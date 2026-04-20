import { beforeEach, describe, expect, it, vi } from 'vitest'

type DbRunMock = ReturnType<typeof vi.fn>
type DbGetMock = ReturnType<typeof vi.fn>
type DbAllMock = ReturnType<typeof vi.fn>

async function loadDbHelpers(dbRun: DbRunMock, dbGet: DbGetMock, dbAll?: DbAllMock) {
  vi.doMock('../src/infrastructure/db/db-core', () => ({
    dbRun,
    dbGet,
    dbAll: dbAll || vi.fn(async () => []),
    withTransaction: async (callback: any) => callback(),
  }))

  vi.doMock('../src/lib/cache', () => ({
    cache: {
      get: async (_key: string, _ttl: number, loader: any) => loader(),
      invalidatePrefix: vi.fn(),
    },
    CACHE_TTL: {
      TEACHERS: 60,
      CLASSES: 60,
    },
  }))

  vi.doMock('../src/infrastructure/db/participation-schema', () => ({
    ensureParticipationColumns: async () => undefined,
  }))

  const mod = await import('../src/infrastructure/db/db-queries')
  return mod.dbHelpers
}

describe('Approval audit trail helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('submitActivityForApproval is idempotent and does not write duplicate audit logs', async () => {
    const dbRun = vi.fn(async () => ({ changes: 1 }))
    const dbGet = vi.fn(async () => ({ id: 77 }))

    const dbHelpers = await loadDbHelpers(dbRun, dbGet)
    const result = await dbHelpers.submitActivityForApproval(10, 5, 'retry note')

    expect(result).toEqual({ lastID: 77, changes: 0, alreadyPending: true })
    expect(dbRun).not.toHaveBeenCalled()
  })

  it('submitActivityForApproval writes exactly one canonical audit log', async () => {
    const dbRun = vi.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO activity_approvals')) {
        return { lastID: 700, changes: 1 }
      }
      return { changes: 1 }
    })
    const dbGet = vi.fn(async () => undefined)

    const dbHelpers = await loadDbHelpers(dbRun, dbGet)
    const result = await dbHelpers.submitActivityForApproval(10, 5, 'need approval')

    expect(result.lastID).toBe(700)

    const auditCalls = dbRun.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO audit_logs'))
    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0]?.[1]).toEqual([
      5,
      'submit_activity_for_approval',
      'activity_approvals',
      700,
      JSON.stringify({ activity_id: 10, note: 'need approval' }),
    ])

    const approvalHistoryCalls = dbRun.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO activity_approval_history')
    )
    expect(approvalHistoryCalls).toHaveLength(1)
    expect(String(approvalHistoryCalls[0]?.[0] || '')).toContain("VALUES (?, 'pending_approval', ?, ?)")
  })

  it('notifyAdminsOfApprovalSubmission is best-effort and keeps related activity fields', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dbRun = vi.fn(async (_sql: string, params?: any[]) => {
      if (params?.[0] === 1) {
        throw new Error('notification write failed')
      }
      return { changes: 1 }
    })
    const dbGet = vi.fn(async () => undefined)
    const dbAll = vi.fn(async () => [{ id: 1 }, { id: 2 }])

    const dbHelpers = await loadDbHelpers(dbRun, dbGet, dbAll)
    const result = await dbHelpers.notifyAdminsOfApprovalSubmission(55, 'Teacher Best Effort', 'Activity N')

    expect(result).toEqual({ success: 1, failed: 1 })

    const notificationCalls = dbRun.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO notifications'))
    expect(notificationCalls).toHaveLength(2)
    expect(notificationCalls[0]?.[1]).toEqual([
      1,
      'info',
      'Hoạt động mới cần phê duyệt',
      'Giảng viên Teacher Best Effort đã gửi hoạt động "Activity N" cần phê duyệt',
      'activities',
      55,
    ])
    expect(notificationCalls[1]?.[1]).toEqual([
      2,
      'info',
      'Hoạt động mới cần phê duyệt',
      'Giảng viên Teacher Best Effort đã gửi hoạt động "Activity N" cần phê duyệt',
      'activities',
      55,
    ])

    errorSpy.mockRestore()
  })

  it('decideApproval(approved) writes one audit log and one teacher notification', async () => {
    const dbRun = vi.fn(async (sql: string) => {
      if (sql.includes('UPDATE activity_approvals')) {
        return { changes: 1 }
      }
      return { changes: 1 }
    })
    const dbGet = vi.fn(async () => ({
      activity_id: 20,
      approval_record_status: 'requested',
      activity_title: 'Spring Event',
      teacher_id: 12,
    }))

    const dbHelpers = await loadDbHelpers(dbRun, dbGet)
    const result = await dbHelpers.decideApproval(801, 2, 'approved', 'LGTM')

    expect(result).toMatchObject({
      success: true,
      activity_id: 20,
      new_status: 'published',
      approval_status: 'approved',
      teacher_id: 12,
    })

    const auditCalls = dbRun.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO audit_logs'))
    const notificationCalls = dbRun.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO notifications'))

    expect(auditCalls.length).toBeGreaterThanOrEqual(1)
    expect(auditCalls).toContainEqual([
      expect.stringContaining('INSERT INTO audit_logs'),
      [2, 'activity_approval_approved', 'activity_approvals', 801, 'LGTM'],
    ])
    expect(notificationCalls).toHaveLength(1)
    expect(notificationCalls[0]?.[1]?.[0]).toBe(12)
    expect(notificationCalls[0]?.[1]?.[1]).toBe('success')
  })

  it('decideApproval(approved) materializes mandatory participations for scoped classes', async () => {
    const dbRun = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('UPDATE activity_approvals')) {
        return { changes: 1 }
      }

      if (sql.includes('INSERT OR IGNORE INTO participations')) {
        return params?.[1] === 101 ? { changes: 1 } : { changes: 0 }
      }

      if (sql.includes('UPDATE participations')) {
        return params?.[1] === 102 ? { changes: 1 } : { changes: 0 }
      }

      return { changes: 1 }
    })
    const dbGet = vi.fn(async () => ({
      activity_id: 22,
      approval_record_status: 'requested',
      activity_title: 'Scoped Event',
      teacher_id: 15,
    }))
    const dbAll = vi.fn(async (sql: string) => {
      if (sql.includes('FROM activity_classes')) {
        return [{ class_id: 7 }]
      }

      if (sql.includes('FROM users')) {
        return [{ id: 101 }, { id: 102 }]
      }

      return []
    })

    const dbHelpers = await loadDbHelpers(dbRun, dbGet, dbAll)
    const result = await dbHelpers.decideApproval(901, 4, 'approved', 'ship it')

    expect(result).toMatchObject({
      success: true,
      activity_id: 22,
      new_status: 'published',
      mandatory_participations_created: 1,
      mandatory_participations_upgraded: 1,
    })

    expect(
      dbRun.mock.calls.some(([sql, params]) =>
        String(sql).includes('INSERT OR IGNORE INTO participations') &&
        params?.[0] === 22 &&
        params?.[1] === 101
      )
    ).toBe(true)

    expect(
      dbRun.mock.calls.some(([sql, params]) =>
        String(sql).includes('UPDATE participations') &&
        params?.[0] === 22 &&
        params?.[1] === 102
      )
    ).toBe(true)
  })

  it('decideApproval(rejected) writes one audit log and one rejection notification', async () => {
    const dbRun = vi.fn(async (sql: string) => {
      if (sql.includes('UPDATE activity_approvals')) {
        return { changes: 1 }
      }
      return { changes: 1 }
    })
    const dbGet = vi.fn(async () => ({
      activity_id: 21,
      approval_record_status: 'requested',
      activity_title: 'Winter Event',
      teacher_id: 13,
    }))

    const dbHelpers = await loadDbHelpers(dbRun, dbGet)
    const result = await dbHelpers.decideApproval(802, 3, 'rejected', 'Missing plan')

    expect(result).toMatchObject({
      success: true,
      activity_id: 21,
      new_status: 'draft',
      approval_status: 'rejected',
      teacher_id: 13,
    })

    const auditCalls = dbRun.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO audit_logs'))
    const notificationCalls = dbRun.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO notifications'))

    expect(auditCalls.length).toBeGreaterThanOrEqual(1)
    expect(auditCalls).toContainEqual([
      expect.stringContaining('INSERT INTO audit_logs'),
      [3, 'activity_approval_rejected', 'activity_approvals', 802, 'Missing plan'],
    ])
    expect(notificationCalls).toHaveLength(1)
    expect(notificationCalls[0]?.[1]?.[0]).toBe(13)
    expect(notificationCalls[0]?.[1]?.[1]).toBe('warning')
    expect(String(notificationCalls[0]?.[1]?.[3] || '')).toContain('Lý do: Missing plan')
  })
})
