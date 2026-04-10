import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('activity access routes', () => {
  it('allows a support teacher to view an activity detail when class scope grants access', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('FROM activities a')) {
        return {
          id: 33,
          title: 'Linked Activity',
          description: null,
          date_time: '2026-04-12T08:00:00.000Z',
          location: 'Hall A',
          teacher_id: 99,
          max_participants: 50,
          status: 'published',
          approval_status: 'approved',
          registration_deadline: null,
          activity_type_id: null,
          organization_level_id: null,
          base_points: 5,
          qr_enabled: 1,
          teacher_name: 'Owner Teacher',
          activity_type: null,
          organization_level: null,
          activity_type_base_points: 0,
          participant_count: 0,
          available_slots: 50,
          is_registered: 0,
          registration_status: null,
        };
      }

      return null;
    });

    const mockDbAll = vi.fn(async () => [{ class_id: 7, name: '12A1' }]);

    vi.doMock('@/lib/guards', () => ({
      requireApiAuth: async () => ({ id: 12, role: 'teacher' }),
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
      dbRun: vi.fn(),
      ensureParticipationColumns: vi.fn(async () => undefined),
      ensureActivityClassParticipationMode: vi.fn(async () => undefined),
      dbHelpers: {},
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/activities/[id]/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '33' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.activity).toMatchObject({
      id: 33,
      title: 'Linked Activity',
      class_ids: [7],
    });
  });

  it('blocks unrelated teachers from reading participants of another activity', async () => {
    const mockDbGet = vi.fn(async () => ({ id: 44 }));
    const mockDbAll = vi.fn();

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 21, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => false,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
    }));

    const route = await import('../src/app/api/activities/[id]/participants/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '44' }),
    } as any);

    expect(response.status).toBe(403);
    expect(mockDbAll).not.toHaveBeenCalled();
  });

  it('allows a support teacher to save bulk attendance for a related activity', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id, teacher_id FROM activities')) {
        return { id: 55, teacher_id: 99 };
      }

      if (sql.includes('SELECT id FROM participations')) {
        return null;
      }

      if (sql.includes('SELECT id, status FROM attendance_records')) {
        return null;
      }

      return null;
    });

    const mockDbRun = vi.fn(async () => ({ changes: 1, lastID: 1 }));
    const mockWithTransaction = vi.fn(async (callback: any) => callback());

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
      withTransaction: mockWithTransaction,
      ensureParticipationColumns: vi.fn(async () => undefined),
    }));

    const route = await import('../src/app/api/activities/[id]/attendance/bulk/route');
    const response = await route.POST(
      {
        json: async () => ({
          attendance: [
            {
              student_id: 300,
              status: 'present',
              notes: 'manual note',
              check_in_time: '2026-04-12T08:05:00.000Z',
            },
          ],
        }),
      } as any,
      { params: Promise.resolve({ id: '55' }) } as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.saved_count).toBe(1);
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
  });

  it('allows a support teacher to submit evaluations for a related activity', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id, teacher_id, title FROM activities')) {
        return { id: 66, teacher_id: 99, title: 'Evaluation Activity' };
      }

      return null;
    });

    const mockDbRun = vi.fn(async () => ({ changes: 1, lastID: 1 }));

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
      dbReady: vi.fn(async () => {}),
      withTransaction: vi.fn(async (callback: any) => callback()),
    }));

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        autoCalculateAfterEvaluation: vi.fn(async () => ({ totalPoints: 10 })),
      },
    }));

    const route = await import('../src/app/api/teacher/activities/[id]/evaluate/route');
    const response = await route.POST(
      {
        json: async () => ({ evaluations: [] }),
      } as any,
      { params: Promise.resolve({ id: '66' }) } as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      success: [],
      failed: [],
    });
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.any(Array)
    );
  });
});
