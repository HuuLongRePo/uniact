import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  copyFileSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbGet: mocks.dbGet,
  dbRun: mocks.dbRun,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
    copyFileSync: mocks.copyFileSync,
    statSync: mocks.statSync,
    readdirSync: mocks.readdirSync,
  },
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
  copyFileSync: mocks.copyFileSync,
  statSync: mocks.statSync,
  readdirSync: mocks.readdirSync,
}));

describe('admin database/system ops routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.dbRun.mockResolvedValue({ changes: 1, lastID: 1 });
    mocks.readFileSync.mockReturnValue(Buffer.from('backup-data'));
    mocks.copyFileSync.mockImplementation(() => undefined);
    mocks.statSync.mockImplementation((target: string) => {
      if (String(target).includes('uniact.db')) {
        return { size: 5 * 1024 * 1024, mtime: new Date('2026-04-13T05:00:00.000Z') } as any;
      }
      return { size: 1024, mtime: new Date('2026-04-13T04:00:00.000Z') } as any;
    });
    mocks.readdirSync.mockReturnValue(['backup-1.db', 'backup-2.db'] as any);
    mocks.existsSync.mockImplementation((target: string) => {
      const text = String(target);
      return text.includes('backups') || text.includes('uniact.db');
    });
    mocks.dbGet
      .mockResolvedValueOnce({ count: 12 })
      .mockResolvedValueOnce({ count: 50 })
      .mockResolvedValueOnce({ count: 20 })
      .mockResolvedValueOnce({ count: 70 })
      .mockResolvedValueOnce({ created_at: '2026-04-12T10:00:00.000Z' });
  });

  it('returns canonical forbidden error for database download', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    mocks.requireApiRole.mockRejectedValueOnce(ApiError.forbidden('Không có quyền truy cập'));

    const route = await import('../src/app/api/admin/database/download/route');
    const response = await route.GET({ nextUrl: new URL('http://localhost/api/admin/database/download?file=x.db') } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('validates backup filename for database download', async () => {
    const route = await import('../src/app/api/admin/database/download/route');
    const response = await route.GET({ nextUrl: new URL('http://localhost/api/admin/database/download') } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns binary response for valid database download', async () => {
    const route = await import('../src/app/api/admin/database/download/route');
    const response = await route.GET({ nextUrl: new URL('http://localhost/api/admin/database/download?file=backup-1.db') } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('backup-1.db');
  });

  it('restores database and returns canonical success shape', async () => {
    const route = await import('../src/app/api/admin/database/restore/route');
    const response = await route.POST({ json: async () => ({ filename: 'backup-1.db' }) } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.filename).toBe('backup-1.db');
    expect(mocks.copyFileSync).toHaveBeenCalledTimes(2);
  });

  it('returns canonical stats payload for database stats', async () => {
    const route = await import('../src/app/api/admin/database/stats/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stats).toMatchObject({
      tables: 12,
      records: 140,
      last_backup: '2026-04-12T10:00:00.000Z',
    });
  });

  it('returns canonical success shape for system stats', async () => {
    const route = await import('../src/app/api/admin/system-stats/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      dbPath: expect.any(String),
      dbSize: expect.any(String),
      uptime: expect.any(String),
    });
  });
});
