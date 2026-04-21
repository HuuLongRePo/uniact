import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet } from '@/lib/database';

// GET /api/profile/me - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Get full user details
    const userDetails = await dbGet(
      `SELECT 
        u.id, u.email, u.name, u.role, u.avatar_url,
        u.class_id, u.created_at,
        c.id as class_id, c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = ?`,
      [user.id]
    );

    if (!userDetails) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Get additional stats based on role
    let stats = {};

    if (user.role === 'student') {
      const studentStats = await dbGet(
        `SELECT 
          COUNT(DISTINCT p.id) as total_activities,
          COUNT(DISTINCT CASE WHEN p.status = 'attended' THEN p.id END) as attended_count,
          COALESCE(SUM(pc.total_points), 0) as total_points,
          (SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = ?) as awards_count
        FROM participations p
        LEFT JOIN point_calculations pc ON p.id = pc.participation_id
        WHERE p.student_id = ?`,
        [user.id, user.id]
      );
      stats = studentStats || {};
    } else if (user.role === 'teacher') {
      const teacherStats = await dbGet(
        `SELECT 
          COUNT(DISTINCT a.id) as total_activities_organized,
          COUNT(DISTINCT ct.class_id) as total_classes,
          COUNT(DISTINCT p.id) as total_participants
        FROM activities a
        LEFT JOIN class_teachers ct ON ct.teacher_id = ?
        LEFT JOIN participations p ON a.id = p.activity_id
        WHERE a.organizer_id = ?`,
        [user.id, user.id]
      );
      stats = teacherStats || {};
    }

    // Ẩn citizen_id nếu user là student (chỉ admin/teacher mới thấy)
    const responseData: any = { ...userDetails, stats };
    if (user.role === 'student') {
      delete responseData.citizen_id;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
