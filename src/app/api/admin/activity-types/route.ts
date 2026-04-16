import { NextRequest } from 'next/server';
import { dbAll, dbRun } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/admin/activity-types - List activity types
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const types = await dbAll(
      `SELECT id, name, multiplier, description, created_at
       FROM activity_types
       ORDER BY name ASC`
    );

    return successResponse(types);
  } catch (error: any) {
    console.error('Error fetching activity types:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách loại hoạt động', {
            details: error?.message,
          })
    );
  }
}

// POST /api/admin/activity-types - Create activity type
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const body = await request.json();
    const { name, multiplier, description } = body;

    if (!name || multiplier === undefined) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc: name, multiplier'));
    }

    if (typeof multiplier !== 'number' || multiplier < 0) {
      return errorResponse(ApiError.validation('Multiplier phải là số không âm'));
    }

    const existing = await dbAll('SELECT id FROM activity_types WHERE name = ?', [name]);
    if (existing.length > 0) {
      return errorResponse(ApiError.conflict('Tên loại hoạt động đã tồn tại'));
    }

    const result = await dbRun(
      `INSERT INTO activity_types (name, multiplier, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [name, multiplier, description || null]
    );

    cache.invalidatePrefix('activity_types');

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE',
        'activity_types',
        result.lastID,
        JSON.stringify({ name, multiplier, description }),
      ]
    );

    return successResponse(
      { id: result.lastID, name, multiplier, description },
      'Tạo loại hoạt động thành công',
      201
    );
  } catch (error: any) {
    console.error('Error creating activity type:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tạo loại hoạt động', { details: error?.message })
    );
  }
}
