import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/student/history', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical history payload for authenticated student', async () => {
    const mockDbAll = vi.fn(async (sql: string) => {
      if (sql.includes('COUNT(*) as total_participations')) {
        return [
          {
            total_participations: 1,
            registered_count: 0,
            attended_count: 1,
            absent_count: 0,
            excellent_count: 0,
            good_count: 1,
            participated_count: 0,
            total_points_earned: 13,
          },
        ];
      }

      if (sql.includes('FROM participations p')) {
        return [
          {
            id: 1,
            participation_id: 1,
            attendance_status: 'attended',
            achievement_level: 'good',
            feedback: 'Ổn',
            evaluated_at: '2026-04-18T01:00:00.000Z',
            created_at: '2026-04-17T01:00:00.000Z',
            registered_at: '2026-04-17T01:00:00.000Z',
            activity_id: 9,
            title: 'Hoạt động A',
            description: 'Mô tả',
            date_time: '2026-04-17T08:00:00.000Z',
            end_time: null,
            location: 'Hội trường A',
            max_participants: 100,
            activity_type: 'Kỹ năng',
            organization_level: 'Cấp trường',
            organizer_name: 'Teacher A',
            base_points: 10,
            type_multiplier: 1,
            level_multiplier: 1,
            achievement_multiplier: 1.2,
            subtotal: 12,
            bonus_points: 1,
            penalty_points: 0,
            total_points: 13,
            points_earned: 13,
            attended: 1,
            status: 'attended',
            evaluated_by_name: 'Teacher A',
          },
        ];
      }

      return [];
    });

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'student' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: mockDbAll,
    }));

    const route = await import('../src/app/api/student/history/route');
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.history[0]).toMatchObject({
      participation_id: 1,
      title: 'Hoạt động A',
      total_points: 13,
    });
    expect(body.data.summary).toMatchObject({
      total_participations: 1,
      attended_count: 1,
      total_points_earned: 13,
    });
  });

  it('preserves unauthorized guard errors instead of failing open', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.unauthorized('Chưa đăng nhập');
      },
    }));

    const route = await import('../src/app/api/student/history/route');
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } } as any);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Chưa đăng nhập');
  });
});
