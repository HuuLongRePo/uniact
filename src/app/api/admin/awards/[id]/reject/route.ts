import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbHelpers, dbRun, dbReady } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/admin/awards/[id]/reject - Reject award
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit(request, 15, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(new ApiError('RATE_LIMITED', 'Too many requests', 429));
    }

    const { id } = await params;
    const suggestionId = parseInt(id, 10);
    if (Number.isNaN(suggestionId)) {
      return errorResponse(ApiError.validation('Invalid id'));
    }

    await dbReady();
    const user = await requireApiRole(request, ['admin']);

    const body = await request.json().catch(() => ({}));
    const reason = (body?.reason ?? body?.note ?? null) as string | null;

    await dbHelpers.rejectAwardSuggestion(suggestionId, user.id, reason);

    // Best-effort notification
    try {
      const suggestions = await dbHelpers.getAwardSuggestions('rejected');
      const suggestion = suggestions.find((s: any) => s.id === suggestionId);
      if (suggestion?.student_id && suggestion?.award_type_name) {
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
    } catch (notifyErr) {
      console.error('Award rejection notification error:', notifyErr);
    }

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'REJECT_AWARD_SUGGESTION',
        'award_suggestions',
        suggestionId,
        JSON.stringify({ reason }),
      ]
    );

    return successResponse({}, 'Award suggestion rejected');
  } catch (error: any) {
    console.error('Error rejecting award:', error);
    if (error?.message === 'Suggestion not found') {
      return errorResponse(ApiError.notFound('Suggestion not found'));
    }
    if (error?.message === 'Suggestion already processed') {
      return errorResponse(ApiError.conflict('Suggestion already processed'));
    }
    return errorResponse(ApiError.internalError(error?.message || 'Internal server error'));
  }
}
