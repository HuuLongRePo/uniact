import { dbGet, dbAll } from '@/lib/database';

export interface RegistrationPolicyResult {
  ok: boolean;
  error?: string;
  conflicts?: { id: number; title: string; date_time: string; location: string }[];
  can_override?: boolean;
}

async function getMaxPerWeek(): Promise<number> {
  const row = (await dbGet('SELECT config_value FROM system_config WHERE config_key = ?', [
    'max_activities_per_week',
  ])) as { config_value?: string } | undefined;
  const val = row?.config_value ? parseInt(row.config_value, 10) : 3;
  return isNaN(val) ? 3 : val;
}

export async function checkWeeklyLimit(
  studentId: number
): Promise<{ count: number; limit: number }> {
  const limit = await getMaxPerWeek();
  // Count registrations in current ISO week
  const rows = (await dbAll(
    `
    SELECT COUNT(*) as count FROM participations p
    JOIN activities a ON p.activity_id = a.id
    WHERE p.student_id = ?
      AND p.attendance_status = 'registered'
      AND strftime('%Y-%W', a.date_time) = strftime('%Y-%W', 'now')
  `,
    [studentId]
  )) as any[];
  const count = rows[0]?.count || 0;
  return { count, limit };
}

export async function detectSameStartTimeConflicts(
  studentId: number,
  activityId: number,
  dateTime: string
) {
  const conflicts = await dbAll(
    `
    SELECT a.id, a.title, a.date_time, a.location
    FROM participations p
    JOIN activities a ON p.activity_id = a.id
    WHERE p.student_id = ?
      AND p.attendance_status = 'registered'
      AND datetime(a.date_time) = datetime(?)
      AND a.id != ?
    ORDER BY a.date_time
  `,
    [studentId, dateTime, activityId]
  );
  return conflicts;
}

// Legacy alias kept to avoid breaking older imports while moving the rule
// from "same day" to the confirmed "same start time" business contract.
export async function detectSameDayConflicts(
  studentId: number,
  activityId: number,
  dateTime: string
) {
  return detectSameStartTimeConflicts(studentId, activityId, dateTime);
}

export async function evaluateRegistrationPolicies(opts: {
  studentId: number;
  activity: any;
  force?: boolean;
  activityId: number;
}): Promise<RegistrationPolicyResult> {
  // Weekly limit check
  const { count, limit } = await checkWeeklyLimit(opts.studentId);
  if (count >= limit) {
    return { ok: false, error: `Bạn đã đạt giới hạn đăng ký ${limit} hoạt động trong tuần này` };
  }
  // Conflict detection follows the confirmed business rule:
  // only flag registrations with the same activity start time.
  const conflicts = await detectSameStartTimeConflicts(
    opts.studentId,
    opts.activityId,
    opts.activity.date_time
  );
  if (conflicts.length > 0 && !opts.force) {
    return {
      ok: false,
      error: 'conflict_detected',
      conflicts: conflicts.map((c) => ({
        id: c.id,
        title: c.title,
        date_time: c.date_time,
        location: c.location,
      })),
      can_override: true,
    };
  }
  return { ok: true };
}
