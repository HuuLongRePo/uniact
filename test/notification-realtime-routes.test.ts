import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  requireApiAuth: vi.fn(),
  sendBulkDatabaseNotifications: vi.fn(),
  rateLimit: vi.fn(),
  ensureRealtimeNotificationTables: vi.fn(),
  listRealtimeEventsForUser: vi.fn(),
  recordRealtimeMetric: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
  requireApiAuth: mocks.requireApiAuth,
}));

vi.mock('@/lib/notifications', () => ({
  sendBulkDatabaseNotifications: mocks.sendBulkDatabaseNotifications,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock('@/lib/realtime-notifications', () => ({
  ensureRealtimeNotificationTables: mocks.ensureRealtimeNotificationTables,
  listRealtimeEventsForUser: mocks.listRealtimeEventsForUser,
  recordRealtimeMetric: mocks.recordRealtimeMetric,
}));

async function readSseSnapshot(response: Response, maxChunks = 8) {
  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  const decoder = new TextDecoder();
  let raw = '';

  for (let index = 0; index < maxChunks; index += 1) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    raw += decoder.decode(value, { stream: true });
    if (raw.includes('"event_id":501')) {
      break;
    }
  }

  await reader.cancel();
  return raw;
}

function createJsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('notification realtime routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mocks.requireApiRole.mockResolvedValue({ id: 10, role: 'teacher' });
    mocks.requireApiAuth.mockResolvedValue({ id: 20, role: 'student' });
    mocks.sendBulkDatabaseNotifications.mockResolvedValue({
      created: 2,
      targetCount: 2,
      failed: 0,
      failedUserIds: [],
    });
    mocks.rateLimit.mockReturnValue({ allowed: true, resetAt: Date.now() + 1000 });
    mocks.ensureRealtimeNotificationTables.mockResolvedValue(undefined);
    mocks.listRealtimeEventsForUser.mockResolvedValue([]);
    mocks.recordRealtimeMetric.mockResolvedValue(undefined);
  });

  it('POST /api/notifications/push sends bulk realtime notifications', async () => {
    const route = await import('../src/app/api/notifications/push/route');

    const response = await route.POST(
      createJsonRequest({
        event_type: 'attendance_started',
        target_user_ids: [11, 12],
        type: 'system',
        title: 'Bat dau diem danh',
        message: 'Moi ban vao phien diem danh',
        priority: 'high',
        ttl_seconds: 10,
        action_buttons: [{ label: 'Tham gia', action: 'join', href: '/student/activities' }],
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.sendBulkDatabaseNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [11, 12],
        eventType: 'attendance_started',
        actorId: 10,
        priority: 'high',
        ttlSeconds: 10,
        dedupeWithinSeconds: 45,
      })
    );

    const body = await response.json();
    expect(body.data.delivery.created).toBe(2);
    expect(body.data.delivery.skipped).toBe(0);
    expect(body.data.target_user_ids).toEqual([11, 12]);
  });

  it('POST /api/notifications/push returns 400 on invalid payload', async () => {
    const route = await import('../src/app/api/notifications/push/route');

    const response = await route.POST(
      createJsonRequest({
        event_type: '',
        target_user_ids: [],
      })
    );

    expect(response.status).toBe(400);
  });

  it('POST /api/notifications/push retries failed recipients once', async () => {
    mocks.sendBulkDatabaseNotifications
      .mockResolvedValueOnce({
        created: 1,
        targetCount: 2,
        failed: 1,
        failedUserIds: [12],
      })
      .mockResolvedValueOnce({
        created: 1,
        targetCount: 1,
        failed: 0,
        failedUserIds: [],
      });

    const route = await import('../src/app/api/notifications/push/route');
    const response = await route.POST(
      createJsonRequest({
        event_type: 'attendance_started',
        target_user_ids: [11, 12],
        type: 'system',
        title: 'Bat dau diem danh',
        message: 'Moi ban vao phien diem danh',
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.sendBulkDatabaseNotifications).toHaveBeenCalledTimes(2);
    expect(mocks.sendBulkDatabaseNotifications).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userIds: [12],
        metadata: expect.objectContaining({ retry_attempt: 1 }),
      })
    );

    const body = await response.json();
    expect(body.data.delivery.retry_once).toBe(1);
    expect(body.data.delivery.retry_recovered).toBe(1);
    expect(body.data.delivery.failed).toBe(0);
  });

  it('POST /api/notifications/push returns 429 when rate-limited', async () => {
    mocks.rateLimit.mockReturnValueOnce({ allowed: false, resetAt: Date.now() + 5000 });
    const route = await import('../src/app/api/notifications/push/route');

    const response = await route.POST(
      createJsonRequest({
        event_type: 'attendance_started',
        target_user_ids: [11],
        type: 'system',
        title: 'Bat dau diem danh',
        message: 'Moi ban vao phien diem danh',
      })
    );

    expect(response.status).toBe(429);
    expect(mocks.requireApiRole).not.toHaveBeenCalled();
  });

  it.each(['student', 'teacher', 'admin'] as const)(
    'GET /api/notifications/stream emits realtime SSE payload for %s role',
    async (role) => {
      mocks.requireApiAuth.mockResolvedValue({ id: 30, role });
      mocks.listRealtimeEventsForUser
        .mockResolvedValueOnce([
          {
            event_id: 501,
            event_type: 'batch2_e2e_check',
            actor_id: 1,
            target_user_ids: [30],
            priority: 'normal',
            ttl_seconds: 7,
            action_buttons: [],
            notification: {
              id: 900,
              type: 'system',
              title: `Realtime ${role}`,
              message: 'Role coverage stream event',
              related_table: null,
              related_id: null,
              created_at: '2026-04-21T09:00:00.000Z',
            },
            created_at: '2026-04-21T09:00:00.000Z',
          },
        ])
        .mockResolvedValue([]);

      const route = await import('../src/app/api/notifications/stream/route');
      const request = new NextRequest('http://localhost:3000/api/notifications/stream');
      const response = await route.GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');

      const snapshot = await readSseSnapshot(response);
      expect(snapshot).toContain('event: ready');
      expect(snapshot).toContain('event: notification');
      expect(snapshot).toContain('"event_id":501');
      expect(mocks.listRealtimeEventsForUser).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 30, limit: 25 })
      );
    }
  );

  it('GET /api/notifications/stream returns 401 for unauthenticated user', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    mocks.requireApiAuth.mockRejectedValue(ApiError.unauthorized('Chua dang nhap'));
    const route = await import('../src/app/api/notifications/stream/route');
    const request = new NextRequest('http://localhost:3000/api/notifications/stream');

    const response = await route.GET(request);

    expect(response.status).toBe(401);
  });
});
