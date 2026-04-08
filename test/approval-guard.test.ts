import { describe, it, expect, beforeAll } from 'vitest'
import { dbRun, dbGet, dbReady } from '@/lib/database'
import { requireActivityApproved } from '@/lib/guards'

/**
 * Test approval enforcement guard
 */

describe('Approval Guard Logic', () => {
  let draftActivityId: number
  let approvedActivityId: number
  let requestedActivityId: number
  let teacherId: number

  beforeAll(async () => {
    await dbReady()

    // Create teacher
    teacherId = (await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['guard-teacher@test.local', 'hash', 'Guard Teacher', 'teacher']
    )).lastID as number

    // Create activities with different approval statuses
    draftActivityId = (await dbRun(
      `INSERT INTO activities (title, description, date_time, location, teacher_id, approval_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Draft Activity', 'desc', new Date().toISOString(), 'Room 1', teacherId, 'draft', 'draft']
    )).lastID as number

    approvedActivityId = (await dbRun(
      `INSERT INTO activities (title, description, date_time, location, teacher_id, approval_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Approved Activity', 'desc', new Date().toISOString(), 'Room 2', teacherId, 'approved', 'published']
    )).lastID as number

    requestedActivityId = (await dbRun(
      `INSERT INTO activities (title, description, date_time, location, teacher_id, approval_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Requested Activity', 'desc', new Date().toISOString(), 'Room 3', teacherId, 'requested', 'draft']
    )).lastID as number
  })

  it('should reject draft activity', async () => {
    await expect(requireActivityApproved(draftActivityId))
      .rejects
      .toThrow(/cần được duyệt/i)
  })

  it('should reject requested (pending) activity', async () => {
    await expect(requireActivityApproved(requestedActivityId))
      .rejects
      .toThrow(/cần được duyệt/i)
  })

  it('should allow approved activity', async () => {
    await expect(requireActivityApproved(approvedActivityId)).resolves.toBeUndefined()
  })

  it('should reject non-existent activity', async () => {
    await expect(requireActivityApproved(999999))
      .rejects
      .toThrow(/không tìm thấy hoạt động/i)
  })
})
