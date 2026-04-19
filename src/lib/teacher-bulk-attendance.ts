import { dbGet, dbRun } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';

export type BulkAttendanceActor = {
  id: number;
};

export async function markStudentAttendanceAndScore(params: {
  activityId: number;
  studentId: number;
  actor: BulkAttendanceActor;
  notes?: string | null;
}) {
  let participation = (await dbGet(
    `SELECT id, attendance_status FROM participations 
     WHERE activity_id = ? AND student_id = ?`,
    [params.activityId, params.studentId]
  )) as any;

  let attendanceMutation: 'created' | 'updated' | 'unchanged' = 'unchanged';

  if (!participation) {
    const result = await dbRun(
      `INSERT INTO participations (activity_id, student_id, attendance_status)
       VALUES (?, ?, 'attended')`,
      [params.activityId, params.studentId]
    );
    participation = { id: result.lastID, attendance_status: 'attended' };
    attendanceMutation = 'created';
  } else if (participation.attendance_status !== 'attended') {
    await dbRun(
      `UPDATE participations 
       SET attendance_status = 'attended', updated_at = datetime('now')
       WHERE id = ?`,
      [participation.id]
    );
    attendanceMutation = 'updated';
  }

  const existingRecord = (await dbGet(
    'SELECT id FROM attendance_records WHERE activity_id = ? AND student_id = ? LIMIT 1',
    [params.activityId, params.studentId]
  )) as any;

  let attendanceRecordMutation: 'created' | 'unchanged' = 'unchanged';

  if (!existingRecord) {
    await dbRun(
      `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note)
       VALUES (NULL, ?, ?, ?, 'bulk', ?)`,
      [params.activityId, params.studentId, params.actor.id, params.notes || null]
    );
    attendanceRecordMutation = 'created';
  }

  const calculation = await PointCalculationService.autoCalculateAfterEvaluation(participation.id);

  return {
    student_id: params.studentId,
    participation_id: participation.id,
    points: calculation.totalPoints,
    attendance_mutation: attendanceMutation,
    attendance_record_mutation: attendanceRecordMutation,
  };
}
