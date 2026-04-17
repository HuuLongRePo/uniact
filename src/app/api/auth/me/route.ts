import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { clearAuthCookie, getTokenFromRequest } from '@/lib/session-cookie';

// WHAT: API endpoint lấy thông tin user hiện tại
export async function GET(request: NextRequest) {
  try {
    // WHAT: Lấy token từ cookie hoặc Authorization Bearer
    const token = getTokenFromRequest(request);

    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    // WHAT: Xác thực token và lấy user info
    const user = await getUserFromToken(token);

    if (!user) {
      // WHAT: Xóa cookie nếu token không hợp lệ
      const response = errorResponse(ApiError.unauthorized('Token không hợp lệ'));
      clearAuthCookie(response);
      return response;
    }

    return successResponse({ user });
  } catch (error) {
    console.error('Get user error:', error);

    const response = errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Lỗi server')
    );

    if (response.status === 401) {
      clearAuthCookie(response);
    }

    return response;
  }
}
