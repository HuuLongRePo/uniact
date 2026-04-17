import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api-response';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  rateLimit: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  hash: vi.fn(),
  randomBytes: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock('@/lib/database', () => ({
  dbGet: mocks.dbGet,
  dbRun: mocks.dbRun,
}));

vi.mock('bcryptjs', () => ({
  default: { hash: mocks.hash },
  hash: mocks.hash,
}));

vi.mock('crypto', () => ({
  default: { randomBytes: mocks.randomBytes },
}));

describe('POST /api/admin/users/[id]/reset-password', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.rateLimit.mockReturnValue({ allowed: true });
    mocks.hash.mockResolvedValue('hashed-temp-password');
    mocks.randomBytes.mockReturnValue({ toString: () => 'abc12345' });
  });

  it('returns temporary password in canonical success shape', async () => {
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin', email: 'admin@example.com' });
    mocks.dbGet.mockResolvedValue({ id: 22 });
    mocks.dbRun.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/admin/users/[id]/reset-password/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users/22/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '22' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.new_password).toBe('abc12345');
    expect(body.message).toBe('Mật khẩu đã được đặt lại');
  });

  it('rejects invalid user id with localized validation error', async () => {
    const { POST } = await import('@/app/api/admin/users/[id]/reset-password/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users/abc/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'abc' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('ID người dùng không hợp lệ');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('preserves forbidden errors from requireApiRole', async () => {
    mocks.requireApiRole.mockRejectedValue(ApiError.forbidden('Không có quyền truy cập'));

    const { POST } = await import('@/app/api/admin/users/[id]/reset-password/route');
    const request = new NextRequest('http://localhost:3000/api/admin/users/22/reset-password', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: '22' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Không có quyền truy cập');
    expect(body.code).toBe('FORBIDDEN');
  });
});
