import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUserFromToken = vi.fn();
const mockDbAll = vi.fn();
const mockDbRun = vi.fn();
const mockDbReady = vi.fn();

vi.mock('@/lib/auth', () => ({
  getUserFromToken: (...args: any[]) => mockGetUserFromToken(...args),
}));

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
  dbReady: (...args: any[]) => mockDbReady(...args),
}));

describe('GET /api/teacher/notifications/history', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetUserFromToken.mockReset();
    mockDbAll.mockReset();
    mockDbRun.mockReset();
    mockDbReady.mockReset();

    mockGetUserFromToken.mockResolvedValue({ id: 12, role: 'teacher' });
    mockDbRun.mockResolvedValue({ changes: 0 });
    mockDbReady.mockResolvedValue(undefined);
  });

  it('returns broadcast summaries, recipient records, and unread hotspots', async () => {
    mockDbAll
      .mockResolvedValueOnce([
        {
          id: 91,
          title: 'Nhắc điểm danh',
          message: 'Các em nhớ check-in',
          target_type: 'class',
          target_names: 'CTK42',
          recipient_count: 10,
          delivered_count: 10,
          read_count: 4,
          sent_at: '2027-01-10T08:00:00.000Z',
          created_at: '2027-01-10T08:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1001,
          notification_id: 91,
          notification_title: 'Nhắc điểm danh',
          student_id: 501,
          student_name: 'Nguyen Van A',
          class_name: 'CTK42',
          sent_at: '2027-01-10T08:00:00.000Z',
          read_at: null,
          is_read: 0,
        },
      ]);

    const route = await import('../src/app/api/teacher/notifications/history/route');
    const response = await route.GET({ cookies: { get: () => ({ value: 'token' }) } } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.notifications[0]).toMatchObject({
      id: 91,
      title: 'Nhắc điểm danh',
      delivered_count: 10,
      read_count: 4,
      unread_count: 6,
      read_rate: 40,
    });
    expect(body.data.records[0]).toMatchObject({
      id: 1001,
      notification_id: 91,
      student_name: 'Nguyen Van A',
      is_read: false,
      read_on_device: 'unknown',
    });
    expect(body.data.summary).toMatchObject({
      total_notifications: 1,
      total_recipients: 10,
      total_read: 4,
      total_unread: 6,
    });
    expect(body.data.summary.low_read_notifications[0].id).toBe(91);
  });

  it('rejects requests without auth token', async () => {
    const route = await import('../src/app/api/teacher/notifications/history/route');
    const response = await route.GET({ cookies: { get: () => undefined } } as any);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
