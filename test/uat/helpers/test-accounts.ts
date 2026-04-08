/**
 * Test Accounts for UAT
 */

export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@school.edu',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User'
  },
  teacher: {
    email: 'nguyen.van.tuan@school.edu',
    password: 'teacher123',
    role: 'teacher',
    name: 'Nguyễn Văn Tuấn'
  },
  student: {
    email: 'sv001.12a1@school.edu',
    password: 'student123',
    role: 'student',
    name: 'Student 001'
  }
} as const

export const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'
