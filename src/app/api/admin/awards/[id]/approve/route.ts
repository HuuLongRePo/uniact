import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbHelpers, dbRun, dbReady } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/admin/awards/[id]/approve - Approve award
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit(request, 15, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(new ApiError('RATE_LIMITED', 'Too many requests', 429));
    }

    await dbReady();
    const user = await requireApiRole(request, ['admin']);

    const { id } = await params;
    const suggestionId = parseInt(id, 10);
    if (Number.isNaN(suggestionId)) {
      return errorResponse(ApiError.validation('Invalid id'));
    }

    const body = await request.json().catch(() => ({}));
    const note = (body?.comment ?? body?.note ?? null) as string | null;

    await dbHelpers.approveAwardSuggestion(suggestionId, user.id, note);

    // Best-effort notification
    try {
      const suggestions = await dbHelpers.getAwardSuggestions();
      const suggestion = suggestions.find((s: any) => s.id === suggestionId);
      if (suggestion?.student_id && suggestion?.award_type_name) {
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
    } catch (notifyErr) {
      console.error('Award approval notification error:', notifyErr);
    }

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'APPROVE_AWARD_SUGGESTION',
        'award_suggestions',
        suggestionId,
        JSON.stringify({ note }),
      ]
    );

    return successResponse({}, 'Award suggestion approved');
  } catch (error: any) {
    console.error('Error approving award:', error);
    if (error?.message === 'Suggestion not found') {
      return errorResponse(ApiError.notFound('Suggestion not found'));
    }
    if (error?.message === 'Suggestion already processed') {
      return errorResponse(ApiError.conflict('Suggestion already processed'));
    }
    return errorResponse(ApiError.internalError(error?.message || 'Internal server error'));
  }
}
