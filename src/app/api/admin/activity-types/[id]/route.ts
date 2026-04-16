import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/admin/activity-types/[id] - Update activity type
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { id } = await params;
    const body = await request.json();
    const { name, multiplier, description } = body;

    const existing = await dbGet('SELECT id FROM activity_types WHERE id = ?', [id]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy loại hoạt động'));
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (multiplier !== undefined) {
      if (typeof multiplier !== 'number' || multiplier < 0) {
        return errorResponse(ApiError.validation('Multiplier phải là số không âm'));
      }
      updates.push('multiplier = ?');
      values.push(multiplier);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0) {
      return errorResponse(ApiError.validation('Không có trường nào để cập nhật'));
    }

    values.push(id);

    await dbRun(`UPDATE activity_types SET ${updates.join(', ')} WHERE id = ?`, values);
    cache.invalidatePrefix('activity_types');

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE', 'activity_types', id, JSON.stringify(body)]
    );

    return successResponse({ updated: true }, 'Cập nhật loại hoạt động thành công');
  } catch (error: any) {
    console.error('Error updating activity type:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật loại hoạt động', { details: error?.message })
    );
  }
}

// DELETE /api/admin/activity-types/[id] - Delete activity type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { id } = await params;
    const existing = (await dbGet('SELECT id, name FROM activity_types WHERE id = ?', [id])) as any;
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy loại hoạt động'));
    }

    const activities = await dbGet('SELECT id FROM activities WHERE activity_type_id = ?', [id]);
    if (activities) {
      return errorResponse(
        ApiError.validation(
          'Không thể xóa loại hoạt động đang được sử dụng, hãy gán lại hoạt động trước'
        )
      );
    }

    await dbRun('DELETE FROM activity_types WHERE id = ?', [id]);
    cache.invalidatePrefix('activity_types');

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE', 'activity_types', id, JSON.stringify({ name: existing.name })]
    );

    return successResponse({ deleted: true }, 'Xóa loại hoạt động thành công');
  } catch (error: any) {
    console.error('Error deleting activity type:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể xóa loại hoạt động', { details: error?.message })
    );
  }
}
