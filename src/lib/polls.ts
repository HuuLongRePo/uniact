import { dbAll, dbRun } from '@/lib/database';

let ensurePollSchemaPromise: Promise<void> | null = null;

async function ensureColumn(tableName: string, columnName: string, alterSql: string) {
  const columns = (await dbAll(`PRAGMA table_info(${tableName})`)) as Array<{
    name?: string;
  }>;

  const hasColumn = columns.some((column) => String(column?.name || '') === columnName);
  if (!hasColumn) {
    await dbRun(alterSql);
  }
}

async function ensurePollSchemaInternal() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      class_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      allow_multiple INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS poll_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      response_text TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS poll_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      default_duration_minutes INTEGER NOT NULL DEFAULT 60,
      allow_multiple_answers INTEGER NOT NULL DEFAULT 0,
      show_results_before_closing INTEGER NOT NULL DEFAULT 1,
      allow_anonymous_responses INTEGER NOT NULL DEFAULT 0,
      default_visibility TEXT NOT NULL DEFAULT 'class',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS poll_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      poll_type TEXT NOT NULL DEFAULT 'single_choice',
      description TEXT,
      default_options TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await ensureColumn(
    'poll_responses',
    'response_text',
    `ALTER TABLE poll_responses ADD COLUMN response_text TEXT`
  );

  await dbRun(
    `CREATE INDEX IF NOT EXISTS idx_polls_creator_created_at ON polls(created_by, created_at DESC)`
  );
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_polls_class_status ON polls(class_id, status)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id)`);
  await dbRun(
    `CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_user ON poll_responses(poll_id, user_id)`
  );
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_poll_responses_created_at ON poll_responses(created_at)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_poll_templates_creator ON poll_templates(created_by)`);
}

export async function ensurePollSchema() {
  if (!ensurePollSchemaPromise) {
    ensurePollSchemaPromise = ensurePollSchemaInternal().catch((error) => {
      ensurePollSchemaPromise = null;
      throw error;
    });
  }

  await ensurePollSchemaPromise;
}

export function parsePollId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseTemplateOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((option) => String(option || '').trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((option) => String(option || '').trim()).filter(Boolean);
      }
    } catch {}
  }

  return [];
}

export function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
