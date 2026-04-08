import { NextRequest } from 'next/server';
import { dbRun, dbAll, dbGet, dbReady } from '@/lib/database';
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

// GET /api/students/:id/notes - Lấy danh sách ghi chú
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    const { id } = await params;

    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const studentId = parseInt(id);

    await ensureStudentNotesSchema();

    const notes = await dbAll(
      `SELECT 
        sn.id,
        sn.student_id,
        sn.content,
        COALESCE(sn.category, 'general') as category,
        COALESCE(sn.is_confidential, 0) as is_confidential,
        sn.created_at,
        COALESCE(sn.updated_at, sn.created_at) as updated_at,
        sn.created_by,
        u.name as created_by_name
      FROM student_notes sn
      LEFT JOIN users u ON sn.created_by = u.id
      WHERE sn.student_id = ?
      ORDER BY sn.created_at DESC`,
      [studentId]
    );

    return successResponse({ notes });
  } catch (error: any) {
    console.error('Lỗi lấy ghi chú học viên:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi lấy ghi chú', { details: error?.message })
    );
  }
}

// POST /api/students/:id/notes - Thêm ghi chú mới
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    const { id } = await params;

    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const studentId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const content = String(body?.content || '');
    const category = String(body?.category || 'general');
    const isConfidential = body?.is_confidential ? 1 : 0;

    if (!content || content.trim() === '') {
      return errorResponse(ApiError.validation('Nội dung ghi chú không được trống'));
    }

    await ensureStudentNotesSchema();

    const student = (await dbGet(`SELECT id, role FROM users WHERE id = ?`, [studentId])) as any;
    if (!student || student.role !== 'student') {
      return errorResponse(ApiError.notFound('Không tìm thấy học viên'));
    }

    const result = await dbRun(
      `INSERT INTO student_notes (student_id, content, category, is_confidential, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, content.trim(), category, isConfidential, user.id]
    );

    return successResponse({ noteId: result.lastID }, 'Đã thêm ghi chú thành công');
  } catch (error: any) {
    console.error('Lỗi tạo ghi chú học viên:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi thêm ghi chú', { details: error?.message })
    );
  }
}

// DELETE /api/students/:id/notes?noteId=123 - Xóa ghi chú
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbReady();
    const { id } = await params;

    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return errorResponse(ApiError.validation('Thiếu noteId'));
    }

    await ensureStudentNotesSchema();

    // Admin hoặc người tạo mới được xóa
    const deleteCondition = user.role === 'admin' ? 'id = ?' : 'id = ? AND created_by = ?';

    const deleteParams = user.role === 'admin' ? [noteId] : [noteId, user.id];

    await dbRun(`DELETE FROM student_notes WHERE ${deleteCondition}`, deleteParams);

    return successResponse({}, 'Đã xóa ghi chú');
  } catch (error: any) {
    console.error('Lỗi xoá ghi chú học viên:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi xóa ghi chú', { details: error?.message })
    );
  }
}
