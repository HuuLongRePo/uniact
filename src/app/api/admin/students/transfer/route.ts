import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Chưa xác thực'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    const { studentIds, targetClassId } = await request.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0 || !targetClassId) {
      return errorResponse(ApiError.validation('Yêu cầu không hợp lệ'));
    }

    // Update all students' class_id
    const placeholders = studentIds.map(() => '?').join(',');
    await dbRun(
      `UPDATE users SET class_id = ? WHERE id IN (${placeholders}) AND role = 'student'`,
      [targetClassId, ...studentIds]
    );

    return successResponse(
      { count: studentIds.length },
      `${studentIds.length} student(s) transferred successfully`
    );
  } catch (error: any) {
    console.error('Transfer students error:', error);
    return errorResponse(
      ApiError.internalError('Failed to transfer students', { details: error?.message })
    );
  }
}
