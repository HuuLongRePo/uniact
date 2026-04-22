import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('biometric production policy', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.BIOMETRIC_FACE_MATCHING_ENGINE;
    delete process.env.BIOMETRIC_FACE_LIVENESS_ENGINE;
    delete process.env.BIOMETRIC_FACE_DISTANCE_THRESHOLD;
    delete process.env.BIOMETRIC_EMBEDDING_RETENTION_DAYS;
  });

  it('returns default production policy values', async () => {
    const { getBiometricProductionPolicy } = await import('../src/lib/biometrics/production-policy');
    expect(getBiometricProductionPolicy()).toMatchObject({
      face_matching_engine: 'cosine_distance_local_v1',
      face_liveness_engine: 'candidate_preview_signal_v1',
      face_distance_threshold: 0.18,
      embedding_encryption_scheme: 'aes-256-gcm-pbkdf2',
      embedding_retention_days: 365,
      retention_cleanup_enabled: true,
    });
  });

  it('normalizes out-of-range env policy values', async () => {
    process.env.BIOMETRIC_FACE_DISTANCE_THRESHOLD = '2';
    process.env.BIOMETRIC_EMBEDDING_RETENTION_DAYS = '7';

    const { getBiometricProductionPolicy } = await import('../src/lib/biometrics/production-policy');
    expect(getBiometricProductionPolicy()).toMatchObject({
      face_distance_threshold: 1,
      embedding_retention_days: 30,
    });
  });

  it('purges embeddings by retention window and returns cleanup stats', async () => {
    const dbRunMock = vi.fn(async () => ({ changes: 4 }));
    vi.doMock('@/lib/database', () => ({
      dbRun: dbRunMock,
    }));

    const { purgeExpiredBiometricEmbeddings } = await import('../src/lib/biometrics/production-policy');
    const result = await purgeExpiredBiometricEmbeddings();

    expect(dbRunMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE student_biometric_profiles'),
      ['-365 days']
    );
    expect(result).toMatchObject({
      purged_count: 4,
      retention_days: 365,
      retention_window: '-365 days',
    });
  });
});
