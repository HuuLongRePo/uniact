import { describe, it, expect, beforeAll } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/database'
import { generateQuestions, getQuestionsForUser, verifyAnswers } from '@/lib/security-questions'
import { createSlots, listSlots, registerForSlot } from '@/lib/time-slots'

describe('Authentication Fallbacks', () => {
  let testUserId: number
  let testActivityId: number
  let testParticipationId: number

  beforeAll(async () => {
    // Wait for all migrations to complete
    await dbReady()
    
    // Create test class
    const classResult = await dbRun(
      'INSERT INTO classes (name, grade, teacher_id) VALUES (?, ?, ?)',
      ['Test Class 1A', '12', 1]
    )
    const testClassId = classResult.lastID!
    
    // Create test user
    const userResult = await dbRun(
      'INSERT INTO users (email, password_hash, name, role, class_id) VALUES (?, ?, ?, ?, ?)',
      ['fallback-test@test.com', 'hash', 'Test User', 'student', testClassId]
    )
    testUserId = userResult.lastID!

    // Create test activity
    const actResult = await dbRun(
      'INSERT INTO activities (title, date_time, location, teacher_id, max_participants) VALUES (?, ?, ?, ?, ?)',
      ['Test Activity', '2025-12-01 10:00:00', 'Test Hall', 1, 100]
    )
    testActivityId = actResult.lastID!

    // Create participation
    const partResult = await dbRun(
      'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
      [testActivityId, testUserId, 'registered']
    )
    testParticipationId = partResult.lastID!

    // Create attendance record for question generation
    await dbRun(
      'INSERT INTO attendance_records (activity_id, student_id, method) VALUES (?, ?, ?)',
      [testActivityId, testUserId, 'qr']
    )
  })

  describe('Security Questions', () => {
    it('should generate personalized questions', async () => {
      await generateQuestions(testUserId)
      const questions = await getQuestionsForUser(testUserId)
      expect(questions.length).toBeGreaterThan(0)
      expect(questions[0]).toHaveProperty('question_text')
    })

    it('should verify correct answers', async () => {
      const questions = await getQuestionsForUser(testUserId)
      // For class size question
      const classQuestion = questions.find((q: any) => q.question_text.includes('bao nhiêu'))
      if (classQuestion) {
        const result = await verifyAnswers(testUserId, [
          { questionId: classQuestion.id, answer: '1' } // 1 student in class
        ])
        expect(result).toBe(true)
      }
    })

    it('should reject incorrect answers', async () => {
      const questions = await getQuestionsForUser(testUserId)
      if (questions.length > 0) {
        const result = await verifyAnswers(testUserId, [
          { questionId: questions[0].id, answer: 'wrong answer xyz' }
        ])
        expect(result).toBe(false)
      }
    })

    it('should rate limit after 5 attempts', async () => {
      const questions = await getQuestionsForUser(testUserId)
      if (questions.length > 0) {
        // Simulate 5 failed attempts
        for (let i = 0; i < 5; i++) {
          await verifyAnswers(testUserId, [
            { questionId: questions[0].id, answer: 'wrong' }
          ]).catch(() => {})
        }
        // 6th attempt should fail with rate limit
        await expect(
          verifyAnswers(testUserId, [{ questionId: questions[0].id, answer: 'correct' }])
        ).rejects.toThrow('Too many attempts')
      }
    })
  })

  describe('Time Slot Scheduling', () => {
    it('should create time slots for activity', async () => {
      await createSlots(testActivityId, '2025-12-01', 100, 50) // 100 participants, 50 per slot = 2 slots
      const slots = await listSlots(testActivityId)
      expect(slots.length).toBe(2)
      expect(slots[0]).toHaveProperty('slot_start')
      expect(slots[0]).toHaveProperty('max_concurrent', 50)
    })

    it('should list available slots', async () => {
      const slots = await listSlots(testActivityId)
      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0].status).toBe('available')
    })

    it('should register participation to a slot', async () => {
      const slots = await listSlots(testActivityId)
      const result = await registerForSlot(testParticipationId, slots[0].id)
      expect(result.success).toBe(true)

      // Verify slot updated
      const updated = await dbGet(
        'SELECT current_registered FROM activity_time_slots WHERE id = ?',
        [slots[0].id]
      ) as any
      expect(updated.current_registered).toBe(1)
    })

    it('should prevent double registration', async () => {
      const slots = await listSlots(testActivityId)
      await expect(
        registerForSlot(testParticipationId, slots[0].id)
      ).rejects.toThrow('Already assigned')
    })

    it('should mark slot as full when capacity reached', async () => {
      // Create new slot with max 1
      await dbRun(
        'INSERT INTO activity_time_slots (activity_id, slot_date, slot_start, slot_end, max_concurrent) VALUES (?, ?, ?, ?, ?)',
        [testActivityId, '2025-12-01', '10:00:00', '11:00:00', 1]
      )
      const slots = await listSlots(testActivityId)
      const smallSlot = slots.find((s: any) => s.max_concurrent === 1)

      // Create second student user + participation (FK enforced on participations.student_id)
      const user2 = await dbRun(
        'INSERT INTO users (email, password_hash, name, role, class_id) VALUES (?, ?, ?, ?, ?)',
        ['fallback-test-2@test.com', 'hash', 'Test User 2', 'student', null]
      )
      const newPart = await dbRun(
        'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
        [testActivityId, user2.lastID!, 'registered']
      )

      if (smallSlot) {
        await registerForSlot(newPart.lastID!, smallSlot.id)
        const updated = await dbGet(
          'SELECT status FROM activity_time_slots WHERE id = ?',
          [smallSlot.id]
        ) as any
        expect(updated.status).toBe('full')
      }
    })
  })

  describe('Database Schema', () => {
    it('should have webauthn_credentials table', async () => {
      const result = await dbGet(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='webauthn_credentials'"
      )
      expect(result).toBeTruthy()
    })

    it('should have security_questions table', async () => {
      const result = await dbGet(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='security_questions'"
      )
      expect(result).toBeTruthy()
    })

    it('should have activity_time_slots table', async () => {
      const result = await dbGet(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='activity_time_slots'"
      )
      expect(result).toBeTruthy()
    })

    it('should have time_slot_id column in participations', async () => {
      const result = await dbGet(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='participations'"
      ) as any
      expect(result.sql).toContain('time_slot_id')
    })
  })
})
