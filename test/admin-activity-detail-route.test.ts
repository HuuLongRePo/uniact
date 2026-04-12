import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin activity detail route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical display status for requested activities without mutating stored workflow fields', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbRun: async () => ({ changes: 1 }),
      dbGet: async () => ({
        id: 77,
        title: 'Requested Activity',
        status: 'draft',
        approval_status: 'requested',
        activity_type_name: 'Tinh nguyen',
        organization_level_name: 'Cap truong',
        creator_name: 'Teacher A',
      }),
    }));

    const route = await import('../src/app/api/admin/activities/[id]/route');
    const res: any = await route.GET(
      { url: 'http://localhost/api/admin/activities/77' } as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.activity).toMatchObject({
      id: 77,
      status: 'pending',
      approval_status: 'requested',
    });
  });

  it('preserves forbidden errors from requireApiRole instead of collapsing to unauthorized/raw responses', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbRun: async () => ({ changes: 1 }),
      dbGet: async () => null,
    }));

    const route = await import('../src/app/api/admin/activities/[id]/route');
    const res: any = await route.GET(
      { url: 'http://localhost/api/admin/activities/77' } as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Không có quyền truy cập');
  });

  it('rejects empty update payloads with canonical validation errors', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbRun: async () => ({ changes: 1 }),
      dbGet: async () => ({ id: 77 }),
    }));

    const route = await import('../src/app/api/admin/activities/[id]/route');
    const res: any = await route.PUT(
      {
        json: async () => ({}),
      } as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found on delete when the activity does not exist', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    const dbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbRun,
      dbGet: async () => null,
    }));

    const route = await import('../src/app/api/admin/activities/[id]/route');
    const res: any = await route.DELETE(
      {} as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('NOT_FOUND');
    expect(dbRun).not.toHaveBeenCalled();
  });
});
