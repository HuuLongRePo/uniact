import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('teacher dashboard routes preserve canonical guard errors', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function mockForbiddenGuard() {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/teacher-dashboard-data', () => ({
      getTeacherDashboardSnapshot: async () => ({
        summary: {
          total_activities: 0,
          pending_requested: 0,
          approved_activities: 0,
          this_week_activities: 0,
          total_participants: 0,
          total_attended: 0,
          published_activities: 0,
        },
        classes: [],
        activities: [],
        activitiesByMonth: [],
        activitiesByType: [],
        topStudents: [],
        recentAttendance: [],
        unreadNotifications: 0,
      }),
    }));
  }

  it('preserves forbidden errors in legacy compatibility dashboard route', async () => {
    await mockForbiddenGuard();

    const route = await import('../src/app/api/teacher/dashboard/route');
    const res: any = await route.GET({} as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Không có quyền truy cập');
  });

  it('preserves forbidden errors in dashboard stats route', async () => {
    await mockForbiddenGuard();

    const route = await import('../src/app/api/teacher/dashboard-stats/route');
    const res: any = await route.GET({} as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Không có quyền truy cập');
  });
});
