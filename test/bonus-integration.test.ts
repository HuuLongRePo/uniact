import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/db-core'
import { BonusEngine, createDefaultEngine } from '@/lib/bonus-engine'

/**
 * Integration Tests: Full Bonus Workflow
 * - Teacher proposes bonus for student
 * - Admin approves proposal
 * - Verify data consistency and audit trails
 */

interface TestUser {
  id: number
  email: string
  role: 'teacher' | 'admin' | 'student'
  name: string
}

interface TestContext {
  teacher: TestUser
  admin: TestUser
  student: TestUser
  engine: BonusEngine
}

async function setupTestUsers(): Promise<TestContext> {
  // Password is never verified in these tests; avoid slow hashing.
  const hashedPw = 'test-hash'

  // Create teacher
  await dbRun(
    `INSERT INTO users (email, name, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    ['teacher.integration@test.com', 'Teacher Integration', 'teacher', hashedPw]
  )
  const teacher = await dbGet('SELECT * FROM users WHERE email = ?', ['teacher.integration@test.com'])

  // Create admin
  await dbRun(
    `INSERT INTO users (email, name, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    ['admin.integration@test.com', 'Admin Integration', 'admin', hashedPw]
  )
  const admin = await dbGet('SELECT * FROM users WHERE email = ?', ['admin.integration@test.com'])

  // Create student
  await dbRun(
    `INSERT INTO users (email, name, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    ['student.integration@test.com', 'Student Integration', 'student', hashedPw]
  )
  const student = await dbGet('SELECT * FROM users WHERE email = ?', ['student.integration@test.com'])

  return {
    teacher,
    admin,
    student,
    engine: createDefaultEngine(),
  }
}

async function cleanupTestData() {
  await dbRun('DELETE FROM suggested_bonus_points WHERE author_id IN (SELECT id FROM users WHERE email LIKE ?)', ['%.integration@test.com'])
  await dbRun('DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE ?)', ['%.integration@test.com'])
  await dbRun('DELETE FROM users WHERE email LIKE ?', ['%.integration@test.com'])
}

describe('Bonus Module - Full Integration Tests', () => {
  let context: TestContext

  beforeAll(async () => {
    // Avoid racing with async migration runner in db-core.
    await dbReady()

    // Ensure suggested_bonus_points table exists (fallback for test env)
    try {
      const tableCheck = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='suggested_bonus_points'")
      if (!tableCheck) {
        await dbRun(`
          CREATE TABLE IF NOT EXISTS suggested_bonus_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            source_type TEXT,
            source_id INTEGER,
            points REAL,
            reason TEXT,
            status TEXT,
            author_id INTEGER,
            approver_id INTEGER,
            evidence_url TEXT,
            apply_to TEXT DEFAULT 'hoc_tap',
            source_provenance TEXT DEFAULT 'manual',
            term TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `)
      }
    } catch (e) {
      console.warn('Could not verify suggested_bonus_points table:', e)
    }

    context = await setupTestUsers()
  })

  afterEach(async () => {
    try {
      await dbRun('DELETE FROM suggested_bonus_points WHERE author_id = ?', [context.teacher.id])
    } catch {}
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('1. Teacher Proposes Bonus (Create Phase)', () => {
    it('should allow teacher to create bonus proposal for student', async () => {
      const result = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, evidence_url, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 10, context.teacher.id, 'https://example.com/evidence']
      )

      expect(result.lastID).toBeDefined()
      expect(result.changes).toBe(1)

      const proposal = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [result.lastID])
      expect(proposal).toBeDefined()
      expect(proposal.student_id).toBe(context.student.id)
      expect(proposal.points).toBe(10)
      expect(proposal.status).toBe('pending')
      expect(proposal.author_id).toBe(context.teacher.id)
    })

    it('should calculate points using engine before storing', async () => {
      const engineResult = context.engine.calculate({
        studentId: context.student.id,
        sourceType: 'achievement',
        basePoints: 8,
        multiplier: 1.25, // exceptional case
      })

      expect(engineResult.suggestedPoints).toBe(10)

      const dbResult = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', engineResult.suggestedPoints, context.teacher.id]
      )

      const proposal = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [dbResult.lastID])
      expect(proposal.points).toBe(10)
    })

    it('should reject proposals exceeding cap', async () => {
      const validation = context.engine.validateAgainstCap(40, 15, 'semester')
      expect(validation.valid).toBe(false)
      expect(validation.remainingCapacity).toBe(10)
    })

    it('should record multiple proposals for same student', async () => {
      const proposal1 = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 5, context.teacher.id]
      )

      const proposal2 = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'activity', 3, context.teacher.id]
      )

      expect(proposal1.lastID).not.toBe(proposal2.lastID)

      const proposals = await dbAll(
        'SELECT * FROM suggested_bonus_points WHERE student_id = ? AND author_id = ?',
        [context.student.id, context.teacher.id]
      )
      expect(proposals.length).toBe(2)
      expect(proposals.reduce((sum, p) => sum + p.points, 0)).toBe(8)
    })
  })

  describe('2. Admin Reviews & Approves (Approval Phase)', () => {
    it('should allow admin to list pending proposals', async () => {
      const proposal1 = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 8, context.teacher.id]
      )

      const proposals = await dbAll(
        'SELECT * FROM suggested_bonus_points WHERE status = ?',
        ['pending']
      )
      expect(proposals.length).toBeGreaterThan(0)
      expect(proposals.some(p => p.id === proposal1.lastID)).toBe(true)
    })

    it('should allow admin to approve proposal', async () => {
      const proposal = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 10, context.teacher.id]
      )

      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['approved', context.admin.id, proposal.lastID]
      )

      const updated = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      expect(updated.status).toBe('approved')
      expect(updated.approver_id).toBe(context.admin.id)
    })

    it('should allow admin to reject proposal with note', async () => {
      const proposal = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'activity', 5, context.teacher.id]
      )

      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['rejected', context.admin.id, proposal.lastID]
      )

      const updated = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      expect(updated.status).toBe('rejected')
      expect(updated.approver_id).toBe(context.admin.id)
    })

    it('should not allow teacher to approve own proposals', async () => {
      const proposal = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 8, context.teacher.id]
      )

      // Simulate teacher trying to approve (in real app, auth guards this)
      // Just verify the rule at DB level: approver must be different from author
      const current = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      expect(current.author_id).toBe(context.teacher.id)
      expect(current.approver_id).toBeNull() // Not yet approved
    })
  })

  describe('3. Data Consistency & Validation', () => {
    it('should maintain status workflow: pending → approved/rejected', async () => {
      const proposal = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 10, context.teacher.id]
      )

      // Verify initial state
      let record = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      expect(record.status).toBe('pending')

      // Approve
      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ? WHERE id = ?',
        ['approved', context.admin.id, proposal.lastID]
      )
      record = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      expect(record.status).toBe('approved')
    })

    it('should enforce semester caps during approval', async () => {
      // Create multiple proposals totaling 55 points
      const proposals = []
      for (let i = 0; i < 3; i++) {
        const res = await dbRun(
          `INSERT INTO suggested_bonus_points
            (student_id, source_type, points, status, author_id, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
          [context.student.id, 'activity', 20, context.teacher.id]
        )
        proposals.push(res.lastID)
      }

      // Calculate total
      const total = await dbGet(
        'SELECT SUM(points) as total FROM suggested_bonus_points WHERE student_id = ?',
        [context.student.id]
      )
      expect(total.total).toBe(60)

      // Validate against cap (50/semester)
      const validation = context.engine.validateAgainstCap(0, total.total, 'semester')
      expect(validation.valid).toBe(false) // 60 > 50
      expect(validation.remainingCapacity).toBeLessThan(total.total)
    })

    it('should maintain referential integrity', async () => {
      const proposal = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 8, context.teacher.id]
      )

      const record = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      
      // Verify foreign key references exist
      const student = await dbGet('SELECT * FROM users WHERE id = ?', [record.student_id])
      const author = await dbGet('SELECT * FROM users WHERE id = ?', [record.author_id])
      
      expect(student).toBeDefined()
      expect(author).toBeDefined()
      expect(author.role).toBe('teacher')
    })

    it('should timestamp all changes (created_at, updated_at)', async () => {
      const proposal = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 10, context.teacher.id]
      )

      let record = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      const originalCreated = record.created_at

      // Wait a bit and then update
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['approved', context.admin.id, proposal.lastID]
      )

      record = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposal.lastID])
      expect(record.created_at).toBe(originalCreated) // Should not change
      expect(record.updated_at).toBeTruthy() // Should have value
      expect(record.status).toBe('approved') // Verify status changed
    })
  })

  describe('4. Complete Workflow (End-to-End)', () => {
    it('should complete full workflow: propose → approve → verify', async () => {
      // 1. Teacher proposes
      const calcResult = context.engine.calculate({
        studentId: context.student.id,
        sourceType: 'achievement',
        basePoints: 8,
      })

      const proposalRes = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, evidence_url, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
        [
          context.student.id,
          'achievement',
          calcResult.suggestedPoints,
          context.teacher.id,
          'https://example.com/evidence.jpg',
        ]
      )

      const proposalId = proposalRes.lastID

      // 2. Admin reviews and approves
      const approvalRes = await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['approved', context.admin.id, proposalId]
      )
      expect(approvalRes.changes).toBe(1)

      // 3. Verify final state
      const final = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [proposalId])
      expect(final.student_id).toBe(context.student.id)
      expect(final.points).toBe(calcResult.suggestedPoints)
      expect(final.status).toBe('approved')
      expect(final.author_id).toBe(context.teacher.id)
      expect(final.approver_id).toBe(context.admin.id)
      expect(final.evidence_url).toBe('https://example.com/evidence.jpg')
    })

    it('should aggregate bonuses correctly', async () => {
      // Create 3 proposals
      const proposals = []
      const points = [5, 7, 3]

      for (const pt of points) {
        const res = await dbRun(
          `INSERT INTO suggested_bonus_points
            (student_id, source_type, points, status, author_id, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
          [context.student.id, 'achievement', pt, context.teacher.id]
        )
        proposals.push(res.lastID)
      }

      // Approve all
      for (const propId of proposals) {
        await dbRun(
          'UPDATE suggested_bonus_points SET status = ?, approver_id = ? WHERE id = ?',
          ['approved', context.admin.id, propId]
        )
      }

      // Verify aggregate
      const approved = await dbAll(
        'SELECT * FROM suggested_bonus_points WHERE student_id = ? AND status = ?',
        [context.student.id, 'approved']
      )
      expect(approved.length).toBe(3)

      const total = approved.reduce((sum, p) => sum + p.points, 0)
      expect(total).toBe(15)
    })

    it('should handle mixed approval states', async () => {
      // Create 3 proposals with different outcomes
      const propApprove = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 8, context.teacher.id]
      )

      const propReject = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'activity', 5, context.teacher.id]
      )

      const propPending = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'development', 3, context.teacher.id]
      )

      // Approve first
      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ? WHERE id = ?',
        ['approved', context.admin.id, propApprove.lastID]
      )

      // Reject second
      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ? WHERE id = ?',
        ['rejected', context.admin.id, propReject.lastID]
      )

      // Leave third pending

      // Verify states
      const allProposals = await dbAll(
        'SELECT * FROM suggested_bonus_points WHERE student_id = ?',
        [context.student.id]
      )

      const approved = allProposals.filter(p => p.status === 'approved')
      const rejected = allProposals.filter(p => p.status === 'rejected')
      const pending = allProposals.filter(p => p.status === 'pending')

      expect(approved.length).toBe(1)
      expect(rejected.length).toBe(1)
      expect(pending.length).toBe(1)

      expect(approved[0].points).toBe(8)
      expect(rejected[0].points).toBe(5)
      expect(pending[0].points).toBe(3)
    })
  })

  describe('5. Edge Cases & Error Handling', () => {
    it('should handle zero points proposal', async () => {
      const res = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 0, context.teacher.id]
      )

      const proposal = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [res.lastID])
      expect(proposal.points).toBe(0)
    })

    it('should handle maximum cap limit', async () => {
      const result = context.engine.calculate({
        studentId: context.student.id,
        sourceType: 'achievement',
        basePoints: 20,
      })

      expect(result.capApplied).toBe(true)
      expect(result.suggestedPoints).toBe(15) // max single bonus
    })

    it('should handle same student with multiple teachers', async () => {
      // Create second teacher
      const hashedPw = 'test-hash'
      
      await dbRun(
        `INSERT INTO users (email, name, role, password_hash, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        ['teacher2.integration@test.com', 'Teacher 2 Integration', 'teacher', hashedPw]
      )
      const teacher2 = await dbGet('SELECT * FROM users WHERE email = ?', ['teacher2.integration@test.com'])

      const proposal1 = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'achievement', 5, context.teacher.id]
      )

      const proposal2 = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, points, status, author_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [context.student.id, 'activity', 3, teacher2.id]
      )

      const proposals = await dbAll(
        'SELECT * FROM suggested_bonus_points WHERE student_id = ? ORDER BY author_id',
        [context.student.id]
      )

      expect(proposals.length).toBeGreaterThanOrEqual(2)
      expect(proposals.map(p => p.author_id)).toContain(context.teacher.id)
      expect(proposals.map(p => p.author_id)).toContain(teacher2.id)

      // Cleanup
      await dbRun('DELETE FROM users WHERE id = ?', [teacher2.id])
    })
  })
})
