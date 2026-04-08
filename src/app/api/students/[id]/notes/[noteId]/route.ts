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

// PUT /api/students/[id]/notes/[noteId] - Cập nhật ghi chú
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    await dbReady();
    const { id, noteId } = await params;

    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const studentId = Number(id);
    const nid = Number(noteId);
    if (!studentId || Number.isNaN(studentId) || !nid || Number.isNaN(nid)) {
      return errorResponse(ApiError.validation('ID không hợp lệ'));
    }

    await ensureStudentNotesSchema();

    const existing = (await dbGet(
      `SELECT id, student_id, created_by FROM student_notes WHERE id = ? AND student_id = ?`,
      [nid, studentId]
    )) as { id: number; student_id: number; created_by: number } | undefined;

    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy ghi chú'));
    }

    if (user.role !== 'admin' && Number(existing.created_by) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể sửa ghi chú do bạn tạo'));
    }

    const body = await request.json().catch(() => ({}));
    const content = String(body?.content || '').trim();
    const category = String(body?.category || 'general');
    const isConfidential = body?.is_confidential ? 1 : 0;

    if (!content) {
      return errorResponse(ApiError.validation('Nội dung ghi chú không được trống'));
    }

    await dbRun(
      `
      UPDATE student_notes
      SET content = ?, category = ?, is_confidential = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [content, category, isConfidential, nid]
    );

    return successResponse({}, 'Cập nhật ghi chú thành công');
  } catch (error: any) {
    console.error('Update student note error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể cập nhật ghi chú', { details: error?.message })
    );
  }
}

// DELETE /api/students/[id]/notes/[noteId] - Xóa ghi chú
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    await dbReady();
    const { id, noteId } = await params;

    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const studentId = Number(id);
    const nid = Number(noteId);
    if (!studentId || Number.isNaN(studentId) || !nid || Number.isNaN(nid)) {
      return errorResponse(ApiError.validation('ID không hợp lệ'));
    }

    await ensureStudentNotesSchema();

    const existing = (await dbGet(
      `SELECT id, student_id, created_by FROM student_notes WHERE id = ? AND student_id = ?`,
      [nid, studentId]
    )) as { id: number; student_id: number; created_by: number } | undefined;

    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy ghi chú'));
    }

    if (user.role !== 'admin' && Number(existing.created_by) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xóa ghi chú do bạn tạo'));
    }

    await dbRun(`DELETE FROM student_notes WHERE id = ?`, [nid]);

    return successResponse({}, 'Đã xóa ghi chú');
  } catch (error: any) {
    console.error('Delete student note error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xóa ghi chú', { details: error?.message })
    );
  }
}
