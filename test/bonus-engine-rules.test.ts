import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/db-core'
import {
  loadRules,
  evaluateRulesForStudent,
  getApprovedPointsForStudent,
  applyRuleSuggestions,
} from '@/lib/bonus-engine'

describe('Bonus Engine - Rules Evaluation', () => {
  beforeAll(async () => {
    await dbReady()
    // Create necessary tables if missing
    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          applies_to TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          criteria_json TEXT,
          points REAL NOT NULL DEFAULT 0,
          cap_per_term REAL,
          cap_per_year REAL,
          auto_apply INTEGER DEFAULT 1,
          requires_approval INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT
        )
      `)
    } catch (e) {
      // Table may already exist
    }

    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS subjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          credits REAL DEFAULT 0,
          grade_level INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } catch (e) {}

    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS grades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          subject_id INTEGER NOT NULL REFERENCES subjects(id),
          term TEXT NOT NULL,
          components_json TEXT,
          final_score REAL,
          status TEXT DEFAULT 'draft'
        )
      `)
    } catch (e) {}

    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS conduct_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          term TEXT NOT NULL,
          final_conduct_score REAL,
          UNIQUE(student_id, term)
        )
      `)
    } catch (e) {}

    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS suggested_bonus_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          source_type TEXT,
          source_id INTEGER,
          points REAL NOT NULL DEFAULT 0,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          author_id INTEGER,
          evidence_url TEXT,
          apply_to TEXT DEFAULT 'hoc_tap',
          source_provenance TEXT,
          term TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT
        )
      `)
    } catch (e) {}
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await dbRun('DELETE FROM suggested_bonus_points WHERE reason LIKE ?', ['%test%'])
      await dbRun('DELETE FROM conduct_scores WHERE student_id IN (SELECT id FROM conduct_scores WHERE student_id > 1000)')
      await dbRun('DELETE FROM grades WHERE student_id > 1000')
      await dbRun('DELETE FROM subjects WHERE code LIKE ?', ['TEST%'])
      await dbRun('DELETE FROM rules WHERE code LIKE ?', ['TEST_%'])
    } catch (e) {
      // Ignore errors
    }
  })

  it('should load rules from database', async () => {
    // Insert test rule
    await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_RULE_1', 'Test Rule 1', 'hoc_tap', 'grade', '{"gpa_gte":8.0}', 5, 1]
    )

    const rules = await loadRules()
    expect(rules.length).toBeGreaterThan(0)
    const testRule = rules.find(r => r.code === 'TEST_RULE_1')
    expect(testRule).toBeDefined()
    expect(testRule?.name).toBe('Test Rule 1')
    expect(testRule?.points).toBe(5)
  })

  it('should evaluate GPA-based rules for a student', async () => {
    // Setup: create subject, grades, and rule
    const subRes = await dbRun(
      `INSERT INTO subjects (code, name, credits, grade_level)
       VALUES (?, ?, ?, ?)`,
      ['TEST_MATH', 'Test Math', 3, 12]
    )
    const subjectId = subRes.lastID

    const studentId = 1001
    const term = '2025-HK1'

    // Insert grades for student
    const components = { process: 8.5, midterm: 8.0, final: 8.2 }
    const avgScore = (8.5 + 8.0 + 8.2) / 3 // 8.233
    await dbRun(
      `INSERT INTO grades (student_id, subject_id, term, components_json, final_score, status)
       VALUES (?, ?, ?, ?, ?, 'approved')`,
      [studentId, subjectId, term, JSON.stringify(components), avgScore]
    )

    // Insert rule: GPA >= 8.0
    await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_GPA_8', 'GPA >= 8.0 Bonus', 'hoc_tap', 'grade', '{"gpa_gte":8.0}', 5, 1]
    )

    // Evaluate
    const suggestions = await evaluateRulesForStudent(studentId, term)
    expect(suggestions.length).toBeGreaterThan(0)

    const gpaBonusRule = suggestions.find(s => s.ruleCode === 'TEST_GPA_8')
    expect(gpaBonusRule).toBeDefined()
    expect(gpaBonusRule?.points).toBe(5)
    expect(gpaBonusRule?.appliesTo).toBe('hoc_tap')
  })

  it('should evaluate conduct-based rules', async () => {
    const studentId = 1002
    const term = '2025-HK1'

    // Insert conduct score
    await dbRun(
      `INSERT INTO conduct_scores (student_id, term, final_conduct_score)
       VALUES (?, ?, ?)`,
      [studentId, term, 9.5]
    )

    // Insert rule: Conduct >= 9.0
    await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_CONDUCT_9', 'Excellent Conduct', 'ren_luyen', 'conduct', '{"conduct_gte":9.0}', 5, 1]
    )

    // Evaluate
    const suggestions = await evaluateRulesForStudent(studentId, term)
    const conductRule = suggestions.find(s => s.ruleCode === 'TEST_CONDUCT_9')
    expect(conductRule).toBeDefined()
    expect(conductRule?.appliesTo).toBe('ren_luyen')
    expect(conductRule?.points).toBe(5)
  })

  it('should not match rules when criteria not met', async () => {
    const studentId = 1003
    const term = '2025-HK1'

    // Create low GPA
    const subRes = await dbRun(
      `INSERT INTO subjects (code, name, credits) VALUES (?, ?, ?)`,
      ['TEST_LOW_GPA', 'Test Low', 3]
    )
    await dbRun(
      `INSERT INTO grades (student_id, subject_id, term, final_score, status)
       VALUES (?, ?, ?, ?, 'approved')`,
      [studentId, subRes.lastID, term, 6.5]
    )

    // Insert rule that requires GPA >= 8.0
    await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_NO_MATCH', 'High GPA Only', 'hoc_tap', 'grade', '{"gpa_gte":8.0}', 5, 1]
    )

    // Evaluate
    const suggestions = await evaluateRulesForStudent(studentId, term)
    const noMatch = suggestions.find(s => s.ruleCode === 'TEST_NO_MATCH')
    expect(noMatch).toBeUndefined()
  })

  it('should calculate approved points for a student', async () => {
    const studentId = 1004
    const term = '2025-HK1'

    // Insert some suggested bonuses
    await dbRun(
      `INSERT INTO suggested_bonus_points (student_id, points, status, apply_to, term, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, 5, 'approved', 'hoc_tap', term, 'test bonus 1']
    )
    await dbRun(
      `INSERT INTO suggested_bonus_points (student_id, points, status, apply_to, term, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, 3, 'approved', 'hoc_tap', term, 'test bonus 2']
    )
    await dbRun(
      `INSERT INTO suggested_bonus_points (student_id, points, status, apply_to, term, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, 7, 'pending', 'hoc_tap', term, 'test pending']
    )

    const approvedHocTap = await getApprovedPointsForStudent(studentId, term, 'hoc_tap')
    expect(approvedHocTap).toBe(8) // 5 + 3

    const total = await getApprovedPointsForStudent(studentId, term)
    expect(total).toBe(8) // Only approved
  })

  it('should apply rule suggestions with auto-apply', async () => {
    const studentId = 1005
    const term = '2025-HK1'
    const authorId = 999

    // Create a rule that auto-applies
    const ruleRes = await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply, requires_approval, cap_per_term)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_AUTO_APPLY', 'Auto Apply Test', 'hoc_tap', 'grade', '{}', 10, 1, 0, 50]
    )

    // Create suggestions
    const suggestions = [
      {
        ruleId: ruleRes.lastID,
        ruleCode: 'TEST_AUTO_APPLY',
        studentId,
        term,
        appliesTo: 'hoc_tap',
        points: 10,
        reason: 'Test auto apply rule',
        provenance: { rule: 'TEST_AUTO_APPLY' }
      }
    ]

    const results = await applyRuleSuggestions(suggestions, authorId, term)
    expect(results.length).toBe(1)
    expect(results[0].status).toBe('approved')

    // Verify record was created
    const record = await dbGet(
      `SELECT * FROM suggested_bonus_points WHERE source_type = ? AND source_id = ? AND student_id = ?`,
      ['rule', ruleRes.lastID, studentId]
    )
    expect(record).toBeDefined()
    expect(record?.status).toBe('approved')
    expect(record?.points).toBe(10)
  })

  it('should respect cap when applying suggestions', async () => {
    const studentId = 1006
    const term = '2025-HK1'
    const authorId = 999

    // Insert existing approved points
    await dbRun(
      `INSERT INTO suggested_bonus_points (student_id, points, status, apply_to, term, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, 45, 'approved', 'hoc_tap', term, 'existing bonus']
    )

    // Create rule with cap of 50 per term
    const ruleRes = await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply, cap_per_term)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_CAP_ENFORCE', 'Cap Test', 'hoc_tap', 'grade', '{}', 10, 1, 50]
    )

    // Try to apply 10 more points (would exceed cap of 50)
    const suggestions = [
      {
        ruleId: ruleRes.lastID,
        ruleCode: 'TEST_CAP_ENFORCE',
        studentId,
        term,
        appliesTo: 'hoc_tap',
        points: 10,
        reason: 'Would exceed cap',
        provenance: { rule: 'TEST_CAP_ENFORCE' }
      }
    ]

    const results = await applyRuleSuggestions(suggestions, authorId, term)
    expect(results.length).toBe(1)
    expect(results[0].status).toBe('pending') // Created as pending due to cap
    expect(results[0].note).toContain('Vượt quá giới hạn') // exceeds cap in Vietnamese
  })

  it('should create pending suggestion when rule requires approval', async () => {
    const studentId = 1007
    const term = '2025-HK1'
    const authorId = 999

    // Create rule that requires approval
    const ruleRes = await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply, requires_approval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_REQUIRES_APPROVAL', 'Needs Approval', 'hoc_tap', 'grade', '{}', 5, 0, 1]
    )

    const suggestions = [
      {
        ruleId: ruleRes.lastID,
        ruleCode: 'TEST_REQUIRES_APPROVAL',
        studentId,
        term,
        appliesTo: 'hoc_tap',
        points: 5,
        reason: 'Requires admin review',
        provenance: { rule: 'TEST_REQUIRES_APPROVAL' }
      }
    ]

    const results = await applyRuleSuggestions(suggestions, authorId, term)
    expect(results.length).toBe(1)
    expect(results[0].status).toBe('pending')

    // Verify record status
    const record = await dbGet(
      `SELECT * FROM suggested_bonus_points WHERE source_id = ? AND student_id = ?`,
      [ruleRes.lastID, studentId]
    )
    expect(record?.status).toBe('pending')
  })

  it('should handle multiple rules for same student', async () => {
    const studentId = 1008
    const term = '2025-HK1'

    // Create subject and grades
    const subRes = await dbRun(
      `INSERT INTO subjects (code, name, credits) VALUES (?, ?, ?)`,
      ['TEST_MULTI', 'Test Multi', 3]
    )
    await dbRun(
      `INSERT INTO grades (student_id, subject_id, term, final_score, status)
       VALUES (?, ?, ?, ?, 'approved')`,
      [studentId, subRes.lastID, term, 8.5]
    )

    // Create conduct score
    await dbRun(
      `INSERT INTO conduct_scores (student_id, term, final_conduct_score)
       VALUES (?, ?, ?)`,
      [studentId, term, 9.0]
    )

    // Insert multiple rules
    await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_HT_MULTI', 'Hoc Tap Multi', 'hoc_tap', 'grade', '{"gpa_gte":8.0}', 5, 1]
    )
    await dbRun(
      `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['TEST_RL_MULTI', 'Ren Luyen Multi', 'ren_luyen', 'conduct', '{"conduct_gte":9.0}', 3, 1]
    )

    // Evaluate
    const suggestions = await evaluateRulesForStudent(studentId, term)
    expect(suggestions.length).toBe(2)

    const hocTap = suggestions.find(s => s.appliesTo === 'hoc_tap')
    const renLuyen = suggestions.find(s => s.appliesTo === 'ren_luyen')

    expect(hocTap?.points).toBe(5)
    expect(renLuyen?.points).toBe(3)
  })
})
