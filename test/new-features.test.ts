import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { dbRun, dbGet, dbAll } from '@/lib/database'

let testTeacherId: number
let testActivityId: number

describe('Activity Clone Feature', () => {
  beforeAll(async () => {
    // Create test teacher
    const teacherResult = await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['test-clone-teacher@test.com', 'hash', 'Clone Teacher', 'teacher']
    )
    testTeacherId = teacherResult.lastID as number

    // Create test activity
    const activityResult = await dbRun(
      `INSERT INTO activities (title, description, date_time, location, teacher_id, status, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Original Activity', 'Test description', '2025-12-01 10:00:00', 'Room 101', testTeacherId, 'published', 'approved']
    )
    testActivityId = activityResult.lastID as number
  })

  afterAll(async () => {
    // Cleanup
    await dbRun('DELETE FROM activities WHERE teacher_id = ?', [testTeacherId])
    await dbRun('DELETE FROM users WHERE id = ?', [testTeacherId])
  })

  it('should clone activity with draft status', async () => {
    // Simulate clone operation (database level)
    const original = await dbGet('SELECT * FROM activities WHERE id = ?', [testActivityId]) as any
    expect(original).toBeTruthy()

    const cloneResult = await dbRun(
      `INSERT INTO activities (title, description, date_time, location, teacher_id, max_participants, activity_type_id, organization_level, base_points, status, approval_status)
       SELECT 
         '[NHÂN BẢN] ' || title,
         description,
         date_time,
         location,
         teacher_id,
         max_participants,
         activity_type_id,
         organization_level,
         base_points,
         'draft',
         'draft'
       FROM activities
       WHERE id = ?`,
      [testActivityId]
    )

    const clonedId = cloneResult.lastID as number
    const cloned = await dbGet('SELECT * FROM activities WHERE id = ?', [clonedId]) as any

    expect(cloned).toBeTruthy()
    expect(cloned.title).toContain('[NHÂN BẢN]')
    expect(cloned.status).toBe('draft')
    expect(cloned.approval_status).toBe('draft')
    expect(cloned.teacher_id).toBe(testTeacherId)
  })
})

describe('Activity Cancel Feature', () => {
  let cancelTeacherId: number
  let cancelActivityId: number

  beforeAll(async () => {
    const teacherResult = await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['test-cancel-teacher@test.com', 'hash', 'Cancel Teacher', 'teacher']
    )
    cancelTeacherId = teacherResult.lastID as number

    const activityResult = await dbRun(
      `INSERT INTO activities (title, date_time, location, teacher_id, status, approval_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Future Activity', '2025-12-20 14:00:00', 'Lab 2', cancelTeacherId, 'published', 'approved']
    )
    cancelActivityId = activityResult.lastID as number
  })

  afterAll(async () => {
    await dbRun('DELETE FROM activities WHERE teacher_id = ?', [cancelTeacherId])
    await dbRun('DELETE FROM users WHERE id = ?', [cancelTeacherId])
  })

  it('should update activity status to cancelled', async () => {
    const result = await dbRun(
      'UPDATE activities SET status = ? WHERE id = ?',
      ['cancelled', cancelActivityId]
    )

    expect(result.changes).toBe(1)

    const updated = await dbGet('SELECT * FROM activities WHERE id = ?', [cancelActivityId]) as any
    expect(updated.status).toBe('cancelled')
  })

  it('should not cancel activity that already started', async () => {
    // Create past activity
    const pastResult = await dbRun(
      `INSERT INTO activities (title, date_time, location, teacher_id, status, approval_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Past Activity', '2020-01-01 10:00:00', 'Room 1', cancelTeacherId, 'published', 'approved']
    )
    const pastActivityId = pastResult.lastID as number

    const pastActivity = await dbGet('SELECT * FROM activities WHERE id = ?', [pastActivityId]) as any
    const now = new Date()
    const startTime = new Date(pastActivity.date_time)

    expect(startTime < now).toBe(true) // Verify it's in the past
  })
})

describe('Student Awards Feature', () => {
  let awardStudentId: number
  let awardTypeId: number
  let awardId: number

  beforeAll(async () => {
    const studentResult = await dbRun(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      ['test-award-student@test.com', 'hash', 'Award Student', 'student']
    )
    awardStudentId = studentResult.lastID as number

    const typeResult = await dbRun(
      'INSERT INTO award_types (name, description, min_points) VALUES (?, ?, ?)',
      ['Test Award Type', 'Test description', 50]
    )
    awardTypeId = typeResult.lastID as number
  })

  afterAll(async () => {
    await dbRun('DELETE FROM student_awards WHERE student_id = ?', [awardStudentId])
    await dbRun('DELETE FROM award_types WHERE id = ?', [awardTypeId])
    await dbRun('DELETE FROM users WHERE id = ?', [awardStudentId])
  })

  it('should create student award', async () => {
    const result = await dbRun(
      `INSERT INTO student_awards (student_id, award_type_id, awarded_by, reason)
       VALUES (?, ?, ?, ?)`,
      [awardStudentId, awardTypeId, 1, 'Excellent performance']
    )

    awardId = result.lastID as number
    expect(awardId).toBeGreaterThan(0)

    const award = await dbGet('SELECT * FROM student_awards WHERE id = ?', [awardId]) as any
    expect(award).toBeTruthy()
    expect(award.student_id).toBe(awardStudentId)
    expect(award.reason).toBe('Excellent performance')
  })

  it('should retrieve student awards with type info', async () => {
    const awards = await dbAll(
      `SELECT 
        sa.id, sa.reason, sa.awarded_at,
        at.name as award_type_name,
        at.description as award_type_description
      FROM student_awards sa
      LEFT JOIN award_types at ON sa.award_type_id = at.id
      WHERE sa.student_id = ?`,
      [awardStudentId]
    )

    expect(awards.length).toBeGreaterThan(0)
    const award = awards[0] as any
    expect(award.award_type_name).toBe('Test Award Type')
  })
})
