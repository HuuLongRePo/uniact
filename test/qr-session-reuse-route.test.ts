import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('qr session reuse routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('POST /api/qr-sessions returns reusable active session instead of conflict', async () => {
    const createQRSession = vi.fn(async () => ({ lastID: 999 }));
    const dbGet = vi.fn(async (query: string) => {
      if (query.includes('FROM activities')) {
        return {
          id: 42,
          teacher_id: 12,
          status: 'published',
          approval_status: 'approved',
        };
      }

      if (query.includes('FROM qr_sessions')) {
        return {
          id: 321,
          session_token: 'active-token-321',
          expires_at: '2026-04-21T12:30:00.000Z',
          metadata: JSON.stringify({ single_use: true, max_scans: 1 }),
        };
      }

      return undefined;
    });

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/rateLimit', () => ({
      rateLimit: () => ({ allowed: true }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet,
      dbAll: vi.fn(async () => []),
      dbHelpers: {
        createQRSession,
      },
    }));

    const route = await import('../src/app/api/qr-sessions/route');
    const response = await route.POST({
      json: async () => ({ activity_id: 42, expires_minutes: 10 }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      session_id: 321,
      session_token: 'active-token-321',
      reused: true,
      options: { single_use: true, max_scans: 1 },
    });
    expect(createQRSession).not.toHaveBeenCalled();
  });

  it('POST /api/qr-sessions uses 10-minute default TTL when expires_minutes is omitted', async () => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-04-22T09:00:00.000Z');
    vi.setSystemTime(baseTime);
    try {
      const createQRSession = vi.fn(async () => ({ lastID: 777 }));
      const dbGet = vi.fn(async (query: string) => {
        if (query.includes('FROM activities')) {
          return {
            id: 42,
            teacher_id: 12,
            title: 'Sinh hoat toan khoa',
            status: 'published',
            approval_status: 'approved',
          };
        }

        if (query.includes('FROM qr_sessions')) {
          return undefined;
        }

        return undefined;
      });

      vi.doMock('@/lib/guards', () => ({
        requireApiRole: async () => ({ id: 12, role: 'teacher' }),
      }));

      vi.doMock('@/lib/activity-access', () => ({
        teacherCanAccessActivity: async () => true,
      }));

      vi.doMock('@/lib/rateLimit', () => ({
        rateLimit: () => ({ allowed: true }),
      }));

      vi.doMock('@/lib/notifications', () => ({
        sendBulkDatabaseNotifications: vi.fn(async () => ({ created: 0, targetCount: 0, failed: 0 })),
      }));

      vi.doMock('@/lib/database', () => ({
        dbGet,
        dbAll: vi.fn(async () => []),
        dbHelpers: {
          createQRSession,
        },
      }));

      const route = await import('../src/app/api/qr-sessions/route');
      const response = await route.POST({
        json: async () => ({ activity_id: 42 }),
      } as any);

      expect(response.status).toBe(201);
      expect(createQRSession).toHaveBeenCalledTimes(1);
      const expiresAtIso = createQRSession.mock.calls[0][3];
      const expiresAtMs = new Date(expiresAtIso).getTime();
      expect(expiresAtMs).toBe(baseTime.getTime() + 10 * 60 * 1000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('GET /api/qr-sessions/active returns active session payload for selected activity', async () => {
    const dbGet = vi.fn(async (query: string) => {
      if (query.includes('FROM activities')) {
        return { id: 42 };
      }

      if (query.includes('FROM qr_sessions')) {
        return {
          id: 654,
          session_token: 'active-token-654',
          expires_at: '2026-04-21T13:00:00.000Z',
          metadata: JSON.stringify({ single_use: false, max_scans: 50 }),
        };
      }

      return undefined;
    });

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet,
    }));

    const route = await import('../src/app/api/qr-sessions/active/route');
    const response = await route.GET({
      url: 'http://localhost/api/qr-sessions/active?activity_id=42',
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.session).toMatchObject({
      session_id: 654,
      session_token: 'active-token-654',
      reusable: true,
      options: { single_use: false, max_scans: 50 },
    });
  });

  it('POST /api/qr-sessions sends realtime notifications to mandatory and voluntary registered students', async () => {
    const createQRSession = vi.fn(async () => ({ lastID: 888 }));
    const sendBulkDatabaseNotifications = vi.fn(async () => ({ created: 3, targetCount: 3 }));
    const dbGet = vi.fn(async (query: string) => {
      if (query.includes('FROM activities')) {
        return {
          id: 42,
          teacher_id: 12,
          title: 'Sinh hoat toan khoa',
          status: 'published',
          approval_status: 'approved',
        };
      }

      if (query.includes('FROM qr_sessions')) {
        return undefined;
      }

      return undefined;
    });

    const dbAll = vi.fn(async (query: string) => {
      if (query.includes('FROM participations')) {
        return [
          { student_id: 101, participation_source: 'assigned' },
          { student_id: 102, participation_source: 'voluntary' },
          { student_id: 103, participation_source: 'voluntary' },
        ];
      }

      return [];
    });

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/rateLimit', () => ({
      rateLimit: () => ({ allowed: true }),
    }));

    vi.doMock('@/lib/notifications', () => ({
      sendBulkDatabaseNotifications,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet,
      dbAll,
      dbHelpers: {
        createQRSession,
      },
    }));

    const route = await import('../src/app/api/qr-sessions/route');
    const response = await route.POST({
      json: async () => ({ activity_id: 42, expires_minutes: 10 }),
    } as any);

    expect(response.status).toBe(201);
    expect(sendBulkDatabaseNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [101, 102, 103],
        eventType: 'attendance_qr_started',
        priority: 'high',
        relatedId: 42,
      })
    );
  });
});
