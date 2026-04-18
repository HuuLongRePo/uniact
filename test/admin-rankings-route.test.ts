import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/admin/rankings', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical rankings payload with pagination and filters', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ total: 1 }),
      dbAll: async (sql: string) => {
        if (sql.includes('FROM student_base sb')) {
          return [
            {
              student_id: 10,
              student_name: 'Student A',
              student_email: 'a@example.com',
              class_id: 2,
              class_name: 'CTK42',
              activity_points: 110,
              activity_count: 5,
              award_count: 1,
            },
          ];
        }
        if (sql.includes('WITH participation_totals AS')) {
          return [
            {
              student_id: 10,
              participation_points: 110,
              award_points: 10,
              adjustment_points: 0,
              final_total: 120,
            },
          ];
        }
        return [];
      },
    }));

    const route = await import('../src/app/api/admin/rankings/route');
    const response = await route.GET({
      url: 'http://localhost/api/admin/rankings?page=1&limit=10&sort_by=total_points',
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.rankings[0]).toMatchObject({
      rank: 1,
      student_id: 10,
      total_points: 120,
      activity_count: 5,
      award_count: 1,
    });
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 10, total: 1, pages: 1 });
    expect(body.data.filters).toMatchObject({ sort_by: 'total_points' });
  });
});
