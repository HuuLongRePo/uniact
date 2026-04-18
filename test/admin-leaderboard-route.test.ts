import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/admin/leaderboard', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical leaderboard payload with limit', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async (sql: string) => {
        if (sql.includes('u.id as user_id') && sql.includes('GROUP BY u.id')) {
          return [
            {
              user_id: 10,
              name: 'Student A',
              email: 'a@example.com',
              class_name: 'CTK42',
              activities_count: 4,
            },
          ];
        }
        if (sql.includes('WITH participation_totals AS')) {
          return [
            {
              student_id: 10,
              participation_points: 100,
              award_points: 15,
              adjustment_points: 5,
              final_total: 120,
            },
          ];
        }
        return [];
      },
    }));

    const route = await import('../src/app/api/admin/leaderboard/route');
    const response = await route.GET({ url: 'http://localhost/api/admin/leaderboard?limit=5' } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.limit).toBe(5);
    expect(body.data.leaderboard[0]).toMatchObject({
      rank: 1,
      user_id: 10,
      total_points: 120,
    });
  });
});
