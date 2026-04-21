import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('GET /api/admin/activities/[id]/approval-history', () => {
  it('maps pending_approval history entries to pending request presentation', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          id: 1,
          status: 'pending_approval',
          notes: 'Gui duyet',
          changed_by: 7,
          changed_by_name: 'Teacher One',
          changed_at: '2026-04-12T08:00:00.000Z',
        },
      ],
    }));

    const route = await import('../src/app/api/admin/activities/[id]/approval-history/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '55' }) } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      id: 1,
      status: 'pending_approval',
      status_label: 'Đã gửi duyệt',
      is_pending_request: true,
      changed_by_name: 'Teacher One',
    });
  });

  it('preserves forbidden errors from guard instead of collapsing to 500', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        const { ApiError } = await import('@/lib/api-response');
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: vi.fn(),
    }));

    const route = await import('../src/app/api/admin/activities/[id]/approval-history/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '55' }) } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('keeps backward compatibility for legacy requested history entries', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          id: 2,
          status: 'requested',
          notes: 'Legacy',
          changed_by: 8,
          changed_by_name: 'Teacher Two',
          changed_at: '2026-04-12T09:00:00.000Z',
        },
      ],
    }));

    const route = await import('../src/app/api/admin/activities/[id]/approval-history/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '55' }) } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.history[0]).toMatchObject({
      id: 2,
      status: 'requested',
      is_pending_request: true,
      changed_by_name: 'Teacher Two',
    });
  });
});
