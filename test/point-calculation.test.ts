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
  dbHelpers: {}
}))

import * as dbMod from '../src/lib/database'
import { PointCalculationService } from '../src/lib/scoring'

beforeAll(async () => {
  testDb = new sqlite3.Database(':memory:')
  dbState.db = testDb
  
  await new Promise<void>((resolve, reject) => {
    testDb.exec(`
      CREATE TABLE activity_types (id INTEGER PRIMARY KEY, name TEXT, base_points INTEGER);
      CREATE TABLE organization_levels (id INTEGER PRIMARY KEY, name TEXT, multiplier REAL);
      CREATE TABLE activities (
        id INTEGER PRIMARY KEY,
        title TEXT,
        activity_type_id INTEGER,
        organization_level_id INTEGER
      );
      CREATE TABLE participations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER,
        student_id INTEGER,
        attendance_status TEXT,
        achievement_level TEXT
      );
      CREATE TABLE achievement_multipliers (achievement_level TEXT PRIMARY KEY, multiplier REAL);
      CREATE TABLE award_bonuses (award_type TEXT PRIMARY KEY, bonus_points INTEGER);
      CREATE TABLE point_calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participation_id INTEGER UNIQUE,
        base_points REAL,
        type_multiplier REAL,
        level_multiplier REAL,
        achievement_multiplier REAL,
        bonus_points REAL,
        penalty_points REAL,
        total_points REAL,
        formula TEXT,
        calculated_at DATETIME
      );
      CREATE TABLE student_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        activity_id INTEGER,
        participation_id INTEGER UNIQUE,
        points REAL,
        category TEXT,
        source TEXT,
        calculated_at DATETIME
      );
      
      INSERT INTO activity_types (id, name, base_points) VALUES (1,'Học thuật',10),(2,'Thể thao',8),(3,'Văn nghệ',7);
      INSERT INTO organization_levels (id, name, multiplier) VALUES (1,'Cấp Lớp',1.0),(2,'Cấp Khoa',1.4),(3,'Cấp Trường',2.0);
      INSERT INTO achievement_multipliers (achievement_level, multiplier) VALUES 
        ('excellent',1.5),
        ('good',1.2),
        ('participated',1.0);
        
      INSERT INTO activities (id, title, activity_type_id, organization_level_id) VALUES 
        (1,'Hội thi Học thuật',1,1),
        (2,'Giải bóng đá khoa',2,2),
        (3,'Đêm nhạc trường',3,3);
        
      INSERT INTO participations (activity_id, student_id, attendance_status, achievement_level) VALUES 
        (1,101,'attended','excellent'),
        (2,102,'attended','good'),
        (3,103,'attended','participated');
    `, (err) => err ? reject(err) : resolve())
  })
})

afterAll(() => {
  if (testDb) testDb.close()
})

describe('PointCalculationService - Tính điểm cơ bản', () => {
  it('Tính điểm với achievement "excellent" (1.5x)', async () => {
    const result = await PointCalculationService.calculatePoints({ participationId: 1 })
    
    // Base: 10, Type: 1.0, Level: 1.0, Achievement: 1.5
    // Total = 10 × 1.0 × 1.0 × 1.5 = 15
    expect(result.totalPoints).toBeCloseTo(15.0, 1)
    expect(result.breakdown.base).toBe(10)
    expect(result.breakdown.achievement).toBe(1.5)
    expect(result.formula).toContain('15')
  })

  it('Tính điểm với level multiplier "Cấp Khoa" (1.4x) và achievement "good" (1.2x)', async () => {
    const result = await PointCalculationService.calculatePoints({ participationId: 2 })
    
    // Base: 8, Type: 1.0, Level: 1.4, Achievement: 1.2
    // Total = 8 × 1.0 × 1.4 × 1.2 = 13.44
    expect(result.totalPoints).toBeCloseTo(13.44, 1)
    expect(result.breakdown.base).toBe(8)
    expect(result.breakdown.level).toBe(1.4)
    expect(result.breakdown.achievement).toBe(1.2)
  })

  it('Tính điểm với level multiplier "Cấp Trường" (2.0x) và achievement "participated" (1.0x)', async () => {
    const result = await PointCalculationService.calculatePoints({ participationId: 3 })
    
    // Base: 7, Type: 1.0, Level: 2.0, Achievement: 1.0
    // Total = 7 × 1.0 × 2.0 × 1.0 = 14
    expect(result.totalPoints).toBeCloseTo(14.0, 1)
    expect(result.breakdown.base).toBe(7)
    expect(result.breakdown.level).toBe(2.0)
    expect(result.breakdown.achievement).toBe(1.0)
  })
})

