import { NextRequest } from 'next/server';
import { dbRun, dbAll, dbGet, dbHelpers } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/bonus?status=pending|approved|rejected - list suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const status = request.nextUrl?.searchParams.get('status') || undefined;
    let rows: any[] = [];

    if (status) {
      rows = await dbAll(
        'SELECT * FROM suggested_bonus_points WHERE status = ? ORDER BY created_at DESC',
        [status]
      );
    } else {
      rows = await dbAll('SELECT * FROM suggested_bonus_points ORDER BY created_at DESC');
    }

    return successResponse({ suggestions: rows });
  } catch (err: any) {
    console.error('GET /api/bonus error:', err);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// POST /api/bonus - create a new suggested bonus
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 20, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Gửi đề xuất quá nhanh. Vui lòng thử lại sau ít phút.', 429)
      );
    }

    const user = await requireApiRole(request, ['teacher', 'admin']);

    const body = await request.json();
    const student_id = Number(body.student_id);
    const points = Number(body.points);
    const source_type = body.source_type || null;
    const source_id = body.source_id ? Number(body.source_id) : null;
    const evidence_url = body.evidence_url || null;

    if (!student_id || isNaN(points)) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc: student_id và points'));
    }

    if (!Number.isInteger(student_id) || student_id <= 0) {
      return errorResponse(ApiError.validation('student_id không hợp lệ'));
    }

    if (!Number.isFinite(points) || points < 0 || points > 500) {
      return errorResponse(ApiError.validation('points phải nằm trong khoảng 0-500'));
    }

    if (source_id !== null && (!Number.isInteger(source_id) || source_id <= 0)) {
      return errorResponse(ApiError.validation('source_id không hợp lệ'));
    }

    const res = await dbRun(
      `INSERT INTO suggested_bonus_points
        (student_id, source_type, source_id, points, status, author_id, evidence_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
      [student_id, source_type, source_id, points, user.id, evidence_url]
    );

    // create audit log
    try {
      await dbHelpers.createAuditLog(
        user.id,
        'CREATE_SUGGESTED_BONUS',
        'suggested_bonus_points',
        res.lastID || null,
        JSON.stringify({ student_id, points })
      );
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    return successResponse({ suggestion_id: res.lastID }, 'Tạo đề xuất điểm thưởng thành công', 201);
  } catch (err: any) {
    console.error('POST /api/bonus error:', err);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
