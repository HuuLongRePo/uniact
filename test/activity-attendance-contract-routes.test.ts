import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  requireApiAuth: vi.fn(),
  teacherCanAccessActivity: vi.fn(),
  dbAll: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
  requireApiAuth: mocks.requireApiAuth,
}));

vi.mock('@/lib/activity-access', () => ({
  teacherCanAccessActivity: mocks.teacherCanAccessActivity,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbGet: mocks.dbGet,
  dbRun: mocks.dbRun,
  dbHelpers: {
    createAuditLog: vi.fn(async () => {}),
  },
}));

describe('activity attendance contract routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.requireApiAuth.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.teacherCanAccessActivity.mockResolvedValue(true);
    mocks.dbAll.mockResolvedValue([]);
    mocks.dbGet.mockResolvedValue(null);
    mocks.dbRun.mockResolvedValue({ changes: 1 });
  });

  it('admin attendance list maps recorded/void to present/absent', async () => {
    mocks.dbAll.mockResolvedValueOnce([
      { id: 1, activityId: 10, activityName: 'A', activityDate: '2026-04-13', userId: 2, userName: 'SV A', userEmail: 'a@example.com', status: 'present', pointsAwarded: 0 },
      { id: 2, activityId: 10, activityName: 'A', activityDate: '2026-04-13', userId: 3, userName: 'SV B', userEmail: 'b@example.com', status: 'absent', pointsAwarded: 0 },
    ]);

    const route = await import('../src/app/api/admin/attendance/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.records[0].status).toBe('present');
    expect(body.records[1].status).toBe('absent');
  });

  it('qr scans query only reads canonical recorded rows', async () => {
    mocks.requireApiRole.mockResolvedValueOnce({ id: 12, role: 'teacher' });
    mocks.dbGet.mockResolvedValueOnce({ id: 77, activity_id: 42, creator_id: 12, created_at: '2026-04-13', expires_at: '2026-04-13', is_active: 1 });
    mocks.dbAll.mockResolvedValueOnce([
      { attendance_id: 2, student_id: 300, student_name: 'Student A', student_code: 'SV300', class_name: '12A1', scanned_at: '2026-04-12T08:03:00.000Z' },
    ]);

    const route = await import('../src/app/api/qr-sessions/[id]/scans/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '77' }) } as any);

    expect(response.status).toBe(200);
    expect(String(mocks.dbAll.mock.calls[0][0])).toContain("ar.status = 'recorded'");
    expect(String(mocks.dbAll.mock.calls[0][0])).not.toContain("'present'");
    const body = await response.json();
    expect(body.data.scans).toHaveLength(1);
  });

  it('participation update normalizes legacy attendance values', async () => {
    const route = await import('../src/app/api/participations/[id]/route');
    const response = await route.PUT(
      { json: async () => ({ attendance_status: 'late' }) } as any,
      { params: Promise.resolve({ id: '91' }) } as any
    );

    expect(response.status).toBe(200);
    expect(mocks.dbRun).toHaveBeenCalledWith(expect.any(String), ['attended', 91]);
    const body = await response.json();
    expect(body.attendance_status).toBe('attended');
    expect(body.message).toBe('Cập nhật điểm danh thành công');
  });

  it('participation update rejects invalid attendance values in Vietnamese', async () => {
    const route = await import('../src/app/api/participations/[id]/route');
    const response = await route.PUT(
      { json: async () => ({ attendance_status: 'weird' }) } as any,
      { params: Promise.resolve({ id: '91' }) } as any
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('attendance_status không hợp lệ');
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
