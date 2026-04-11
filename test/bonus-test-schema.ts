import { dbAll, dbGet, dbRun } from '@/lib/db-core'

async function columnExists(table: string, column: string): Promise<boolean> {
  const columns = await dbAll(`PRAGMA table_info(${table})`)
  return columns.some((col) => col.name === column)
}

export async function ensureBonusTestSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      avatar_url TEXT,
      class_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  if (!(await columnExists('classes', 'grade'))) {
    await dbRun('ALTER TABLE classes ADD COLUMN grade TEXT')
  }

  if (!(await columnExists('classes', 'teacher_id'))) {
    await dbRun('ALTER TABLE classes ADD COLUMN teacher_id INTEGER')
  }

  if (!(await columnExists('classes', 'description'))) {
    await dbRun('ALTER TABLE classes ADD COLUMN description TEXT')
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      action TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const tableCheck = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='suggested_bonus_points'")
  if (!tableCheck) {
    await dbRun(`
      CREATE TABLE suggested_bonus_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        source_type TEXT,
        source_id INTEGER,
        points REAL,
        reason TEXT,
        status TEXT,
        author_id INTEGER,
        approver_id INTEGER,
        evidence_url TEXT,
        apply_to TEXT DEFAULT 'hoc_tap',
        source_provenance TEXT DEFAULT 'manual',
        term TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `)
  }
}
