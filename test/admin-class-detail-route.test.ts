import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api-response';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
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

describe('GET /api/admin/classes/[id]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical class detail shape with teacher list', async () => {
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.dbGet.mockResolvedValueOnce({ id: 8, name: 'CNTT K66', grade: 'K66', student_count: 40 });
    mocks.dbAll.mockResolvedValueOnce([{ id: 5, name: 'Nguyen Van GV', email: 'gv@example.com' }]);

    const { GET } = await import('@/app/api/admin/classes/[id]/route');
    const request = new NextRequest('http://localhost:3000/api/admin/classes/8');

    const response = await GET(request, { params: Promise.resolve({ id: '8' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.class.id).toBe(8);
    expect(body.data.class.teachers).toHaveLength(1);
  });

  it('rejects invalid class id with canonical validation error', async () => {
    const { GET } = await import('@/app/api/admin/classes/[id]/route');
    const request = new NextRequest('http://localhost:3000/api/admin/classes/abc');

    const response = await GET(request, { params: Promise.resolve({ id: 'abc' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('ID lớp không hợp lệ');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('preserves forbidden errors from requireApiRole', async () => {
    mocks.requireApiRole.mockRejectedValue(ApiError.forbidden('Không có quyền truy cập'));

    const { GET } = await import('@/app/api/admin/classes/[id]/route');
    const request = new NextRequest('http://localhost:3000/api/admin/classes/8');

    const response = await GET(request, { params: Promise.resolve({ id: '8' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Không có quyền truy cập');
    expect(body.code).toBe('FORBIDDEN');
  });
});
