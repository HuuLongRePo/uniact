import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('POST /api/teacher/activities/[id]/resubmit', () => {
  it('allows owner teacher to resubmit rejected activity', async () => {
    const submitActivityForApproval = vi.fn(async () => ({ lastID: 501 }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 22, role: 'teacher' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => ({ id: 77, teacher_id: 22, approval_status: 'rejected' }),
      dbHelpers: {
        submitActivityForApproval,
      },
    }));

    const route = await import('../src/app/api/teacher/activities/[id]/resubmit/route');
    const response = await route.POST(
      {
        json: async () => ({ message: 'Gui lai de admin xem lai' }),
      } as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(submitActivityForApproval).toHaveBeenCalledWith(77, 22, 'Gui lai de admin xem lai');
  });

  it('preserves forbidden error contract for non-owner teacher', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 22, role: 'teacher' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => ({ id: 77, teacher_id: 99, approval_status: 'rejected' }),
      dbHelpers: {
        submitActivityForApproval: vi.fn(),
      },
    }));

    const route = await import('../src/app/api/teacher/activities/[id]/resubmit/route');
    const response = await route.POST(
      {
        json: async () => ({ message: 'Gui lai de admin xem lai' }),
      } as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns conflict when activity is already pending', async () => {
    const submitActivityForApproval = vi.fn(async () => ({ alreadyPending: true }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 22, role: 'teacher' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => ({ id: 77, teacher_id: 22, approval_status: 'requested' }),
      dbHelpers: {
        submitActivityForApproval,
      },
    }));

    const route = await import('../src/app/api/teacher/activities/[id]/resubmit/route');
    const response = await route.POST(
      {
        json: async () => ({ message: 'Gui lai de admin xem lai' }),
      } as any,
      { params: Promise.resolve({ id: '77' }) } as any
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('CONFLICT');
  });
});
