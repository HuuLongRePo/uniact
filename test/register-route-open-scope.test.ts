import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registration route open-scope activities', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('allows a student from any class to register when the activity has no class scope', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({
        id: 200,
        role: 'student',
        class_id: 99,
        name: 'Student Open Scope',
      }),
    }));

    vi.doMock('@/lib/activity-service', () => ({
      evaluateRegistrationPolicies: async () => ({ ok: true }),
    }));

    vi.doMock('@/lib/notifications', () => ({
      notificationService: { send: async () => undefined },
      ActivityRegistrationNotification: class {},
    }));

    const ensureParticipationColumns = vi.fn(async () => undefined);
    const ensureActivityClassParticipationMode = vi.fn(async () => undefined);
    const withTransaction = vi.fn(async (callback: any) => callback());
    const dbRun = vi.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO participations')) {
        return { changes: 1, lastID: 901 };
      }
      return { changes: 1 };
    });

    vi.doMock('@/lib/database', () => ({
      ensureParticipationColumns,
      ensureActivityClassParticipationMode,
      withTransaction,
      dbAll: async (sql: string) => {
        if (sql.includes('FROM activity_classes')) {
          return [];
        }
        return [];
      },
      dbGet: async (sql: string) => {
        if (sql.includes('SELECT * FROM activities')) {
          return {
            id: 76,
            status: 'published',
            registration_deadline: new Date(Date.now() + 86_400_000).toISOString(),
            max_participants: 10,
            title: 'Open Scope Activity',
            date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
            location: 'Room',
            teacher_id: 15,
          };
        }

        if (sql.includes('SELECT * FROM participations')) {
          return null;
        }

        if (sql.includes('SELECT COUNT(*) as count FROM participations')) {
          return { count: 0 };
        }

        return null;
      },
      dbRun,
      dbHelpers: {
        createAuditLog: async () => undefined,
      },
    }));

    const route = await import('../src/app/api/activities/[id]/register/route');
    const res: any = await route.POST(
      {
        json: async () => ({}),
      } as any,
      { params: Promise.resolve({ id: '76' }) } as any
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ participation_id: 901 });
    expect(ensureParticipationColumns).toHaveBeenCalled();
    expect(ensureActivityClassParticipationMode).toHaveBeenCalled();
    expect(withTransaction).toHaveBeenCalled();
  });
});
