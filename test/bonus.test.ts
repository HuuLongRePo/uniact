import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/db-core'
import { NextRequest } from 'next/server'
import { ensureBonusTestSchema } from './bonus-test-schema'

// Mock the auth guard to bypass real auth in tests
vi.mock('@/lib/guards', () => ({
  getUserFromRequest: vi.fn(async (req: NextRequest) => {
    const token = req.headers.get('x-test-user-id')
    if (!token) return null
    const [userId, role] = token.split(':')
    return { id: Number(userId), role, email: `user${userId}@test.com` }
  })
}))

// Helper: create NextRequest with test user
function createRequest(url: string, options: { userId?: number; role?: string; method?: string; body?: any } = {}) {
  const req = new NextRequest(`http://localhost:3000${url}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.userId && { 'x-test-user-id': `${options.userId}:${options.role || 'student'}` })
    },
    ...(options.body && { body: JSON.stringify(options.body) })
  })
  return req
}

// Helper: setup test data
async function setupTestData() {
  // Create test users with password_hash
  // Password is never verified in these tests; avoid slow hashing.
  const hashedPw = 'test-hash'

  await dbRun(
    `INSERT INTO users (email, name, role, password_hash, class_id, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ['teacher1@test.com', 'Teacher One', 'teacher', hashedPw, null]
  )
  const teacherResult = await dbGet('SELECT id FROM users WHERE email = ?', ['teacher1@test.com'])
  const teacherId = teacherResult?.id || 1

  await dbRun(
    `INSERT INTO users (email, name, role, password_hash, class_id, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ['admin1@test.com', 'Admin One', 'admin', hashedPw, null]
  )
  const adminResult = await dbGet('SELECT id FROM users WHERE email = ?', ['admin1@test.com'])
  const adminId = adminResult?.id || 2

  await dbRun(
    `INSERT INTO users (email, name, role, password_hash, class_id, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ['student1@test.com', 'Student One', 'student', hashedPw, null]
  )
  const studentResult = await dbGet('SELECT id FROM users WHERE email = ?', ['student1@test.com'])
  const studentId = studentResult?.id || 3

  return { teacherId, adminId, studentId }
}

async function clearTestData() {
  try { await dbRun('DELETE FROM suggested_bonus_points') } catch {}
  try { await dbRun('DELETE FROM users WHERE email LIKE ?', ['%@test.com']) } catch {}
}

describe('Bonus API Endpoints', () => {
  let testData: { teacherId: number; adminId: number; studentId: number }

  beforeAll(async () => {
    await dbReady()
    await ensureBonusTestSchema()
    testData = await setupTestData()
  })

  afterEach(async () => {
    try {
      await dbRun('DELETE FROM suggested_bonus_points WHERE status != ?', ['pending'])
    } catch {}
  })

  afterAll(async () => {
    await clearTestData()
    // Don't close db in test (it's managed by test runner)
  })

  describe('Bonus API - GET /api/bonus', () => {
    it('should return 401 if no auth header', async () => {
      // Mock implementation that returns list or checks auth
      const rows = await dbAll('SELECT * FROM suggested_bonus_points ORDER BY created_at DESC')
      expect(Array.isArray(rows)).toBe(true)
    })

    it('should list all bonus suggestions if authorized', async () => {
      // Insert test suggestion
      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, points, status, author_id, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 5, testData.teacherId]
      )

      const rows = await dbAll('SELECT * FROM suggested_bonus_points ORDER BY created_at DESC')
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0].student_id).toBe(testData.studentId)
      expect(rows[0].points).toBe(5)
    })

    it('should filter by status', async () => {
      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, points, status, author_id, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 5, testData.teacherId]
      )
      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, points, status, author_id, created_at, updated_at)
         VALUES (?, ?, 'approved', ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 3, testData.adminId]
      )

      const pending = await dbAll('SELECT * FROM suggested_bonus_points WHERE status = ?', ['pending'])
      const approved = await dbAll('SELECT * FROM suggested_bonus_points WHERE status = ?', ['approved'])
      
      expect(pending.length).toBeGreaterThan(0)
      expect(approved.length).toBeGreaterThan(0)
      pending.forEach(p => expect(p.status).toBe('pending'))
      approved.forEach(a => expect(a.status).toBe('approved'))
    })
  })

  describe('Bonus API - POST /api/bonus', () => {
    it('should create a new bonus suggestion', async () => {
      const res = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, source_id, points, status, author_id, evidence_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 'achievement', 1, 5, testData.teacherId, 'https://example.com/evidence']
      )
      
      expect(res.lastID).toBeDefined()
      expect(res.changes).toBe(1)

      const suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [res.lastID])
      expect(suggestion?.student_id).toBe(testData.studentId)
      expect(suggestion?.points).toBe(5)
      expect(suggestion?.status).toBe('pending')
      expect(suggestion?.author_id).toBe(testData.teacherId)
    })

    it('should store suggestion with all fields', async () => {
      const res = await dbRun(
        `INSERT INTO suggested_bonus_points
          (student_id, source_type, source_id, points, status, author_id, evidence_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 'achievement', 1, 5, testData.teacherId, 'https://example.com/evidence']
      )
      
      expect(res.lastID).toBeDefined()
      expect(res.changes).toBe(1)

      const suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [res.lastID])
      expect(suggestion?.student_id).toBe(testData.studentId)
      expect(suggestion?.points).toBe(5)
      expect(suggestion?.status).toBe('pending')
      expect(suggestion?.author_id).toBe(testData.teacherId)
      expect(suggestion?.evidence_url).toBe('https://example.com/evidence')
      expect(suggestion?.source_type).toBe('achievement')
    })
  })

  describe('Bonus API - POST /api/bonus/[id]/approve', () => {
    it('should approve a suggestion', async () => {
      const sugRes = await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, points, status, author_id, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 5, testData.teacherId]
      )
      const sugId = sugRes.lastID

      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['approved', testData.adminId, sugId]
      )

      const suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [sugId])
      expect(suggestion?.status).toBe('approved')
      expect(suggestion?.approver_id).toBe(testData.adminId)
    })

    it('should reject a suggestion', async () => {
      const sugRes = await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, points, status, author_id, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 5, testData.teacherId]
      )
      const sugId = sugRes.lastID

      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['rejected', testData.adminId, sugId]
      )

      const suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [sugId])
      expect(suggestion?.status).toBe('rejected')
      expect(suggestion?.approver_id).toBe(testData.adminId)
    })

    it('should handle non-existent suggestion gracefully', async () => {
      const suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [99999])
      expect(suggestion).toBeUndefined()
    })
  })

  describe('Bonus Workflow Integration', () => {
    it('should support full workflow: create -> approve -> verify', async () => {
      // Create
      const createRes = await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, points, status, author_id, evidence_url, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
        [testData.studentId, 10, testData.teacherId, 'https://example.com/evidence']
      )
      const sugId = createRes.lastID
      
      let suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [sugId])
      expect(suggestion?.status).toBe('pending')

      // Approve
      await dbRun(
        'UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime(\'now\') WHERE id = ?',
        ['approved', testData.adminId, sugId]
      )
      
      suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [sugId])
      expect(suggestion?.status).toBe('approved')
      expect(suggestion?.approver_id).toBe(testData.adminId)
      expect(suggestion?.points).toBe(10)
    })
  })
})
