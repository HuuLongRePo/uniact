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
});
