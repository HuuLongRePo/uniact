import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('approval lifecycle routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('admin approval route does not recreate a missing pending approval record implicitly', async () => {
    const submitActivityForApproval = vi.fn();

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi
        .fn()
        .mockResolvedValueOnce({
          id: 55,
          teacher_id: 7,
          status: 'draft',
          approval_status: 'requested',
          approval_notes: null,
          title: 'Activity A',
        })
        .mockResolvedValueOnce(undefined),
      dbHelpers: {
        submitActivityForApproval,
        decideApproval: vi.fn(),
      },
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/admin/activities/[id]/approval/route');
    const response = await route.POST(
      { json: async () => ({ action: 'approve' }) } as any,
      { params: Promise.resolve({ id: '55' }) } as any
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.error).toBe('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý');
    expect(submitActivityForApproval).not.toHaveBeenCalled();
  });

  it('legacy approve route also fails closed when pending approval record is missing', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi
        .fn()
        .mockResolvedValueOnce({
          id: 55,
          title: 'Activity A',
          teacher_id: 7,
          status: 'draft',
          approval_status: 'requested',
          approval_notes: null,
        })
        .mockResolvedValueOnce(undefined),
    }));

    vi.doMock('@/lib/cache', () => ({
      cache: { invalidatePrefix: vi.fn() },
    }));

    const route = await import('../src/app/api/activities/[id]/approve/route');
    const response = await route.POST(
      { json: async () => ({ notes: 'OK' }) } as any,
      { params: Promise.resolve({ id: '55' }) } as any
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('CONFLICT');
    expect(body.error).toBe('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý');
  });
});
