import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserFromToken: vi.fn(),
  dbAll: vi.fn(),
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbReady: vi.fn(),
  getTeacherManagedStudentIds: vi.fn(),
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
  sendBulkDatabaseNotifications: mocks.sendBulkDatabaseNotifications,
}));

describe('teacher notification routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUserFromToken.mockResolvedValue({ id: 7, role: 'teacher' });
    mocks.dbReady.mockResolvedValue(undefined);
    mocks.sendBulkDatabaseNotifications.mockResolvedValue({ created: 2, targetCount: 2 });
    mocks.getTeacherManagedStudentIds.mockResolvedValue([11, 12, 13]);
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
