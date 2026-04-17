import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api-response';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  ensureUserColumns: vi.fn(),
  dbAll: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbRun: vi.fn(),
}));

vi.mock('@/app/api/admin/users/_utils', () => ({
  allowedRoles: ['admin', 'teacher', 'student', 'class_manager'],
  ensureUserColumns: mocks.ensureUserColumns,
  generateUserCode: vi.fn(),
}));

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.ensureUserColumns.mockResolvedValue(undefined);
  });

  it('returns canonical users list and pagination shape for admin users', async () => {
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.dbAll
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([
        { id: 11, full_name: 'Nguyen Van A', email: 'a@example.com', role: 'student' },
        { id: 12, full_name: 'Tran Thi B', email: 'b@example.com', role: 'teacher' },
      ]);

    const { GET } = await import('@/app/api/admin/users/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users?page=2&limit=2');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.users).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 2,
      totalPages: 1,
    });
    expect(mocks.ensureUserColumns).toHaveBeenCalled();
  });

  it('preserves forbidden errors from requireApiRole', async () => {
    mocks.requireApiRole.mockRejectedValue(ApiError.forbidden('Không có quyền truy cập'));

    const { GET } = await import('@/app/api/admin/users/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users');

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Không có quyền truy cập');
    expect(body.code).toBe('FORBIDDEN');
  });
});
