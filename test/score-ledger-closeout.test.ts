import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('score ledger closeout surfaces', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('admin rankings sorts by final total including adjustments', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ total: 2 }),
      dbAll: async (sql: string) => {
        if (sql.includes('FROM student_base sb')) {
          return [
            {
              student_id: 10,
              student_name: 'Student A',
              student_email: 'a@example.com',
              class_id: 2,
              class_name: 'CTK42',
              activity_points: 100,
              activity_count: 5,
              award_count: 0,
            },
            {
              student_id: 11,
              student_name: 'Student B',
              student_email: 'b@example.com',
              class_id: 2,
              class_name: 'CTK42',
              activity_points: 90,
              activity_count: 5,
              award_count: 1,
            },
          ];
        }
        if (sql.includes('WITH participation_totals AS')) {
          return [
            { student_id: 10, participation_points: 100, award_points: 0, adjustment_points: 0, final_total: 100 },
            { student_id: 11, participation_points: 90, award_points: 5, adjustment_points: 10, final_total: 105 },
          ];
        }
        return [];
      },
    }));

    const route = await import('../src/app/api/admin/rankings/route');
    const response = await route.GET({
      url: 'http://localhost/api/admin/rankings?page=1&limit=10&sort_by=total_points',
    } as any);
    const body = await response.json();

    expect(body.data.rankings[0]).toMatchObject({ student_id: 11, total_points: 105, rank: 1 });
    expect(body.data.rankings[1]).toMatchObject({ student_id: 10, total_points: 100, rank: 2 });
  });

  it('student points breakdown summary includes total adjustment points in final total semantics', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 11, role: 'student' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async (sql: string) => {
        if (sql.includes('FROM participations p') && sql.includes('ORDER BY a.date_time DESC')) {
          return [];
        }
        if (sql.includes('GROUP BY at.id')) {
          return [];
        }
        if (sql.includes('GROUP BY ol.id')) {
          return [];
        }
        if (sql.includes('GROUP BY p.achievement_level')) {
          return [];
        }
        if (sql.includes('FROM student_awards sa')) {
          return [{ id: 1, award_type: 'Khen thưởng', bonus_points: 3, reason: 'Top', approved_at: '2099-01-01', activity_title: null, approved_by_name: 'Admin' }];
        }
        if (sql.includes('COUNT(DISTINCT p.id) as total_activities')) {
          return [{ total_base_points: 10, total_after_multipliers: 12, total_bonus: 1, total_penalty: 0, grand_total: 13, total_activities: 1 }];
        }
        if (sql.includes('WITH participation_totals AS')) {
          return [{ student_id: 11, participation_points: 13, award_points: 3, adjustment_points: -2, final_total: 14 }];
        }
        return [];
      },
    }));

    const route = await import('../src/app/api/student/points-breakdown/route');
    const response = await route.GET(new Request('http://localhost/api/student/points-breakdown') as any);
    const body = await response.json();

    expect(body.data.summary).toMatchObject({
      total_award_points: 3,
      total_adjustment_points: -2,
      final_total: 14,
    });
  });
});
