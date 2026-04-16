import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';

type ReportType = 'activities' | 'participants' | 'scores' | 'awards';

type CsvValue = string | number | null | undefined;
type CsvRow = Record<string, CsvValue>;
type QueryParams = Array<string | number>;

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  organiz_level?: string;
  organization_level?: string;
  activity_type?: string;
  role?: string;
}

interface ReportRequestBody {
  name?: string;
  type?: ReportType;
  columns?: string[];
  filters?: ReportFilters;
  format?: 'csv';
}

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  title: 'Tiêu đề',
  name: 'Họ tên',
  email: 'Email',
  class: 'Lớp',
  date_time: 'Ngày giờ',
  location: 'Địa điểm',
  status: 'Trạng thái',
  type: 'Loại',
  level: 'Cấp độ',
  organizer: 'Người tổ chức',
  participants: 'Người tham gia',
  created_at: 'Ngày tạo',
  activity: 'Hoạt động',
  checked_in: 'Điểm danh',
  rating: 'Đánh giá',
  points: 'Điểm',
  registered_at: 'Ngày đăng ký',
  total_points: 'Tổng điểm',
  activities_joined: 'Hoạt động tham gia',
  avg_rating: 'Đánh giá trung bình',
  rank: 'Xếp hạng',
  updated_at: 'Cập nhật lần cuối',
  recipient: 'Người nhận',
  reason: 'Lý do',
  awarded_by: 'Trao bởi',
  awarded_at: 'Ngày trao',
};

function appendDateFilters(
  filters: ReportFilters,
  column: string,
  queryParts: string[],
  params: QueryParams
) {
  if (filters.dateFrom) {
    queryParts.push(`AND DATE(${column}) >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    queryParts.push(`AND DATE(${column}) <= ?`);
    params.push(filters.dateTo);
  }
}

function escapeCsvValue(value: CsvValue): string {
  const normalized = value ?? '';
  return `"${String(normalized).replace(/"/g, '""')}"`;
}

function generateCsv(data: CsvRow[], columns: string[]): string {
  const headers = columns
    .map((column) => escapeCsvValue(COLUMN_LABELS[column] ?? column))
    .join(',');
  const rows = data.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','));

  return ['\uFEFF' + headers, ...rows].join('\n');
}

async function generateActivityReport(filters: ReportFilters): Promise<CsvRow[]> {
  const queryParts = [
    `
    SELECT
      a.id,
      a.title,
      a.date_time,
      a.location,
      a.status,
      a.created_at,
      at.name AS type,
      COALESCE(ol.name, a.organization_level) AS level,
      u.name AS organizer,
      COUNT(DISTINCT p.id) AS participants
    FROM activities a
    LEFT JOIN activity_types at ON a.activity_type_id = at.id
    LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
    LEFT JOIN users u ON a.teacher_id = u.id
    LEFT JOIN participations p ON p.activity_id = a.id
    WHERE 1=1
    `,
  ];
  const params: QueryParams = [];

  appendDateFilters(filters, 'a.date_time', queryParts, params);

  if (filters.status) {
    queryParts.push('AND a.status = ?');
    params.push(filters.status);
  }

  if (filters.activity_type) {
    queryParts.push('AND (a.activity_type_id = ? OR at.name = ?)');
    params.push(filters.activity_type, filters.activity_type);
  }

  const organizationLevel = filters.organization_level || filters.organiz_level;
  if (organizationLevel) {
    queryParts.push('AND (a.organization_level_id = ? OR ol.name = ? OR a.organization_level = ?)');
    params.push(organizationLevel, organizationLevel, organizationLevel);
  }

  queryParts.push('GROUP BY a.id ORDER BY a.date_time DESC');

  return (await dbAll(queryParts.join('\n'), params)) as CsvRow[];
}

