import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication (admin/teacher access to analytics)
    await requireApiAuth(request);
    const rows = await dbAll(`
      SELECT at.name as activity_type, COUNT(p.id) as participation_count
      FROM activity_types at
      LEFT JOIN activities a ON a.activity_type_id = at.id
      LEFT JOIN participations p ON p.activity_id = a.id AND p.attendance_status IN ('registered','attended')
      GROUP BY at.id
      ORDER BY participation_count DESC
    `);
    const total = rows.reduce((sum: number, r: any) => sum + (r.participation_count || 0), 0) || 1;
    const distribution = rows.map((r: any) => ({
      type: r.activity_type,
      count: r.participation_count,
      percent: +((r.participation_count / total) * 100).toFixed(2),
    }));
    return successResponse({ total, distribution });
  } catch (err: any) {
    return errorResponse(
      err instanceof ApiError
        ? err
        : ApiError.internalError('Failed to load participation distribution', {
            details: err?.message,
          })
    );
  }
}
