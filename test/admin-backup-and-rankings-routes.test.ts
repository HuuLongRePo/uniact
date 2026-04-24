import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  dbAll: vi.fn(),
  dbGet: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbGet: mocks.dbGet,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
  },
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
}));

describe('admin backup and rankings routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(Buffer.from('db-binary'));
    mocks.dbGet.mockResolvedValue({ total: 1 });
    mocks.dbAll.mockResolvedValue([
      {
        student_id: 101,
        student_name: 'Long Nguyen',
        student_email: 'sv31a001@annd.edu.vn',
        class_id: 5,
        class_name: 'CNTT 31A',
        activity_points: 18,
        activity_count: 2,
        award_count: 1,
        award_points: 4,
      },
    ]);
  });

  it('preserves forbidden errors for admin backup route', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    mocks.requireApiRole.mockRejectedValueOnce(ApiError.forbidden('Không có quyền truy cập'));

    const route = await import('../src/app/api/admin/backup/route');
    const response = await route.POST({} as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns binary backup response for admin backup route', async () => {
    const route = await import('../src/app/api/admin/backup/route');
    const response = await route.POST({} as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="uniact-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.db"$/
    );
  });

  it('preserves forbidden errors for rankings route', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    mocks.requireApiRole.mockRejectedValueOnce(ApiError.forbidden('Không có quyền truy cập'));

    const route = await import('../src/app/api/admin/rankings/route');
    const response = await route.GET({ url: 'http://localhost/api/admin/rankings' } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns canonical success shape for rankings route', async () => {
    const route = await import('../src/app/api/admin/rankings/route');
    const response = await route.GET({ url: 'http://localhost/api/admin/rankings?page=1&limit=25' } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.rankings[0]).toMatchObject({
      rank: 1,
      student_id: 101,
      total_points: 22,
      activity_count: 2,
      award_count: 1,
      avg_points: 9,
    });
    expect(body.pagination).toMatchObject({ page: 1, limit: 25, total: 1, pages: 1 });
  });
});
