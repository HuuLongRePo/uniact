import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  createRealtimeEventForUser: vi.fn(),
  recordRealtimeMetric: vi.fn(),
}));

describe('notification dedupe helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mocks.dbAll.mockResolvedValue([]);
    mocks.recordRealtimeMetric.mockResolvedValue(undefined);
    mocks.createRealtimeEventForUser.mockResolvedValue({ event_id: 601, event_type: 'system' });
  });

  it('sendDatabaseNotification skips duplicate notifications in dedupe window', async () => {
    mocks.dbGet.mockResolvedValueOnce({ id: 77 });
    mocks.dbRun.mockResolvedValue({ lastID: 88, changes: 1 });

    vi.doMock('@/lib/database', () => ({
      dbRun: mocks.dbRun,
      dbGet: mocks.dbGet,
      dbAll: mocks.dbAll,
      dbHelpers: {
        createAuditLog: vi.fn(async () => undefined),
      },
    }));
    vi.doMock('@/lib/realtime-notifications', () => ({
      createRealtimeEventForUser: mocks.createRealtimeEventForUser,
      recordRealtimeMetric: mocks.recordRealtimeMetric,
    }));

    const { sendDatabaseNotification } = await import('../src/lib/notifications');
    const result = await sendDatabaseNotification({
      userId: 5,
      type: 'system',
      title: 'T1',
      message: 'M1',
      relatedTable: 'activities',
      relatedId: 9,
      dedupeWithinSeconds: 45,
    });

    expect(result).toEqual({ notificationId: 77, eventId: null, deduped: true });
    expect(mocks.dbRun).not.toHaveBeenCalled();
    expect(mocks.createRealtimeEventForUser).not.toHaveBeenCalled();
  });

  it('sendBulkDatabaseNotifications reports skipped duplicates and created items', async () => {
    mocks.dbGet.mockImplementation(async (_sql: string, params?: unknown[]) => {
      const userId = Number(params?.[0] || 0);
      if (userId === 11) {
        return { id: 1101 };
      }
      return null;
    });

    mocks.dbRun.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (String(sql).includes('INSERT INTO notifications')) {
        return { lastID: Number(params?.[0] || 0) + 2000, changes: 1 };
      }
      return { changes: 1 };
    });

    vi.doMock('@/lib/database', () => ({
      dbRun: mocks.dbRun,
      dbGet: mocks.dbGet,
      dbAll: mocks.dbAll,
      dbHelpers: {
        createAuditLog: vi.fn(async () => undefined),
      },
    }));
    vi.doMock('@/lib/realtime-notifications', () => ({
      createRealtimeEventForUser: mocks.createRealtimeEventForUser,
      recordRealtimeMetric: mocks.recordRealtimeMetric,
    }));

    const { sendBulkDatabaseNotifications } = await import('../src/lib/notifications');
    const result = await sendBulkDatabaseNotifications({
      userIds: [11, 12],
      type: 'system',
      title: 'Push test',
      message: 'Lop A1 mo diem danh',
      eventType: 'attendance_started',
      dedupeWithinSeconds: 45,
    });

    expect(result).toMatchObject({
      created: 1,
      skipped: 1,
      failed: 0,
      targetCount: 2,
    });
    expect(mocks.createRealtimeEventForUser).toHaveBeenCalledTimes(1);
  });
});
