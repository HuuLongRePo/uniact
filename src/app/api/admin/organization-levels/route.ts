import { NextRequest } from 'next/server';
import { dbAll, dbHelpers, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/admin/organization-levels - List organization levels
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const levels = await dbHelpers.getOrganizationLevels();

    return successResponse(levels);
  } catch (error: any) {
    console.error('Error fetching organization levels:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách cấp tổ chức', { details: error?.message })
    );
  }
}

// POST /api/admin/organization-levels - Create organization level
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

    const normalizedName = String(name).trim();
    if (!normalizedName) {
      return errorResponse(ApiError.validation('Tên cấp tổ chức không được để trống'));
    }

    const existing = await dbAll(
      'SELECT id FROM organization_levels WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
      [normalizedName]
    );
    if (existing.length > 0) {
      return errorResponse(ApiError.conflict('Tên cấp tổ chức đã tồn tại'));
    }

    const result = await dbRun(
      `INSERT INTO organization_levels (name, multiplier, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [normalizedName, multiplier, description || null]
    );

    cache.invalidatePrefix('organization_levels');

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE',
        'organization_levels',
        result.lastID,
        JSON.stringify({ name: normalizedName, multiplier, description }),
      ]
    );

    return successResponse(
      { id: result.lastID, name: normalizedName, multiplier, description },
      'Tạo cấp tổ chức thành công',
      201
    );
  } catch (error: any) {
    console.error('Error creating organization level:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tạo cấp tổ chức', { details: error?.message })
    );
  }
}
