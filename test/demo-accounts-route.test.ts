import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbAll = vi.fn();
const mockDbReady = vi.fn(async () => undefined);

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbReady: () => mockDbReady(),
}));

vi.mock('@/lib/api-response', async () => {
  const actual = await vi.importActual<any>('../src/lib/api-response');
  return actual;
});

describe('GET /api/auth/demo-accounts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('allows demo accounts endpoint in production when ENABLE_DEMO_ACCOUNTS env flag is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '1');

    mockDbAll
      .mockResolvedValueOnce([{ email: 'admin@annd.edu.vn', name: 'Admin', role: 'admin' }])
      .mockResolvedValueOnce([{ email: 'teacher@annd.edu.vn', name: 'Teacher', role: 'teacher' }])
      .mockResolvedValueOnce([{ email: 'student@annd.edu.vn', name: 'Student', role: 'student', class_name: 'D31A' }]);

    const route = await import('../src/app/api/auth/demo-accounts/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(3);
    expect(body.accounts.admin).toBe('admin@annd.edu.vn');
  });

  it('allows demo accounts endpoint in production when NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS env flag is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '1');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');

    mockDbAll
      .mockResolvedValueOnce([{ email: 'admin@annd.edu.vn', name: 'Admin', role: 'admin' }])
      .mockResolvedValueOnce([{ email: 'teacher@annd.edu.vn', name: 'Teacher', role: 'teacher' }])
      .mockResolvedValueOnce([{ email: 'student@annd.edu.vn', name: 'Student', role: 'student', class_name: 'D31A' }]);

    const route = await import('../src/app/api/auth/demo-accounts/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(3);
    expect(body.accounts.admin).toBe('admin@annd.edu.vn');
  });

  it('returns 404 when demo accounts env flag is disabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');

    const route = await import('../src/app/api/auth/demo-accounts/route');
    const response = await route.GET();

    expect(response.status).toBe(404);
  });

  it('allows demo accounts endpoint in development by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');

    mockDbAll
      .mockResolvedValueOnce([{ email: 'admin@annd.edu.vn', name: 'Admin', role: 'admin' }])
      .mockResolvedValueOnce([{ email: 'teacher@annd.edu.vn', name: 'Teacher', role: 'teacher' }])
      .mockResolvedValueOnce([{ email: 'student@annd.edu.vn', name: 'Student', role: 'student', class_name: 'D31A' }]);

    const route = await import('../src/app/api/auth/demo-accounts/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('supports searching active users by name/email for quick login panel', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');

    mockDbAll.mockResolvedValueOnce([
      { email: 'teacher.one@annd.edu.vn', name: 'Nguyen One', role: 'teacher' },
      { email: 'teacher.two@annd.edu.vn', name: 'Nguyen Two', role: 'teacher' },
    ]);

    const route = await import('../src/app/api/auth/demo-accounts/route');
    const request = new Request('http://localhost/api/auth/demo-accounts?q=nguyen&limit=1');
    const response = await route.GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.data[0].name).toBe('Nguyen One');
    expect(body.search.hasMore).toBe(true);
  });
});
