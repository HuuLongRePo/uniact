import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin config item route contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical validation when updating activity type with no fields', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ id: 1 }),
      dbRun: async () => ({ changes: 1 }),
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/admin/activity-types/[id]/route');
    const res: any = await route.PUT(
      { json: async () => ({}) } as any,
      { params: Promise.resolve({ id: '1' }) } as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns canonical validation when deleting organization level that is still in use', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi
        .fn()
        .mockResolvedValueOnce({ id: 2, name: 'Cap truong' })
        .mockResolvedValueOnce({ id: 99 }),
      dbRun: async () => ({ changes: 1 }),
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/admin/organization-levels/[id]/route');
    const res: any = await route.DELETE(
      {} as any,
      { params: Promise.resolve({ id: '2' }) } as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
