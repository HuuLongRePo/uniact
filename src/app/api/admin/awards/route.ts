import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbHelpers, dbReady } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { sendDatabaseNotification } from '@/lib/notifications';

// GET /api/admin/awards?status=pending - List award suggestions
export async function GET(request: NextRequest) {
  try {
    await dbReady();
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Forbidden'));

    const status = request.nextUrl?.searchParams?.get('status') as
      | 'pending'
      | 'approved'
      | 'rejected'
      | undefined;

    const suggestions = await dbHelpers.getAwardSuggestions(status);
    return successResponse({ suggestions });
  } catch (error: any) {
    console.error('Admin get award suggestions error:', error);
    return errorResponse(ApiError.internalError('Internal server error'));
  }
}

// POST /api/admin/awards { action: 'generate' }
export async function POST(request: NextRequest) {
  try {
    await dbReady();
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Forbidden'));

    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action !== 'generate') {
      return errorResponse(ApiError.validation('Invalid action'));
    }

    const count = await dbHelpers.generateAwardSuggestions();
    return successResponse({ count }, `Generated ${count} award suggestions`);
  } catch (error: any) {
    console.error('Admin generate award suggestions error:', error);
    return errorResponse(ApiError.internalError('Internal server error'));
  }
}

// PUT /api/admin/awards { suggestion_id, action: 'approve'|'reject', note? }
export async function PUT(request: NextRequest) {
  try {
    await dbReady();
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Forbidden'));

    const body = await request.json();
    const { suggestion_id, action, note } = body as {
      suggestion_id?: number;
      action?: 'approve' | 'reject';
      note?: string | null;
    };

    if (!suggestion_id || !action || (action !== 'approve' && action !== 'reject')) {
      return errorResponse(ApiError.validation('Invalid parameters'));
    }

    if (action === 'approve') {
      try {
        await dbHelpers.approveAwardSuggestion(Number(suggestion_id), user.id, note || null);
      } catch (err: any) {
        if (err?.message === 'Suggestion not found')
          return errorResponse(ApiError.notFound('Suggestion not found'));
        if (err?.message === 'Suggestion already processed')
          return errorResponse(ApiError.conflict('Suggestion already processed'));
        return errorResponse(ApiError.validation(err?.message || 'Failed to approve suggestion'));
      }

      // Best-effort notification
      try {
        const suggestions = await dbHelpers.getAwardSuggestions();
        const suggestion = suggestions.find((s: any) => s.id === Number(suggestion_id));
        if (suggestion?.student_id && suggestion?.award_type_name) {
          await sendDatabaseNotification({
            userId: Number(suggestion.student_id),
            type: 'award',
            title: 'Chúc mừng! Bạn được khen thưởng',
            message: `Bạn đã được duyệt khen thưởng: ${suggestion.award_type_name}`,
            relatedTable: 'award_suggestions',
            relatedId: Number(suggestion.id),
          });
        }
      } catch (notifyErr) {
        console.error('Award approval notification error:', notifyErr);
      }

      return successResponse({}, 'Award suggestion approved');
    }

    try {
      await dbHelpers.rejectAwardSuggestion(Number(suggestion_id), user.id, note || null);
    } catch (err: any) {
      if (err?.message === 'Suggestion not found')
        return errorResponse(ApiError.notFound('Suggestion not found'));
      if (err?.message === 'Suggestion already processed')
        return errorResponse(ApiError.conflict('Suggestion already processed'));
      return errorResponse(ApiError.validation(err?.message || 'Failed to reject suggestion'));
    }

    // Best-effort notification
    try {
      const suggestions = await dbHelpers.getAwardSuggestions('rejected');
      const suggestion = suggestions.find((s: any) => s.id === Number(suggestion_id));
      if (suggestion?.student_id && suggestion?.award_type_name) {
        await sendDatabaseNotification({
          userId: Number(suggestion.student_id),
          type: 'award',
          title: 'Khen thưởng chưa được duyệt',
          message: `Đề xuất khen thưởng "${suggestion.award_type_name}" chưa được duyệt`,
          relatedTable: 'award_suggestions',
          relatedId: Number(suggestion.id),
        });
      }
    } catch (notifyErr) {
      console.error('Award rejection notification error:', notifyErr);
    }

    return successResponse({}, 'Award suggestion rejected');
  } catch (error: any) {
    console.error('Admin process award suggestion error:', error);
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
