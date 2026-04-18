import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/student/statistics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical statistics payload for an authenticated student', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes("attendance_status IN ('registered', 'attended')")) {
        return { count: 6 };
      }
      if (sql.includes("attendance_status = 'attended'")) {
        return { count: 4 };
      }
      if (sql.includes('SELECT points')) {
        return { points: 12 };
      }
      if (sql.includes('datetime(a.date_time) > datetime')) {
        return { count: 2 };
      }
      if (sql.includes('FROM notifications')) {
        return { count: 3 };
      }
      return { count: 0 };
    });

    const mockDbAll = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT id FROM users WHERE role = 'student'")) {
        return [{ id: 10 }, { id: 11 }, { id: 12 }];
      }
      if (sql.includes('WITH participation_totals AS')) {
        return [
          { student_id: 10, participation_points: 45, award_points: 5, adjustment_points: 0, final_total: 50 },
          { student_id: 11, participation_points: 30, award_points: 10, adjustment_points: -5, final_total: 35 },
          { student_id: 12, participation_points: 10, award_points: 0, adjustment_points: 0, final_total: 10 },
        ];
      }
      return [];
    });

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 11, role: 'student' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
    }));

    vi.doMock('@/lib/calculations', () => ({
      calculateRank: () => 2,
    }));

    const route = await import('../src/app/api/student/statistics/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.statistics).toEqual({
      registeredActivities: 6,
      attendedActivities: 4,
      totalScore: 35,
      recentScore: 12,
      pendingActivities: 2,
      notifications: 3,
      rank: 2,
      totalStudents: 3,
    });
  });

  it('preserves forbidden/unauthorized errors from guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.unauthorized('Chưa đăng nhập');
      },
    }));

    const route = await import('../src/app/api/student/statistics/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Chưa đăng nhập');
  });
});
