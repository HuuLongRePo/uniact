import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireRole = vi.fn();
const mockRequireApiRole = vi.fn();
const mockDbAll = vi.fn();
const mockDbGet = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockTeacherCanAccessActivity = vi.fn();
const mockCreateWorkbookFromJsonSheets = vi.fn(async () => new Uint8Array([1, 2, 3]));

vi.mock('@/lib/guards', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
  requireApiRole: (...args: any[]) => mockRequireApiRole(...args),
}));

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbHelpers: {
    createAuditLog: (...args: any[]) => mockCreateAuditLog(...args),
  },
}));

vi.mock('@/lib/activity-access', () => ({
  teacherCanAccessActivity: (...args: any[]) => mockTeacherCanAccessActivity(...args),
}));

vi.mock('@/lib/excel-export', () => ({
  createWorkbookFromJsonSheets: (...args: any[]) => mockCreateWorkbookFromJsonSheets(...args),
}));

describe('timezone export filename routes', () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireRole.mockReset();
    mockRequireApiRole.mockReset();
    mockDbAll.mockReset();
    mockDbGet.mockReset();
    mockCreateAuditLog.mockReset();
    mockTeacherCanAccessActivity.mockReset();
    mockCreateWorkbookFromJsonSheets.mockReset();

    mockTeacherCanAccessActivity.mockResolvedValue(true);
    mockCreateAuditLog.mockResolvedValue(undefined);
    mockCreateWorkbookFromJsonSheets.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it('uses vietnam date stamp for activity participants export filename', async () => {
    mockRequireRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mockDbGet.mockResolvedValue({ id: 42, teacher_id: 12, title: 'Hoat dong A' });
    mockDbAll.mockResolvedValue([
      {
        student_id: 1,
        student_code: 'SV001',
        student_name: 'Nguyen Van A',
        student_email: 'a@example.com',
        attendance_status: 'attended',
        achievement_level: 'good',
        evaluated_at: '2026-04-24T08:00:00.000Z',
      },
    ]);

    const route = await import('../src/app/api/activities/[id]/participants/export/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '42' }) } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="participants-42-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''participants-42-\d{4}-\d{2}-\d{2}\.csv$/
    );
  });

  it('uses vietnam date stamp for qr scan export filename', async () => {
    mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mockDbGet.mockResolvedValue({ id: 7, activity_id: 42, creator_id: 12 });
    mockDbAll.mockResolvedValue([
      {
        attendance_id: 1001,
        student_id: 1,
        student_code: 'SV001',
        student_name: 'Nguyen Van A',
        class_name: 'CTK42',
        scanned_at: '2026-04-24T08:05:00.000Z',
      },
    ]);

    const route = await import('../src/app/api/qr-sessions/[id]/scans/export/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '7' }) } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="diem-danh-7-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''diem-danh-7-\d{4}-\d{2}-\d{2}\.csv$/
    );
  });

  it('uses vietnam date stamp from activity date for attendance export filename', async () => {
    mockRequireRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mockDbGet.mockResolvedValue({
      id: 42,
      teacher_id: 12,
      title: 'Hoat dong A',
      date_time: '2026-04-24T17:30:00.000Z',
    });
    mockDbAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          student_id: 1,
          student_code: 'SV001',
          student_name: 'Nguyen Van A',
        },
      ])
      .mockResolvedValueOnce([
        {
          student_id: 1,
          attendance_status: 'attended',
          achievement_level: 'good',
        },
      ]);

    const route = await import('../src/app/api/activities/[id]/attendance/export/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '42' }) } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe(
      `attachment; filename="dau-danh-42-2026-04-25.xlsx"; filename*=UTF-8''dau-danh-42-2026-04-25.xlsx`
    );
  });
});
