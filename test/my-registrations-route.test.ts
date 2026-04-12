import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('GET /api/activities/my-registrations', () => {
  it('counts only active participants and categorizes cancelled separately', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 88, role: 'student' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          id: 1,
          activity_id: 101,
          attendance_status: 'registered',
          achievement_level: null,
          feedback: null,
          registered_at: '2026-04-10T08:00:00.000Z',
          title: 'Upcoming Activity',
          description: 'Desc',
          date_time: '2099-04-20T08:00:00.000Z',
          location: 'Hall A',
          activity_status: 'published',
          teacher_name: 'Teacher A',
          participant_count: 7,
          max_participants: 20,
        },
        {
          id: 2,
          activity_id: 102,
          attendance_status: 'registered',
          achievement_level: null,
          feedback: null,
          registered_at: '2026-04-10T08:00:00.000Z',
          title: 'Cancelled Activity',
          description: 'Desc',
          date_time: '2099-04-21T08:00:00.000Z',
          location: 'Hall B',
          activity_status: 'cancelled',
          teacher_name: 'Teacher B',
          participant_count: 4,
          max_participants: 20,
        },
      ],
    }));

    const route = await import('../src/app/api/activities/my-registrations/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.registrations.upcoming).toHaveLength(1);
    expect(body.registrations.cancelled).toHaveLength(1);
    expect(body.registrations.completed).toHaveLength(0);
    expect(body.registrations.upcoming[0].participant_count).toBe(7);
  });
});
