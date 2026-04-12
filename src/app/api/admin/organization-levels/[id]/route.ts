import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/admin/organization-levels/[id] - Update organization level
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiRole(request, ['admin']);

    const body = await request.json();
    const { name, multiplier, description } = body;

    const existing = await dbGet('SELECT id FROM organization_levels WHERE id = ?', [id]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy cấp tổ chức'));
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

    await dbRun(`UPDATE organization_levels SET ${updates.join(', ')} WHERE id = ?`, values);
    cache.invalidatePrefix('organization_levels');

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE', 'organization_levels', id, JSON.stringify(body)]
    );

    return successResponse({ updated: true }, 'Cập nhật cấp tổ chức thành công');
  } catch (error: any) {
    console.error('Error updating organization level:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật cấp tổ chức', { details: error?.message })
    );
  }
}

// DELETE /api/admin/organization-levels/[id] - Delete organization level
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireApiRole(request, ['admin']);

    const existing = (await dbGet('SELECT id, name FROM organization_levels WHERE id = ?', [id])) as any;
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy cấp tổ chức'));
    }

    const activities = await dbGet('SELECT id FROM activities WHERE organization_level_id = ?', [id]);
    if (activities) {
      return errorResponse(
        ApiError.validation('Không thể xóa cấp tổ chức đang được sử dụng, hãy gán lại hoạt động trước')
      );
    }

    await dbRun('DELETE FROM organization_levels WHERE id = ?', [id]);
    cache.invalidatePrefix('organization_levels');

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE', 'organization_levels', id, JSON.stringify({ name: existing.name })]
    );

    return successResponse({ deleted: true }, 'Xóa cấp tổ chức thành công');
  } catch (error: any) {
    console.error('Error deleting organization level:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể xóa cấp tổ chức', { details: error?.message })
    );
  }
}
