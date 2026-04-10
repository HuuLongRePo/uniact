import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registration route conflict messaging', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns the confirmed start-time conflict message and override hint', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 200, role: 'student', class_id: 1, name: 'Student Conflict' }),
      requireApiRole: async () => ({
        id: 200,
        role: 'student',
        class_id: 1,
        name: 'Student Conflict',
      }),
    }));

    vi.doMock('@/lib/activity-service', () => ({
      evaluateRegistrationPolicies: async () => ({
        ok: false,
        error: 'conflict_detected',
        can_override: true,
        conflicts: [
          {
            id: 901,
            title: 'Overlap Activity',
            date_time: '2026-04-10T08:00:00.000Z',
            location: 'Hall A',
          },
        ],
      }),
    }));

    vi.doMock('@/lib/notifications', () => ({
      notificationService: { send: async () => {} },
      ActivityRegistrationNotification: class {},
    }));

    const withTransaction = vi.fn(async (callback: any) => callback());
    const ensureParticipationColumns = vi.fn(async () => undefined);

    vi.doMock('@/lib/database', () => ({
      withTransaction,
      ensureParticipationColumns,
      ensureActivityClassParticipationMode: async () => undefined,
      dbAll: async () => [],
      dbGet: async (sql: string) => {
        if (sql.includes('SELECT * FROM activities')) {
          return {
            id: 76,
            status: 'published',
            registration_deadline: new Date(Date.now() + 86_400_000).toISOString(),
            max_participants: 10,
            title: 'Start Time Conflict Activity',
            date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
            location: 'Room',
          };
        }

        if (sql.includes('SELECT * FROM participations')) {
          return null;
        }

        return null;
      },
      dbRun: async () => ({ changes: 1 }),
    }));

    const route = await import('../src/app/api/activities/[id]/register/route');
    const req = {
      json: async () => ({ force_register: false }),
    } as any;

    const res: any = await route.POST(req, { params: Promise.resolve({ id: '76' }) } as any);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain('trùng giờ bắt đầu');
    expect(String(body.details?.hint)).toContain('trùng giờ bắt đầu');
    expect(body.details?.can_override).toBe(true);
    expect(body.details?.conflicts).toHaveLength(1);
    expect(ensureParticipationColumns).toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });
});
