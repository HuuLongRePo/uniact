/**
 * API Route: Background Job - Generate Alerts
 * POST /api/jobs/generate-alerts
 *
 * Admin-only endpoint to generate alerts for students with low scores
 * Checks against warning thresholds (green/yellow/orange/red)
 * Should be run daily after calculate-scores job
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { PointCalculationService } from '@/lib/scoring';

export async function POST(request: NextRequest) {
  try {
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can trigger this job
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Chỉ admin mới có thể chạy job này',
        },
        { status: 403 }
      );
    }

    console.warn(`🔔 [Job] Generate Alerts started by admin ${user.id}`);
    const startTime = Date.now();

    // Get warning thresholds from system_config
    const greenThreshold = await getConfigValue('warning_green_min', 80);
    const yellowThreshold = await getConfigValue('warning_yellow_min', 60);
    const orangeThreshold = await getConfigValue('warning_orange_min', 40);

    console.warn(
      `📊 Thresholds: Green≥${greenThreshold}, Yellow≥${yellowThreshold}, Orange≥${orangeThreshold}`
    );

    // Get all students
    const students = (await dbAll('SELECT id, name, email FROM users WHERE role = "student"')) as {
      id: number;
      name: string;
      email: string;
    }[];

    const pointService = new PointCalculationService();
    let alertsCreated = 0;
    const alertsByLevel: Record<string, number> = {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
    };

    // Calculate scores and generate alerts
    for (const student of students) {
      try {
        // TODO: Re-implement calculateStudentScore or get from database
        // const score = await pointService.calculateStudentScore(student.id)
        const scoreResult = (await dbGet(
          'SELECT COALESCE(SUM(points), 0) as total FROM student_scores WHERE student_id = ?',
          [student.id]
        )) as any;
        const score = scoreResult?.total || 0;

        let level: 'info' | 'warning' | 'error' = 'info';
        let message = '';
        let alertLevel = '';

        if (score >= greenThreshold) {
          // Green - Excellent, no alert needed (optional: could send congratulation)
          alertLevel = 'green';
          continue; // Skip green level alerts to reduce noise
        } else if (score >= yellowThreshold) {
          // Yellow - Warning
          level = 'warning';
          alertLevel = 'yellow';
          message = `Cảnh báo VÀNG: Điểm của bạn là ${score}. Cần cải thiện để đạt mức Xanh (≥${greenThreshold} điểm).`;
        } else if (score >= orangeThreshold) {
          // Orange - Strong warning
          level = 'warning';
          alertLevel = 'orange';
          message = `Cảnh báo CAM: Điểm của bạn là ${score}. Cần tham gia thêm hoạt động để đạt mức Vàng (≥${yellowThreshold} điểm).`;
        } else {
          // Red - Critical alert
          level = 'error';
          alertLevel = 'red';
          message = `Cảnh báo ĐỎ: Điểm của bạn chỉ còn ${score}. Cần tham gia ngay các hoạt động để cải thiện điểm.`;
        }

        // Create alert in alerts table
        await dbRun(
          `
          INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at)
          VALUES (?, ?, 'users', ?, 0, datetime('now'))
        `,
          [level, message, student.id]
        );

        // Also create notification if notifications table exists
        try {
          await dbRun(
            `
            INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
            VALUES (?, 'score_alert', ?, ?, 'users', ?, 0, datetime('now'))
          `,
            [student.id, `Cảnh báo ${alertLevel.toUpperCase()}`, message, student.id]
          );
        } catch {
          // Notifications table might not exist, that's okay
        }

        alertsCreated++;
        alertsByLevel[alertLevel] = (alertsByLevel[alertLevel] || 0) + 1;
      } catch (error: any) {
        console.error(`  ✗ Error processing student ${student.id}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;

    console.warn(`✅ [Job] Generate Alerts completed in ${duration}ms`);
    console.warn(`   Created ${alertsCreated} alerts:`, alertsByLevel);

    return NextResponse.json({
      success: true,
      message: `Đã tạo ${alertsCreated} cảnh báo`,
      stats: {
        total_students: students.length,
        alerts_created: alertsCreated,
        by_level: alertsByLevel,
        thresholds: {
          green: greenThreshold,
          yellow: yellowThreshold,
          orange: orangeThreshold,
        },
        duration_ms: duration,
      },
    });
  } catch (error: any) {
    console.error('Generate alerts job error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi khi chạy job',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get config value
 */
async function getConfigValue(key: string, defaultValue: number): Promise<number> {
  try {
    const config = (await dbGet('SELECT config_value FROM system_config WHERE config_key = ?', [
      key,
    ])) as any;

    return config ? parseInt(config.config_value) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * GET endpoint to check job status/info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current thresholds
    const greenThreshold = await getConfigValue('warning_green_min', 80);
    const yellowThreshold = await getConfigValue('warning_yellow_min', 60);
    const orangeThreshold = await getConfigValue('warning_orange_min', 40);

    return NextResponse.json({
      job_name: 'generate_alerts',
      description: 'Tạo cảnh báo cho học viên có điểm dưới ngưỡng',
      thresholds: {
        green: `≥${greenThreshold} (Xuất sắc - Không cảnh báo)`,
        yellow: `≥${yellowThreshold} (Khá - Cảnh báo Vàng)`,
        orange: `≥${orangeThreshold} (Trung bình - Cảnh báo Cam)`,
        red: `<${orangeThreshold} (Yếu - Cảnh báo Đỏ)`,
      },
      recommended_schedule: 'Daily at 00:30 (after calculate-scores)',
      trigger_url: '/api/jobs/generate-alerts',
      method: 'POST',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Lỗi server',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
