import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/teacher/activities/[id]/participants', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden errors from canonical guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => null,
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/teacher/activities/[id]/participants/route');
    const res: any = await route.GET({} as any, {
      params: Promise.resolve({ id: '44' }),
    } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });
});
