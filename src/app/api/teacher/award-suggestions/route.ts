import { NextRequest } from 'next/server';
import { dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

type SuggestionStatus = 'pending' | 'approved' | 'rejected';

function normalizeStatus(value: string | null): SuggestionStatus | undefined {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher']);
    const status = normalizeStatus(request.nextUrl.searchParams.get('status'));
    const suggestions = await dbHelpers.getAwardSuggestions(status);

    const ownSuggestions = (suggestions || [])
      .filter((item: any) => Number(item.suggestion_by || 0) === Number(user.id))
      .map((item: any) => ({
        id: Number(item.id),
        student_id: Number(item.student_id),
        student_name: String(item.student_name || ''),
        student_email: item.student_email ? String(item.student_email) : '',
        class_name: item.class_name ? String(item.class_name) : '',
        award_type_id: Number(item.award_type_id),
        award_type_name: String(item.award_type_name || `#${item.award_type_id}`),
        award_min_points: Number(item.award_min_points || 0),
        score_snapshot: Number(item.score_snapshot || 0),
        status: String(item.status || 'pending'),
        note: item.note ? String(item.note) : '',
        suggested_at: String(item.suggested_at || ''),
        suggestion_by: Number(item.suggestion_by || 0),
      }));

    return successResponse({ suggestions: ownSuggestions });
  } catch (error: any) {
    console.error('Teacher get award suggestions error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Khong the tai danh sach de xuat khen thuong', {
            details: error?.message,
          })
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher']);
    const body = await request.json().catch(() => ({}));
    const studentId = Number(body?.student_id);
    const awardTypeId = Number(body?.award_type_id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return errorResponse(ApiError.validation('Student ID khong hop le'));
    }

    if (!Number.isInteger(awardTypeId) || awardTypeId <= 0) {
      return errorResponse(ApiError.validation('Award type ID khong hop le'));
    }

    const result = await dbHelpers.createAwardSuggestion(studentId, awardTypeId, user.id);

    return successResponse(
      { suggestion_id: Number(result.lastID || 0) },
      'Tao de xuat khen thuong thanh cong',
      201
    );
  } catch (error: any) {
    console.error('Teacher create award suggestion error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.validation(error?.message || 'Khong the tao de xuat khen thuong')
    );
  }
}
