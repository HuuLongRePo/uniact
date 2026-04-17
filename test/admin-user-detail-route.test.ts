import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api-response';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  ensureUserColumns: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbGet: mocks.dbGet,
  dbAll: mocks.dbAll,
  dbRun: mocks.dbRun,
}));

vi.mock('@/app/api/admin/users/_utils', () => ({
  allowedRoles: ['admin', 'teacher', 'student', 'class_manager'],
  ensureUserColumns: mocks.ensureUserColumns,
}));

describe('GET /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.ensureUserColumns.mockResolvedValue(undefined);
  });

  it('returns canonical user detail shape with stats and recent data', async () => {
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.dbGet
      .mockResolvedValueOnce({ id: 15, full_name: 'Le Van C', role: 'student', email: 'c@example.com' })
      .mockResolvedValueOnce({ total_participations: 7, attended: 5 });
    mocks.dbAll
      .mockResolvedValueOnce([{ id: 101, title: 'Sinh hoạt đầu khóa', attendance_status: 'attended' }])
      .mockResolvedValueOnce([{ id: 201, reason: 'Tham gia tích cực' }]);

    const { GET } = await import('@/app/api/admin/users/[id]/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users/15');

    const response = await GET(request, { params: Promise.resolve({ id: '15' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user.id).toBe(15);
    expect(body.data.user.stats).toEqual({ total_participations: 7, attended: 5 });
    expect(body.data.user.recentActivities).toHaveLength(1);
    expect(body.data.user.awards).toHaveLength(1);
  });

  it('rejects invalid user id with canonical validation error', async () => {
    const { GET } = await import('@/app/api/admin/users/[id]/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users/abc');

    const response = await GET(request, { params: Promise.resolve({ id: 'abc' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('ID người dùng không hợp lệ');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('preserves forbidden errors from requireApiRole', async () => {
    mocks.requireApiRole.mockRejectedValue(ApiError.forbidden('Không có quyền truy cập'));

    const { GET } = await import('@/app/api/admin/users/[id]/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users/15');

    const response = await GET(request, { params: Promise.resolve({ id: '15' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Không có quyền truy cập');
    expect(body.code).toBe('FORBIDDEN');
  });
});
