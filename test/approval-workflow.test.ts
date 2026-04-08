import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import sqlite3 from 'sqlite3'

let testDb: sqlite3.Database
let originalConsoleWarn: typeof console.warn

// Create a reference that can be shared
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
  dbHelpers: {}
}))

import { approvalService, ApprovalState } from '../src/lib/approval-workflow'
import * as dbModule from '../src/lib/database'

beforeAll(async () => {
  originalConsoleWarn = console.warn
  console.warn = vi.fn() as typeof console.warn

  testDb = new sqlite3.Database(':memory:')
  dbState.db = testDb
  
  await new Promise<void>((resolve, reject) => {
    testDb.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, role TEXT);
      INSERT INTO users (id, role) VALUES (1,'admin'),(2,'admin'),(3,'teacher');
      CREATE TABLE approval_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT,
        entity_id INTEGER,
        requester_id INTEGER,
        state TEXT,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE approval_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        approval_request_id INTEGER,
        step_order INTEGER,
        approver_id INTEGER,
        status TEXT DEFAULT 'pending',
        approved_at DATETIME
      );
      CREATE TABLE approval_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        approval_request_id INTEGER,
        approver_id INTEGER,
        action TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        title TEXT,
        message TEXT,
        related_table TEXT,
        related_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE student_awards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        award_type_id INTEGER NOT NULL,
        awarded_by INTEGER,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, (err) => err ? reject(err) : resolve())
  })
})

afterAll(() => {
  console.warn = originalConsoleWarn
  if (testDb) testDb.close()
})

describe('Approval Workflow Service', () => {
  it('creates request and enters pending state', async () => {
    const id = await approvalService.createRequest('student_award', 10, 3, [1,2])
    expect(id).toBeGreaterThan(0)
    const req = await (dbModule.dbGet as any)('SELECT state FROM approval_requests WHERE id = ?', [id])
    expect(req.state).toBe(ApprovalState.PENDING)
    const steps = await (dbModule.dbAll as any)('SELECT * FROM approval_steps WHERE approval_request_id = ?', [id])
    expect(steps.length).toBe(2)
  })

  it('approves sequentially and reaches APPROVED final state', async () => {
    const id = await approvalService.createRequest('student_award', 11, 3, [1,2])
    await approvalService.approve(id, 1, 'First ok')
    let req = await (dbModule.dbGet as any)('SELECT state FROM approval_requests WHERE id = ?', [id])
    expect([ApprovalState.IN_REVIEW, ApprovalState.APPROVED]).toContain(req.state)
    await approvalService.approve(id, 2, 'Second ok')
    req = await (dbModule.dbGet as any)('SELECT state FROM approval_requests WHERE id = ?', [id])
    expect(req.state).toBe(ApprovalState.APPROVED)
    const actions = await (dbModule.dbAll as any)('SELECT action FROM approval_actions WHERE approval_request_id = ?', [id])
    expect(actions.filter((a: any) => a.action==='approved').length).toBe(2)
  })

  it('rejects request and stores reason', async () => {
    const id = await approvalService.createRequest('student_award', 12, 3, [1])
    await approvalService.reject(id, 1, 'Not valid')
    const req = await (dbModule.dbGet as any)('SELECT state, rejection_reason FROM approval_requests WHERE id = ?', [id])
    expect(req.state).toBe(ApprovalState.REJECTED)
    expect(req.rejection_reason).toBe('Not valid')
  })
})
