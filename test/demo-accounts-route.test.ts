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

  it('allows demo accounts endpoint in production when env flag is enabled', async () => {
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

  it('returns 404 when demo accounts env flag is disabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');

    const route = await import('../src/app/api/auth/demo-accounts/route');
    const response = await route.GET();

    expect(response.status).toBe(404);
  });
});
