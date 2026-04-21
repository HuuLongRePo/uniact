import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registration route mandatory participation safeguards', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('blocks student self-cancel when the participation is mandatory', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({
        id: 200,
        role: 'student',
        class_id: 1,
        name: 'Student Mandatory',
      }),
    }));

    const ensureParticipationColumns = vi.fn(async () => undefined);
    const withTransaction = vi.fn(async (callback: any) => callback());

    vi.doMock('@/lib/database', () => ({
      ensureParticipationColumns,
      withTransaction,
      dbAll: async () => [],
      dbGet: async (sql: string) => {
        if (sql.includes('SELECT * FROM activities')) {
          return {
            id: 76,
            status: 'published',
            title: 'Mandatory Activity',
            date_time: new Date(Date.now() + 3 * 86_400_000).toISOString(),
            location: 'Room A',
          };
        }

        if (sql.includes('FROM participations')) {
          return {
            id: 901,
            attendance_status: 'registered',
            participation_source: 'assigned',
          };
        }

        return null;
      },
      dbRun: async () => ({ changes: 1 }),
      dbHelpers: {
        createAuditLog: async () => undefined,
      },
    }));

    const route = await import('../src/app/api/activities/[id]/register/route');
    const res: any = await route.DELETE({} as any, {
      params: Promise.resolve({ id: '76' }),
    } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain('bắt buộc');
    expect(ensureParticipationColumns).toHaveBeenCalled();
    expect(withTransaction).toHaveBeenCalled();
  });
});
