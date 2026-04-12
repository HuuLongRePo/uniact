import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('GET /api/admin/activities/pending', () => {
  it('requires admin auth and maps requested approvals to pending display status', async () => {
    const dbAll = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 11,
          title: 'Hoat dong cho duyet',
          status: 'draft',
          approval_status: 'requested',
          creator_name: 'Teacher One',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    vi.doMock('@/lib/database', () => ({
      dbReady: vi.fn(async () => {}),
      dbAll,
    }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    const route = await import('../src/app/api/admin/activities/pending/route');
    const response = await route.GET({
      url: 'http://localhost/api/admin/activities/pending?page=1&limit=20',
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.activities).toHaveLength(1);
    expect(body.activities[0]).toMatchObject({
      id: 11,
      status: 'pending',
      approval_status: 'requested',
    });
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('rejects non-admin users with canonical api error shape', async () => {
    vi.doMock('@/lib/database', () => ({
      dbReady: vi.fn(async () => {}),
      dbAll: vi.fn(),
    }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        const { ApiError } = await import('@/lib/api-response');
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    const route = await import('../src/app/api/admin/activities/pending/route');
    const response = await route.GET({
      url: 'http://localhost/api/admin/activities/pending',
    } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });
});
