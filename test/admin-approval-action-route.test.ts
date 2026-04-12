import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('POST /api/admin/activities/[id]/approval', () => {
  it('returns not found when the activity does not exist', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: vi.fn(async () => ({ id: 1, role: 'admin' })),
    }));

    vi.doMock('@/lib/database', () => ({
      dbHelpers: {},
      dbGet: vi.fn(async () => undefined),
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/admin/activities/[id]/approval/route');
    const request = {
      json: vi.fn(async () => ({ action: 'approve' })),
    } as any;

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body).toMatchObject({
      error: 'Không tìm thấy hoạt động',
      code: 'NOT_FOUND',
    });
  });

  it('returns validation error when rejecting without notes', async () => {
    const requireApiRole = vi.fn(async () => ({ id: 1, role: 'admin' }));

    vi.doMock('@/lib/guards', () => ({ requireApiRole }));
    vi.doMock('@/lib/database', () => ({
      dbHelpers: {},
      dbGet: vi.fn(),
    }));
    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/admin/activities/[id]/approval/route');
    const request = {
      json: vi.fn(async () => ({ action: 'reject', notes: '   ' })),
    } as any;

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toMatchObject({
      notes: 'Vui lòng nhập lý do từ chối',
    });
  });
});
