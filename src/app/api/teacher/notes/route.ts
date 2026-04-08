import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbRun, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

async function ensureStudentNotesSchema(): Promise<void> {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS student_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      is_confidential INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  const cols = await dbAll(`PRAGMA table_info(student_notes)`);
  const colNames = new Set((cols as any[]).map((c) => String(c.name)));

  if (!colNames.has('category')) {
    await dbRun(`ALTER TABLE student_notes ADD COLUMN category TEXT DEFAULT 'general'`);
  }
  if (!colNames.has('is_confidential')) {
    await dbRun(`ALTER TABLE student_notes ADD COLUMN is_confidential INTEGER DEFAULT 0`);
  }
  if (!colNames.has('updated_at')) {
    await dbRun(
      `ALTER TABLE student_notes ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`
    );
  }
}

async function assertTeacherCanAccessStudent(teacherId: number, studentId: number): Promise<void> {
  const row = await dbGet(
    `
    SELECT u.id
    FROM users u
    JOIN classes c ON c.id = u.class_id
    LEFT JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = ?
    WHERE u.id = ? AND u.role = 'student' AND (c.teacher_id = ? OR ct.teacher_id IS NOT NULL)
    `,
    [teacherId, studentId, teacherId]
  );

  if (!row) {
    throw ApiError.forbidden('Bạn chỉ có thể ghi chú cho sinh viên thuộc lớp bạn phụ trách');
  }
}

// GET /api/teacher/notes - Danh sách ghi chú (của giảng viên hoặc tất cả nếu admin)
export async function GET(request: NextRequest) {
  try {
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    await ensureStudentNotesSchema();

    const where = user.role === 'admin' ? '' : 'WHERE sn.created_by = ?';
    const params = user.role === 'admin' ? [] : [user.id];

    const rows = await dbAll(
      `
      SELECT
        sn.id,
        sn.student_id,
        s.name as student_name,
        s.email as student_email,
        c.name as class_name,
        sn.content,
        COALESCE(sn.category, 'general') as category,
        sn.created_at,
        COALESCE(sn.updated_at, sn.created_at) as updated_at
      FROM student_notes sn
      JOIN users s ON s.id = sn.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      ${where}
      ORDER BY sn.created_at DESC
      `,
      params
    );

    const notes = (rows as any[]).map((r) => ({
      id: Number(r.id),
      studentId: Number(r.student_id),
      studentName: String(r.student_name || ''),
      studentEmail: String(r.student_email || ''),
      content: String(r.content || ''),
      category: String(r.category || 'general'),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      className: String(r.class_name || ''),
    }));

    return successResponse({ notes });
  } catch (error: any) {
    console.error('Get teacher notes error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải ghi chú', { details: error?.message })
    );
  }
}

// POST /api/teacher/notes - Tạo ghi chú
export async function POST(request: NextRequest) {
  try {
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    await ensureStudentNotesSchema();

    const body = await request.json().catch(() => ({}));
    const studentId = Number(body?.studentId);
    const content = String(body?.content || '').trim();
    const category = String(body?.category || 'general');

    if (!studentId || Number.isNaN(studentId)) {
      return errorResponse(ApiError.validation('Thiếu studentId'));
    }
    if (!content) {
      return errorResponse(ApiError.validation('Nội dung ghi chú không được trống'));
    }

    const student = (await dbGet(`SELECT id, role FROM users WHERE id = ?`, [studentId])) as any;
    if (!student || student.role !== 'student') {
      return errorResponse(ApiError.notFound('Không tìm thấy sinh viên'));
    }

    if (user.role === 'teacher') {
      await assertTeacherCanAccessStudent(user.id, studentId);
    }

    const result = await dbRun(
      `INSERT INTO student_notes (student_id, content, category, is_confidential, created_by)
       VALUES (?, ?, ?, 0, ?)`,
      [studentId, content, category, user.id]
    );

    return successResponse({ id: result.lastID }, 'Tạo ghi chú thành công', 201);
  } catch (error: any) {
    console.error('Create teacher note error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tạo ghi chú', { details: error?.message })
    );
  }
}
