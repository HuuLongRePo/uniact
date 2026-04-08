/**
 * Migration 001: Add Attendance & QR Performance Indexes
 *
 * Purpose:
 * - Improve lookup speed for QR validation, anti-duplicate checks, and exports.
 * - Keep all indexes idempotent using IF NOT EXISTS.
 */

export async function up(db: any) {
  const run = db.run

  await run(`
    CREATE INDEX IF NOT EXISTS idx_qr_sessions_id_token_active
    ON qr_sessions(id, session_token, is_active)
  `)

  await run(`
    CREATE INDEX IF NOT EXISTS idx_qr_sessions_token_active
    ON qr_sessions(session_token, is_active)
  `)

  await run(`
    CREATE INDEX IF NOT EXISTS idx_attendance_session_student
    ON attendance_records(qr_session_id, student_id)
  `)

  await run(`
    CREATE INDEX IF NOT EXISTS idx_attendance_activity_student
    ON attendance_records(activity_id, student_id)
  `)

  await run(`
    CREATE INDEX IF NOT EXISTS idx_attendance_session_recorded
    ON attendance_records(qr_session_id, recorded_at DESC)
  `)

  await run(`
    CREATE INDEX IF NOT EXISTS idx_participations_activity_student
    ON participations(activity_id, student_id)
  `)
}

export async function down(db: any) {
  const run = db.run

  await run(`DROP INDEX IF EXISTS idx_qr_sessions_id_token_active`)
  await run(`DROP INDEX IF EXISTS idx_qr_sessions_token_active`)
  await run(`DROP INDEX IF EXISTS idx_attendance_session_student`)
  await run(`DROP INDEX IF EXISTS idx_attendance_activity_student`)
  await run(`DROP INDEX IF EXISTS idx_attendance_session_recorded`)
  await run(`DROP INDEX IF EXISTS idx_participations_activity_student`)
}
