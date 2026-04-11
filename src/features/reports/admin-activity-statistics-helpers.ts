export interface ActivityStatistics {
  id: number;
  title: string;
  date_time: string;
  location: string;
  organizer_name: string;
  activity_type: string;
  organization_level: string;
  max_participants: number;
  total_participants: number;
  attended_count: number;
  registered_only: number;
  excellent_count: number;
  good_count: number;
  avg_points_per_student: number;
  manual_attendance_count: number;
  qr_attendance_count: number;
  face_attendance_count: number;
}

export interface Statistics {
  total_activities: number;
  total_participants: number;
  total_attended: number;
  total_registered_only: number;
  total_manual_attendance: number;
  total_qr_attendance: number;
  total_face_attendance: number;
  avg_participants_per_activity: number;
  attendance_rate: number;
  face_adoption_rate: number;
}

export interface ActivityStatisticsInsights {
  top_not_participated_activities: Array<{
    id: number;
    title: string;
    registered_only: number;
    total_participants: number;
    attended_count: number;
  }>;
}

export const EMPTY_ACTIVITY_STATS: Statistics = {
  total_activities: 0,
  total_participants: 0,
  total_attended: 0,
  total_registered_only: 0,
  total_manual_attendance: 0,
  total_qr_attendance: 0,
  total_face_attendance: 0,
  avg_participants_per_activity: 0,
  attendance_rate: 0,
  face_adoption_rate: 0,
};

export const EMPTY_ACTIVITY_INSIGHTS: ActivityStatisticsInsights = {
  top_not_participated_activities: [],
};

export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeStatistics(payload: unknown): Statistics {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_ACTIVITY_STATS;
  }

  const record = payload as Partial<Statistics>;

  return {
    total_activities: toNumber(record.total_activities),
    total_participants: toNumber(record.total_participants),
    total_attended: toNumber(record.total_attended),
    total_registered_only: toNumber(record.total_registered_only),
    total_manual_attendance: toNumber(record.total_manual_attendance),
    total_qr_attendance: toNumber(record.total_qr_attendance),
    total_face_attendance: toNumber(record.total_face_attendance),
    avg_participants_per_activity: toNumber(record.avg_participants_per_activity),
    attendance_rate: toNumber(record.attendance_rate),
    face_adoption_rate: toNumber(record.face_adoption_rate),
  };
}

export function normalizeInsights(payload: unknown): ActivityStatisticsInsights {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_ACTIVITY_INSIGHTS;
  }

  const record = payload as {
    top_not_participated_activities?: Array<{
      id?: unknown;
      title?: unknown;
      registered_only?: unknown;
      total_participants?: unknown;
      attended_count?: unknown;
    }>;
  };

  const hotspots = Array.isArray(record.top_not_participated_activities)
    ? record.top_not_participated_activities.map((item) => ({
        id: toNumber(item.id),
        title: typeof item.title === 'string' ? item.title : 'Chưa đặt tên',
        registered_only: toNumber(item.registered_only),
        total_participants: toNumber(item.total_participants),
        attended_count: toNumber(item.attended_count),
      }))
    : [];

  return {
    top_not_participated_activities: hotspots,
  };
}

export function normalizeActivity(payload: unknown): ActivityStatistics | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  return {
    id: toNumber(record.id),
    title: typeof record.title === 'string' ? record.title : 'Chưa đặt tên',
    date_time: typeof record.date_time === 'string' ? record.date_time : '',
    location: typeof record.location === 'string' ? record.location : '',
    organizer_name: typeof record.organizer_name === 'string' ? record.organizer_name : '',
    activity_type: typeof record.activity_type === 'string' ? record.activity_type : '',
    organization_level:
      typeof record.organization_level === 'string' ? record.organization_level : '',
    max_participants: toNumber(record.max_participants),
    total_participants: toNumber(record.total_participants),
    attended_count: toNumber(record.attended_count),
    registered_only: toNumber(record.registered_only),
    excellent_count: toNumber(record.excellent_count),
    good_count: toNumber(record.good_count),
    avg_points_per_student: toNumber(record.avg_points_per_student),
    manual_attendance_count: toNumber(record.manual_attendance_count),
    qr_attendance_count: toNumber(record.qr_attendance_count),
    face_attendance_count: toNumber(record.face_attendance_count),
  };
}

export function buildActivityStatisticsUrl(startDate: string, endDate: string): string {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const query = params.toString();
  const path = `/api/admin/reports/activity-statistics${query ? `?${query}` : ''}`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}
