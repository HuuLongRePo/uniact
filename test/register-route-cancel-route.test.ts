import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('registration route cancel semantics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses notification helper for successful self-cancel', async () => {
    const mockSendDatabaseNotification = vi.fn(async () => undefined);

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({
        id: 201,
        role: 'student',
        class_id: 1,
        name: 'Student Cancel',
      }),
    }));

    vi.doMock('@/lib/notifications', () => ({
      notificationService: { send: vi.fn(async () => undefined) },
      ActivityRegistrationNotification: class {},
      sendDatabaseNotification: mockSendDatabaseNotification,
    }));

    vi.doMock('@/lib/database', () => ({
      ensureParticipationColumns: vi.fn(async () => undefined),
      withTransaction: vi.fn(async (callback: any) => callback()),
      dbAll: async () => [],
      dbGet: async (sql: string) => {
        if (sql.includes('SELECT * FROM activities')) {
          return {
            id: 77,
            status: 'published',
            title: 'Cancel Notify Activity',
            date_time: new Date(Date.now() + 3 * 86_400_000).toISOString(),
            location: 'Room B',
          };
        }

        if (sql.includes('FROM participations')) {
          return {
            id: 902,
            attendance_status: 'registered',
            participation_source: 'voluntary',
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
      params: Promise.resolve({ id: '77' }),
    } as any);

    expect(res.status).toBe(200);
    expect(mockSendDatabaseNotification).toHaveBeenCalledWith({
      userId: 201,
      type: 'registration',
      title: 'Hủy đăng ký thành công',
      message: 'Bạn đã hủy đăng ký hoạt động "Cancel Notify Activity".',
      relatedTable: 'activities',
      relatedId: 77,
    });
  });

  it('returns success noop when the student has no registration to cancel', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({
        id: 200,
        role: 'student',
        class_id: 1,
        name: 'Student Noop',
      }),
    }));

    const ensureParticipationColumns = vi.fn(async () => undefined);
    const withTransaction = vi.fn(async (callback: any) => callback());
    const createAuditLog = vi.fn(async () => undefined);

    vi.doMock('@/lib/database', () => ({
      ensureParticipationColumns,
      withTransaction,
      dbAll: async () => [],
      dbGet: async (sql: string) => {
        if (sql.includes('SELECT * FROM activities')) {
          return {
            id: 76,
            status: 'published',
            title: 'Noop Cancel Activity',
            date_time: new Date(Date.now() + 3 * 86_400_000).toISOString(),
            location: 'Room A',
          };
        }

        if (sql.includes('FROM participations')) {
          return null;
        }

        return null;
      },
      dbRun: async () => ({ changes: 1 }),
      dbHelpers: {
        createAuditLog,
      },
    }));

    const route = await import('../src/app/api/activities/[id]/register/route');
    const res: any = await route.DELETE({} as any, {
      params: Promise.resolve({ id: '76' }),
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      cancelled: false,
      already_not_registered: true,
    });
    expect(ensureParticipationColumns).toHaveBeenCalled();
    expect(withTransaction).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalled();
  });

  it('blocks self-cancel after attendance has already been recorded', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({
        id: 200,
        role: 'student',
        class_id: 1,
        name: 'Student Attended',
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
            title: 'Attended Activity',
            date_time: new Date(Date.now() + 3 * 86_400_000).toISOString(),
            location: 'Room A',
          };
        }

        if (sql.includes('FROM participations')) {
          return {
            id: 901,
            attendance_status: 'attended',
            participation_source: 'voluntary',
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
    expect(String(body.error)).toContain('điểm danh');
    expect(ensureParticipationColumns).toHaveBeenCalled();
    expect(withTransaction).toHaveBeenCalled();
  });
});
