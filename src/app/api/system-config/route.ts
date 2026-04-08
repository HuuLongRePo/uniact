import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers, dbRun, dbGet } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/system-config?category=attendance
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin')
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    const category = request.nextUrl.searchParams.get('category') || undefined;
    const configs = await dbHelpers.getSystemConfig(category);
    return successResponse({ configs });
  } catch (e: any) {
    console.error('Lỗi lấy cấu hình hệ thống:', e);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// PUT /api/system-config  body: { updates: [{ key, value }] }
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin')
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    const body = await request.json();
    const updates = body.updates as { key: string; value: string }[] | undefined;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return errorResponse(ApiError.validation('Thiếu danh sách cập nhật'));
    }

    for (const u of updates) {
      if (!u.key) continue;
      await dbHelpers.updateSystemConfig(u.key, String(u.value), user.id);
    }

    return successResponse({}, 'Cập nhật cấu hình thành công');
  } catch (e: any) {
    console.error('Lỗi cập nhật cấu hình hệ thống:', e);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
