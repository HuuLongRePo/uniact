import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/admin/reports/scores', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical score report stats for admin', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          student_id: 10,
          participation_points: 120,
          award_points: 20,
          adjustment_points: -5,
        },
        {
          student_id: 11,
          participation_points: 80,
          award_points: 0,
          adjustment_points: 10,
        },
      ],
    }));

    const route = await import('../src/app/api/admin/reports/scores/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.stats).toMatchObject({
      average: '112.5',
      median: 135,
      max: 135,
      min: 90,
    });
    expect(body.data.stats.distribution).toHaveLength(6);
  });

  it('preserves forbidden guard errors', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    const route = await import('../src/app/api/admin/reports/scores/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });
});
