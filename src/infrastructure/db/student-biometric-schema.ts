import { dbAll, dbRun } from './db-core';

let ensureStudentBiometricSchemaPromise: Promise<void> | null = null;

async function ensureStudentBiometricSchemaInternal(): Promise<void> {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS student_biometric_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL UNIQUE,
      enrollment_status TEXT DEFAULT 'missing'
        CHECK(enrollment_status IN ('missing', 'captured', 'ready', 'failed')),
      training_status TEXT DEFAULT 'not_started'
        CHECK(training_status IN ('not_started', 'pending', 'trained', 'failed')),
      face_embedding_encrypted TEXT,
      face_embedding_iv TEXT,
      face_embedding_salt TEXT,
      training_version TEXT,
      last_trained_at DATETIME,
      sample_image_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  const indexes = (await dbAll(`PRAGMA index_list('student_biometric_profiles')`)) as Array<{
    name?: string;
  }>;
  const indexNames = new Set((indexes || []).map((item) => String(item?.name || '')));

  if (!indexNames.has('idx_student_biometric_profiles_training_status')) {
    await dbRun(
      'CREATE INDEX IF NOT EXISTS idx_student_biometric_profiles_training_status ON student_biometric_profiles(training_status)'
    );
  }
}

export async function ensureStudentBiometricSchema(): Promise<void> {
  if (!ensureStudentBiometricSchemaPromise) {
    ensureStudentBiometricSchemaPromise = (async () => {
      try {
        await ensureStudentBiometricSchemaInternal();
      } finally {
        ensureStudentBiometricSchemaPromise = null;
      }
    })();
  }

  await ensureStudentBiometricSchemaPromise;
}
