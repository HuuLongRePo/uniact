import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('PUT /api/activities/[id]/status', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden errors from guard instead of collapsing to 500', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => null,
      dbRun: async () => ({ changes: 1 }),
      dbHelpers: {
        createAuditLog: async () => undefined,
      },
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: {
        invalidatePrefix: vi.fn(),
      },
    }));

    vi.doMock('@/lib/activity-workflow', () => ({
      validateTransition: vi.fn(),
      getStatusLabel: vi.fn((status: string) => status),
    }));

    const route = await import('../src/app/api/activities/[id]/status/route');
    const res: any = await route.PUT(
      {
        json: async () => ({ status: 'published' }),
      } as any,
      { params: Promise.resolve({ id: '12' }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Không có quyền truy cập');
  });
});
