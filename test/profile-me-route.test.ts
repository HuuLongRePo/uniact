import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/profile/me', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses attendance_status for student stats and returns success', async () => {
    vi.doMock('@/lib/auth', () => ({
      getUserFromSession: async () => ({ id: 7, role: 'student' }),
    }));

    const dbGet = vi.fn(async (sql: string) => {
      if (sql.includes('FROM users u')) {
        return {
          id: 7,
          email: 'sv31a001@annd.edu.vn',
          name: 'Student A',
          role: 'student',
          class_name: 'CTK43',
        };
      }

      if (sql.includes('FROM participations p')) {
        expect(sql).toContain('p.attendance_status');
        expect(sql).not.toContain('p.status');
        return {
          total_activities: 2,
          attended_count: 1,
          total_points: 10,
          awards_count: 0,
        };
      }

      return null;
    });

    vi.doMock('@/lib/database', () => ({
      dbGet,
    }));

    const route = await import('../src/app/api/profile/me/route');
    const res: any = await route.GET({} as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.stats?.attended_count).toBe(1);
  });
});
