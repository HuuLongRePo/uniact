import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  dbAll: vi.fn(),
  dbRun: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.requireApiRole,
}))

vi.mock('@/lib/database', () => ({
  dbAll: mocks.dbAll,
  dbRun: mocks.dbRun,
}))

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    readdirSync: mocks.readdirSync,
    statSync: mocks.statSync,
    unlinkSync: mocks.unlinkSync,
  },
  existsSync: mocks.existsSync,
  readdirSync: mocks.readdirSync,
  statSync: mocks.statSync,
  unlinkSync: mocks.unlinkSync,
}))

describe('admin database backups routes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    mocks.requireApiRole.mockResolvedValue({ id: 1, role: 'admin', email: 'admin@annd.edu.vn' })
    mocks.dbRun.mockResolvedValue({ changes: 1, lastID: 1 })

    mocks.existsSync.mockImplementation((target: string) => String(target).includes('backups'))
    mocks.readdirSync.mockReturnValue(['backup-2.db', 'backup-1.db', 'README.md'] as any)
    mocks.statSync.mockImplementation((target: string) => {
      if (String(target).includes('backup-1.db')) {
        return { size: 4 * 1024 * 1024, mtime: new Date('2026-04-24T01:00:00.000Z') } as any
      }
      return { size: 2 * 1024 * 1024, mtime: new Date('2026-04-25T01:00:00.000Z') } as any
    })
    mocks.dbAll.mockResolvedValue([
      {
        filename: 'backup-1.db',
        size_mb: 4,
        created_at: '2026-04-24T01:00:00.000Z',
        created_by: 'admin@annd.edu.vn',
        status: 'success',
      },
    ])
  })

  it('lists backups from directory merged with backup history metadata', async () => {
    const route = await import('../src/app/api/admin/database/backups/route')
    const response = await route.GET({} as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.backups)).toBe(true)
    expect(body.backups).toHaveLength(2)
    expect(body.backups[0].filename).toBe('backup-2.db')
    expect(body.backups[1]).toMatchObject({
      filename: 'backup-1.db',
      created_by: 'admin@annd.edu.vn',
      status: 'success',
    })
  })

  it('returns empty list when backup directory does not exist', async () => {
    mocks.existsSync.mockReturnValue(false)

    const route = await import('../src/app/api/admin/database/backups/route')
    const response = await route.GET({} as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.backups).toEqual([])
  })

  it('deletes backup file and writes cleanup/audit records', async () => {
    const route = await import('../src/app/api/admin/database/backups/[filename]/route')
    const response = await route.DELETE(
      {} as any,
      { params: Promise.resolve({ filename: 'backup-1.db' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.filename).toBe('backup-1.db')
    expect(mocks.unlinkSync).toHaveBeenCalledTimes(1)
    expect(mocks.dbRun).toHaveBeenCalledWith('DELETE FROM backup_history WHERE filename = ?', [
      'backup-1.db',
    ])
    expect(mocks.dbRun).toHaveBeenCalledWith(
      expect.stringContaining('DATABASE_BACKUP_DELETE'),
      [1, JSON.stringify({ filename: 'backup-1.db' })]
    )
  })

  it('rejects invalid backup filename for delete route', async () => {
    const route = await import('../src/app/api/admin/database/backups/[filename]/route')
    const response = await route.DELETE(
      {} as any,
      { params: Promise.resolve({ filename: '../escape.db' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('VALIDATION_ERROR')
  })
})

