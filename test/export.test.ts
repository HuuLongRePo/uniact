import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Export API - Scoreboard', () => {
  let mockGetUserFromRequest: any
  let mockDbHelpers: any
  let mockDbAll: any

  beforeEach(() => {
    vi.resetModules()
  })

  it('Admin có thể xuất toàn bộ dữ liệu bảng điểm', async () => {
    // Mock guards
    mockGetUserFromRequest = vi.fn().mockResolvedValue({ 
      id: 1, 
      role: 'admin', 
      class_id: null 
    })

    // Mock database
    mockDbHelpers = {
      getScoreboardExportData: vi.fn().mockResolvedValue([
        { id: 1, name: 'Nguyễn Văn A', email: 'nva@school.edu', class_name: '12A1', total_score: 85, activities_count: 10 },
        { id: 2, name: 'Trần Thị B', email: 'ttb@school.edu', class_name: '12A2', total_score: 92, activities_count: 12 }
      ])
    }

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: mockDbHelpers, dbAll: vi.fn() }))

    const { GET } = await import('../src/app/api/export/scoreboard/route')
    const request = {
      nextUrl: { searchParams: { get: () => null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    
    const csv = await response.text()
    expect(csv).toContain('Mã Sinh Viên')
    expect(csv).toContain('Nguyễn Văn A')
    expect(csv).toContain('Trần Thị B')
  })

  it('Giáo viên chỉ có thể xuất dữ liệu lớp của mình', async () => {
    mockGetUserFromRequest = vi.fn().mockResolvedValue({ 
      id: 2, 
      role: 'teacher', 
      class_id: null 
    })

    mockDbAll = vi.fn().mockResolvedValue([{ id: 1 }]) // Teacher owns class 1

    mockDbHelpers = {
      getScoreboardExportData: vi.fn().mockResolvedValue([
        { id: 1, name: 'Nguyễn Văn A', email: 'nva@school.edu', class_name: '12A1', total_score: 85, activities_count: 10 }
      ])
    }

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: mockDbHelpers, dbAll: mockDbAll }))

    const { GET } = await import('../src/app/api/export/scoreboard/route')
    const request = {
      nextUrl: { searchParams: { get: (key: string) => key === 'class_id' ? '1' : null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(mockDbAll).toHaveBeenCalledWith(expect.any(String), [2])
  })

  it('Giáo viên không được xuất dữ liệu lớp khác', async () => {
    mockGetUserFromRequest = vi.fn().mockResolvedValue({ 
      id: 2, 
      role: 'teacher', 
      class_id: null 
    })

    mockDbAll = vi.fn().mockResolvedValue([{ id: 1 }]) // Teacher owns class 1, not class 2

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: {}, dbAll: mockDbAll }))

    const { GET } = await import('../src/app/api/export/scoreboard/route')
    const request = {
      nextUrl: { searchParams: { get: (key: string) => key === 'class_id' ? '2' : null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toContain('phụ trách lớp này')
  })

  it('Học viên chỉ có thể xuất dữ liệu lớp của mình', async () => {
    mockGetUserFromRequest = vi.fn().mockResolvedValue({ 
      id: 3, 
      role: 'student', 
      class_id: 1 
    })

    mockDbHelpers = {
      getScoreboardExportData: vi.fn().mockResolvedValue([
        { id: 3, name: 'Học Sinh C', email: 'hsc@school.edu', class_name: '12A1', total_score: 75, activities_count: 8 }
      ])
    }

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: mockDbHelpers, dbAll: vi.fn() }))

    const { GET } = await import('../src/app/api/export/scoreboard/route')
    const request = {
      nextUrl: { searchParams: { get: () => null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(mockDbHelpers.getScoreboardExportData).toHaveBeenCalledWith({ class_id: 1 })
  })

  it('Học viên không được xuất dữ liệu lớp khác', async () => {
    mockGetUserFromRequest = vi.fn().mockResolvedValue({ 
      id: 3, 
      role: 'student', 
      class_id: 1 
    })

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: {}, dbAll: vi.fn() }))

    const { GET } = await import('../src/app/api/export/scoreboard/route')
    const request = {
      nextUrl: { searchParams: { get: (key: string) => key === 'class_id' ? '2' : null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toContain('Không có quyền xuất dữ liệu lớp khác')
  })

  it('Yêu cầu không xác thực bị từ chối', async () => {
    mockGetUserFromRequest = vi.fn().mockResolvedValue(null)

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: {}, dbAll: vi.fn() }))

    const { GET } = await import('../src/app/api/export/scoreboard/route')
    const request = {
      nextUrl: { searchParams: { get: () => null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(401)
  })
})

describe('Export API - Attendance', () => {
  let mockGetUserFromRequest: any
  let mockDbHelpers: any

  beforeEach(() => {
    vi.resetModules()
  })

  it('Admin có thể xuất toàn bộ dữ liệu điểm danh', async () => {
    mockGetUserFromRequest = vi.fn().mockResolvedValue({ 
      id: 1, 
      role: 'admin', 
      class_id: null 
    })

    mockDbHelpers = {
      getAttendanceExportData: vi.fn().mockResolvedValue([
        {
          id: 10,
          activity_id: 5,
          activity_title: 'Hoạt động Văn nghệ',
          student_id: 1,
          student_name: 'Nguyễn Văn A',
          student_email: 'nva@school.edu',
          class_name: '12A1',
          status: 'present',
          method: 'qr',
          recorded_at: '2024-01-01T10:00:00.000Z'
        }
      ])
    }

    vi.doMock('@/lib/guards', () => ({ getUserFromRequest: mockGetUserFromRequest }))
    vi.doMock('@/lib/database', () => ({ dbHelpers: mockDbHelpers }))

    const { GET } = await import('../src/app/api/export/attendance/route')
    const request = {
      nextUrl: { searchParams: { get: () => null } }
    } as any

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="attendance-export-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv"$/
    )
    
    const csv = await response.text()
    expect(csv).toContain('activity_title')
    expect(csv).toContain('Hoạt động Văn nghệ')
  })
})
