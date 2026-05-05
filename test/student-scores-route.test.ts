import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/student/scores', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical score payload for authenticated student', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 9, role: 'student' }),
    }));

    vi.doMock('@/lib/cache', () => ({
      CACHE_TTL: { SCOREBOARD: 60 },
      cache: {
        get: async (_key: string, _ttl: number, callback: () => Promise<any>) => callback(),
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          participation_id: 1,
          base_points: 10,
          type_multiplier: 1,
          level_multiplier: 1,
          achievement_multiplier: 1.2,
          subtotal: 12,
          bonus_points: 1,
          penalty_points: 0,
          total_points: 13,
          formula: '(10 x 1 x 1 x 1.2) + 1 - 0 = 13',
          calculated_at: '2026-04-18T01:00:00.000Z',
          achievement_level: 'good',
          evaluated_at: '2026-04-18T00:50:00.000Z',
          activity_title: 'Hoat dong A',
          activity_type_name: 'Ky nang',
          organization_level_name: 'Cap truong',
          award_type: null,
        },
      ],
    }));

    vi.doMock('@/lib/score-ledger', () => ({
      getFinalScoreLedgerByStudentIds: async () =>
        new Map([
          [
            9,
            {
              student_id: 9,
              participation_points: 13,
              award_points: 4,
              adjustment_points: -1,
              final_total: 16,
            },
          ],
        ]),
    }));

    const route = await import('../src/app/api/student/scores/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.summary).toMatchObject({
      total_activities: 1,
      total_points: 16,
      final_total: 16,
      activity_points: 13,
      award_points: 4,
      adjustment_points: -1,
      average_points: 13,
      good_count: 1,
    });
    expect(body.data.scores[0]).toMatchObject({
      participation_id: 1,
      total_points: 13,
      score: 13,
      created_at: '2026-04-18T00:50:00.000Z',
      activity_title: 'Hoat dong A',
    });
  });

  it('preserves unauthorized errors from guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.unauthorized('Chua dang nhap');
      },
    }));

    const route = await import('../src/app/api/student/scores/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Chua dang nhap');
  });
});
