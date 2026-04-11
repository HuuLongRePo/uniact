import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUserFromToken = vi.fn()
const mockDbAll = vi.fn()
const mockDbRun = vi.fn()
const mockDbReady = vi.fn()

vi.mock('@/lib/auth', () => ({
  getUserFromToken: (...args: any[]) => mockGetUserFromToken(...args),
}))

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
  dbReady: (...args: any[]) => mockDbReady(...args),
}))

describe('POST /api/teacher/notifications/history/export', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUserFromToken.mockReset()
    mockDbAll.mockReset()
    mockDbRun.mockReset()
    mockDbReady.mockReset()

    mockGetUserFromToken.mockResolvedValue({ id: 12, role: 'teacher' })
    mockDbRun.mockResolvedValue({ changes: 0 })
    mockDbReady.mockResolvedValue(undefined)
  })

  it('exports csv using read-status and class filters', async () => {
    mockDbAll.mockResolvedValue([
      {
        id: 1001,
        notification_id: 91,
        notification_title: 'Nhắc điểm danh',
        student_name: 'Nguyen Van A',
        class_name: 'CTK42',
        sent_at: '2027-01-10T08:00:00.000Z',
        is_read: 1,
      },
      {
        id: 1002,
        notification_id: 91,
        notification_title: 'Nhắc điểm danh',
        student_name: 'Tran Thi B',
        class_name: 'CTK43',
        sent_at: '2027-01-10T08:05:00.000Z',
        is_read: 0,
      },
    ])

    const route = await import('../src/app/api/teacher/notifications/history/export/route')
    const response = await route.POST({
      cookies: { get: () => ({ value: 'token' }) },
      json: async () => ({
        filters: {
          readStatus: 'read',
          classId: 'CTK42',
        },
      }),
    } as any)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')

    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191])

    const csv = new TextDecoder('utf-8').decode(bytes)
    expect(csv).toContain('Nguyen Van A')
    expect(csv).not.toContain('Tran Thi B')
    expect(csv).toContain('Không theo dõi')
  })
})
