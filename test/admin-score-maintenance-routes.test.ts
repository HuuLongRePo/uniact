import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireApiRole = vi.fn()
const mockDbAll = vi.fn()
const mockGetFinalScoreLedgerByStudentIds = vi.fn()

vi.mock('@/lib/guards', () => ({
  requireApiRole: (...args: any[]) => mockRequireApiRole(...args),
}))

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
}))

vi.mock('@/lib/score-ledger', () => ({
  getFinalScoreLedgerByStudentIds: (...args: any[]) => mockGetFinalScoreLedgerByStudentIds(...args),
}))

describe('admin score maintenance routes', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRequireApiRole.mockReset()
    mockDbAll.mockReset()
    mockGetFinalScoreLedgerByStudentIds.mockReset()
    mockRequireApiRole.mockResolvedValue({ id: 1, role: 'admin' })
  })

  it('recalculate route uses canonical attended status', async () => {
    mockDbAll
      .mockResolvedValueOnce([{ student_id: 10 }, { student_id: 11 }])
      .mockResolvedValueOnce([{ total: 12 }])
      .mockResolvedValueOnce([{ total: 8 }])

    const route = await import('../src/app/api/admin/scores/recalculate/route')
    const response = await route.POST({} as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.updated).toBe(2)

    const firstQuery = String(mockDbAll.mock.calls[0][0])
    const secondQuery = String(mockDbAll.mock.calls[1][0])
    expect(firstQuery).toContain("attendance_status = 'attended'")
    expect(firstQuery).not.toContain("attendance_status = 'present'")
    expect(secondQuery).toContain("p.attendance_status = 'attended'")
  })

  it('leaderboard route returns canonical success payload and clamps limit', async () => {
    mockDbAll.mockResolvedValueOnce([
      {
        rank: 1,
        user_id: 10,
        name: 'Nguyen Van A',
        email: 'a@example.com',
        class_name: 'CTK42',
        total_points: 120,
        activities_count: 3,
      },
    ])
    mockGetFinalScoreLedgerByStudentIds.mockResolvedValue(
      new Map([[10, { final_total: 120 }]])
    )

    const route = await import('../src/app/api/admin/leaderboard/route')
    const response = await route.GET({ url: 'http://localhost/api/admin/leaderboard?limit=999' } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.limit).toBe(100)
    expect(body.leaderboard[0]).toMatchObject({ user_id: 10, total_points: 120 })

    const query = String(mockDbAll.mock.calls[0][0])
    expect(query).toContain("p.attendance_status = 'attended'")
    expect(query).not.toContain("attendance_status = 'present'")
    expect(mockGetFinalScoreLedgerByStudentIds).toHaveBeenCalledWith([10])
  })

  it('leaderboard route preserves canonical forbidden error', async () => {
    mockRequireApiRole.mockRejectedValue({ status: 403, code: 'FORBIDDEN', message: 'Không có quyền truy cập' })

    const route = await import('../src/app/api/admin/leaderboard/route')
    const response = await route.GET({ url: 'http://localhost/api/admin/leaderboard' } as any)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.code).toBe('FORBIDDEN')
  })
})
