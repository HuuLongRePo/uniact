import { beforeAll, afterEach, test, expect } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/database'
import createConductAndTrigger from '@/lib/conduct-api'

beforeAll(async () => {
  await dbReady()
  // Ensure minimal tables exist for tests
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
    cap_per_term INTEGER,
    created_at TEXT
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
  await dbRun(`CREATE TABLE IF NOT EXISTS conduct_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    term TEXT,
    daily_score REAL,
    weekly_score REAL,
    final_conduct_score REAL,
    created_at TEXT,
    updated_at TEXT
  )`)
})

afterEach(async () => {
  await dbRun('DELETE FROM suggested_bonus_points WHERE student_id = ?', [8888])
  await dbRun('DELETE FROM conduct_scores WHERE student_id = ?', [8888])
  await dbRun("DELETE FROM rules WHERE code = 'R_TEST_CONDUCT'")
})

test('createConductAndTrigger inserts conduct and auto-applies conduct rule', async () => {
  // insert a rule that awards 3 points for conduct >= 9
  await dbRun(
    `INSERT INTO rules (code, name, applies_to, trigger_type, criteria_json, points, auto_apply, requires_approval, cap_per_term, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ['R_TEST_CONDUCT', 'Conduct >=9 auto', 'ren_luyen', 'conduct', JSON.stringify({ conduct_gte: 9 }), 3, 1, 0, 50]
  )

  const result = await createConductAndTrigger({
    studentId: 8888,
    term: '2025-HK1',
    dailyScore: 9,
    weeklyScore: 9,
    finalConductScore: 9,
  }, 1)

  expect(result).toHaveProperty('conductId')
  expect(result).toHaveProperty('suggestions')

  const rows = await dbAll('SELECT * FROM suggested_bonus_points WHERE student_id = ? AND source_provenance = ?', [8888, 'rule'])
  expect(rows.length).toBeGreaterThan(0)
})
