import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserFromToken: vi.fn(),
  dbAll: vi.fn(),
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbReady: vi.fn(),
  getTeacherManagedStudentIds: vi.fn(),
  getManagedActivityParticipantIds: vi.fn(),
  ensureScheduledNotificationsTable: vi.fn(),
  sendBulkDatabaseNotifications: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromToken: mocks.getUserFromToken,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbRun: mocks.dbRun,
  dbGet: mocks.dbGet,
  dbReady: mocks.dbReady,
}));

vi.mock('@/lib/notifications', () => ({
  getTeacherManagedStudentIds: mocks.getTeacherManagedStudentIds,
  getManagedActivityParticipantIds: mocks.getManagedActivityParticipantIds,
  ensureScheduledNotificationsTable: mocks.ensureScheduledNotificationsTable,
  sendBulkDatabaseNotifications: mocks.sendBulkDatabaseNotifications,
}));

describe('teacher notification routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUserFromToken.mockResolvedValue({ id: 7, role: 'teacher' });
    mocks.dbReady.mockResolvedValue(undefined);
    mocks.dbRun.mockResolvedValue({ lastID: 77, changes: 1 });
    mocks.sendBulkDatabaseNotifications.mockResolvedValue({ created: 2, targetCount: 2 });
    mocks.getTeacherManagedStudentIds.mockResolvedValue([11, 12, 13]);
    mocks.getManagedActivityParticipantIds.mockResolvedValue([21, 22]);
    mocks.ensureScheduledNotificationsTable.mockResolvedValue(undefined);
  });

  it('students notify route uses canonical bulk notification helper', async () => {
    const route = await import('../src/app/api/students/notify/route');

    const response = await route.POST({
      cookies: { get: vi.fn(() => ({ value: 'token-1' })) },
      json: async () => ({ student_ids: [11, 12], title: 'Nhắc nhở', message: 'Mai đi học', type: 'info' }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.sendBulkDatabaseNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [11, 12],
        title: 'Nhắc nhở',
        message: 'Mai đi học',
      })
    );

    const body = await response.json();
    expect(body.message).toContain('2/2');
  });

  it('students notify route rejects teacher sends outside managed scope', async () => {
    const route = await import('../src/app/api/students/notify/route');

    const response = await route.POST({
      cookies: { get: vi.fn(() => ({ value: 'token-1' })) },
      json: async () => ({ student_ids: [11, 99], title: 'Nhắc nhở', message: 'Mai đi học', type: 'info' }),
    } as any);

    expect(response.status).toBe(403);
    expect(mocks.sendBulkDatabaseNotifications).not.toHaveBeenCalled();
  });

  it('teacher broadcast route resolves managed activity participants', async () => {
    const route = await import('../src/app/api/teacher/notifications/broadcast/route');

    const response = await route.POST({
      cookies: { get: vi.fn(() => ({ value: 'token-1' })) },
      json: async () => ({
        scope: 'managed_activities',
        activity_ids: [99, 100],
        title: 'Nhắc điểm danh',
        message: 'Các em nhớ có mặt đúng giờ',
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.getManagedActivityParticipantIds).toHaveBeenCalledWith(7, [99, 100]);
    expect(mocks.sendBulkDatabaseNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [21, 22],
        type: 'broadcast',
        title: 'Nhắc điểm danh',
      })
    );
  });

  it('teacher schedule route validates managed student scope before persisting', async () => {
    const route = await import('../src/app/api/teacher/notifications/schedule/route');

    const response = await route.POST({
      cookies: { get: vi.fn(() => ({ value: 'token-1' })) },
      json: async () => ({
        student_ids: [11, 12],
        title: 'Nhắc lịch',
        message: 'Mai nộp báo cáo',
        scheduled_at: '2026-04-21T08:00:00.000Z',
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.ensureScheduledNotificationsTable).toHaveBeenCalled();
    expect(mocks.dbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO scheduled_notifications'),
      expect.arrayContaining([7, 'Nhắc lịch', 'Mai nộp báo cáo'])
    );
  });

  it('teacher notification history export returns csv for broadcast records', async () => {
    mocks.dbRun.mockResolvedValue(undefined);
    mocks.dbAll.mockResolvedValue([
      {
        id: 9,
        notification_id: 5,
        notification_title: 'Thông báo lớp',
        student_name: 'Nguyễn Văn A',
        class_name: 'CTK42',
        sent_at: '2026-04-20T07:00:00.000Z',
        is_read: 0,
      },
    ]);

    const route = await import('../src/app/api/teacher/notifications/history/export/route');
    const response = await route.POST({
      cookies: { get: vi.fn(() => ({ value: 'token-1' })) },
      json: async () => ({ filters: { readStatus: 'unread' } }),
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    const csv = await response.text();
    expect(csv).toContain('Thông báo lớp');
    expect(csv).toContain('Nguyễn Văn A');
  });

  it('teacher notification history returns canonical nested payload', async () => {
    mocks.dbRun.mockResolvedValue(undefined);
    mocks.dbAll
      .mockResolvedValueOnce([
        {
          id: 5,
          title: 'Thông báo lớp',
          message: 'Đi học đúng giờ',
          target_type: 'all',
          target_names: 'Tất cả lớp của tôi',
          recipient_count: 2,
          delivered_count: 2,
          read_count: 1,
          sent_at: '2026-04-20T07:00:00.000Z',
          created_at: '2026-04-20T07:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          notification_id: 5,
          notification_title: 'Thông báo lớp',
          student_id: 11,
          student_name: 'Nguyễn Văn A',
          class_name: 'CTK42',
          sent_at: '2026-04-20T07:00:00.000Z',
          read_at: null,
          is_read: 0,
        },
      ]);

    const route = await import('../src/app/api/teacher/notifications/history/route');
    const response = await route.GET({ cookies: { get: vi.fn(() => ({ value: 'token-1' })) } } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.notifications[0]).toMatchObject({
      id: 5,
      delivered_count: 2,
      read_count: 1,
    });
    expect(body.data.records[0]).toMatchObject({
      student_id: 11,
      student_name: 'Nguyễn Văn A',
    });
  });
});
