import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbAll = vi.fn()
const mockDbReady = vi.fn()
const mockRequireRole = vi.fn()

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbReady: (...args: any[]) => mockDbReady(...args),
}))

vi.mock('@/lib/guards', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}))

describe('GET /api/teacher/reports/attendance/records', () => {
  beforeEach(() => {
    vi.resetModules()
    mockDbAll.mockReset()
    mockDbReady.mockReset()
    mockRequireRole.mockReset()

    mockDbReady.mockResolvedValue(undefined)
    mockRequireRole.mockResolvedValue({ id: 12, role: 'teacher' })
  })

  it('returns latest attendance method together with normalized status', async () => {
    mockDbAll
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([
        {
          student_id: 201,
          student_name: 'Nguyen Van A',
          student_code: 'SV001',
          class_name: 'CTK42',
          activity_name: 'Hoat dong pilot',
          activity_date: '2027-01-10',
          attendance_status: 'attended',
          attendance_method: 'face',
          check_in_time: '2027-01-10T08:05:00.000Z',
          notes: 'xac thuc thanh cong',
        },
      ])

    const route = await import('../src/app/api/teacher/reports/attendance/records/route')
    const response = await route.GET({} as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.records).toHaveLength(1)
    expect(body.data.records[0]).toMatchObject({
      student_id: 201,
      student_name: 'Nguyen Van A',
      status: 'present',
      method: 'face',
      notes: 'xac thuc thanh cong',
    })
  })

  it('falls back to unknown method when there is no attendance record method', async () => {
    mockDbAll
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([
        {
          student_id: 202,
          student_name: 'Tran Thi B',
          student_code: 'SV002',
          class_name: 'CTK42',
          activity_name: 'Hoat dong dang ky',
          activity_date: '2027-01-12',
          attendance_status: 'registered',
          attendance_method: null,
          check_in_time: null,
          notes: null,
        },
      ])

    const route = await import('../src/app/api/teacher/reports/attendance/records/route')
    const response = await route.GET({} as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.records[0]).toMatchObject({
      status: 'not_participated',
      method: 'unknown',
    })
  })
})
