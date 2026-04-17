import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api-response';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  dbAll: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbRun: mocks.dbRun,
  dbGet: vi.fn(),
}));

describe('GET /api/admin/classes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical classes list and pagination shape for admin users', async () => {
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.dbAll
      .mockResolvedValueOnce([{ total: 3 }])
      .mockResolvedValueOnce([
        { id: 21, name: 'CNTT K66', grade: 'K66', student_count: 40 },
        { id: 22, name: 'ATTT K66', grade: 'K66', student_count: 38 },
      ]);

    const { GET } = await import('@/app/api/admin/classes/route');
    const request = new NextRequest('http://localhost:3000/api/admin/classes?page=1&limit=2');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.classes).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('preserves forbidden errors from requireApiRole', async () => {
    mocks.requireApiRole.mockRejectedValue(ApiError.forbidden('Không có quyền truy cập'));

    const { GET } = await import('@/app/api/admin/classes/route');
    const request = new NextRequest('http://localhost:3000/api/admin/classes');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Không có quyền truy cập');
    expect(body.code).toBe('FORBIDDEN');
  });
});
