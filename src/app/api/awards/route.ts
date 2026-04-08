import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbHelpers, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/awards?status=pending - Get award suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    // Only teachers and admins can view award suggestions
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Forbidden'));
    }

    const params = request.nextUrl?.searchParams;
    const status = params?.get('status') as 'pending' | 'approved' | 'rejected' | undefined;

    const suggestions = await dbHelpers.getAwardSuggestions(status);

    return successResponse({ suggestions });
  } catch (error: any) {
    console.error('Get award suggestions error:', error);
    return errorResponse(ApiError.internalError('Internal server error'));
  }
}

// POST /api/awards - Create award suggestion or generate suggestions
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    // Only teachers and admins can create suggestions
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Forbidden'));
    }

    const body = await request.json();
    const { action, student_id, award_type_id } = body;

    if (action === 'generate') {
      // Generate suggestions automatically based on scores
      const count = await dbHelpers.generateAwardSuggestions();
      return successResponse({ count }, `Generated ${count} award suggestions`);
    }

    if (action === 'create' && student_id && award_type_id) {
      // Create a single suggestion
      try {
        const result = await dbHelpers.createAwardSuggestion(
          Number(student_id),
          Number(award_type_id),
          user.id
        );
        return successResponse({ suggestion_id: result.lastID }, 'Award suggestion created', 201);
      } catch (err: any) {
        return errorResponse(ApiError.validation(err.message || 'Failed to create suggestion'));
      }
    }

    return errorResponse(ApiError.validation('Invalid action or missing parameters'));
  } catch (error: any) {
    console.error('Create award suggestion error:', error);
    return errorResponse(ApiError.internalError('Internal server error'));
  }
}

// PUT /api/awards - Approve or reject award suggestion
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    // Only admins can approve/reject suggestions
    if (user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Forbidden: Only admins can approve/reject awards'));
    }

    const body = await request.json();
    const { suggestion_id, action, note } = body;

    if (!suggestion_id || !action || (action !== 'approve' && action !== 'reject')) {
      return errorResponse(ApiError.validation('Invalid parameters'));
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
        return successResponse({}, 'Award suggestion approved');
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
        return successResponse({}, 'Award suggestion rejected');
      }
    } catch (err: any) {
      return errorResponse(ApiError.validation(err.message || 'Failed to process suggestion'));
    }
  } catch (error: any) {
    console.error('Process award suggestion error:', error);
    return errorResponse(ApiError.internalError('Internal server error'));
  }
}
