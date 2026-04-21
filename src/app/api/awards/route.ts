import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbHelpers, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/awards?status=pending - Get award suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    // Only teachers and admins can view award suggestions
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const params = request.nextUrl?.searchParams;
    const status = params?.get('status') as 'pending' | 'approved' | 'rejected' | undefined;

    const suggestions = await dbHelpers.getAwardSuggestions(status);

    return successResponse({ suggestions });
  } catch (error: any) {
    console.error('Get award suggestions error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// POST /api/awards - Create award suggestion or generate suggestions
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    // Only teachers and admins can create suggestions
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const body = await request.json();
    const { action, student_id, award_type_id } = body;

    if (action === 'generate') {
      // Generate suggestions automatically based on scores
      const count = await dbHelpers.generateAwardSuggestions();
      return successResponse({ count }, `Đã tạo ${count} đề xuất khen thưởng`);
    }

    if (action === 'create' && student_id && award_type_id) {
      // Create a single suggestion
      try {
        const result = await dbHelpers.createAwardSuggestion(
          Number(student_id),
          Number(award_type_id),
          user.id
        );
        return successResponse(
          { suggestion_id: result.lastID },
          'Tạo đề xuất khen thưởng thành công',
          201
        );
      } catch (err: any) {
        return errorResponse(ApiError.validation(err.message || 'Không thể tạo đề xuất'));
      }
    }

    return errorResponse(ApiError.validation('Hành động không hợp lệ hoặc thiếu tham số'));
  } catch (error: any) {
    console.error('Create award suggestion error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// PUT /api/awards - Approve or reject award suggestion
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    // Only admins can approve/reject suggestions
    if (user.role !== 'admin') {
      return errorResponse(
        ApiError.forbidden('Không có quyền truy cập (chỉ admin duyệt/từ chối khen thưởng)')
      );
    }

    const body = await request.json();
    const { suggestion_id, action, note } = body;

    if (!suggestion_id || !action || (action !== 'approve' && action !== 'reject')) {
      return errorResponse(ApiError.validation('Tham số không hợp lệ'));
    }

    try {
      if (action === 'approve') {
        await dbHelpers.approveAwardSuggestion(Number(suggestion_id), user.id, note || null);
        // Create notification for awarded student
        try {
          const suggestions = await dbHelpers.getAwardSuggestions();
          const suggestion = suggestions.find((s: any) => s.id === Number(suggestion_id));
          if (suggestion && suggestion.student_id && suggestion.award_type_name) {
            await dbRun(
              `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
              VALUES (?, 'award', ?, ?, 'award_suggestions', ?, 0, datetime('now'))`,
              [
                suggestion.student_id,
                'Chúc mừng! Bạn được khen thưởng',
                `Bạn đã được duyệt khen thưởng: ${suggestion.award_type_name}`,
                suggestion.id,
              ]
            );
          }
        } catch (awardNotifyErr) {
          console.error('Award approval notification error:', awardNotifyErr);
        }
        return successResponse({}, 'Duyệt đề xuất khen thưởng thành công');
      } else {
        await dbHelpers.rejectAwardSuggestion(Number(suggestion_id), user.id, note || null);
        // Notification for rejection (optional)
        try {
          const suggestion = await dbHelpers
            .getAwardSuggestions('rejected')
            .then((sug) => sug.find((s) => s.id === Number(suggestion_id)));
          if (suggestion && suggestion.student_id && suggestion.award_type_name) {
            await dbRun(
              `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
              VALUES (?, 'award', ?, ?, 'award_suggestions', ?, 0, datetime('now'))`,
              [
                suggestion.student_id,
                'Khen thưởng chưa được duyệt',
                `Đề xuất khen thưởng "${suggestion.award_type_name}" chưa được duyệt`,
                suggestion.id,
              ]
            );
          }
        } catch (awardRejectNotifyErr) {
          console.error('Award rejection notification error:', awardRejectNotifyErr);
        }
        return successResponse({}, 'Từ chối đề xuất khen thưởng');
      }
    } catch (err: any) {
      return errorResponse(ApiError.validation(err.message || 'Không thể xử lý đề xuất'));
    }
  } catch (error: any) {
    console.error('Process award suggestion error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
