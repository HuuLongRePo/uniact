import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all, users, activities, classes, awards
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query.trim()) {
      return NextResponse.json({ error: 'Thiếu từ khóa tìm kiếm' }, { status: 400 });
    }

    const searchPattern = `%${query.trim()}%`;
    const results: any = {
      query,
      total: 0,
      users: [],
      activities: [],
      classes: [],
      awards: [],
    };

    // Search users
    if (type === 'all' || type === 'users') {
      const userWhere = ['(name LIKE ? OR email LIKE ?)'];
      const userBindings: unknown[] = [searchPattern, searchPattern];

      if (role) {
        userWhere.push('role = ?');
        userBindings.push(role);
      }

      const users = await dbAll(
        `SELECT id, name, email, role, created_at
         FROM users
         WHERE ${userWhere.join(' AND ')}
         ORDER BY name
         LIMIT ? OFFSET ?`,
        [...userBindings, limit, offset]
      );
      results.users = users || [];
      results.total += results.users.length;
    }

    // Search activities
    if (type === 'all' || type === 'activities') {
      const activityWhere = ['(a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ?)'];
      const activityBindings: unknown[] = [searchPattern, searchPattern, searchPattern];

      if (status) {
        activityWhere.push('a.status = ?');
        activityBindings.push(status);
      }
      if (dateFrom) {
        activityWhere.push('date(a.date) >= date(?)');
        activityBindings.push(dateFrom);
      }
      if (dateTo) {
        activityWhere.push('date(a.date) <= date(?)');
        activityBindings.push(dateTo);
      }

      const activities = await dbAll(
        `SELECT 
          a.id,
          a.title,
          a.description,
          a.location,
          a.date,
          a.status,
          at.name as activity_type,
          ol.name as org_level,
          u.name as creator_name
         FROM activities a
         LEFT JOIN activity_types at ON a.type_id = at.id
         LEFT JOIN organization_levels ol ON a.org_level_id = ol.id
         LEFT JOIN users u ON a.created_by = u.id
         WHERE ${activityWhere.join(' AND ')}
         ORDER BY a.date DESC
         LIMIT ? OFFSET ?`,
        [...activityBindings, limit, offset]
      );
      results.activities = activities || [];
      results.total += results.activities.length;
    }

    // Search classes
    if (type === 'all' || type === 'classes') {
      const classes = await dbAll(
        `SELECT 
          c.id,
          c.name,
          '',
          '',
          u.name as teacher_name,
          (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as member_count
         FROM classes c
         LEFT JOIN users u ON c.teacher_id = u.id
         WHERE c.name LIKE ? OR '' LIKE ?
         ORDER BY c.name
         LIMIT ? OFFSET ?`,
        [searchPattern, searchPattern, limit, offset]
      );
      results.classes = classes || [];
      results.total += results.classes.length;
    }

    // Search awards
    if (type === 'all' || type === 'awards') {
      const awards = await dbAll(
        `SELECT 
          sa.id,
          at.name as type,
          sa.reason,
          sa.awarded_at,
          u.name as recipient_name,
          u.email as recipient_email,
          awarder.name as awarded_by_name
         FROM student_awards sa
         LEFT JOIN award_types at ON sa.award_type_id = at.id
         LEFT JOIN users u ON sa.student_id = u.id
         LEFT JOIN users awarder ON sa.awarded_by = awarder.id
         WHERE at.name LIKE ? OR sa.reason LIKE ? OR u.name LIKE ?
         ORDER BY sa.awarded_at DESC
         LIMIT ? OFFSET ?`,
        [searchPattern, searchPattern, searchPattern, limit, offset]
      );
      results.awards = awards || [];
      results.total += results.awards.length;
    }

    // If searching across all, limit each category
    if (type === 'all') {
      results.users = results.users.slice(0, 10);
      results.activities = results.activities.slice(0, 10);
      results.classes = results.classes.slice(0, 10);
      results.awards = results.awards.slice(0, 10);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
