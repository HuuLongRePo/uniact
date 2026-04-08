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

// PUT /api/teacher/notes/[noteId] - Cập nhật ghi chú
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    await dbReady();
    const { noteId } = await params;

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const nid = Number(noteId);
    if (!nid || Number.isNaN(nid)) {
      return errorResponse(ApiError.validation('ID ghi chú không hợp lệ'));
    }

    await ensureStudentNotesSchema();

    const existing = (await dbGet(`SELECT id, created_by FROM student_notes WHERE id = ?`, [
      nid,
    ])) as any;
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy ghi chú'));
    }

    if (user.role !== 'admin' && Number(existing.created_by) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể sửa ghi chú do bạn tạo'));
    }

    const body = await request.json().catch(() => ({}));
    const content = String(body?.content || '').trim();
    const category = String(body?.category || 'general');

    if (!content) {
      return errorResponse(ApiError.validation('Nội dung ghi chú không được trống'));
    }

    await dbRun(
      `UPDATE student_notes SET content = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [content, category, nid]
    );

    return successResponse({}, 'Cập nhật ghi chú thành công');
  } catch (error: any) {
    console.error('Update teacher note error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể cập nhật ghi chú', { details: error?.message })
    );
  }
}

// DELETE /api/teacher/notes/[noteId] - Xóa ghi chú
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    await dbReady();
    const { noteId } = await params;

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const nid = Number(noteId);
    if (!nid || Number.isNaN(nid)) {
      return errorResponse(ApiError.validation('ID ghi chú không hợp lệ'));
    }

    await ensureStudentNotesSchema();

    const existing = (await dbGet(`SELECT id, created_by FROM student_notes WHERE id = ?`, [
      nid,
    ])) as any;
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy ghi chú'));
    }

    if (user.role !== 'admin' && Number(existing.created_by) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xóa ghi chú do bạn tạo'));
    }

    await dbRun(`DELETE FROM student_notes WHERE id = ?`, [nid]);

    return successResponse({}, 'Xóa ghi chú thành công');
  } catch (error: any) {
    console.error('Delete teacher note error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xóa ghi chú', { details: error?.message })
    );
  }
}