describe('PointCalculationService - Bonus và Penalty', () => {
  it('Áp dụng bonus points (+5)', async () => {
    const result = await PointCalculationService.calculatePoints({ 
      participationId: 1, 
      bonusPoints: 5 
    })
    
    // Base calculation: 15.0, Bonus: +5
    expect(result.totalPoints).toBeCloseTo(20.0, 1)
    expect(result.breakdown.bonus).toBe(5)
  })

  it('Áp dụng penalty points (-3)', async () => {
    const result = await PointCalculationService.calculatePoints({ 
      participationId: 1, 
      penaltyPoints: 3 
    })
    
    // Base calculation: 15.0, Penalty: -3
    expect(result.totalPoints).toBeCloseTo(12.0, 1)
    expect(result.breakdown.penalty).toBe(3)
  })

  it('Áp dụng cả bonus và penalty', async () => {
    const result = await PointCalculationService.calculatePoints({ 
      participationId: 2, 
      bonusPoints: 10,
      penaltyPoints: 2 
    })
    
    // Base calculation: 13.44, Bonus: +10, Penalty: -2
    expect(result.totalPoints).toBeCloseTo(21.44, 1)
  })

  it('Không cho phép điểm âm (penalty > total)', async () => {
    const result = await PointCalculationService.calculatePoints({ 
      participationId: 1, 
      penaltyPoints: 100 
    })
    
    // Should be 0, not negative
    expect(result.totalPoints).toBe(0)
  })
})

describe('PointCalculationService - Lưu kết quả', () => {
  it('Lưu calculation vào point_calculations table', async () => {
    const result = await PointCalculationService.calculatePoints({ participationId: 1 })
    await PointCalculationService.saveCalculation(1, result)
    
    const calc = await (dbMod as any).dbGet(
      'SELECT * FROM point_calculations WHERE participation_id = ?', 
      [1]
    )
    
    expect(calc).toBeDefined()
    expect(calc.total_points).toBeCloseTo(result.totalPoints, 1)
    expect(calc.base_points).toBe(result.breakdown.base)
    expect(calc.formula).toContain('=')
  })

  it('Lưu điểm vào student_scores table', async () => {
    const result = await PointCalculationService.calculatePoints({ participationId: 1 })
    await PointCalculationService.saveCalculation(1, result)
    
    const score = await (dbMod as any).dbGet(
      'SELECT * FROM student_scores WHERE participation_id = ?', 
      [1]
    )
    
    expect(score).toBeDefined()
    expect(score.student_id).toBe(101)
    expect(score.activity_id).toBe(1)
    expect(score.points).toBeCloseTo(result.totalPoints, 1)
    expect(score.category).toBe('activity')
  })

  it('Cập nhật calculation khi gọi lại (ON CONFLICT)', async () => {
    // First calculation
    const result1 = await PointCalculationService.calculatePoints({ participationId: 1 })
    await PointCalculationService.saveCalculation(1, result1)
    
    // Second calculation with bonus
    const result2 = await PointCalculationService.calculatePoints({ 
      participationId: 1,
      bonusPoints: 5 
    })
    await PointCalculationService.saveCalculation(1, result2)
    
    const calc = await (dbMod as any).dbGet(
      'SELECT * FROM point_calculations WHERE participation_id = ?', 
      [1]
    )
    
    // Should be updated to new value
    expect(calc.total_points).toBeCloseTo(20.0, 1)
    expect(calc.bonus_points).toBe(5)
  })
})

describe('PointCalculationService - Auto-calculate', () => {
  it('Auto-calculate sau evaluation tự động lưu kết quả', async () => {
    const result = await PointCalculationService.autoCalculateAfterEvaluation(1)
    
    expect(result.totalPoints).toBeCloseTo(15.0, 1)
    
    // Verify it was saved
    const calc = await (dbMod as any).dbGet(
      'SELECT * FROM point_calculations WHERE participation_id = ?', 
      [1]
    )
    expect(calc).toBeDefined()
  })
})

describe('PointCalculationService - Thống kê điểm', () => {
  it('Lấy tổng điểm của student', async () => {
    // Calculate and save for multiple participations
    await PointCalculationService.autoCalculateAfterEvaluation(1) // 15 points
    await PointCalculationService.autoCalculateAfterEvaluation(2) // 13.44 points
    
    const total = await PointCalculationService.getStudentTotalScore(101)
    expect(total).toBeCloseTo(15.0, 1)
    
    const total2 = await PointCalculationService.getStudentTotalScore(102)
    expect(total2).toBeCloseTo(13.44, 1)
  })

  it('Lấy breakdown chi tiết điểm của student', async () => {
    await PointCalculationService.autoCalculateAfterEvaluation(1)
    
    const breakdown = await PointCalculationService.getStudentScoreBreakdown(101)
    
    expect(breakdown.total).toBeCloseTo(15.0, 1)
    expect(breakdown.details).toHaveLength(1)
    expect(breakdown.details[0].activity_title).toBe('Hội thi Học thuật')
  })
})
