import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbGet = vi.fn();
const mockDbAll = vi.fn();
const mockDbRun = vi.fn();

vi.mock('@/lib/database', () => ({
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: async () => ({ id: 1, role: 'teacher' }),
}));

describe('activity attendance policy routes', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDbGet.mockReset();
    mockDbAll.mockReset();
    mockDbRun.mockReset();
    mockDbRun.mockResolvedValue({ changes: 0 });
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

  it('honors selected_only face-pilot mode from system_config', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 77,
          title: 'Config Driven Pilot Activity',
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

    mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activity_classes')) {
        return [{ participation_mode: 'mandatory' }];
      }
      if (sql.includes('FROM system_config')) {
        return [
          {
            config_key: 'attendance_face_pilot_selection_mode',
            config_value: 'selected_only',
            data_type: 'string',
          },
          {
            config_key: 'attendance_face_pilot_activity_ids',
            config_value: '[77]',
            data_type: 'json',
          },
        ];
      }
      return [];
    });

    const route = await import('../src/app/api/activities/[id]/attendance-policy/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '77' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.policy.facePilot.eligible).toBe(true);
    expect(body.data.policy.facePilot.selectionMode).toBe('selected_only');
    expect(body.data.policy.facePilot.selectedByConfig).toBe(true);
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
