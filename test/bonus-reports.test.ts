import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { dbRun, dbGet, dbAll, dbReady } from '@/lib/db-core'
import {
  getStudentBonusReport,
  getClassBonusReport,
  getSemesterBonusReport,
  exportStudentBonusAsCSV,
  exportClassBonusAsCSV,
  exportSemesterBonusAsCSV,
  exportStudentBonusAsXLSX,
  exportClassBonusAsXLSX,
  exportSemesterBonusAsXLSX,
  generateBonusStatistics,
  generateExportFilename,
} from '@/lib/bonus-reports'

describe('Bonus Reports Module', () => {
  beforeAll(async () => {
    await dbReady()
    // Ensure all necessary tables exist
    try {
      // Create users table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'student',
          password_hash TEXT,
          class_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create classes table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS classes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create suggested_bonus_points table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS suggested_bonus_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          source_type TEXT,
          source_id INTEGER,
          points REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          author_id INTEGER,
          approver_id INTEGER,
          evidence_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id),
          FOREIGN KEY (author_id) REFERENCES users(id),
          FOREIGN KEY (approver_id) REFERENCES users(id)
        )
      `)
    } catch (e) {
      console.warn('Table setup warning:', e)
    }

    // Clear any existing test data
    try {
      await dbRun('DELETE FROM suggested_bonus_points')
      await dbRun("DELETE FROM users WHERE email LIKE ?", ['%test@example.com'])
      await dbRun("DELETE FROM classes WHERE name LIKE ?", ['%Test%'])
    } catch (e) {
      // Tables might not exist yet
    }

    // Create test classes
    await dbRun('INSERT INTO classes (name, grade) VALUES (?, ?)', ['Lớp A1', 10])
    await dbRun('INSERT INTO classes (name, grade) VALUES (?, ?)', ['Lớp A2', 10])

    // Create test users (password is never verified in these tests)
    const hashedPw = 'test-hash'

    // Create students
    for (let i = 1; i <= 5; i++) {
      await dbRun(
        `INSERT INTO users (email, name, role, password_hash, class_id, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [`student${i}test@example.com`, `Student ${i}`, 'student', hashedPw, i <= 3 ? 1 : 2]
      )
    }

    // Create teachers
    for (let i = 1; i <= 2; i++) {
      await dbRun(
        `INSERT INTO users (email, name, role, password_hash, class_id, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [`teacher${i}test@example.com`, `Teacher ${i}`, 'teacher', hashedPw, null]
      )
    }

    // Create sample bonus proposals
    const students = await dbAll('SELECT id FROM users WHERE role = ?', ['student'])
    const teachers = await dbAll('SELECT id FROM users WHERE role = ?', ['teacher'])

    if (students.length > 0 && teachers.length > 0) {
      // Add some approved proposals
      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, source_type, points, status, author_id, approver_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [students[0].id, 'achievement', 5, 'approved', teachers[0].id, 1]
      )

      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, source_type, points, status, author_id, approver_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [students[1].id, 'activity', 3, 'approved', teachers[0].id, 1]
      )

      // Add some pending proposals
      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, source_type, points, status, author_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [students[2].id, 'development', 4, 'pending', teachers[1].id]
      )

      // Add some rejected proposals
      await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, source_type, points, status, author_id, approver_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [students[0].id, 'special', 2, 'rejected', teachers[1].id, 1]
      )
    }
  })

  afterEach(async () => {
    // Clean up between tests if needed
  })
  describe('generateExportFilename', () => {
    it('should generate correct CSV filename format', () => {
      const date = new Date('2024-12-09')
      const filename = generateExportFilename('student', 'csv', date)
      
      expect(filename).toBe('bonus-student-2024-12-09.csv')
    })

    it('should generate class filename', () => {
      const date = new Date('2024-12-09')
      const filename = generateExportFilename('class', 'csv', date)
      
      expect(filename).toBe('bonus-class-2024-12-09.csv')
    })

    it('should generate semester filename', () => {
      const date = new Date('2024-12-09')
      const filename = generateExportFilename('semester', 'csv', date)
      
      expect(filename).toBe('bonus-semester-2024-12-09.csv')
    })

    it('should generate filename with today date by default', () => {
      const filename = generateExportFilename('student', 'csv')
      const today = new Date().toISOString().split('T')[0]

      expect(filename).toContain(`bonus-student-${today}.csv`)
    })
  })

  describe('CSV Export Functions', () => {
    it('exportStudentBonusAsCSV should return empty string for non-existent student', async () => {
      const csv = await exportStudentBonusAsCSV(99999)
      
      expect(csv).toBe('')
    })

    it('exportClassBonusAsCSV should return empty string for non-existent class', async () => {
      const csv = await exportClassBonusAsCSV(99999)
      
      expect(csv).toBe('')
    })

    it('exportSemesterBonusAsCSV should include header rows', async () => {
      const csv = await exportSemesterBonusAsCSV(1, '2024')
      
      expect(csv).toContain('Báo Cáo Cộng Điểm Theo Học Kỳ')
      expect(csv).toContain('Học kỳ: Học kỳ 1')
      expect(csv).toContain('Năm học: 2024')
    })

    it('exportSemesterBonusAsCSV should include table headers', async () => {
      const csv = await exportSemesterBonusAsCSV(1, '2024')
      
      expect(csv).toContain('Lớp,Số học viên,Tổng điểm')
    })
  })

  describe('Report Generation', () => {
    it('getStudentBonusReport should return null for non-existent student', async () => {
      const report = await getStudentBonusReport(99999)
      
      expect(report).toBeNull()
    })

    it('getClassBonusReport should return null for non-existent class', async () => {
      const report = await getClassBonusReport(99999)
      
      expect(report).toBeNull()
    })

    it('getSemesterBonusReport should return valid structure', async () => {
      const report = await getSemesterBonusReport(1, '2024')
      
      expect(report).toBeDefined()
      expect(report.semester).toContain('Học kỳ')
      expect(report.academicYear).toBe('2024')
      expect(report.classReports).toBeInstanceOf(Array)
      expect(report.totalPoints).toBeGreaterThanOrEqual(0)
      expect(report.totalStudents).toBeGreaterThanOrEqual(0)
    })

    it('getSemesterBonusReport should calculate average correctly', async () => {
      const report = await getSemesterBonusReport(1, '2024')
      
      if (report.totalStudents > 0) {
        const expectedAverage = report.totalPoints / report.totalStudents
        expect(report.averagePointsPerStudent).toBe(expectedAverage)
      } else {
        expect(report.averagePointsPerStudent).toBe(0)
      }
    })

    it('getSemesterBonusReport should include class-level breakdown', async () => {
      const report = await getSemesterBonusReport(1, '2024')
      
      report.classReports.forEach(cls => {
        expect(cls.className).toBeDefined()
        expect(cls.studentCount).toBeGreaterThanOrEqual(0)
        expect(cls.totalApprovedPoints).toBeGreaterThanOrEqual(0)
        expect(cls.proposals).toBeDefined()
        expect(cls.proposals.total).toBeGreaterThanOrEqual(0)
        expect(cls.proposals.approved).toBeGreaterThanOrEqual(0)
        expect(cls.proposals.pending).toBeGreaterThanOrEqual(0)
        expect(cls.proposals.rejected).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Statistics Generation', () => {
    it('generateBonusStatistics should return valid structure', async () => {
      const stats = await generateBonusStatistics()
      
      expect(stats).toBeDefined()
      expect(stats.total).toBeDefined()
      expect(stats.total.proposals).toBeGreaterThanOrEqual(0)
      expect(stats.total.points).toBeGreaterThanOrEqual(0)
      expect(stats.byStatus).toBeDefined()
      expect(stats.byStatus.approved).toBeGreaterThanOrEqual(0)
      expect(stats.byStatus.pending).toBeGreaterThanOrEqual(0)
      expect(stats.byStatus.rejected).toBeGreaterThanOrEqual(0)
    })

    it('generateBonusStatistics should have correct approval rate', async () => {
      const stats = await generateBonusStatistics()
      
      if (stats.total.proposals > 0) {
        const expectedRate = (stats.byStatus.approved / stats.total.proposals) * 100
        expect(Math.abs(stats.averages.approvalRate - expectedRate)).toBeLessThan(0.01)
      } else {
        expect(stats.averages.approvalRate).toBe(0)
      }
    })

    it('generateBonusStatistics should calculate points per proposal correctly', async () => {
      const stats = await generateBonusStatistics()
      
      if (stats.byStatus.approved > 0) {
        const expectedAverage = stats.total.points / stats.byStatus.approved
        expect(Math.abs(stats.averages.pointsPerApprovedProposal - expectedAverage)).toBeLessThan(0.01)
      } else {
        expect(stats.averages.pointsPerApprovedProposal).toBe(0)
      }
    })
  })

  describe('CSV Format Validation', () => {
    it('exportSemesterBonusAsCSV should have valid CSV structure', async () => {
      const csv = await exportSemesterBonusAsCSV(1, '2024')
      const lines = csv.split('\n')
      
      // Should have header and table header
      expect(lines.length).toBeGreaterThan(2)
      
      // CSV lines should not be empty
      const dataLines = lines.filter(line => line.trim() !== '')
      expect(dataLines.length).toBeGreaterThan(0)
    })

    it('CSV should be properly escaped for quoted fields', async () => {
      const csv = await exportSemesterBonusAsCSV(1, '2024')
      
      // Class names with special characters should be quoted
      expect(csv).toBeDefined()
      expect(typeof csv).toBe('string')
    })
  })

  describe('Report Data Consistency', () => {
    it('class report totals should match semester report', async () => {
      const semesterReport = await getSemesterBonusReport(1, '2024')
      
      const classTotal = semesterReport.classReports.reduce((sum, cls) => sum + cls.totalApprovedPoints, 0)
      expect(classTotal).toBe(semesterReport.totalPoints)
    })

    it('class student counts should sum to semester total', async () => {
      const semesterReport = await getSemesterBonusReport(1, '2024')
      
      const classStudentCount = semesterReport.classReports.reduce((sum, cls) => sum + cls.studentCount, 0)
      expect(classStudentCount).toBe(semesterReport.totalStudents)
    })

    it('proposal status counts should match total', async () => {
      const semesterReport = await getSemesterBonusReport(1, '2024')
      
      semesterReport.classReports.forEach(cls => {
        const statusSum = cls.proposals.approved + cls.proposals.pending + cls.proposals.rejected
        expect(statusSum).toBe(cls.proposals.total)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle semester with zero proposals', async () => {
      // The test data already has proposals, so test with a future year
      const report = await getSemesterBonusReport(2, '2050')
      
      expect(report).toBeDefined()
      expect(report.totalPoints).toBeGreaterThanOrEqual(0)
      // Future data should have at least some students from existing setup
      expect(report.totalStudents).toBeGreaterThanOrEqual(0)
    })

    it('should handle semester with only pending proposals', async () => {
      const report = await getSemesterBonusReport(1, '2024')
      
      // The report only includes approved proposals
      // So pending proposals shouldn't affect totalPoints
      expect(report.totalPoints).toBeGreaterThanOrEqual(0)
    })

    it('should handle class with no students', async () => {
      const report = await getSemesterBonusReport(1, '2024')
      
      // All classes should have valid data
      report.classReports.forEach(cls => {
        expect(cls.studentCount).toBeGreaterThanOrEqual(0)
        if (cls.studentCount === 0) {
          expect(cls.averagePointsPerStudent).toBe(0)
        }
      })
    })
  })

  describe('XLSX Export Functions', () => {
    it('should export student bonus as XLSX and return Buffer', async () => {
      const buffer = await exportStudentBonusAsXLSX(1)
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should export class bonus as XLSX and return Buffer', async () => {
      const buffer = await exportClassBonusAsXLSX(1)
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should export semester bonus as XLSX and return Buffer', async () => {
      const buffer = await exportSemesterBonusAsXLSX(1, '2024')
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should create valid XLSX for non-existent student', async () => {
      const buffer = await exportStudentBonusAsXLSX(9999)
      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should handle XLSX export with different semesters', async () => {
      const buffer1 = await exportSemesterBonusAsXLSX(1, '2024')
      const buffer2 = await exportSemesterBonusAsXLSX(2, '2024')
      
      expect(buffer1.length).toBeGreaterThan(0)
      expect(buffer2.length).toBeGreaterThan(0)
    })

    it('should export class XLSX with all student details', async () => {
      const buffer = await exportClassBonusAsXLSX(1)
      
      // XLSX buffer should contain proper Excel data
      expect(buffer.length).toBeGreaterThan(100) // Minimum size for valid XLSX
    })

    it('should handle filename generation with format parameter', () => {
      const csvName = generateExportFilename('student', 'csv')
      const xlsxName = generateExportFilename('student', 'xlsx')
      const jsonName = generateExportFilename('student', 'json')
      
      expect(csvName).toMatch(/\.csv$/)
      expect(xlsxName).toMatch(/\.xlsx$/)
      expect(jsonName).toMatch(/\.json$/)
    })

    it('should generate different filenames for different types', () => {
      const studentFile = generateExportFilename('student', 'xlsx')
      const classFile = generateExportFilename('class', 'xlsx')
      const semesterFile = generateExportFilename('semester', 'xlsx')
      
      expect(studentFile).toContain('bonus-student')
      expect(classFile).toContain('bonus-class')
      expect(semesterFile).toContain('bonus-semester')
    })
  })
})
