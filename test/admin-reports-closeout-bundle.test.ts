import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin reports closeout bundle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('admin scores preserves forbidden guard errors', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/admin/scores/route');
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('admin leaderboard returns canonical payload with clamped limit', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async (_sql: string, params?: unknown[]) => [
        {
          rank: 1,
          user_id: 7,
          name: 'Student A',
          email: 'a@example.com',
          class_name: 'CTK42',
          total_points: 50,
          activities_count: 3,
          observed_limit: params?.[0],
        },
      ],
    }));

    const route = await import('../src/app/api/admin/leaderboard/route');
    const response = await route.GET({ url: 'http://localhost/api/admin/leaderboard?limit=999' } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.limit).toBe(100);
    expect(body.data.leaderboard[0]).toMatchObject({
      user_id: 7,
      total_points: 50,
    });
  });

  it('admin rankings returns canonical filters and pagination payload', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ total: 1 }),
      dbAll: async () => [
        {
          student_id: 9,
          student_name: 'Student B',
          student_email: 'b@example.com',
          class_id: 2,
          class_name: 'CTK43',
          activity_points: 40,
          activity_count: 2,
          award_count: 1,
          award_points: 5,
        },
      ],
    }));

    const route = await import('../src/app/api/admin/rankings/route');
    const response = await route.GET({
      url: 'http://localhost/api/admin/rankings?page=1&limit=10&sort_by=award_count',
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.rankings[0]).toMatchObject({
      student_id: 9,
      total_points: 45,
      award_count: 1,
    });
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 10, total: 1, pages: 1 });
    expect(body.data.filters).toMatchObject({ sort_by: 'award_count' });
  });
});
