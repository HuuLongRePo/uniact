import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/activity-approvals', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET preserves forbidden errors from guard', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        const { ApiError } = await import('@/lib/api-response');
        throw ApiError.forbidden('Khong co quyen');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbHelpers: { getPendingApprovals: vi.fn() },
      dbGet: vi.fn(),
    }));

    const route = await import('../src/app/api/activity-approvals/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('POST preserves conflict errors from approval decision path', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({ id: 55 }),
      dbHelpers: {
        getPendingApprovals: vi.fn(),
        decideApproval: async () => {
          throw new Error('Approval already processed');
        },
      },
    }));

    const route = await import('../src/app/api/activity-approvals/route');
    const response = await route.POST({
      json: async () => ({ approval_id: 55, action: 'approved', note: 'ok' }),
    } as any);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('CONFLICT');
  });
});
