import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { toVietnamDateStamp } from '@/lib/timezone';

interface ParticipationReportRow {
  id: number;
  title: string;
  date_time: string;
  location: string;
  participant_count: number;
  attended_count: number;
}

type QueryBinding = string | number;

function toCsvValue(value: string | number | null | undefined): string {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return `"${normalized}"`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const params = request.nextUrl.searchParams;
    const start = params.get('start');
    const end = params.get('end');
    const classId = params.get('class_id');
    const activityTypeId = params.get('activity_type_id');
    const exportAsCsv = params.get('export') === 'csv';

    const conditions: string[] = [];
    const bindings: QueryBinding[] = [];

    if (start) {
      conditions.push('a.date_time >= ?');
      bindings.push(start);
    }

    if (end) {
      conditions.push('a.date_time <= ?');
      bindings.push(`${end} 23:59:59`);
    }

    if (classId) {
      conditions.push(
        `(
          NOT EXISTS (SELECT 1 FROM activity_classes ac2 WHERE ac2.activity_id = a.id)
          OR EXISTS (
            SELECT 1
            FROM activity_classes ac
            WHERE ac.activity_id = a.id AND ac.class_id = ?
          )
        )`
      );
      bindings.push(classId);
    }

    if (activityTypeId) {
      conditions.push('a.activity_type_id = ?');
      bindings.push(activityTypeId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = (await dbAll(
      `
      SELECT
        a.id,
        a.title,
        a.date_time,
        a.location,
        COALESCE(COUNT(p.id), 0) AS participant_count,
        COALESCE(SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END), 0) AS attended_count
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.date_time DESC
      LIMIT 500
      `,
      bindings
    )) as ParticipationReportRow[];

    if (exportAsCsv) {
      const headers = ['ID', 'Tiêu đề', 'Ngày', 'Địa điểm', 'Số đăng ký', 'Số đã điểm danh'];

      const csv = ['\uFEFF' + headers.join(',')]
        .concat(
          rows.map((row) =>
            [
              row.id,
              row.title,
              row.date_time,
              row.location,
              row.participant_count,
              row.attended_count,
            ]
              .map(toCsvValue)
              .join(',')
          )
        )
        .join('\n');

      const filename = `participation-report-${toVietnamDateStamp(new Date())}.csv`;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=${filename}`,
        },
      });
    }

    return successResponse({ activities: rows });
  } catch (error: unknown) {
    console.error('Participation report error:', error);
    return errorResponse(
      ApiError.internalError('Không thể tải báo cáo tham gia', {
        details: error instanceof Error ? error.message : String(error),
      })
    );
  }
}
