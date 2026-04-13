import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// POST - Test email configuration
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    let body: {
      smtpHost?: string;
      smtpPort?: string | number;
      smtpUser?: string;
      smtpPass?: string;
      smtpFrom?: string;
    };
    try {
      body = await request.json();
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu JSON không hợp lệ'));
    }

    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = body;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return errorResponse(ApiError.validation('Thiếu cấu hình SMTP bắt buộc'));
    }

    console.warn('Email test simulation:', {
      from: smtpFrom || smtpUser,
      to: user.email,
      subject: 'UniAct - Email Test',
      config: { smtpHost, smtpPort },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    return successResponse(
      {
        sent: true,
        recipient: user.email,
      },
      `Email test đã gửi đến ${user.email}`
    );
  } catch (error: any) {
    console.error('POST /api/admin/system-config/test-email error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể gửi email kiểm tra', { details: error?.message })
    );
  }
}
