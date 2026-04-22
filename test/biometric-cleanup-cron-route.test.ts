import { beforeEach, describe, expect, it, vi } from 'vitest';

const purgeExpiredBiometricEmbeddingsMock = vi.fn();

vi.mock('@/lib/biometrics/production-policy', () => ({
  purgeExpiredBiometricEmbeddings: purgeExpiredBiometricEmbeddingsMock,
}));

describe('GET /api/cron/cleanup-biometric', () => {
  beforeEach(() => {
    vi.resetModules();
    purgeExpiredBiometricEmbeddingsMock.mockReset();
    purgeExpiredBiometricEmbeddingsMock.mockResolvedValue({
      purged_count: 3,
      retention_days: 365,
      retention_window: '-365 days',
    });
    process.env.CRON_SECRET = 'test-secret';
  });

  it('returns 401 when cron secret is missing or invalid', async () => {
    const route = await import('../src/app/api/cron/cleanup-biometric/route');
    const response = await route.GET(new Request('http://localhost/api/cron/cleanup-biometric'));

    expect(response.status).toBe(401);
    expect(purgeExpiredBiometricEmbeddingsMock).not.toHaveBeenCalled();
  });

  it('purges expired embeddings when cron secret is valid', async () => {
    const route = await import('../src/app/api/cron/cleanup-biometric/route');
    const response = await route.GET(
      new Request('http://localhost/api/cron/cleanup-biometric', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(purgeExpiredBiometricEmbeddingsMock).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.stats).toMatchObject({
      purged_count: 3,
      retention_days: 365,
    });
  });
});
