import { NextRequest } from 'next/server';
import { loginUser } from '@/lib/auth';
import { ApiError, apiHandler, errorResponse, successResponse } from '@/lib/api-response';
import { setAuthCookie } from '@/lib/session-cookie';
import { rateLimit } from '@/lib/rateLimit';

// WHAT: API endpoint cho đăng nhập
// WHY: Xác thực user credentials
export const POST = apiHandler(async (request: NextRequest) => {
  // Rate limit: 10 lần/15 phút per IP để chống brute force
  const rl = rateLimit(request, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return errorResponse(new ApiError('RATE_LIMITED', 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.', 429));
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      throw ApiError.validation('Email và password là bắt buộc');
    }

    const { user, token } = await loginUser({ email, password });

    const response = successResponse(
      {
        user,
        token: process.env.NODE_ENV !== 'production' ? token : undefined,
      },
      'Đăng nhập thành công',
      200
    );

    setAuthCookie(response, token);

    return response;
  } catch (error: any) {
    if (error?.message && String(error.message).includes('không đúng')) {
      return errorResponse(new ApiError('INVALID_CREDENTIALS', error.message, 401));
    }
    throw error;
  }
});
