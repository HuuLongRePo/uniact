import { NextRequest } from 'next/server';
import { registerUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { setAuthCookie } from '@/lib/session-cookie';

// WHAT: API endpoint cho đăng ký user
// WHY: Xử lý registration requests từ client
// HOW: Next.js Route Handler
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit registration (5 per hour per IP)
    const rl = rateLimit(request, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Quá nhiều yêu cầu đăng ký. Hãy thử lại sau 1 giờ', 429)
      );
    }

    const { email, password, name, role, class_id } = await request.json();

    // WHAT: Validation input
    // WHY: Đảm bảo dữ liệu hợp lệ trước khi xử lý
    if (!email || !password || !name) {
      return errorResponse(ApiError.validation('Email, password và name là bắt buộc'));
    }

    // WHAT: Gọi hàm register từ auth system
    // WHY: Business logic tập trung
    const { user, token } = await registerUser({
      email,
      password,
      name,
      role,
      class_id,
    });

    const res = successResponse({ user }, 'Đăng ký thành công', 201);
    setAuthCookie(res, token);

    return res;
  } catch (error: any) {
    console.error('Register error:', error);

    // WHAT: Xử lý lỗi cụ thể
    // WHY: User-friendly error messages
    if (error.message.includes('đã tồn tại')) {
      return errorResponse(ApiError.validation(error.message));
    }

    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
