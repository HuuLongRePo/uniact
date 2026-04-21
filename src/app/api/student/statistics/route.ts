import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll, dbGet } from '@/lib/database';
import { calculateRank } from '@/lib/calculations';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

/**
 * GET /api/student/statistics
 * Get comprehensive statistics for the logged-in student
 * Returns: activity counts, scores, rank, notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    // Tổng số hoạt động đã đăng ký (đăng ký hoặc đã tham dự)
    let registeredResult: { count: number } = { count: 0 };
    try {
      registeredResult = (await dbGet(
        `SELECT COUNT(*) as count 
         FROM participations 
         WHERE student_id = ? AND attendance_status IN ('registered', 'attended')`,
        [user.id]
      )) as { count: number };
    } catch {}

    // Số hoạt động đã tham dự
    let attendedResult: { count: number } = { count: 0 };
    try {
      attendedResult = (await dbGet(
        `SELECT COUNT(*) as count 
         FROM participations 
         WHERE student_id = ? AND attendance_status = 'attended'`,
        [user.id]
      )) as { count: number };
    } catch {}

    const scoreLedger = await getFinalScoreLedgerByStudentIds([Number(user.id)]);
    const currentStudentLedger = scoreLedger.get(Number(user.id));
    const currentStudentScore = currentStudentLedger?.final_total || 0;

    // Điểm gần nhất (từ student_scores)
    let recentScoreResult: { points: number } | null = null;
    try {
      recentScoreResult = (await dbGet(
        `SELECT points 
         FROM student_scores 
         WHERE student_id = ?
         ORDER BY calculated_at DESC
         LIMIT 1`,
        [user.id]
      )) as { points: number } | null;
    } catch {}

    // Hoạt động sắp tới (đã đăng ký nhưng chưa bắt đầu)
    let pendingResult: { count: number } = { count: 0 };
    try {
      pendingResult = (await dbGet(
        `SELECT COUNT(*) as count 
         FROM participations p
         JOIN activities a ON p.activity_id = a.id
         WHERE p.student_id = ? 
           AND p.attendance_status = 'registered'
           AND datetime(a.date_time) > datetime('now')`,
        [user.id]
      )) as { count: number };
    } catch {}

    // Get unread notifications count
    let notificationsResult: { count: number } = { count: 0 };
    try {
      notificationsResult = (await dbGet(
        `SELECT COUNT(*) as count 
         FROM notifications 
         WHERE user_id = ? AND is_read = 0`,
        [user.id]
      )) as { count: number };
    } catch {}

    // Xếp hạng theo tổng điểm cuối cùng (participation + award + adjustment)
    let allStudentsScores: Array<{ id: number; total_points: number }>;
    try {
      const studentRows = (await dbAll(
        `SELECT id FROM users WHERE role = 'student' ORDER BY id ASC`
      )) as Array<{ id: number }>;
      const allLedgers = await getFinalScoreLedgerByStudentIds(
        studentRows.map((student) => student.id)
      );
      allStudentsScores = studentRows.map((student) => ({
        id: student.id,
        total_points: allLedgers.get(Number(student.id))?.final_total || 0,
      }));
    } catch {
      allStudentsScores = [];
    }

    let rank = null;
    const totalStudents = allStudentsScores.length;

    const scoreList = allStudentsScores.map((student) => Number(student.total_points || 0));
    const calculatedRank = calculateRank(Number(currentStudentScore || 0), scoreList);

    if (calculatedRank > 0) {
      rank = calculatedRank;
    } else {
      // Fallback rank (1-based) for zero-point edge cases
      for (let i = 0; i < allStudentsScores.length; i++) {
        if (allStudentsScores[i].id === user.id) {
          rank = i + 1;
          break;
        }
      }
    }

    const statistics = {
      registeredActivities: registeredResult.count,
      attendedActivities: attendedResult.count,
      totalScore: currentStudentScore,
      recentScore: recentScoreResult?.points || 0,
      pendingActivities: pendingResult.count,
      notifications: notificationsResult.count,
      rank,
      totalStudents,
    };

    return successResponse({ statistics });
  } catch (error: any) {
    console.error('Student statistics error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể lấy thống kê học viên', { details: error?.message })
    );
  }
}
