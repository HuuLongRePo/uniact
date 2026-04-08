import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication (admin/teacher access to class analytics)
    await requireApiAuth(request);
    const rows = await dbAll(`
      SELECT c.id as class_id, c.name as class_name, COALESCE(SUM(ss.points),0) as total_points, COUNT(DISTINCT u.id) as student_count
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
      LEFT JOIN student_scores ss ON ss.student_id = u.id
      GROUP BY c.id
      ORDER BY total_points DESC
      LIMIT 50
    `);
    const data = rows.map((r: any) => ({
      class_id: r.class_id,
      class_name: r.class_name,
      total_points: r.total_points,
      avg_points_per_student: r.student_count ? +(r.total_points / r.student_count).toFixed(2) : 0,
      student_count: r.student_count,
    }));
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(
      err instanceof ApiError
        ? err
        : ApiError.internalError('Failed to load class comparison', { details: err?.message })
    );
  }
}
