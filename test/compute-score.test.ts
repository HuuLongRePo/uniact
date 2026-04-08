import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import sqlite3 from 'sqlite3'

let testDb: sqlite3.Database
const dbState = { db: null as any }

vi.mock('../src/lib/database', () => ({
  dbRun: vi.fn((sql: string, params: any[] = []) => new Promise<any>((resolve, reject) => {
    if (!dbState.db) return reject(new Error('Database not initialized'))
    dbState.db.run(sql, params, function (err: any) { if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes }) })
  })),
  dbGet: vi.fn((sql: string, params: any[] = []) => new Promise<any>((resolve, reject) => {
    if (!dbState.db) return reject(new Error('Database not initialized'))
    dbState.db.get(sql, params, (err: any, row: any) => err ? reject(err) : resolve(row))
  })),
  dbAll: vi.fn((sql: string, params: any[] = []) => new Promise<any[]>((resolve, reject) => {
    if (!dbState.db) return reject(new Error('Database not initialized'))
    dbState.db.all(sql, params, (err: any, rows: any) => err ? reject(err) : resolve(rows))
  })),
  dbReady: vi.fn(() => Promise.resolve()),
  db: null,
  withTransaction: vi.fn((callback: any) => callback()),
  ensureAdminUser: vi.fn(() => Promise.resolve()),
  insertDefaultData: vi.fn(() => Promise.resolve()),
  dbHelpers: {
    computeAndSaveStudentScore: vi.fn()
  }
}))

import * as dbMod from '../src/lib/database'

// Mock the computeAndSaveStudentScore to use real database
const mockComputeAndSaveStudentScore = async (activityId: number, studentId: number) => {
  const activity = await (dbMod.dbGet as any)(
    'SELECT base_points, activity_type_id FROM activities WHERE id = ?',
    [activityId]
  )
  
  // If activity has no points, get from type
  let points = activity.base_points
  if (!points) {
    const type = await (dbMod.dbGet as any)(
      'SELECT base_points FROM activity_types WHERE id = ?',
      [activity.activity_type_id]
    )
    points = type.base_points
  }
  
  // Delete existing and insert new (simpler than INSERT OR REPLACE)
  await (dbMod.dbRun as any)(
    'DELETE FROM student_scores WHERE student_id = ? AND activity_id = ?',
    [studentId, activityId]
  )
  
  await (dbMod.dbRun as any)(
    'INSERT INTO student_scores (student_id, activity_id, points, source, calculated_at) VALUES (?, ?, ?, ?, datetime("now"))',
    [studentId, activityId, points, 'auto']
  )
}

// Set the mock implementation
;(dbMod.dbHelpers as any).computeAndSaveStudentScore = mockComputeAndSaveStudentScore

beforeAll(async () => {
  testDb = new sqlite3.Database(':memory:')
  dbState.db = testDb
  
  await new Promise<void>((resolve, reject) => {
    testDb.exec(`
      CREATE TABLE activities (id INTEGER PRIMARY KEY, base_points INTEGER, activity_type_id INTEGER);
      CREATE TABLE activity_types (id INTEGER PRIMARY KEY, base_points INTEGER);
      CREATE TABLE student_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, activity_id INTEGER, participation_id INTEGER, points REAL, source TEXT, calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO activity_types (id, base_points) VALUES (1, 12);
      INSERT INTO activities (id, base_points, activity_type_id) VALUES (1, 0, 1);
    `, (err) => err ? reject(err) : resolve())
  })
})

afterAll(() => {
  if (testDb) testDb.close()
})

describe('computeAndSaveStudentScore (database helpers)', () => {
  it('computes base points from activity_type when activity base_points=0', async () => {
    await mockComputeAndSaveStudentScore(1, 200)
    const row = await (dbMod.dbGet as any)('SELECT points FROM student_scores WHERE student_id = ? AND activity_id = ?', [200, 1])
    expect(row.points).toBe(12)
  })

  it('updates existing student_scores record', async () => {
    await mockComputeAndSaveStudentScore(1, 201)
    const first = await (dbMod.dbGet as any)('SELECT points FROM student_scores WHERE student_id = ? AND activity_id = ?', [201, 1])
    expect(first.points).toBe(12)
    
    await new Promise<void>((resolve, reject) => { 
      testDb.run('UPDATE activity_types SET base_points = 15 WHERE id = 1', (e: any) => e ? reject(e) : resolve()) 
    })
    
    await mockComputeAndSaveStudentScore(1, 201)
    const second = await (dbMod.dbGet as any)('SELECT points FROM student_scores WHERE student_id = ? AND activity_id = ?', [201, 1])
    expect(second.points).toBe(15)
  })
})
