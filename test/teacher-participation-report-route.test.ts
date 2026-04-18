import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/teacher/reports/participation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden guard errors instead of collapsing to unauthorized', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbAll: async () => [],
    }));

    vi.doMock('@/lib/calculations', () => ({
      calculateParticipationRate: () => 0,
    }));

    const route = await import('../src/app/api/teacher/reports/participation/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Không có quyền truy cập');
  });
});
