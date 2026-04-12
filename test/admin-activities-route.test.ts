import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/admin/activities', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical success shape and derives pending display status from approval_status', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbAll: async () => [
        {
          id: 21,
          title: 'Requested Activity',
          description: 'Desc',
          teacher_id: 9,
          teacher_name: 'Teacher A',
          activity_type: 'Tinh nguyen',
          organization_level: 'Cap truong',
          date_time: '2026-04-12T10:00:00.000Z',
          end_time: '2026-04-12T12:00:00.000Z',
          location: 'Hall',
          max_participants: 100,
          participant_count: 10,
          points: 5,
          status: 'draft',
          approval_status: 'requested',
          created_at: '2026-04-01T10:00:00.000Z',
        },
      ],
      dbGet: async () => ({ total: 1 }),
    }));

    const route = await import('../src/app/api/admin/activities/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/admin/activities?page=1&limit=20',
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.activities).toHaveLength(1);
    expect(body.activities[0]).toMatchObject({
      status: 'pending',
      approval_status: 'requested',
    });
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('preserves forbidden errors from guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbAll: async () => [],
      dbGet: async () => ({ total: 0 }),
    }));

    const route = await import('../src/app/api/admin/activities/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/admin/activities',
    } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('rejects invalid teacher_id filters with validation error', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin', name: 'Admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbAll: async () => [],
      dbGet: async () => ({ total: 0 }),
    }));

    const route = await import('../src/app/api/admin/activities/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/admin/activities?teacher_id=abc',
    } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
