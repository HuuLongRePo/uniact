/**
 * Test Accounts for UAT
 */

export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@annd.edu.vn',
    password: 'Admin@2025',
    role: 'admin',
    name: 'Quản Trị Hệ Thống'
  },
  teacher: {
    email: 'gv.nguyenthilan@annd.edu.vn',
    password: 'teacher123',
    role: 'teacher',
    name: 'Đại tá, PGS.TS Nguyễn Thị Lan'
  },
  student: {
    email: 'sv31a001@annd.edu.vn',
    password: 'student123',
    role: 'student',
    name: 'Nguyễn Đức Anh'
  }
} as const

export const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'
