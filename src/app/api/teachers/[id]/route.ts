import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbAll } from '@/lib/database';

// GET /api/teachers/[id] - Get teacher details with assignments
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teacherId = parseInt(id);
    if (!teacherId || isNaN(teacherId)) {
      return NextResponse.json({ error: 'Invalid teacher ID' }, { status: 400 });
    }

    // Get teacher info
    const teacher = await dbGet(
      `SELECT 
        id, email, name, role, avatar_url, created_at
      FROM users 
      WHERE id = ? AND role = 'teacher'`,
      [teacherId]
    );

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Get classes assigned to teacher
    const classes = await dbAll(
      `SELECT 
        c.id, c.name, c.grade, 
        COUNT(DISTINCT u.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.id = u.class_id AND u.role = 'student'
      WHERE c.teacher_id = ?
      GROUP BY c.id`,
      [teacherId]
    );

    // Get activities organized by teacher
    const activities = await dbAll(
      `SELECT 
        a.id, a.title, a.status,
        COUNT(DISTINCT p.id) as participant_count
      FROM activities a
      LEFT JOIN participations p ON a.id = p.activity_id
      WHERE a.teacher_id = ?
      GROUP BY a.id`,
      [teacherId]
    );

    // Get statistics
    const totalClasses = await dbGet(`SELECT COUNT(*) as count FROM classes WHERE teacher_id = ?`, [
      teacherId,
    ]);

    const totalStudents = await dbGet(
      `SELECT COUNT(DISTINCT u.id) as count 
       FROM users u 
       JOIN classes c ON u.class_id = c.id 
       WHERE c.teacher_id = ?`,
      [teacherId]
    );

    const totalActivities = await dbGet(
      `SELECT COUNT(*) as count FROM activities WHERE teacher_id = ?`,
      [teacherId]
    );

    const stats = {
      total_classes: totalClasses?.count || 0,
      total_students: totalStudents?.count || 0,
      total_activities: totalActivities?.count || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        teacher,
        classes: classes || [],
        activities: activities || [],
        stats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching teacher details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
