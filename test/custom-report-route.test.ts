import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('POST /api/admin/reports/custom', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden guard errors instead of relying on legacy session auth', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/admin/reports/custom/route');
    const response = await route.POST({ json: async () => ({ type: 'activities', columns: ['id'] }) } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Không có quyền truy cập');
  });

  it('exports csv for score reports with computed rank column', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [
        {
          id: 7,
          name: 'Student A',
          class: 'CTK42',
          total_points: 25,
          activities_joined: 3,
          avg_rating: 1.2,
          updated_at: '2026-04-18T00:00:00.000Z',
        },
      ],
    }));

    const route = await import('../src/app/api/admin/reports/custom/route');
    const response = await route.POST({
      json: async () => ({
        name: 'score-report',
        type: 'scores',
        columns: ['name', 'total_points', 'rank'],
        format: 'csv',
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');

    const csv = await response.text();
    expect(csv).toContain('Họ tên');
    expect(csv).toContain('Tổng điểm');
    expect(csv).toContain('Xếp hạng');
    expect(csv).toContain('Student A');
    expect(csv).toContain('"1"');
  });
});
