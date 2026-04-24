import { dbAll } from '@/lib/database';

export const DEFAULT_ACTIVITY_DURATION_MINUTES = 120;
export const CLASS_SCHEDULE_BLOCK_STATUSES = ['published'] as const;

export type ClassScheduleConflict = {
  activity_id: number;
  title: string;
  teacher_name: string | null;
  date_time: string;
  end_time: string | null;
  location: string | null;
  class_id: number;
  class_name: string;
  overlap_minutes: number;
};

type ScopedClassSource = {
  class_ids?: unknown;
  mandatory_class_ids?: unknown;
  voluntary_class_ids?: unknown;
  applies_to_all_students?: unknown;
};

export type ActivityTimeWindow = {
  start_time: string;
  end_time: string;
  duration_minutes: number;
};

type ClassScheduleConflictParams = {
  classIds: number[];
  dateTime: string;
  endTime?: unknown;
  durationMinutes?: unknown;
  excludeActivityId?: number;
};

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeIdList(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(values.map((value) => toPositiveInt(value)).filter((value): value is number => !!value))
  );
}

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function resolveActivityTimeWindow(params: {
  dateTime: unknown;
  endTime?: unknown;
  durationMinutes?: unknown;
}): ActivityTimeWindow | null {
  const startTime = parseDateInput(params.dateTime);
  if (!startTime) return null;

  const parsedDuration = Number(params.durationMinutes);
  const fallbackDuration =
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? Math.round(parsedDuration)
      : DEFAULT_ACTIVITY_DURATION_MINUTES;

  const endCandidate = parseDateInput(params.endTime);
  const hasValidEndCandidate =
    !!endCandidate && endCandidate.getTime() > startTime.getTime();

  const endTime = hasValidEndCandidate
    ? (endCandidate as Date)
    : new Date(startTime.getTime() + fallbackDuration * 60_000);
  const durationMinutes = Math.max(
    1,
    Math.round((endTime.getTime() - startTime.getTime()) / 60_000)
  );

  return {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_minutes: durationMinutes,
  };
}

export function extractScopedClassIds(source: ScopedClassSource): number[] {
  if (source.applies_to_all_students === true) {
    return [];
  }

  return Array.from(
    new Set([
      ...normalizeIdList(source.class_ids),
      ...normalizeIdList(source.mandatory_class_ids),
      ...normalizeIdList(source.voluntary_class_ids),
    ])
  );
}

export async function findClassScheduleConflicts({
  classIds,
  dateTime,
  endTime,
  durationMinutes,
  excludeActivityId,
}: ClassScheduleConflictParams): Promise<{
  conflicts: ClassScheduleConflict[];
  window: ActivityTimeWindow | null;
}> {
  const normalizedClassIds = Array.from(new Set(classIds.map((id) => Number(id)).filter(Number.isFinite)));
  const timeWindow = resolveActivityTimeWindow({ dateTime, endTime, durationMinutes });

  if (normalizedClassIds.length === 0 || !timeWindow) {
    return { conflicts: [], window: timeWindow };
  }

  const placeholders = normalizedClassIds.map(() => '?').join(', ');
  const rawConflicts = (await dbAll(
    `
      SELECT
        a.id as activity_id,
        a.title,
        a.date_time,
        a.end_time,
        a.location,
        u.name as teacher_name,
        ac.class_id as class_id,
        c.name as class_name,
        CAST(
          (
            MIN(julianday(COALESCE(a.end_time, datetime(a.date_time, '+120 minutes'))), julianday(?))
            - MAX(julianday(a.date_time), julianday(?))
          ) * 24 * 60
          AS INTEGER
        ) as overlap_minutes
      FROM activities a
      INNER JOIN activity_classes ac ON ac.activity_id = a.id
      INNER JOIN classes c ON c.id = ac.class_id
      LEFT JOIN users u ON u.id = a.teacher_id
      WHERE ac.class_id IN (${placeholders})
        AND a.status IN (${CLASS_SCHEDULE_BLOCK_STATUSES.map((status) => `'${status}'`).join(', ')})
        AND a.id != ?
        AND datetime(a.date_time) < datetime(?)
        AND datetime(COALESCE(a.end_time, datetime(a.date_time, '+120 minutes'))) > datetime(?)
      ORDER BY c.name ASC, a.date_time ASC, a.id ASC
    `,
    [
      timeWindow.end_time,
      timeWindow.start_time,
      ...normalizedClassIds,
      excludeActivityId || -1,
      timeWindow.end_time,
      timeWindow.start_time,
    ]
  )) as Array<Record<string, unknown>>;

  const conflicts = rawConflicts
    .map((row) => ({
      activity_id: Number(row.activity_id),
      title: String(row.title || ''),
      teacher_name: row.teacher_name ? String(row.teacher_name) : null,
      date_time: String(row.date_time || ''),
      end_time: row.end_time ? String(row.end_time) : null,
      location: row.location ? String(row.location) : null,
      class_id: Number(row.class_id),
      class_name: String(row.class_name || ''),
      overlap_minutes: Math.max(1, Number(row.overlap_minutes || 0)),
    }))
    .filter((item) => Number.isFinite(item.activity_id) && Number.isFinite(item.class_id));

  return { conflicts, window: timeWindow };
}
