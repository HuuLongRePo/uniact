export interface ClassOption {
  id: number;
  name: string;
}

export type AttendanceDisplayStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'not_participated';

export type AttendanceMethod = 'manual' | 'qr' | 'face' | 'unknown';

export interface AttendanceRecord {
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  activity_name: string;
  activity_date: string;
  status: AttendanceDisplayStatus;
  method: AttendanceMethod;
  check_in_time?: string;
  notes?: string;
}

export interface AttendanceSummary {
  class_id: number;
  class_name: string;
  total_students: number;
  total_activities: number;
  total_attendance: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  not_participated_count: number;
  present_rate: number;
  absent_rate: number;
  late_rate: number;
}

export interface StudentAttendanceSummary {
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  total_activities: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  not_participated_count: number;
  attendance_rate: number;
}

export function getClassesFromResponse(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { classes?: ClassOption[] };
    classes?: ClassOption[];
  };

  if (Array.isArray(normalized.data?.classes)) {
    return normalized.data.classes;
  }

  if (Array.isArray(normalized.classes)) {
    return normalized.classes;
  }

  return [];
}

export function getSummaryFromResponse<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { summary?: T[] };
    summary?: T[];
  };

  if (Array.isArray(normalized.data?.summary)) {
    return normalized.data.summary;
  }

  if (Array.isArray(normalized.summary)) {
    return normalized.summary;
  }

  return [];
}

export function normalizeMethod(value: unknown): AttendanceMethod {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'manual' || normalized === 'qr' || normalized === 'face') {
    return normalized;
  }
  return 'unknown';
}

export function getRecordsFromResponse(payload: unknown): AttendanceRecord[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { records?: AttendanceRecord[] };
    records?: AttendanceRecord[];
  };

  const rows = Array.isArray(normalized.data?.records)
    ? normalized.data.records
    : Array.isArray(normalized.records)
      ? normalized.records
      : [];

  return rows.map((record) => ({
    ...record,
    method: normalizeMethod(record.method),
  }));
}

export function buildOverallStats(records: AttendanceRecord[]) {
  return {
    totalRecords: records.length,
    present: records.filter((record) => record.status === 'present').length,
    absent: records.filter((record) => record.status === 'absent').length,
    late: records.filter((record) => record.status === 'late').length,
    excused: records.filter((record) => record.status === 'excused').length,
    notParticipated: records.filter((record) => record.status === 'not_participated').length,
    qr: records.filter((record) => record.method === 'qr').length,
    manual: records.filter((record) => record.method === 'manual').length,
    face: records.filter((record) => record.method === 'face').length,
  };
}
