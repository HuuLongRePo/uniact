import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserFromSession = vi.fn()
const mockDbAll = vi.fn()
const mockDbRun = vi.fn()

vi.mock('@/lib/auth', () => ({
  getUserFromSession: (...args: any[]) => mockGetUserFromSession(...args),
}))

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
}))

describe('Alerts API', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUserFromSession.mockReset()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
  })

  it('returns normalized alerts with summary and hotspots', async () => {
    mockGetUserFromSession.mockResolvedValue({ id: 5, role: 'admin' })
    mockDbAll
      .mockResolvedValueOnce([{ name: 'id' }, { name: 'message' }, { name: 'resolved' }])
      .mockResolvedValueOnce([
        {
          id: 1,
          user_id: 5,
          level: 'critical',
          message: 'Cảnh báo 1',
          is_read: 0,
          resolved: 0,
          resolved_at: null,
          related_table: 'activities',
          related_id: 99,
          created_at: '2027-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          user_id: null,
          level: 'warning',
          message: 'Cảnh báo 2',
          is_read: 1,
          resolved: 1,
          resolved_at: '2027-01-01T01:00:00.000Z',
          related_table: 'scores',
          related_id: 42,
          created_at: '2027-01-01T01:00:00.000Z',
        },
      ])

    const route = await import('../src/app/api/alerts/route')
    const response = await route.GET({} as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.alerts).toHaveLength(2)
    expect(body.data.alerts[0]).toMatchObject({
      id: 1,
      is_read: false,
      resolved: false,
      level: 'critical',
    })
    expect(body.data.summary).toMatchObject({
      total_alerts: 2,
      unread_alerts: 1,
      unresolved_alerts: 1,
      critical_alerts: 1,
      warning_alerts: 1,
      info_alerts: 0,
    })
    expect(body.data.summary.escalation_hotspots[0].id).toBe(1)
    expect(mockDbRun).toHaveBeenCalledWith('ALTER TABLE alerts ADD COLUMN is_read INTEGER DEFAULT 0')
  })

  it('marks alert as read for the current user', async () => {
    mockGetUserFromSession.mockResolvedValue({ id: 8, role: 'student' })
    mockDbAll.mockResolvedValue([{ name: 'is_read' }])
    mockDbRun.mockResolvedValue({ changes: 1 })

    const route = await import('../src/app/api/alerts/route')
    const response = await route.PUT({
      json: async () => ({ alertId: 7, action: 'read' }),
    } as any)

    expect(response.status).toBe(200)
    expect(mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('SET is_read = 1'),
      [7, 8]
    )
  })

  it('blocks non-staff users from resolving alerts', async () => {
    mockGetUserFromSession.mockResolvedValue({ id: 8, role: 'student' })
    mockDbAll.mockResolvedValue([{ name: 'is_read' }])

    const route = await import('../src/app/api/alerts/route')
    const response = await route.PUT({
      json: async () => ({ alertId: 7, action: 'resolve' }),
    } as any)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.code).toBe('FORBIDDEN')
  })
})
