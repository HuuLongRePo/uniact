import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type StudentHistoryRow = {
  id: number;
  participation_id: number;
  attendance_status: string;
  achievement_level: string | null;
  feedback: string | null;
  evaluated_at: string | null;
  created_at: string;
  registered_at: string;
  activity_id: number;
  title: string;
  description: string | null;
  date_time: string;
  end_time: string | null;
  location: string | null;
  max_participants: number | null;
  activity_type: string | null;
  organization_level: string | null;
  organizer_name: string | null;
  base_points: number | null;
  type_multiplier: number | null;
  level_multiplier: number | null;
  achievement_multiplier: number | null;
  subtotal: number | null;
  bonus_points: number | null;
  penalty_points: number | null;
  total_points: number | null;
  points_earned: number;
  attended: number;
  status: string;
  attendance_method: string | null;
  evaluated_by_name: string | null;
};

type StudentHistorySummaryRow = {
  total_participations: number;
  registered_count: number;
  attended_count: number;
  absent_count: number;
  excellent_count: number;
  good_count: number;
  participated_count: number;
  total_points_earned: number;
};

// GET /api/student/history - Get student's participation history
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || ''; // registered, attended, absent
    const evaluated = searchParams.get('evaluated') || ''; // true, false

    // Build query
    let query = `
      SELECT 
        p.id,
        p.id as participation_id,
        p.attendance_status,
        p.achievement_level,
        p.feedback,
        p.evaluated_at,
        p.created_at,
        p.created_at as registered_at,
        a.id as activity_id,
        a.title,
        a.description,
        a.date_time,
        a.end_time,
        a.location,
        a.max_participants,
        at.name as activity_type,
        ol.name as organization_level,
        u.name as organizer_name,
        pc.base_points,
        COALESCE(pc.coefficient, 1) as type_multiplier,
        COALESCE(ol.multiplier, 1) as level_multiplier,
        COALESCE(am.multiplier, 1) as achievement_multiplier,
        (COALESCE(pc.base_points, 0) * COALESCE(pc.coefficient, 1) * COALESCE(ol.multiplier, 1) * COALESCE(am.multiplier, 1)) as subtotal,
        pc.bonus_points,
        pc.penalty_points,
        pc.total_points,
        COALESCE(pc.total_points, 0) as points_earned,
        CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END as attended,
        p.attendance_status as status,
        ar.method as attendance_method,
        evaluator.name as evaluated_by_name
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN users u ON a.teacher_id = u.id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      LEFT JOIN achievement_multipliers am ON am.achievement_level = p.achievement_level
      LEFT JOIN users evaluator ON p.evaluated_by = evaluator.id
      LEFT JOIN attendance_records ar ON ar.id = (
        SELECT ar2.id
        FROM attendance_records ar2
        WHERE ar2.activity_id = p.activity_id AND ar2.student_id = p.student_id
        ORDER BY COALESCE(ar2.recorded_at, ar2.created_at) DESC, ar2.id DESC
        LIMIT 1
      )
      WHERE p.student_id = ?
    `;
    const params: Array<number | string> = [user.id];

    if (status) {
      query += ` AND p.attendance_status = ?`;
      params.push(status);
    }

    if (evaluated === 'true') {
      query += ` AND p.achievement_level IS NOT NULL`;
    } else if (evaluated === 'false') {
      query += ` AND p.achievement_level IS NULL`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const history = (await dbAll(query, params)) as StudentHistoryRow[];

    // Get summary statistics
    const summary = (await dbAll(
      `
      SELECT 
        COUNT(*) as total_participations,
        COUNT(CASE WHEN attendance_status = 'registered' THEN 1 END) as registered_count,
        COUNT(CASE WHEN attendance_status = 'attended' THEN 1 END) as attended_count,
        COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN achievement_level = 'excellent' THEN 1 END) as excellent_count,
        COUNT(CASE WHEN achievement_level = 'good' THEN 1 END) as good_count,
        COUNT(CASE WHEN achievement_level = 'participated' THEN 1 END) as participated_count,
        COALESCE(SUM(pc.total_points), 0) as total_points_earned
      FROM participations p
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE p.student_id = ?
    `,
      [user.id]
    )) as StudentHistorySummaryRow[];

    return successResponse({
      history,
      summary: summary[0] || {
        total_participations: 0,
        registered_count: 0,
        attended_count: 0,
        absent_count: 0,
        excellent_count: 0,
        good_count: 0,
        participated_count: 0,
        total_points_earned: 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student history:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải lịch sử tham gia', { details: error?.message })
    );
  }
}
