import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin config route contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden errors for activity types route', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
      dbRun: async () => ({ changes: 1, lastID: 1 }),
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
      CACHE_TTL: {},
    }));

    const route = await import('../src/app/api/admin/activity-types/route');
    const res: any = await route.GET({} as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns canonical conflict for duplicate organization level names', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [{ id: 1 }],
      dbRun: async () => ({ changes: 1, lastID: 1 }),
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/admin/organization-levels/route');
    const res: any = await route.POST({
      json: async () => ({ name: 'Cap truong', multiplier: 2 }),
    } as any);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('CONFLICT');
  });

  it('returns canonical success payload for creating activity types', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    const invalidatePrefix = vi.fn();
    const dbRun = vi.fn(async () => ({ changes: 1, lastID: 9 }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
      dbRun,
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix },
      CACHE_TTL: {},
    }));

    const route = await import('../src/app/api/admin/activity-types/route');
    const res: any = await route.POST({
      json: async () => ({ name: 'Tinh nguyen', multiplier: 1.5, description: 'Mo ta' }),
    } as any);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: 9, name: 'Tinh nguyen', multiplier: 1.5 });
    expect(invalidatePrefix).toHaveBeenCalledWith('activity_types');
    expect(dbRun).toHaveBeenCalled();
  });
});
