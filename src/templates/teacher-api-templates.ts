// Teacher API templates
// Lightweight scaffolds aligned with the current teacher-facing contracts.

/**
 * TEMPLATE: GET /api/teacher/classes/[id]/students
 * List students in a class the teacher is allowed to manage.
 */
export const GET_CLASS_STUDENTS = `
// GET /api/teacher/classes/[id]/students
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { dbAll, dbGet } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession()
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const classId = Number(params.id)
    if (!classId || Number.isNaN(classId)) {
      return NextResponse.json({ error: 'Invalid class id' }, { status: 400 })
    }

    const classInfo =
      user.role === 'admin'
        ? await dbGet('SELECT id, name FROM classes WHERE id = ?', [classId])
        : await dbGet(
            \`
            SELECT c.id, c.name
            FROM classes c
            LEFT JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = ?
            WHERE c.id = ?
              AND (c.teacher_id = ? OR ct.teacher_id IS NOT NULL)
            \`,
            [user.id, classId, user.id]
          )

    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 })
    }

    const students = await dbAll(
      \`
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id), 0) as total_points,
        (
          SELECT COUNT(*)
          FROM participations p
          WHERE p.student_id = u.id
            AND p.attendance_status = 'attended'
        ) as attended_count
      FROM users u
      WHERE u.class_id = ?
        AND u.role = 'student'
      ORDER BY u.name ASC
      \`,
      [classId]
    )

    return NextResponse.json({
      success: true,
      data: {
        class: classInfo,
        students,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: POST /api/teacher/attendance/bulk
 * Mark attendance in bulk for an activity a teacher can operate.
 */
export const BULK_ATTENDANCE = `
// POST /api/teacher/attendance/bulk
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { dbGet, dbRun } from '@/lib/database'
import { teacherCanAccessActivity } from '@/lib/activity-access'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { activity_id, student_ids } = await request.json()

    if (!activity_id || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { error: 'activity_id and a non-empty student_ids array are required' },
        { status: 400 }
      )
    }

    const activity = await dbGet('SELECT id FROM activities WHERE id = ?', [activity_id])
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activity_id)))
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let successCount = 0
    const errors: Array<{ student_id: number; error: string }> = []

    for (const studentId of student_ids) {
      try {
        const existing = await dbGet(
          'SELECT id FROM participations WHERE activity_id = ? AND student_id = ?',
          [activity_id, studentId]
        )

        if (existing) {
          await dbRun(
            "UPDATE participations SET attendance_status = 'attended', updated_at = datetime('now') WHERE id = ?",
            [existing.id]
          )
        } else {
          await dbRun(
            "INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, 'attended')",
            [activity_id, studentId]
          )
        }

        successCount++
      } catch (error: any) {
        errors.push({ student_id: Number(studentId), error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        success_count: successCount,
        failed_count: errors.length,
        errors,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: GET /api/teacher/dashboard-stats
 * Teacher dashboard statistics using the current contract.
 */
export const TEACHER_DASHBOARD_STATS = `
// GET /api/teacher/dashboard-stats
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { dbAll, dbGet } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const summary = await dbGet(
      \`
      SELECT
        COUNT(DISTINCT a.id) as total_activities,
        COUNT(DISTINCT CASE WHEN a.approval_status = 'requested' THEN a.id END) as pending_activities,
        COUNT(DISTINCT CASE WHEN a.status = 'published' THEN a.id END) as published_activities,
        COUNT(DISTINCT p.id) as total_participants,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as total_attended
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.teacher_id = ?
      \`,
      [user.id]
    )

    const participationByClass = await dbAll(
      \`
      SELECT
        c.name as class_name,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT p.student_id) as active_students
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
      LEFT JOIN participations p ON p.student_id = u.id
        AND p.activity_id IN (SELECT id FROM activities WHERE teacher_id = ?)
      WHERE c.id IN (
        SELECT DISTINCT class_id FROM class_teachers WHERE teacher_id = ?
        UNION
        SELECT DISTINCT id FROM classes WHERE teacher_id = ?
      )
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
      \`,
      [user.id, user.id, user.id]
    )

    const recentActivities = await dbAll(
      \`
      SELECT
        a.id,
        a.title,
        a.date_time,
        a.status,
        COUNT(DISTINCT p.id) as participant_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as attended_count
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.teacher_id = ?
      GROUP BY a.id, a.title, a.date_time, a.status
      ORDER BY a.date_time DESC
      LIMIT 5
      \`,
      [user.id]
    )

    return NextResponse.json({
      success: true,
      summary: summary || {
        total_activities: 0,
        pending_activities: 0,
        published_activities: 0,
        total_participants: 0,
        total_attended: 0,
      },
      participationByClass,
      recentActivities,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

// Backward-compatible alias for older imports.
export const TEACHER_DASHBOARD = TEACHER_DASHBOARD_STATS;

export default {
  GET_CLASS_STUDENTS,
  BULK_ATTENDANCE,
  TEACHER_DASHBOARD_STATS,
  TEACHER_DASHBOARD,
};
