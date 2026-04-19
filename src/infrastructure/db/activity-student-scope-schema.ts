import { dbAll, dbRun } from './db-core';

let ensureActivityStudentScopePromise: Promise<void> | null = null;

async function ensureActivityStudentScopeInternal(): Promise<void> {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS activity_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      participation_mode TEXT DEFAULT 'mandatory'
        CHECK(participation_mode IN ('mandatory', 'voluntary')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, student_id),
      FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  const indexes = (await dbAll(`PRAGMA index_list('activity_students')`)) as Array<{
    name?: string;
  }>;
  const indexNames = new Set((indexes || []).map((item) => String(item?.name || '')));

  if (!indexNames.has('idx_activity_students_activity')) {
    await dbRun(
      'CREATE INDEX IF NOT EXISTS idx_activity_students_activity ON activity_students(activity_id)'
    );
  }

  if (!indexNames.has('idx_activity_students_student')) {
    await dbRun(
      'CREATE INDEX IF NOT EXISTS idx_activity_students_student ON activity_students(student_id)'
    );
  }
}

export async function ensureActivityStudentScope(): Promise<void> {
  if (!ensureActivityStudentScopePromise) {
    ensureActivityStudentScopePromise = (async () => {
      try {
        await ensureActivityStudentScopeInternal();
      } finally {
        ensureActivityStudentScopePromise = null;
      }
    })();
  }

  await ensureActivityStudentScopePromise;
}
