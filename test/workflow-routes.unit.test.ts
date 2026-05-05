import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Workflow route fixes (unit, mocked)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('Fix #1 - attendance validate route is race-safe for max_scans', () => {
    it('returns 400 when max_scans is already exhausted (checked inside transaction)', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireApiRole: async () => ({ id: 100, role: 'student' }),
      }))

      vi.doMock('@/lib/scoring', () => ({
        PointCalculationService: {
          calculatePoints: async () => ({}),
        },
      }))

      vi.doMock('@/lib/network-proximity', () => ({
        resolveRequestNetworkPrefix: () => '10.20.30',
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: {
          getQRSessionByToken: async () => ({
            id: 1,
            activity_id: 55,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            is_active: 1,
            metadata: JSON.stringify({
              max_scans: 1,
              anti_cheat: { network_lock: true, creator_network_prefix: '10.20.30' },
            }),
          }),
          getActivityById: async () => ({ id: 55, status: 'published', approval_status: 'approved' }),
          countAttendanceForSession: async () => 1,
          checkExistingAttendance: async () => null,
          createAttendanceRecord: async () => ({ lastID: 1 }),
          updateParticipationStatus: async () => ({ changes: 1 }),
          deactivateQRSession: async () => ({ changes: 1 }),
          createAuditLog: async () => {},
        },
      }))

      const route = await import('../src/app/api/attendance/validate/route')
      const req = {
        json: async () => ({ qr_token: 'token-1', session_id: 1 }),
      } as any

      const res: any = await route.POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(String(body.error).toLowerCase()).toMatch(/(đạt giới hạn|dat gioi han)/)
    })

    it('returns 200 idempotent response when student already recorded', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireApiRole: async () => ({ id: 101, role: 'student' }),
      }))

      vi.doMock('@/lib/scoring', () => ({
        PointCalculationService: {
          calculatePoints: async () => ({}),
        },
      }))

      vi.doMock('@/lib/network-proximity', () => ({
        resolveRequestNetworkPrefix: () => '10.20.30',
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: {
          getQRSessionByToken: async () => ({
            id: 2,
            activity_id: 56,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            is_active: 1,
            metadata: JSON.stringify({
              max_scans: 3,
              anti_cheat: { network_lock: true, creator_network_prefix: '10.20.30' },
            }),
          }),
          getActivityById: async () => ({ id: 56, status: 'published', approval_status: 'approved' }),
          countAttendanceForSession: async () => 0,
          checkExistingAttendance: async () => ({ id: 99 }),
          createAttendanceRecord: async () => ({ lastID: 1 }),
          updateParticipationStatus: async () => ({ changes: 1 }),
          deactivateQRSession: async () => ({ changes: 1 }),
          createAuditLog: async () => {},
        },
      }))

      const route = await import('../src/app/api/attendance/validate/route')
      const req = {
        json: async () => ({ qr_token: 'token-2', session_id: 2 }),
      } as any

      const res: any = await route.POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.already_recorded).toBe(true)
    })
  })

  describe('Fix #2 - registration capacity excludes cancelled/withdrawn', () => {
    it('uses active-only capacity query and allows registration when one slot is cancelled', async () => {
      const capturedQueries: string[] = []

      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 201, role: 'student', class_id: 1, name: 'Student A' }),
        requireApiRole: async () => ({ id: 201, role: 'student', class_id: 1, name: 'Student A' }),
      }))

      vi.doMock('@/lib/activity-service', () => ({
        evaluateRegistrationPolicies: async () => ({ ok: true }),
      }))

      vi.doMock('@/lib/notifications', () => ({
        notificationService: { send: async () => {} },
        ActivityRegistrationNotification: class {},
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbAll: async () => [],
        dbGet: async (sql: string) => {
          capturedQueries.push(sql)
          if (sql.includes('SELECT * FROM activities')) {
            return {
              id: 77,
              status: 'published',
              registration_deadline: new Date(Date.now() + 86_400_000).toISOString(),
              max_participants: 2,
              title: 'A',
              date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
              location: 'Room',
            }
          }
          if (sql.includes('SELECT * FROM participations')) {
            return null
          }
          if (sql.includes('COUNT(*) as count')) {
            if (!sql.includes("attendance_status IN ('registered', 'attended')")) {
              throw new Error('Old capacity query used')
            }
            return { count: 1 }
          }
          return null
        },
        dbRun: async (sql: string) => {
          capturedQueries.push(sql)
          if (sql.includes('INSERT INTO participations')) return { lastID: 900, changes: 1 }
          return { changes: 1 }
        },
        ensureParticipationColumns: async () => undefined,
        ensureActivityClassParticipationMode: async () => undefined,
        dbHelpers: {
          createAuditLog: async () => {},
        },
      }))

      const route = await import('../src/app/api/activities/[id]/register/route')
      const req = {
        json: async () => ({ force_register: false }),
      } as any

      const res: any = await route.POST(req, { params: Promise.resolve({ id: '77' }) } as any)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.participation_id).toBe(900)
      expect(capturedQueries.some((q) => q.includes("attendance_status IN ('registered', 'attended')"))).toBe(true)
    })

    it('rejects registration when activity has reached max_participants', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 202, role: 'student', class_id: 1, name: 'Student B' }),
        requireApiRole: async () => ({ id: 202, role: 'student', class_id: 1, name: 'Student B' }),
      }))

      vi.doMock('@/lib/activity-service', () => ({
        evaluateRegistrationPolicies: async () => ({ ok: true }),
      }))

      vi.doMock('@/lib/notifications', () => ({
        notificationService: { send: async () => {} },
        ActivityRegistrationNotification: class {},
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbAll: async () => [],
        dbGet: async (sql: string) => {
          if (sql.includes('SELECT * FROM activities')) {
            return {
              id: 78,
              status: 'published',
              registration_deadline: new Date(Date.now() + 86_400_000).toISOString(),
              max_participants: 2,
              title: 'Full Activity',
              date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
              location: 'Room',
            }
          }
          if (sql.includes('SELECT * FROM participations')) return null
          if (sql.includes('SELECT id FROM participations')) return null
          if (sql.includes('COUNT(*) as count')) return { count: 2 }
          return null
        },
        dbRun: async () => ({ changes: 1 }),
        ensureParticipationColumns: async () => undefined,
        ensureActivityClassParticipationMode: async () => undefined,
        dbHelpers: { createAuditLog: async () => {} },
      }))

      const route = await import('../src/app/api/activities/[id]/register/route')
      const req = { json: async () => ({}) } as any

      const res: any = await route.POST(req, { params: Promise.resolve({ id: '78' }) } as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(String(body.error)).toContain('hết chỗ')
    })

    it('rejects registration at deadline boundary (strict now < deadline)', async () => {
      const withTransaction = vi.fn(async (callback: any) => callback())

      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 203, role: 'student', class_id: 1, name: 'Student C' }),
        requireApiRole: async () => ({ id: 203, role: 'student', class_id: 1, name: 'Student C' }),
      }))

      vi.doMock('@/lib/activity-service', () => ({
        evaluateRegistrationPolicies: async () => ({ ok: true }),
      }))

      vi.doMock('@/lib/notifications', () => ({
        notificationService: { send: async () => {} },
        ActivityRegistrationNotification: class {},
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction,
        dbAll: async () => [],
        dbGet: async (sql: string) => {
          if (sql.includes('SELECT * FROM activities')) {
            return {
              id: 79,
              status: 'published',
              registration_deadline: new Date().toISOString(),
              max_participants: 10,
              title: 'Boundary Activity',
              date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
              location: 'Hall',
            }
          }
          return null
        },
        dbRun: async () => ({ changes: 1 }),
        ensureParticipationColumns: async () => undefined,
        ensureActivityClassParticipationMode: async () => undefined,
        dbHelpers: { createAuditLog: async () => {} },
      }))

      const route = await import('../src/app/api/activities/[id]/register/route')
      const req = { json: async () => ({}) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '79' }) } as any)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(String(body.error)).toContain('Đã hết hạn đăng ký')
      expect(withTransaction).not.toHaveBeenCalled()
    })

    it('maps unique constraint race error to duplicate registration validation', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 204, role: 'student', class_id: 1, name: 'Student D' }),
        requireApiRole: async () => ({ id: 204, role: 'student', class_id: 1, name: 'Student D' }),
      }))

      vi.doMock('@/lib/activity-service', () => ({
        evaluateRegistrationPolicies: async () => ({ ok: true }),
      }))

      vi.doMock('@/lib/notifications', () => ({
        notificationService: { send: async () => {} },
        ActivityRegistrationNotification: class {},
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbAll: async () => [],
        dbGet: async (sql: string) => {
          if (sql.includes('SELECT * FROM activities')) {
            return {
              id: 80,
              status: 'published',
              registration_deadline: new Date(Date.now() + 86_400_000).toISOString(),
              max_participants: 10,
              title: 'Duplicate Race Activity',
              date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
              location: 'Hall',
            }
          }
          if (sql.includes('SELECT * FROM participations')) return null
          if (sql.includes('SELECT id FROM participations')) return null
          if (sql.includes('COUNT(*) as count')) return { count: 0 }
          return null
        },
        dbRun: async (sql: string) => {
          if (sql.includes('INSERT INTO participations')) {
            throw new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: participations.activity_id, participations.student_id')
          }
          return { changes: 1 }
        },
        ensureParticipationColumns: async () => undefined,
        ensureActivityClassParticipationMode: async () => undefined,
        dbHelpers: { createAuditLog: async () => {} },
      }))

      const route = await import('../src/app/api/activities/[id]/register/route')
      const req = { json: async () => ({}) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '80' }) } as any)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(String(body.error)).toContain('đã đăng ký')
    })

    it('rejects student without class when activity is class-restricted', async () => {
      const withTransaction = vi.fn(async (callback: any) => callback())

      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 205, role: 'student', class_id: null, name: 'Student E' }),
        requireApiRole: async () => ({ id: 205, role: 'student', class_id: null, name: 'Student E' }),
      }))

      vi.doMock('@/lib/activity-service', () => ({
        evaluateRegistrationPolicies: async () => ({ ok: true }),
      }))

      vi.doMock('@/lib/notifications', () => ({
        notificationService: { send: async () => {} },
        ActivityRegistrationNotification: class {},
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction,
        dbAll: async () => [{ class_id: 99 }],
        dbGet: async (sql: string) => {
          if (sql.includes('SELECT * FROM activities')) {
            return {
              id: 81,
              status: 'published',
              registration_deadline: new Date(Date.now() + 86_400_000).toISOString(),
              max_participants: 10,
              title: 'Class Restricted Activity',
              date_time: new Date(Date.now() + 2 * 86_400_000).toISOString(),
              location: 'Room',
            }
          }
          return null
        },
        dbRun: async () => ({ changes: 1 }),
        ensureParticipationColumns: async () => undefined,
        ensureActivityClassParticipationMode: async () => undefined,
        dbHelpers: { createAuditLog: async () => {} },
      }))

      const route = await import('../src/app/api/activities/[id]/register/route')
      const req = { json: async () => ({}) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '81' }) } as any)

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(String(body.error)).toMatch(/không dành cho lớp|khong danh cho lop/i)
      expect(withTransaction).not.toHaveBeenCalled()
    })
  })

  describe('Fix #3 - admin approval route standardized behavior', () => {
    it('reject action requires notes', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 301, role: 'admin' }),
        requireApiRole: async () => ({ id: 301, role: 'admin' }),
      }))

      vi.doMock('@/lib/cache', () => ({
        cache: { invalidatePrefix: () => {} },
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbGet: async () => ({ id: 1, status: 'pending', approval_status: 'requested', title: 'A' }),
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: { createAuditLog: async () => {} },
      }))

      const route = await import('../src/app/api/admin/activities/[id]/approval/route')
      const req = {
        json: async () => ({ action: 'reject', notes: '   ' }),
      } as any

      const res: any = await route.POST(req, { params: Promise.resolve({ id: '1' }) } as any)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.details).toHaveProperty('notes')
    })

    it('returns conflict when already approved and action=approve', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 302, role: 'admin' }),
        requireApiRole: async () => ({ id: 302, role: 'admin' }),
      }))

      vi.doMock('@/lib/cache', () => ({
        cache: { invalidatePrefix: () => {} },
      }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return { id: 2, status: 'published', approval_status: 'approved', title: 'Done' }
          }
          return null
        },
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: { createAuditLog: async () => {} },
      }))

      const route = await import('../src/app/api/admin/activities/[id]/approval/route')
      const req = {
        json: async () => ({ action: 'approve', notes: 'ok' }),
      } as any

      const res: any = await route.POST(req, { params: Promise.resolve({ id: '2' }) } as any)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it('blocks approving a plain draft without pending approval request', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 303, role: 'admin' }),
        requireApiRole: async () => ({ id: 303, role: 'admin' }),
      }))

      vi.doMock('@/lib/cache', () => ({
        cache: { invalidatePrefix: () => {} },
      }))

      const submitActivityForApproval = vi.fn(async () => ({ lastID: 99 }))
      const decideApproval = vi.fn(async () => ({ success: true }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return {
              id: 3,
              teacher_id: 88,
              status: 'draft',
              approval_status: 'draft',
              approval_notes: 'teacher note',
              title: 'Draft only',
            }
          }
          if (sql.includes('FROM activity_approvals')) {
            return null
          }
          return null
        },
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: { submitActivityForApproval, decideApproval },
      }))

      const route = await import('../src/app/api/admin/activities/[id]/approval/route')
      const req = {
        json: async () => ({ action: 'approve', notes: 'ok' }),
      } as any

      const res: any = await route.POST(req, { params: Promise.resolve({ id: '3' }) } as any)
      expect(res.status).toBe(400)
      expect(submitActivityForApproval).not.toHaveBeenCalled()
      expect(decideApproval).not.toHaveBeenCalled()
    })

    it('recreates missing pending approval with teacher context for legacy requested activity', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 304, role: 'admin' }),
        requireApiRole: async () => ({ id: 304, role: 'admin' }),
      }))

      vi.doMock('@/lib/cache', () => ({
        cache: { invalidatePrefix: () => {} },
      }))

      const submitActivityForApproval = vi.fn(async () => ({ lastID: 88 }))
      const decideApproval = vi.fn(async () => ({ success: true }))

      vi.doMock('@/lib/database', () => ({
        withTransaction: async (callback: any) => callback(),
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return {
              id: 4,
              teacher_id: 77,
              status: 'draft',
              approval_status: 'requested',
              approval_notes: 'teacher note',
              title: 'Legacy requested',
            }
          }
          if (sql.includes('FROM activity_approvals')) {
            return null
          }
          return null
        },
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: { submitActivityForApproval, decideApproval },
      }))

      const route = await import('../src/app/api/admin/activities/[id]/approval/route')
      const req = {
        json: async () => ({ action: 'approve', notes: 'ok' }),
      } as any

      const res: any = await route.POST(req, { params: Promise.resolve({ id: '4' }) } as any)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý')
      expect(submitActivityForApproval).not.toHaveBeenCalled()
      expect(decideApproval).not.toHaveBeenCalled()
    })
  })

  describe('Fix #4 - submit-for-approval status/idempotency guards', () => {
    it('blocks submit when activity status is not draft/rejected', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 401, role: 'teacher' }),
        requireApiRole: async () => ({ id: 401, role: 'teacher' }),
      }))

      vi.doMock('@/lib/database', () => ({
        dbGet: async () => ({ id: 10, status: 'published', approval_status: 'approved', teacher_id: 401 }),
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 1 }),
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit-for-approval/route')
      const req = {} as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '10' }) } as any)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it('blocks submit when approval_status is requested', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 402, role: 'teacher' }),
        requireApiRole: async () => ({ id: 402, role: 'teacher' }),
      }))

      vi.doMock('@/lib/database', () => ({
        dbGet: async () => ({ id: 11, status: 'draft', approval_status: 'requested', teacher_id: 402 }),
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 22 }),
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit-for-approval/route')
      const req = {} as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '11' }) } as any)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it('blocks legacy submit-approval route when approval_status is requested', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 403, role: 'teacher', name: 'Teacher A' }),
        requireApiRole: async () => ({ id: 403, role: 'teacher', name: 'Teacher A' }),
      }))

      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return { id: 12, title: 'Activity A', status: 'draft', approval_status: 'requested', teacher_id: 403 }
          }
          return { admin_ids: '1,2' }
        },
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 99, alreadyPending: true }),
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit-approval/route')
      const req = {} as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '12' }) } as any)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it('blocks legacy submit PATCH route when approval_status is requested', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 4031, role: 'teacher', name: 'Teacher A' }),
        requireApiRole: async () => ({ id: 4031, role: 'teacher', name: 'Teacher A' }),
      }))

      const submitActivityForApproval = vi.fn(async () => ({ lastID: 100 }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return {
              id: 13,
              title: 'Activity B',
              description: 'Desc',
              date_time: '2026-03-20T10:00:00.000Z',
              location: 'Hall',
              status: 'draft',
              approval_status: 'requested',
              teacher_id: 4031,
            }
          }
          return { admin_ids: '1,2' }
        },
        dbRun: async () => ({ changes: 1 }),
        dbHelpers: {
          submitActivityForApproval,
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit/route')
      const req = { json: async () => ({}) } as any
      const res: any = await route.PATCH(req, { params: Promise.resolve({ id: '13' }) } as any)
      expect(res.status).toBe(409)
      expect(submitActivityForApproval).not.toHaveBeenCalled()
    })

    it('legacy submit PATCH route delegates to helper for rejected activity', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 4032, role: 'teacher', name: 'Teacher A' }),
        requireApiRole: async () => ({ id: 4032, role: 'teacher', name: 'Teacher A' }),
      }))

      const submitActivityForApproval = vi.fn(async () => ({ lastID: 101 }))
      const dbRun = vi.fn(async () => ({ changes: 1 }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return {
              id: 14,
              title: 'Activity C',
              description: 'Desc',
              date_time: '2026-03-20T10:00:00.000Z',
              location: 'Hall',
              status: 'draft',
              approval_status: 'rejected',
              teacher_id: 4032,
              max_participants: 30,
            }
          }
          return { admin_ids: '1,2' }
        },
        dbRun,
        dbHelpers: {
          submitActivityForApproval,
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit/route')
      const req = { json: async () => ({ note: 'retry' }) } as any
      const res: any = await route.PATCH(req, { params: Promise.resolve({ id: '14' }) } as any)
      expect(res.status).toBe(200)
      expect(submitActivityForApproval).toHaveBeenCalledWith(14, 4032, 'retry')

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.activity.status).toBe('draft')
      expect(body.data.approval_id).toBe(101)
      expect(dbRun).not.toHaveBeenCalled()
    })

    it('submit-for-approval route notifies admins after successful submit', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 4033, role: 'teacher', name: 'Teacher Notify' }),
        requireApiRole: async () => ({ id: 4033, role: 'teacher', name: 'Teacher Notify' }),
      }))

      const notifyAdminsOfApprovalSubmission = vi.fn(async () => ({ success: 2, failed: 0 }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async () => ({
          id: 15,
          title: 'Activity Notify',
          status: 'draft',
          approval_status: 'draft',
          teacher_id: 4033,
        }),
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 105 }),
          notifyAdminsOfApprovalSubmission,
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit-for-approval/route')
      const req = {} as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '15' }) } as any)
      expect(res.status).toBe(201)
      expect(notifyAdminsOfApprovalSubmission).toHaveBeenCalledWith(15, 'Teacher Notify', 'Activity Notify')
    })

    it('legacy submit-approval route delegates admin notifications to helper', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 4034, role: 'teacher', name: 'Teacher Helper' }),
        requireApiRole: async () => ({ id: 4034, role: 'teacher', name: 'Teacher Helper' }),
      }))

      const notifyAdminsOfApprovalSubmission = vi.fn(async () => ({ success: 0, failed: 1 }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async () => ({
          id: 16,
          title: 'Activity Helper',
          status: 'draft',
          approval_status: 'draft',
          teacher_id: 4034,
        }),
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 106 }),
          notifyAdminsOfApprovalSubmission,
        },
      }))

      const route = await import('../src/app/api/activities/[id]/submit-approval/route')
      const req = {} as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '16' }) } as any)
      expect(res.status).toBe(200)
      expect(notifyAdminsOfApprovalSubmission).toHaveBeenCalledWith(16, 'Teacher Helper', 'Activity Helper')
    })

    it('approve route accepts legacy requested approvals even when activity status is draft', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 404, role: 'admin', name: 'Admin A' }),
        requireApiRole: async () => ({ id: 404, role: 'admin', name: 'Admin A' }),
      }))

      const decideApproval = vi.fn(async () => ({ success: true }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return { id: 20, title: 'Legacy Pending', teacher_id: 12, status: 'draft', approval_status: 'requested' }
          }
          if (sql.includes('SELECT id FROM activity_approvals')) {
            return { id: 501 }
          }
          return null
        },
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 501 }),
          decideApproval,
        },
        dbRun: async () => ({ changes: 1 }),
      }))

      const route = await import('../src/app/api/activities/[id]/approve/route')
      const req = { json: async () => ({ notes: 'ok' }) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '20' }) } as any)
      expect(res.status).toBe(200)
      expect(decideApproval).toHaveBeenCalledWith(501, 404, 'approved', 'ok')
    })

    it('approve route queries only requested approval records', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 405, role: 'admin', name: 'Admin B' }),
        requireApiRole: async () => ({ id: 405, role: 'admin', name: 'Admin B' }),
      }))

      const decideApproval = vi.fn(async () => ({ success: true }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes("status IN ('requested', 'pending')")) {
            throw new Error('Old requested/pending query used')
          }
          if (sql.includes('FROM activities')) {
            return { id: 21, title: 'Requested only', teacher_id: 12, status: 'draft', approval_status: 'requested' }
          }
          if (sql.includes('SELECT id FROM activity_approvals')) {
            return { id: 502 }
          }
          return null
        },
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 502 }),
          decideApproval,
        },
        dbRun: async () => ({ changes: 1 }),
      }))

      const route = await import('../src/app/api/activities/[id]/approve/route')
      const req = { json: async () => ({ notes: 'ship it' }) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '21' }) } as any)
      expect(res.status).toBe(200)
      expect(decideApproval).toHaveBeenCalledWith(502, 405, 'approved', 'ship it')
    })

    it('reject route queries only requested approval records', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 406, role: 'admin', name: 'Admin C' }),
        requireApiRole: async () => ({ id: 406, role: 'admin', name: 'Admin C' }),
      }))

      const decideApproval = vi.fn(async () => ({ success: true }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes("status IN ('requested', 'pending')")) {
            throw new Error('Old requested/pending query used')
          }
          if (sql.includes('FROM activities')) {
            return { id: 22, title: 'Reject requested', teacher_id: 13, status: 'draft', approval_status: 'requested' }
          }
          if (sql.includes('SELECT id FROM activity_approvals')) {
            return { id: 503 }
          }
          return null
        },
        dbHelpers: {
          submitActivityForApproval: async () => ({ lastID: 503 }),
          decideApproval,
        },
      }))

      const route = await import('../src/app/api/activities/[id]/reject/route')
      const req = { json: async () => ({ reason: 'needs fixes' }) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '22' }) } as any)
      expect(res.status).toBe(200)
      expect(decideApproval).toHaveBeenCalledWith(503, 406, 'rejected', 'needs fixes')
    })
  })

  describe('Fix #6 - admin approval endpoint centralizes review actions', () => {
    it('handles reject action via the approval endpoint', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireApiRole: async () => ({ id: 601, role: 'admin' }),
      }))

      const decideApproval = vi.fn(async () => ({ success: true }))
      vi.doMock('@/lib/database', () => ({
        dbGet: async (sql: string) => {
          if (sql.includes('FROM activities')) {
            return { id: 33, teacher_id: 12, status: 'draft', approval_status: 'requested', approval_notes: null, title: 'Needs review' }
          }
          if (sql.includes('SELECT id FROM activity_approvals')) {
            return { id: 603 }
          }
          return null
        },
        dbHelpers: {
          decideApproval,
          submitActivityForApproval: async () => ({ lastID: 603 }),
        },
      }))

      const route = await import('../src/app/api/admin/activities/[id]/approval/route')
      const req = { json: async () => ({ action: 'reject', notes: 'needs fixes' }) } as any
      const res: any = await route.POST(req, { params: Promise.resolve({ id: '33' }) } as any)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toMatchObject({ status: 'draft', approval_status: 'rejected' })
      expect(decideApproval).toHaveBeenCalledWith(603, 601, 'rejected', 'needs fixes')
    })
  })

  describe('Fix #5 - scores/calculate standardized auth and response', () => {
    it('returns unauthorized when not logged in', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => {
          throw new Error('Chưa đăng nhập')
        },
        requireApiRole: async () => {
          throw new Error('Chưa đăng nhập')
        },
      }))

      vi.doMock('@/lib/scoring', () => ({
        PointCalculationService: {
          calculatePoints: async () => ({}),
          saveCalculation: async () => {},
        },
      }))

      const route = await import('../src/app/api/scores/calculate/route')
      const req = { json: async () => ({ participationId: 1 }) } as any

      const res: any = await route.POST(req)
      expect(res.status).toBe(401)
    })

    it('returns forbidden when role is not allowed', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => {
          throw new Error('Không có quyền truy cập')
        },
        requireApiRole: async () => {
          throw new Error('Không có quyền truy cập')
        },
      }))

      vi.doMock('@/lib/scoring', () => ({
        PointCalculationService: {
          calculatePoints: async () => ({}),
          saveCalculation: async () => {},
        },
      }))

      const route = await import('../src/app/api/scores/calculate/route')
      const req = { json: async () => ({ participationId: 1 }) } as any

      const res: any = await route.POST(req)
      expect(res.status).toBe(403)
    })

    it('returns validation error when participationId is missing', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 501, role: 'teacher' }),
        requireApiRole: async () => ({ id: 501, role: 'teacher' }),
      }))

      vi.doMock('@/lib/scoring', () => ({
        PointCalculationService: {
          calculatePoints: async () => ({}),
          saveCalculation: async () => {},
        },
      }))

      const route = await import('../src/app/api/scores/calculate/route')
      const req = { json: async () => ({ bonusPoints: 1 }) } as any

      const res: any = await route.POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it('returns standardized success payload on calculate', async () => {
      vi.doMock('@/lib/guards', () => ({
        requireRole: async () => ({ id: 502, role: 'admin' }),
        requireApiRole: async () => ({ id: 502, role: 'admin' }),
      }))

      vi.doMock('@/lib/scoring', () => ({
        PointCalculationService: {
          calculatePoints: async () => ({ totalPoints: 12, formula: 'base+bonus' }),
          saveCalculation: async () => {},
        },
      }))

      const route = await import('../src/app/api/scores/calculate/route')
      const req = {
        json: async () => ({ participationId: 99, bonusPoints: 2, penaltyPoints: 0 }),
      } as any

      const res: any = await route.POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toEqual({ totalPoints: 12, formula: 'base+bonus' })
    })
  })
})
