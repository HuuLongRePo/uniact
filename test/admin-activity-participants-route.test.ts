import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/admin/activities/[id]/participants', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical success shape and normalizes attendance statuses', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          id: 1,
          user_id: 11,
          user_name: 'Student A',
          user_email: 'a@example.com',
          class_name: 'CNTT 1',
          registered_at: '2026-04-12T10:00:00.000Z',
          attendance_status: 'attended',
          achievement_level: null,
          points_earned: 5,
        },
        {
          id: 2,
          user_id: 12,
          user_name: 'Student B',
          user_email: 'b@example.com',
          class_name: 'CNTT 2',
          registered_at: '2026-04-12T10:00:00.000Z',
          attendance_status: 'registered',
          achievement_level: null,
          points_earned: 0,
        },
      ],
    }));

    const route = await import('../src/app/api/admin/activities/[id]/participants/route');
    const res: any = await route.GET(
      { url: 'http://localhost/api/admin/activities/88/participants' } as any,
      { params: Promise.resolve({ id: '88' }) } as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.participants).toHaveLength(2);
    expect(body.participants[0].attendance_status).toBe('present');
    expect(body.participants[1].attendance_status).toBe('not_participated');
  });

  it('preserves forbidden errors from guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/admin/activities/[id]/participants/route');
    const res: any = await route.GET(
      { url: 'http://localhost/api/admin/activities/88/participants' } as any,
      { params: Promise.resolve({ id: '88' }) } as any
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('rejects invalid activity ids with canonical validation error', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/admin/activities/[id]/participants/route');
    const res: any = await route.GET(
      { url: 'http://localhost/api/admin/activities/not-a-number/participants' } as any,
      { params: Promise.resolve({ id: 'not-a-number' }) } as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
