import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbGet } from '@/lib/database';
import { calculateRank } from '@/lib/calculations';

/**
 * GET /api/student/statistics
 * Get comprehensive statistics for the logged-in student
 * Returns: activity counts, scores, rank, notifications
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can access this endpoint' },
        { status: 403 }
      );
    }

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

    // Tổng điểm từ bảng student_scores
    let scoreResult: { total: number } = { total: 0 };
    try {
      scoreResult = (await dbGet(
        `SELECT COALESCE(SUM(points), 0) as total 
         FROM student_scores 
         WHERE student_id = ?`,
        [user.id]
      )) as { total: number };
    } catch {}

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

    // Xếp hạng theo tổng điểm (từ student_scores)
    let allStudentsScores: Array<{ id: number; total_points: number }>;
    try {
      allStudentsScores = (await dbAll(
        `SELECT 
          u.id,
          COALESCE(SUM(ss.points), 0) as total_points
         FROM users u
         LEFT JOIN student_scores ss ON u.id = ss.student_id
         WHERE u.role = 'student'
         GROUP BY u.id
         ORDER BY total_points DESC`
      )) as Array<{ id: number; total_points: number }>;
    } catch {
      allStudentsScores = [];
    }

    const currentStudentScore = scoreResult.total;
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

    return NextResponse.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('Student statistics error:', error);
    return NextResponse.json({ error: 'Failed to fetch student statistics' }, { status: 500 });
  }
}
