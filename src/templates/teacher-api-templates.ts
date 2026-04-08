// Template API Giáo viên
// Scaffold nhanh cho tính năng giáo viên

/**
 * TEMPLATE: GET /api/teacher/classes/[id]/students
 * Lấy danh sách học viên trong lớp của giáo viên
 */
export const GET_CLASS_STUDENTS = `
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { dbAll, dbGet } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const classId = parseInt(params.id)

    // Xác minh giáo viên sở hữu lớp này
    const classInfo = await dbGet(
      'SELECT * FROM classes WHERE id = ? AND teacher_id = ?',
      [classId, user.id]
    )
    if (!classInfo) {
      return NextResponse.json({ error: 'Không tìm thấy lớp hoặc bạn không có quyền truy cập' }, { status: 404 })
    }

    const students = await dbAll(\`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        COUNT(DISTINCT p.activity_id) as total_activities,
        SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as attended_count,
        COALESCE(SUM(pc.total_points), 0) as total_points
      FROM users u
      LEFT JOIN participations p ON u.id = p.student_id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE u.class_id = ? AND u.role = 'student'
      GROUP BY u.id
      ORDER BY u.name
    \`, [classId])

    return NextResponse.json({
      success: true,
      data: {
        class: classInfo,
        students
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: POST /api/teacher/activities/[id]/attendance/bulk
 * Điểm danh hàng loạt
 */
export const BULK_ATTENDANCE = `
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const activityId = parseInt(params.id)
    const { attendances } = await request.json()
    // attendances: [{ student_id, status: 'present' | 'absent' | 'late' | 'excused' }]

    // Xác minh giáo viên sở hữu hoạt động này
    const activity = await dbGet(
      'SELECT * FROM activities WHERE id = ? AND teacher_id = ?',
      [activityId, user.id]
    )
    if (!activity) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động' }, { status: 404 })
    }

    let successCount = 0
    const errors: any[] = []

    for (const att of attendances) {
      try {
        // Cập nhật hoặc tạo mới bản ghi tham gia
        const existing = await dbGet(
          'SELECT id FROM participations WHERE activity_id = ? AND student_id = ?',
          [activityId, att.student_id]
        )

        if (existing) {
          await dbRun(
            'UPDATE participations SET attendance_status = ? WHERE id = ?',
            [att.status, existing.id]
          )
        } else {
          await dbRun(
            'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
            [activityId, att.student_id, att.status]
          )
        }

        successCount++
      } catch (error: any) {
        errors.push({ student_id: att.student_id, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: \`Updated \${successCount} attendance records\`,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: GET /api/teacher/dashboard
 * Teacher dashboard stats
 */
export const TEACHER_DASHBOARD = `
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // My classes
    const classes = await dbAll(
      'SELECT * FROM classes WHERE teacher_id = ?',
      [user.id]
    )

    // My activities
    const activities = await dbAll(\`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM activities
      WHERE teacher_id = ?
    \`, [user.id])

    // Students under my management
    const students = await dbAll(\`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN classes c ON u.class_id = c.id
      WHERE c.teacher_id = ? AND u.role = 'student'
    \`, [user.id])

    // Pending evaluations
    const pendingEvals = await dbAll(\`
      SELECT COUNT(*) as count
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      WHERE a.teacher_id = ?
      AND p.attendance_status = 'attended'
      AND p.achievement_level IS NULL
    \`, [user.id])

    return NextResponse.json({
      success: true,
      data: {
        classes: classes.length,
        students: students[0].total,
        activities: activities[0],
        pending_evaluations: pendingEvals[0].count
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

export default {
  GET_CLASS_STUDENTS,
  BULK_ATTENDANCE,
  TEACHER_DASHBOARD,
};