async function generateParticipantsReport(filters: ReportFilters): Promise<CsvRow[]> {
  const queryParts = [
    `
    SELECT
      p.id,
      u.name,
      u.email,
      c.name AS class,
      a.title AS activity,
      p.attendance_status AS status,
      CASE WHEN p.attendance_status = 'attended' THEN 'Đã điểm danh' ELSE 'Chưa điểm danh' END AS checked_in,
      p.achievement_level AS rating,
      COALESCE(pc.total_points, 0) AS points,
      p.created_at AS registered_at
    FROM participations p
    JOIN users u ON p.student_id = u.id
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN activities a ON p.activity_id = a.id
    LEFT JOIN point_calculations pc ON p.id = pc.participation_id
    WHERE 1=1
    `,
  ];
  const params: QueryParams = [];

  appendDateFilters(filters, 'p.created_at', queryParts, params);

  if (filters.status) {
    queryParts.push('AND p.attendance_status = ?');
    params.push(filters.status);
  }

  if (filters.role) {
    queryParts.push('AND u.role = ?');
    params.push(filters.role);
  }

  queryParts.push('ORDER BY p.created_at DESC');

  return (await dbAll(queryParts.join('\n'), params)) as CsvRow[];
}

async function generateScoresReport(filters: ReportFilters): Promise<CsvRow[]> {
  const queryParts = [
    `
    SELECT
      u.id,
      u.name,
      c.name AS class,
      COALESCE(SUM(COALESCE(pc.total_points, 0)), 0) AS total_points,
      COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) AS activities_joined,
      COALESCE(
        AVG(
          CASE
            WHEN p.achievement_level = 'excellent' THEN 1.5
            WHEN p.achievement_level = 'good' THEN 1.2
            WHEN p.achievement_level = 'participated' THEN 1.0
            ELSE NULL
          END
        ),
        0
      ) AS avg_rating,
      MAX(COALESCE(pc.calculated_at, p.updated_at, p.created_at)) AS updated_at
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN participations p ON u.id = p.student_id AND p.attendance_status = 'attended'
    LEFT JOIN point_calculations pc ON p.id = pc.participation_id
    WHERE u.role = 'student'
    `,
  ];
  const params: QueryParams = [];

  const scoreDateColumn = 'COALESCE(pc.calculated_at, p.updated_at, p.created_at)';
  appendDateFilters(filters, scoreDateColumn, queryParts, params);

  queryParts.push(
    'GROUP BY u.id, u.name, c.name ORDER BY total_points DESC, activities_joined DESC'
  );

  const rows = (await dbAll(queryParts.join('\n'), params)) as CsvRow[];
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

async function generateAwardsReport(filters: ReportFilters): Promise<CsvRow[]> {
  if (filters.status && String(filters.status).toLowerCase() !== 'approved') {
    return [];
  }

  const queryParts = [
    `
    SELECT
      sa.id,
      u.name AS recipient,
      at.name AS type,
      sa.reason,
      admin.name AS awarded_by,
      sa.awarded_at,
      'approved' AS status
    FROM student_awards sa
    JOIN users u ON sa.student_id = u.id
    JOIN award_types at ON sa.award_type_id = at.id
    LEFT JOIN users admin ON sa.awarded_by = admin.id
    WHERE 1=1
    `,
  ];
  const params: QueryParams = [];

  appendDateFilters(filters, 'sa.awarded_at', queryParts, params);
  queryParts.push('ORDER BY sa.awarded_at DESC');

  return (await dbAll(queryParts.join('\n'), params)) as CsvRow[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const body = (await request.json()) as ReportRequestBody;
    const { name = 'bao-cao', type, columns = [], filters = {}, format = 'csv' } = body;

    if (!type || columns.length === 0) {
      return errorResponse(ApiError.validation('Loại báo cáo và danh sách cột là bắt buộc'));
    }

    if (format !== 'csv') {
      return errorResponse(ApiError.validation('Hiện tại chỉ hỗ trợ xuất CSV'));
    }

    let data: CsvRow[] = [];

    switch (type) {
      case 'activities':
        data = await generateActivityReport(filters);
        break;
      case 'participants':
        data = await generateParticipantsReport(filters);
        break;
      case 'scores':
        data = await generateScoresReport(filters);
        break;
      case 'awards':
        data = await generateAwardsReport(filters);
        break;
      default:
        return errorResponse(ApiError.validation('Loại báo cáo không hợp lệ'));
    }

    const filename = `${String(name || 'bao-cao').trim() || 'bao-cao'}.csv`;
    const csvContent = generateCsv(data, columns);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Generate custom report error:', error);
    return errorResponse(
      ApiError.internalError(
        error instanceof Error ? error.message : 'Không thể tạo báo cáo tùy chỉnh'
      )
    );
  }
}
