import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireApiRole = vi.fn()
const mockDbAll = vi.fn()

vi.mock('@/lib/guards', () => ({
  requireApiRole: (...args: any[]) => mockRequireApiRole(...args),
}))

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
}))

describe('GET /api/admin/scores', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRequireApiRole.mockReset()
    mockDbAll.mockReset()
    mockRequireApiRole.mockResolvedValue({ id: 1, role: 'admin' })
  })

  it('returns score summary and insights with bonus/penalty breakdown', async () => {
    mockDbAll
      .mockResolvedValueOnce([
        {
          user_id: 10,
          name: 'Nguyen Van A',
          email: 'a@example.com',
          class_id: 1,
          class_name: 'CTK42',
          total_points: 520,
          activities_count: 8,
          participated_count: 7,
          excellent_count: 3,
          good_count: 2,
          average_count: 2,
          awards_count: 1,
          award_points: 20,
          adjustment_points: -15,
          bonus_adjustment_points: 5,
          penalty_points: 20,
        },
        {
          user_id: 11,
          name: 'Tran Thi B',
          email: 'b@example.com',
          class_id: 1,
          class_name: 'CTK42',
          total_points: 450,
          activities_count: 7,
          participated_count: 6,
          excellent_count: 2,
          good_count: 2,
          average_count: 2,
          awards_count: 0,
          award_points: 0,
          adjustment_points: 10,
          bonus_adjustment_points: 10,
          penalty_points: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 100,
          student_id: 10,
          student_name: 'Nguyen Van A',
          class_name: 'CTK42',
          points: -10,
          source: 'adjustment:late submission',
          calculated_at: '2027-01-10T08:00:00.000Z',
        },
      ])

    const route = await import('../src/app/api/admin/scores/route')
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.summary).toMatchObject({
      total_students: 2,
      average_points: 485,
      total_award_points: 20,
      total_bonus_adjustment_points: 15,
      total_penalty_points: 20,
      adjusted_students_count: 2,
      penalized_students_count: 1,
      rewarded_students_count: 2,
    })
    expect(body.data.insights.top_penalty_students[0]).toMatchObject({
      user_id: 10,
      penalty_points: 20,
    })
    expect(body.data.insights.top_bonus_students[0]).toMatchObject({
      user_id: 11,
      bonus_adjustment_points: 10,
    })
    expect(body.data.insights.recent_adjustments[0]).toMatchObject({
      student_id: 10,
      adjustment_type: 'penalty',
      reason: 'late submission',
    })
  })

  it('applies search, class, and min-points filters in the scores query', async () => {
    mockDbAll.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const route = await import('../src/app/api/admin/scores/route')
    const response = await route.GET({
      nextUrl: {
        searchParams: new URLSearchParams([
          ['search', 'Nguyen'],
          ['class_id', '3'],
          ['min_points', '200'],
        ]),
      },
    } as any)

    expect(response.status).toBe(200)
    const [query, params] = mockDbAll.mock.calls[0] as [string, any[]]
    expect(query).toContain('u.name LIKE ? OR u.email LIKE ?')
    expect(query).toContain('u.class_id = ?')
    expect(query).toContain('HAVING total_points >= ?')
    expect(query).toContain("p.attendance_status = 'attended'")
    expect(query).not.toContain("p.attendance_status IN ('present', 'attended')")
    expect(params).toEqual(['%Nguyen%', '%Nguyen%', '3', 200])
  })

  it('preserves canonical forbidden errors from guard', async () => {
    mockRequireApiRole.mockRejectedValue({ status: 403, code: 'FORBIDDEN', message: 'Không có quyền truy cập' })

    const route = await import('../src/app/api/admin/scores/route')
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } } as any)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.code).toBe('FORBIDDEN')
  })

  it('exports csv with new bonus/penalty columns', async () => {
    mockDbAll
      .mockResolvedValueOnce([
        {
          user_id: 10,
          name: 'Nguyen Van A',
          email: 'a@example.com',
          class_id: 1,
          class_name: 'CTK42',
          total_points: 520,
          activities_count: 8,
          participated_count: 7,
          excellent_count: 3,
          good_count: 2,
          average_count: 2,
          awards_count: 1,
          award_points: 20,
          adjustment_points: -15,
          bonus_adjustment_points: 5,
          penalty_points: 20,
        },
      ])
      .mockResolvedValueOnce([])

    const route = await import('../src/app/api/admin/scores/route')
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams([['export', 'csv']]) } } as any)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    const csv = await response.text()
    expect(csv).toContain('Điểm thưởng')
    expect(csv).toContain('Điều chỉnh cộng')
    expect(csv).toContain('Điều chỉnh trừ')
    expect(csv).toContain('Nguyen Van A')
  })
})
