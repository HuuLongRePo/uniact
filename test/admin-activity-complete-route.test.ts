import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin activity complete route', () => {
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
      dbGet: async () => null,
      dbRun: async () => ({ changes: 1 }),
      dbAll: async () => [],
    }));

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        autoCalculateAfterEvaluation: vi.fn(),
      },
    }));

    const route = await import('../src/app/api/admin/activities/[id]/complete/route');
    const res: any = await route.POST({} as any, { params: Promise.resolve({ id: '5' }) } as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns canonical validation when activity is already completed', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ id: 5, title: 'Test', status: 'completed' }),
      dbRun: async () => ({ changes: 1 }),
      dbAll: async () => [],
    }));

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        autoCalculateAfterEvaluation: vi.fn(),
      },
    }));

    const route = await import('../src/app/api/admin/activities/[id]/complete/route');
    const res: any = await route.POST({} as any, { params: Promise.resolve({ id: '5' }) } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
