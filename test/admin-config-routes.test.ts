import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  dbAll: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  prepare: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbGet: mocks.dbGet,
  dbRun: mocks.dbRun,
  db: {
    prepare: mocks.prepare,
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    mkdirSync: mocks.mkdirSync,
    writeFileSync: mocks.writeFileSync,
  },
  existsSync: mocks.existsSync,
  mkdirSync: mocks.mkdirSync,
  writeFileSync: mocks.writeFileSync,
}));

describe('admin config routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin', email: 'admin@annd.edu.vn' });
    mocks.dbAll.mockResolvedValue([
      { category: 'email', value: JSON.stringify({ smtpHost: 'smtp.example.com', enabled: true }) },
      { category: 'maintenance', value: JSON.stringify({ enabled: true, message: 'Bao tri' }) },
    ]);
    mocks.dbGet.mockResolvedValue({ id: 5 });
    mocks.dbRun.mockResolvedValue({ changes: 1 });
    mocks.existsSync.mockReturnValue(true);
    mocks.prepare.mockImplementation((sql: string) => ({
      all: vi.fn(() => [{ value: JSON.stringify({ bgColor: '#111111', logoEnabled: true }) }]),
      get: vi.fn(() => (sql.includes('SELECT id') ? { id: 9 } : null)),
      run: vi.fn(() => ({ changes: 1 })),
    }));
  });

  it('returns merged advanced config with canonical success shape', async () => {
    const route = await import('../src/app/api/admin/system-config/advanced/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.email).toMatchObject({ smtpHost: 'smtp.example.com', enabled: true });
    expect(body.maintenance).toMatchObject({ enabled: true, message: 'Bao tri' });
  });

  it('validates advanced config updates canonically', async () => {
    const route = await import('../src/app/api/admin/system-config/advanced/route');
    const response = await route.PUT({ json: async () => ({}) } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('simulates test email with canonical success response', async () => {
    const route = await import('../src/app/api/admin/system-config/test-email/route');
    const response = await route.POST({
      json: async () => ({
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPass: 'secret',
        smtpFrom: 'noreply@example.com',
      }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('admin@annd.edu.vn');
  });

  it('returns qr design via canonical success response while preserving top-level fields', async () => {
    const route = await import('../src/app/api/admin/qr-design/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.bgColor).toBe('#111111');
    expect(body.logoEnabled).toBe(true);
  });

  it('validates missing qr design payload canonically', async () => {
    const route = await import('../src/app/api/admin/qr-design/route');
    const response = await route.PUT({ formData: async () => new FormData() } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
