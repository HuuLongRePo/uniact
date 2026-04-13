import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin attendance routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden errors for attendance list route', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/admin/attendance/route');
    const res: any = await route.GET({} as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns canonical validation when attendance update status is invalid', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ id: 7, activity_id: 11, student_id: 22 }),
      dbRun: async () => ({ changes: 1 }),
    }));

    const route = await import('../src/app/api/admin/attendance/[id]/route');
    const res: any = await route.PUT(
      { json: async () => ({ status: 'weird' }) } as any,
      { params: Promise.resolve({ id: '7' }) } as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('updates attendance record and participation using canonical status mapping', async () => {
    const dbGet = vi.fn(async () => ({ id: 7, activity_id: 11, student_id: 22 }));
    const dbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 99, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet,
      dbRun,
    }));

    const route = await import('../src/app/api/admin/attendance/[id]/route');
    const res: any = await route.PUT(
      { json: async () => ({ status: 'late' }) } as any,
      { params: Promise.resolve({ id: '7' }) } as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('late');

    expect(dbRun).toHaveBeenNthCalledWith(1, 'UPDATE attendance_records SET status = ? WHERE id = ?', [
      'recorded',
      7,
    ]);
    expect(dbRun).toHaveBeenNthCalledWith(
      2,
      `UPDATE participations
       SET attendance_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE activity_id = ? AND student_id = ?`,
      ['attended', 11, 22]
    );
  });

  it('returns canonical not-found when attendance record does not exist', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => null,
      dbRun: async () => ({ changes: 1 }),
    }));

    const route = await import('../src/app/api/admin/attendance/[id]/route');
    const res: any = await route.PUT(
      { json: async () => ({ status: 'present' }) } as any,
      { params: Promise.resolve({ id: '7' }) } as any
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});
