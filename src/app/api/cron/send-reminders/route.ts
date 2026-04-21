import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { notificationService, ReminderNotification } from '@/lib/notifications';

type UpcomingReminderActivity = {
  id: number;
  title: string;
  date_time: string;
  location: string;
  student_ids: string | null;
};

// GET /api/cron/send-reminders - Send activity reminders
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
    }

    console.warn('📢 Starting activity reminder cron job...');

    // Find activities starting in 24 hours
    const upcomingActivities = (await dbAll(`
      SELECT 
        a.id,
        a.title,
        a.date_time,
        a.location,
        GROUP_CONCAT(p.student_id) as student_ids
      FROM activities a
      JOIN participations p ON a.id = p.activity_id
      WHERE a.status = 'published'
        AND p.attendance_status = 'registered'
        AND a.date_time BETWEEN datetime('now', '+23 hours') AND datetime('now', '+25 hours')
      GROUP BY a.id
    `)) as UpcomingReminderActivity[];

    console.warn(`  Found ${upcomingActivities.length} activities with reminders to send`);

    let totalSent = 0;

    for (const activity of upcomingActivities) {
      if (!activity.student_ids) {
        continue;
      }

      const studentIds = activity.student_ids.split(',').map((id: string) => parseInt(id));

      try {
        await notificationService.sendBulk(
          studentIds,
          new ReminderNotification(),
          {
            activity_id: activity.id,
            activity_title: activity.title,
            date_time: activity.date_time,
            location: activity.location,
            hours_until: 24,
          },
          ['database']
        );

        totalSent += studentIds.length;
        console.warn(`  ✅ Sent ${studentIds.length} reminders for "${activity.title}"`);
      } catch (error) {
        console.error(`  ❌ Failed to send reminders for activity ${activity.id}:`, error);
      }
    }

    console.warn(`📢 Reminder job completed: ${totalSent} notifications sent`);

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} reminders for ${upcomingActivities.length} activities`,
      stats: {
        activities_processed: upcomingActivities.length,
        total_notifications: totalSent,
      },
    });
  } catch (error: unknown) {
    console.error('Send reminders cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
