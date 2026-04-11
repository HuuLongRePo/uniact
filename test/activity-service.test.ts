import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockDbGet: vi.fn(),
  mockDbAll: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  dbGet: mocks.mockDbGet,
  dbAll: mocks.mockDbAll,
}));

import { evaluateRegistrationPolicies } from '../src/lib/activity-service';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockDbGet.mockResolvedValue({ config_value: '5' });
});

describe('activity-service registration policy', () => {
  it('allows another activity on the same day when start time is different', async () => {
    mocks.mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes("strftime('%Y-%W'")) {
        return [{ count: 0 }];
      }

      if (sql.includes('datetime(a.date_time) = datetime(?)')) {
        return [];
      }

      return [];
    });

    const result = await evaluateRegistrationPolicies({
      studentId: 15,
      activityId: 88,
      activity: {
        date_time: '2026-04-10T10:00:00.000Z',
      },
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.mockDbAll).toHaveBeenCalledWith(
      expect.stringContaining('datetime(a.date_time) = datetime(?)'),
      [15, '2026-04-10T10:00:00.000Z', 88]
    );
  });

  it('returns a conflict only when another registration has the same start time', async () => {
    mocks.mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes("strftime('%Y-%W'")) {
        return [{ count: 0 }];
      }

      if (sql.includes('datetime(a.date_time) = datetime(?)')) {
        return [
          {
            id: 44,
            title: 'Activity Clash',
            date_time: '2026-04-10T08:00:00.000Z',
            location: 'Hall B',
          },
        ];
      }

      return [];
    });

    const result = await evaluateRegistrationPolicies({
      studentId: 15,
      activityId: 99,
      activity: {
        date_time: '2026-04-10T08:00:00.000Z',
      },
    });

    expect(result).toMatchObject({
      ok: false,
      error: 'conflict_detected',
      can_override: true,
    });
    expect(result.conflicts).toEqual([
      {
        id: 44,
        title: 'Activity Clash',
        date_time: '2026-04-10T08:00:00.000Z',
        location: 'Hall B',
      },
    ]);
  });
});
