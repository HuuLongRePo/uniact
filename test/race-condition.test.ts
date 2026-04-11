import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { dbRun, dbGet, dbReady, withTransaction } from '@/lib/database'
import { ensureCoreTestSchema } from './core-test-schema'

describe('Race Condition Prevention - Activity Registration', () => {
  let activityId: number
  const studentIds: number[] = []

  beforeAll(async () => {
    await dbReady()
    await ensureCoreTestSchema()

    // Tạo hoạt động với max_participants = 5
    const activity = await dbRun(`
      INSERT INTO activities (
        title, description, date_time, location, 
        max_participants, activity_type_id, organization_level,
        status, approval_status, teacher_id
      ) VALUES (?, ?, ?, ?, ?, 1, 'school', 'published', 'approved', 1)
    `, [
      'Test Activity (Limited)',
      'Race condition test',
      new Date(Date.now() + 86400000).toISOString(),
      'Test Location',
      5
    ])
    activityId = activity.lastID!

    // Tạo 10 học viên để thử đăng ký đồng thời
    for (let i = 0; i < 10; i++) {
      const student = await dbRun(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES (?, 'hash', ?, 'student')
      `, [`student${i}@test.edu`, `Student ${i}`])
      studentIds.push(student.lastID!)
    }
  })

  afterAll(async () => {
    // Cleanup
    if (activityId) {
      await dbRun('DELETE FROM participations WHERE activity_id = ?', [activityId])
      await dbRun('DELETE FROM activities WHERE id = ?', [activityId])
    }
    for (const id of studentIds) {
      await dbRun('DELETE FROM users WHERE id = ?', [id])
    }
  })

  afterEach(async () => {
    // Keep tests isolated: previous tests may insert participations.
    if (activityId) {
      await dbRun('DELETE FROM participations WHERE activity_id = ?', [activityId])
    }
  })

  it('should prevent over-registration when multiple students register simultaneously', async () => {
    // Simulate 10 concurrent registrations (only 5 should succeed)
    const registrations = studentIds.map(async (studentId) => {
      try {
        await withTransaction(async () => {
          const count = await dbGet(
            'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
            [activityId]
          ) as any

          if (count.count >= 5) throw new Error('CAPACITY_FULL')

          await dbRun(
            'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
            [activityId, studentId, 'registered']
          )
        })

        return { success: true }
      } catch (error: any) {
        if (String(error?.message) === 'CAPACITY_FULL') return { success: false, reason: 'full' }
        return { success: false, reason: error?.message || 'error' }
      }
    })

    const results = await Promise.all(registrations)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    // Verify exactly 5 succeeded and 5 failed
    expect(successful).toBe(5)
    expect(failed).toBe(5)

    // Verify database consistency
    const finalCount = await dbGet(
      'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
      [activityId]
    )
    expect(finalCount.count).toBe(5)
  })

  it('should handle unique constraint on (activity_id, student_id)', async () => {
    const studentId = studentIds[0]

    // First registration should succeed
    const first = await dbRun(
      'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
      [activityId, studentId, 'registered']
    )
    expect(first.lastID).toBeDefined()

    // Second registration should fail (unique constraint)
    await expect(
      dbRun(
        'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
        [activityId, studentId, 'registered']
      )
    ).rejects.toThrow()

    // Cleanup
    await dbRun('DELETE FROM participations WHERE activity_id = ? AND student_id = ?', 
      [activityId, studentId])
  })

  it('should rollback on capacity check failure', async () => {
    const testActivityId = activityId

    // Fill up the activity
    await dbRun('DELETE FROM participations WHERE activity_id = ?', [testActivityId])
    
    for (let i = 0; i < 5; i++) {
      await dbRun(
        'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
        [testActivityId, studentIds[i], 'registered']
      )
    }

    // Verify it's full
    const count = await dbGet(
      'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
      [testActivityId]
    )
    expect(count.count).toBe(5)

    // Try to register when full
    await expect(
      withTransaction(async () => {
        const checkCount = await dbGet(
          'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
          [testActivityId]
        ) as any

        if (checkCount.count >= 5) throw new Error('CAPACITY_FULL')

        await dbRun(
          'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
          [testActivityId, studentIds[5], 'registered']
        )
      })
    ).rejects.toThrow('CAPACITY_FULL')

    // Verify count is still 5
    const finalCount = await dbGet(
      'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
      [testActivityId]
    )
    expect(finalCount.count).toBe(5)
  })
})
