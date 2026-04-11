import { dbAll, dbGet, dbReady, dbRun } from '@/lib/database'

async function columnExists(table: string, column: string): Promise<boolean> {
  const columns = await dbAll(`PRAGMA table_info(${table})`)
  return columns.some((col: any) => col.name === column)
}

async function ensureColumn(table: string, column: string, definition: string) {
  if (!(await columnExists(table, column))) {
    await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export async function ensureCoreTestSchema() {
  await dbReady()

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      class_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await ensureColumn('users', 'class_id', 'INTEGER')
  await ensureColumn('users', 'is_active', 'INTEGER DEFAULT 1')

  await dbRun(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await ensureColumn('classes', 'grade', 'TEXT')
  await ensureColumn('classes', 'teacher_id', 'INTEGER')
  await ensureColumn('classes', 'description', 'TEXT')

  await dbRun(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date_time DATETIME NOT NULL,
      location TEXT,
      max_participants INTEGER,
      activity_type_id INTEGER,
      organization_level TEXT,
      organization_level_id INTEGER,
      base_points REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      approval_status TEXT DEFAULT 'draft',
      teacher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await ensureColumn('activities', 'activity_type_id', 'INTEGER')
  await ensureColumn('activities', 'organization_level', 'TEXT')
  await ensureColumn('activities', 'organization_level_id', 'INTEGER')
  await ensureColumn('activities', 'base_points', 'REAL DEFAULT 0')
  await ensureColumn('activities', 'approval_status', "TEXT DEFAULT 'draft'")
  await ensureColumn('activities', 'status', "TEXT DEFAULT 'draft'")
  await ensureColumn('activities', 'teacher_id', 'INTEGER')
  await ensureColumn('activities', 'max_participants', 'INTEGER')

  const participationsTable = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='participations'")
  if (!participationsTable) {
    await dbRun(`
      CREATE TABLE participations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        attendance_status TEXT DEFAULT 'registered',
        achievement_level TEXT,
        feedback TEXT,
        time_slot_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, student_id)
      )
    `)
  }
  await ensureColumn('participations', 'attendance_status', "TEXT DEFAULT 'registered'")
  await ensureColumn('participations', 'achievement_level', 'TEXT')
  await ensureColumn('participations', 'feedback', 'TEXT')
  await ensureColumn('participations', 'time_slot_id', 'INTEGER')

  await dbRun(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_session_id INTEGER,
      activity_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      recorded_by INTEGER,
      method TEXT,
      note TEXT,
      status TEXT DEFAULT 'recorded',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await ensureColumn('attendance_records', 'qr_session_id', 'INTEGER')
  await ensureColumn('attendance_records', 'recorded_by', 'INTEGER')
  await ensureColumn('attendance_records', 'note', 'TEXT')
  await ensureColumn('attendance_records', 'status', "TEXT DEFAULT 'recorded'")

  await dbRun(`
    CREATE TABLE IF NOT EXISTS activity_time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      slot_date TEXT,
      slot_start TEXT,
      slot_end TEXT,
      max_concurrent INTEGER DEFAULT 1,
      current_registered INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await ensureColumn('activity_time_slots', 'current_registered', 'INTEGER DEFAULT 0')
  await ensureColumn('activity_time_slots', 'status', "TEXT DEFAULT 'active'")

  await dbRun(`
    CREATE TABLE IF NOT EXISTS security_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT,
      answer_hash TEXT,
      attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await ensureColumn('security_questions', 'question_type', 'TEXT')
  await ensureColumn('security_questions', 'attempts', 'INTEGER DEFAULT 0')
  await ensureColumn('security_questions', 'locked_until', 'DATETIME')

  await dbRun(`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credential_id TEXT NOT NULL,
      public_key TEXT,
      counter INTEGER DEFAULT 0,
      device_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS security_question_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER,
      success INTEGER DEFAULT 0,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS award_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      min_points REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS student_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      award_type_id INTEGER NOT NULL,
      awarded_by INTEGER,
      reason TEXT,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await ensureColumn('student_awards', 'awarded_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
}
