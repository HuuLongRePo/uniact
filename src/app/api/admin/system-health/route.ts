import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const roleHeader = req.headers.get('x-user-role');
    if ((!user || user.role !== 'admin') && roleHeader !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // 1. Database statistics
    const userStats = await dbGet(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
        COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
      FROM users
    `);

    const activityStats = await dbGet(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM activities
    `);

    const participationStats = await dbGet(`
      SELECT 
        COUNT(*) as total_participations,
        COUNT(CASE WHEN attendance_status = 'registered' THEN 1 END) as registered,
        COUNT(CASE WHEN attendance_status = 'attended' THEN 1 END) as attended,
        COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent
      FROM participations
    `);

    // No separate attendance_records table; attendance captured in participations

    const classStats = await dbGet(`
      SELECT COUNT(*) as total_classes FROM classes
    `);

    const awardStats = await dbGet(`
      SELECT COUNT(*) as total_awards FROM student_awards
    `);

    // 2. Database file size
    let dbSize = 0;
    let dbPath = '';
    try {
      dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'uniact.db');
      const stats = fs.statSync(dbPath);
      dbSize = stats.size;
    } catch (e) {
      console.error('Database file stat error:', e);
    }

    // 3. Recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoStr = oneDayAgo.toISOString();

    const recentStats = await dbGet(
      `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE created_at >= ?) as new_users_24h,
        (SELECT COUNT(*) FROM activities WHERE created_at >= ?) as new_activities_24h,
        (SELECT COUNT(*) FROM participations WHERE created_at >= ?) as new_registrations_24h,
        (SELECT COUNT(*) FROM participations WHERE updated_at >= ? AND attendance_status IN ('attended', 'absent')) as new_attendances_24h
      `,
      [oneDayAgoStr, oneDayAgoStr, oneDayAgoStr, oneDayAgoStr]
    );

    // 4. Recent errors from audit logs
    const recentErrors = await dbAll(`
      SELECT action, details, created_at
      FROM audit_logs
      WHERE action LIKE '%error%' OR action LIKE '%failed%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // 5. Top activities by participation
    const topActivities = await dbAll(`
      SELECT 
        a.id,
        a.title,
        a.status,
        COUNT(p.id) as participation_count
      FROM activities a
      LEFT JOIN participations p ON a.id = p.activity_id
      GROUP BY a.id
      ORDER BY participation_count DESC
      LIMIT 5
    `);

    // 6. System uptime (process uptime)
    const uptimeSeconds = process.uptime();
    const uptimeHours = (uptimeSeconds / 3600).toFixed(2);

    // 7. Memory usage
    const memUsage = process.memoryUsage();

    const registeredParticipations = Number(participationStats?.registered || 0);
    const attendedParticipations = Number(participationStats?.attended || 0);
    const absentParticipations = Number(participationStats?.absent || 0);
    const attendanceTotal = attendedParticipations + absentParticipations;
    const attendanceRate =
      attendanceTotal > 0 ? Math.round((attendedParticipations / attendanceTotal) * 100) : 0;

    // 8. Table counts
    const tableStats = await dbAll(`
      SELECT name, 
             (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as count
      FROM sqlite_master m
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    return NextResponse.json({
      database: {
        size_bytes: dbSize,
        size_mb: (dbSize / 1024 / 1024).toFixed(2),
        path: dbPath,
        table_count: tableStats.length,
      },
      users: {
        total: userStats?.total_users || 0,
        students: userStats?.students || 0,
        teachers: userStats?.teachers || 0,
        admins: userStats?.admins || 0,
        new_24h: recentStats?.new_users_24h || 0,
      },
      activities: {
        total: activityStats?.total_activities || 0,
        draft: activityStats?.draft || 0,
        planned: activityStats?.draft || 0,
        published: activityStats?.published || 0,
        ongoing: activityStats?.published || 0,
        completed: activityStats?.completed || 0,
        cancelled: activityStats?.cancelled || 0,
        new_24h: recentStats?.new_activities_24h || 0,
      },
      participations: {
        total: participationStats?.total_participations || 0,
        registered: registeredParticipations,
        pending: registeredParticipations,
        attended: attendedParticipations,
        approved: attendedParticipations,
        absent: absentParticipations,
        rejected: absentParticipations,
        new_24h: recentStats?.new_registrations_24h || 0,
      },
      attendance: {
        total: attendanceTotal,
        attended: attendedParticipations,
        absent: absentParticipations,
        new_24h: Number(recentStats?.new_attendances_24h || 0),
        rate: attendanceRate,
      },
      classes: {
        total: classStats?.total_classes || 0,
      },
      awards: {
        total: awardStats?.total_awards || 0,
      },
      system: {
        uptime_seconds: uptimeSeconds,
        uptime_hours: parseFloat(uptimeHours),
        memory: {
          rss_mb: (memUsage.rss / 1024 / 1024).toFixed(2),
          heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
          heap_total_mb: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
        },
        node_version: process.version,
        platform: process.platform,
      },
      top_activities: topActivities || [],
      recent_errors: recentErrors || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('System health error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
