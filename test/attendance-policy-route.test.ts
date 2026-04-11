import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbGet = vi.fn();
const mockDbAll = vi.fn();

vi.mock('@/lib/database', () => ({
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbAll: (...args: any[]) => mockDbAll(...args),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: async () => ({ id: 1, role: 'teacher' }),
}));

describe('activity attendance policy routes', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDbGet.mockReset();
    mockDbAll.mockReset();
  });

  it('returns face pilot recommendation for a mandatory high-volume activity', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 77,
          title: 'Pilot Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 120,
          date_time: '2027-01-10T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count')) {
        return { count: 64 };
      }
      return null;
    });
    mockDbAll.mockResolvedValue([
      { participation_mode: 'mandatory' },
      { participation_mode: 'mandatory' },
      { participation_mode: 'voluntary' },
    ]);

    const route = await import('../src/app/api/activities/[id]/attendance-policy/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '77' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.policy.facePilot.eligible).toBe(true);
    expect(body.data.policy.facePilot.preferredPrimaryMethod).toBe('face');
    expect(body.data.counts.mandatory_class_count).toBe(2);
  });

  it('returns fallback recommendation when qr runtime metrics exceed thresholds', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 88,
          title: 'Fallback Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 80,
          date_time: '2027-01-11T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count')) {
        return { count: 44 };
      }
      return null;
    });
    mockDbAll.mockResolvedValue([{ participation_mode: 'mandatory' }]);

    const route = await import('../src/app/api/activities/[id]/attendance-policy/fallback/route');
    const response = await route.POST(
      {
        json: async () => ({
          responseTimeP95Ms: 1700,
          queueBacklog: 30,
          scanFailureRate: 0.2,
          sampleSize: 25,
        }),
      } as any,
      {
        params: Promise.resolve({ id: '88' }),
      } as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.fallback.triggered).toBe(true);
    expect(body.data.fallback.recommended_target_mode).toBe('mixed');
    expect(body.data.fallback.teacher_manual_override).toBe(true);
  });
});
