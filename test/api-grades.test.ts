import { beforeAll, afterEach, test, expect } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/database'
import createGradeAndTrigger from '@/lib/grades-api'

beforeAll(async () => {
  await dbReady()
  // Ensure minimal tables exist for tests (in case migrations weren't applied in test env)
  await dbRun(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    name TEXT,
    credits INTEGER,
    grade_level TEXT,
    created_at TEXT,
    updated_at TEXT
  )`)
  await dbRun(`CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    name TEXT,
    applies_to TEXT,
    trigger_type TEXT,
    criteria_json TEXT,
    points INTEGER,
    auto_apply INTEGER DEFAULT 0,
    requires_approval INTEGER DEFAULT 0,
    cap_per_term INTEGER
  )`)
  // Ensure created_at exists on rules table (some test runs may create a simpler table)
  const ruleCols = await dbAll("PRAGMA table_info('rules')")
  const hasCreatedAt = ruleCols.some((c: any) => c.name === 'created_at')
  if (!hasCreatedAt) {
    try {
      await dbRun("ALTER TABLE rules ADD COLUMN created_at TEXT")
    } catch (e) { /* ignore */ }
  }
  await dbRun(`CREATE TABLE IF NOT EXISTS suggested_bonus_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    source_type TEXT,
    source_id INTEGER,
    points REAL,
    reason TEXT,
    status TEXT,
    author_id INTEGER,
    evidence_url TEXT,
    apply_to TEXT,
    source_provenance TEXT,
    created_at TEXT,
    updated_at TEXT
  )`)
  await dbRun(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    term TEXT,
    components_json TEXT,
    final_score REAL,
    gpa_contrib REAL,
    created_at TEXT,
    updated_at TEXT
  )`)
})

afterEach(async () => {
  // cleanup test data
  await dbRun('DELETE FROM suggested_bonus_points WHERE student_id = ?', [9999])
  await dbRun('DELETE FROM grades WHERE student_id = ?', [9999])
  await dbRun("DELETE FROM rules WHERE code = 'R_TEST_GPA'")
  await dbRun("DELETE FROM subjects WHERE code = 'TST101'")
})

test('createGradeAndTrigger inserts grade and auto-applies GPA rule', async () => {
  // create a subject for the grade
  const subRes = await dbRun(
    `INSERT INTO subjects (code, name, credits, grade_level, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    ['TST101', 'Test Subject', 1, '10']
  )
  const subjectId = subRes.lastID

  // insert a rule that awards 5 points for GPA >= 8.0
  await dbRun(
    `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply, requires_approval, cap_per_term, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ['R_TEST_GPA', 'GPA >= 8 auto', 'hoc_tap', 'grade', JSON.stringify({ gpa_gte: 8.0 }), 5, 1, 0, 100]
  )

  // create grade and trigger
  const result = await createGradeAndTrigger({
    studentId: 9999,
    subjectId,
    term: '2025-HK1',
    finalScore: 8.5,
    credits: 1,
  }, 1)

  expect(result).toHaveProperty('gradeId')
  expect(result).toHaveProperty('suggestions')

  // check suggested bonus points created
  const rows = await dbAll('SELECT * FROM suggested_bonus_points WHERE student_id = ? AND source_provenance = ?', [9999, 'rule'])
  expect(rows.length).toBeGreaterThan(0)
  const s = rows[0]
  expect(Number(s.points)).toBeGreaterThanOrEqual(0)
})
