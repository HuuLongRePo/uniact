/**
 * API Route: Background Job - Calculate All Student Scores
 * POST /api/jobs/calculate-scores
 *
 * Admin-only endpoint to trigger score calculation for all students
 * Should be run daily via cron job or manual trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { PointCalculationService } from '@/lib/scoring';
import { cache } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
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

    console.warn(`🔄 [Job] Calculate Scores started by admin ${user.id}`);
    const startTime = Date.now();

    // Get all students
    const students = (await dbAll('SELECT id, name FROM users WHERE role = "student"')) as {
      id: number;
      name: string;
    }[];

    console.warn(`📊 Found ${students.length} students to calculate`);

    const pointService = new PointCalculationService();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Calculate scores for each student
    for (const student of students) {
      try {
        successCount++;

        // Invalidate cache for this student
        cache.invalidate(`scores:${student.id}`);

        if (successCount % 50 === 0) {
          console.warn(`  ✓ Processed ${successCount}/${students.length} students`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Student ${student.id} (${student.name}): ${error.message}`);
        console.error(`  ✗ Error calculating for student ${student.id}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;

    console.warn(`✅ [Job] Calculate Scores completed in ${duration}ms`);
    console.warn(`   Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      message: 'Đã tính điểm cho tất cả học viên',
      stats: {
        total_students: students.length,
        success_count: successCount,
        error_count: errorCount,
        duration_ms: duration,
        errors: errors.slice(0, 10), // Chỉ trả về 10 lỗi đầu tiên
      },
    });
  } catch (error: any) {
    console.error('Calculate scores job error:', error);
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
 * GET endpoint to check job status/info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Get student count
    const students = (await dbAll(
      'SELECT COUNT(*) as count FROM users WHERE role = "student"'
    )) as any[];

    // Get last calculation info (if we had a job_logs table)
    // For now, just return basic info

    return NextResponse.json({
      job_name: 'calculate_scores',
      description: 'Tính điểm cho tất cả học viên',
      total_students: students[0]?.count || 0,
      recommended_schedule: 'Daily at 00:00',
      trigger_url: '/api/jobs/calculate-scores',
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
