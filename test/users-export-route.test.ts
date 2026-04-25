import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  dbAll: vi.fn(),
  createAuditLog: vi.fn(),
  formatVietnamDateTime: vi.fn(),
  toVietnamDateStamp: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbHelpers: {
    createAuditLog: mocks.createAuditLog,
  },
}));

vi.mock('@/lib/timezone', () => ({
  formatVietnamDateTime: mocks.formatVietnamDateTime,
  toVietnamDateStamp: mocks.toVietnamDateStamp,
}));

describe('GET /api/users/export', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.toVietnamDateStamp.mockReturnValue('2026-04-25');
    mocks.formatVietnamDateTime.mockReturnValue('2026-04-24');
  });

  it('returns validation error for unsupported role filter', async () => {
    const route = await import('../src/app/api/users/export/route');
    const response = await route.GET({
      url: 'http://localhost/api/users/export?role=guest&format=csv',
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns csv export with canonical utf-8 content-disposition', async () => {
    mocks.dbAll.mockResolvedValue([
      {
        id: 7,
        student_id: 'SV007',
        name: 'Student A',
        email: 'student.a@example.com',
        role: 'student',
        class_name: 'CTK42',
        total_points: 25,
        activity_count: 3,
        award_count: 1,
        created_at: '2026-04-24T00:00:00.000Z',
      },
    ]);

    const route = await import('../src/app/api/users/export/route');
    const response = await route.GET({
      url: 'http://localhost/api/users/export?role=student&format=csv',
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toBe(
      `attachment; filename="users-student-2026-04-25.csv"; filename*=UTF-8''users-student-2026-04-25.csv`
    );

    const bytes = new Uint8Array(await response.arrayBuffer());
    const csv = new TextDecoder('utf-8').decode(bytes);
    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191]);
    expect(csv).toContain('student.a@example.com');
    expect(csv).toContain('"Student A"');
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      1,
      'EXPORT',
      'users',
      null,
      JSON.stringify({ role: 'student', format: 'csv', total: 1 })
    );
  });

  it('returns json fallback and logs export action', async () => {
    mocks.dbAll.mockResolvedValue([
      {
        id: 9,
        student_id: 'SV009',
        name: 'Student B',
      },
    ]);

    const route = await import('../src/app/api/users/export/route');
    const response = await route.GET({
      url: 'http://localhost/api/users/export?role=student&format=json',
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.users).toEqual([{ id: 9, student_id: 'SV009', name: 'Student B' }]);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      1,
      'EXPORT',
      'users',
      null,
      JSON.stringify({ role: 'student', format: 'json', total: 1 })
    );
  });
});
