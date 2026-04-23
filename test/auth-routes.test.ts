import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.UAT_MODE;
    delete process.env.PLAYWRIGHT;
  });

  it('POST /api/auth/login returns canonical payload and sets auth cookie on success', async () => {
    const loginUser = vi.fn().mockResolvedValue({
      user: { id: 1, email: 'admin@annd.edu.vn', role: 'admin', name: 'Admin' },
      token: 'token-123',
    });

    vi.doMock('@/lib/auth', () => ({ loginUser }));
    vi.doMock('@/lib/rateLimit', () => ({
      rateLimit: vi.fn(() => ({ allowed: true })),
    }));

    const route = await import('../src/app/api/auth/login/route');
    const res: any = await route.POST({
      json: async () => ({ email: 'admin@annd.edu.vn', password: 'secret' }),
      headers: new Headers(),
    } as any);

    expect(loginUser).toHaveBeenCalledWith({
      email: 'admin@annd.edu.vn',
      password: 'secret',
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user).toMatchObject({ email: 'admin@annd.edu.vn', role: 'admin' });
    expect(body.user).toMatchObject({ email: 'admin@annd.edu.vn', role: 'admin' });
    expect(body.data.token).toBe('token-123');

    const cookieHeader = res.headers.get('set-cookie') || '';
    expect(cookieHeader).toContain('token=token-123');
  });

  it('POST /api/auth/login preserves invalid credential errors as 401', async () => {
    vi.doMock('@/lib/auth', () => ({
      loginUser: vi.fn().mockRejectedValue(new Error('Email hoặc mật khẩu không đúng')),
    }));
    vi.doMock('@/lib/rateLimit', () => ({
      rateLimit: vi.fn(() => ({ allowed: true })),
    }));

    const route = await import('../src/app/api/auth/login/route');
    const res: any = await route.POST({
      json: async () => ({ email: 'admin@annd.edu.vn', password: 'bad-secret' }),
      headers: new Headers(),
    } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/auth/login bypasses rate limit for non-production UAT header', async () => {
    process.env.NODE_ENV = 'development';
    const loginUser = vi.fn().mockResolvedValue({
      user: { id: 2, email: 'teacher@annd.edu.vn', role: 'teacher', name: 'Teacher' },
      token: 'uat-token',
    });
    const rateLimit = vi.fn(() => ({ allowed: false }));

    vi.doMock('@/lib/auth', () => ({ loginUser }));
    vi.doMock('@/lib/rateLimit', () => ({ rateLimit }));

    const route = await import('../src/app/api/auth/login/route');
    const res: any = await route.POST({
      json: async () => ({ email: 'teacher@annd.edu.vn', password: 'secret' }),
      headers: new Headers({ 'x-uat-e2e': '1' }),
    } as any);

    expect(rateLimit).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('POST /api/auth/login keeps rate limit in production even with UAT header', async () => {
    process.env.NODE_ENV = 'production';
    const rateLimit = vi.fn(() => ({ allowed: false }));

    vi.doMock('@/lib/auth', () => ({
      loginUser: vi.fn(),
    }));
    vi.doMock('@/lib/rateLimit', () => ({ rateLimit }));

    const route = await import('../src/app/api/auth/login/route');
    const res: any = await route.POST({
      json: async () => ({ email: 'teacher@annd.edu.vn', password: 'secret' }),
      headers: new Headers({ 'x-uat-e2e': '1' }),
    } as any);

    expect(rateLimit).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
  });

  it('GET /api/auth/me returns unauthorized without clearing cookie when no token exists', async () => {
    vi.doMock('@/lib/auth', () => ({
      getUserFromToken: vi.fn(),
    }));

    const route = await import('../src/app/api/auth/me/route');
    const res: any = await route.GET({
      cookies: { get: vi.fn(() => undefined) },
      headers: new Headers(),
    } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);

    const cookieHeader = res.headers.get('set-cookie') || '';
    expect(cookieHeader).not.toContain('token=;');
  });

  it('GET /api/auth/me clears auth cookie when token is invalid', async () => {
    const getUserFromToken = vi.fn().mockResolvedValue(null);
    vi.doMock('@/lib/auth', () => ({ getUserFromToken }));

    const route = await import('../src/app/api/auth/me/route');
    const res: any = await route.GET({
      cookies: { get: vi.fn(() => ({ value: 'stale-token' })) },
      headers: new Headers(),
    } as any);

    expect(getUserFromToken).toHaveBeenCalledWith('stale-token');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);

    const cookieHeader = res.headers.get('set-cookie') || '';
    expect(cookieHeader).toContain('token=;');
    expect(cookieHeader).toContain('Max-Age=0');
  });

  it('POST /api/auth/logout clears auth cookie and returns canonical success payload', async () => {
    const route = await import('../src/app/api/auth/logout/route');
    const res: any = await route.POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({});

    const cookieHeader = res.headers.get('set-cookie') || '';
    expect(cookieHeader).toContain('token=;');
    expect(cookieHeader).toContain('Max-Age=0');
  });
});
