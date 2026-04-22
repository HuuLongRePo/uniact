const DEFAULT_FACE_MATCHING_ENGINE = 'cosine_distance_local_v1';
const DEFAULT_FACE_LIVENESS_ENGINE = 'candidate_preview_signal_v1';
const DEFAULT_FACE_DISTANCE_THRESHOLD = 0.18;
const DEFAULT_EMBEDDING_RETENTION_DAYS = 365;
const MIN_EMBEDDING_RETENTION_DAYS = 30;
const MAX_EMBEDDING_RETENTION_DAYS = 1825;

function normalizeRetentionDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EMBEDDING_RETENTION_DAYS;
  const rounded = Math.round(parsed);
  return Math.min(MAX_EMBEDDING_RETENTION_DAYS, Math.max(MIN_EMBEDDING_RETENTION_DAYS, rounded));
}

function normalizeDistanceThreshold(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FACE_DISTANCE_THRESHOLD;
  return Math.min(1, Math.max(0, parsed));
}

export type BiometricProductionPolicy = {
  face_matching_engine: string;
  face_liveness_engine: string;
  face_distance_threshold: number;
  embedding_encryption_scheme: string;
  embedding_retention_days: number;
  retention_cleanup_enabled: boolean;
};

export function getBiometricProductionPolicy(): BiometricProductionPolicy {
  return {
    face_matching_engine: String(
      process.env.BIOMETRIC_FACE_MATCHING_ENGINE || DEFAULT_FACE_MATCHING_ENGINE
    ),
    face_liveness_engine: String(
      process.env.BIOMETRIC_FACE_LIVENESS_ENGINE || DEFAULT_FACE_LIVENESS_ENGINE
    ),
    face_distance_threshold: normalizeDistanceThreshold(
      process.env.BIOMETRIC_FACE_DISTANCE_THRESHOLD
    ),
    embedding_encryption_scheme: 'aes-256-gcm-pbkdf2',
    embedding_retention_days: normalizeRetentionDays(process.env.BIOMETRIC_EMBEDDING_RETENTION_DAYS),
    retention_cleanup_enabled: true,
  };
}

export async function purgeExpiredBiometricEmbeddings() {
  const { dbRun } = await import('@/lib/database');
  const policy = getBiometricProductionPolicy();
  const retentionWindow = `-${policy.embedding_retention_days} days`;

  const result = await dbRun(
    `UPDATE student_biometric_profiles
     SET face_embedding_encrypted = NULL,
         face_embedding_iv = NULL,
         face_embedding_salt = NULL,
         training_status = CASE
           WHEN training_status = 'trained' THEN 'pending'
           ELSE training_status
         END,
         enrollment_status = CASE
           WHEN enrollment_status = 'ready' THEN 'captured'
           ELSE enrollment_status
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE face_embedding_encrypted IS NOT NULL
       AND datetime(COALESCE(last_trained_at, updated_at, created_at))
         < datetime('now', ?)` ,
    [retentionWindow]
  );

  return {
    purged_count: Number(result?.changes || 0),
    retention_days: policy.embedding_retention_days,
    retention_window: retentionWindow,
  };
}
