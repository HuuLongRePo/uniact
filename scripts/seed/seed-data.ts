#!/usr/bin/env tsx
/**
 * Unified Data Seeder - UniAct
 * Consolidated from: insert-mock-data.ts, reset-demo-data.ts, seed-demo-data.ts, seed-enhanced-demo.ts
 * 
 * Modes:
 *   --mode=reset    : Xóa + tạo lại dữ liệu demo + full QA coverage
 *   --mode=demo     : Insert dữ liệu demo nếu DB chưa có dữ liệu
 *   --mode=enhanced : Demo + mở rộng thêm học sinh
 *   --mode=minimal  : Chỉ tạo 1 admin
 *   --mode=qa       : Alias của reset (chuẩn kiểm thử đầy đủ)
 * 
 * Usage:
 *   npm run seed                       # Demo mode
 *   npm run seed:reset                 # Reset + full coverage
 *   npm run seed:qa                    # Full coverage
 *   tsx scripts/seed/seed-data.ts --mode=enhanced
 */

import bcrypt from 'bcryptjs'
import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = path.join(process.cwd(), 'uniact.db')
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối database:', err.message)
    process.exit(1)
  }
  console.log('✅ Kết nối SQLite thành công')
})

// Database helpers
function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve({ lastID: (this as any).lastID, changes: (this as any).changes })
    })
  })
}

function dbGet(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
  })
}

function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
  })
}

function dbExec(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => err ? reject(err) : resolve())
  })
}

function usernameFromEmail(email: string): string {
  return String(email)
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeGender(gender?: string): 'nam' | 'nữ' | null {
  if (!gender) return null
  const g = gender.trim().toLowerCase()
  if (g === 'nam') return 'nam'
  if (g === 'nữ' || g === 'nu' || g === 'n u' || g === 'nữ ') return 'nữ'
  if (g === 'male') return 'nam'
  if (g === 'female') return 'nữ'
  if (g === 'nữ' || g === 'nữ') return 'nữ'
  // Data constants sometimes use 'Nam'/'Nữ'
  if (g === 'nam') return 'nam'
  if (g === 'nữ') return 'nữ'
  if (g === 'nu') return 'nữ'
  return null
}

function buildAddress(province?: string, district?: string, ward?: string, addressDetail?: string): string {
  return [addressDetail, ward, district, province].filter(Boolean).join(', ')
}

function avatarUrlFromSeed(seed: string): string {
  const safe = encodeURIComponent(seed || 'user')
  // Deterministic avatar URL suitable for tests (absolute URL for zod .url())
  return `https://api.dicebear.com/7.x/initials/svg?seed=${safe}`
}

function citizenIdFromIndex(index: number): string {
  // 12-digit deterministic-ish ID for demo data
  const num = 100000000000 + (index % 900000000000)
  return String(num).padStart(12, '0')
}

function staffAddressFromIndex(index: number): { province: string; district: string; ward: string; address_detail: string; address: string } {
  const province = 'Hà Nội'
  const district = 'Cầu Giấy'
  const ward = 'Dịch Vọng'
  const address_detail = `Học viện ANND - Phòng ${String(100 + (index % 900)).padStart(3, '0')}`
  return { province, district, ward, address_detail, address: buildAddress(province, district, ward, address_detail) }
}

function studentAddressFromIndex(index: number): { province: string; district: string; ward: string; address_detail: string; address: string } {
  const province = 'Hà Nội'
  const district = 'Thanh Xuân'
  const ward = 'Phương Liệt'
  const address_detail = `KTX ANND - Phòng ${String(100 + (index % 900)).padStart(3, '0')}`
  return { province, district, ward, address_detail, address: buildAddress(province, district, ward, address_detail) }
}

function phoneFromIndex(index: number): string {
  // Deterministic, looks like a VN mobile number for demo data
  const suffix = String(10000000 + (index % 90000000)).padStart(8, '0')
  return `09${suffix}`
}

// =============================================================================
// DATA CONSTANTS
// =============================================================================

const demoData = {
  admin: {
    email: 'admin@annd.edu.vn',
    name: 'Quản Trị Hệ Thống',
    password: 'Admin@2025'
  },

  classManagers: [
    { email: 'gvcn.nguyenvanmanh@annd.edu.vn', name: 'Thượng tá Nguyễn Văn Mạnh' },
    { email: 'gvcn.tranthidung@annd.edu.vn', name: 'Trung tá Trần Thị Dũng' },
    { email: 'gvcn.leducvinh@annd.edu.vn', name: 'Thượng tá Lê Đức Vinh' },
    { email: 'gvcn.phamthihoa@annd.edu.vn', name: 'Thiếu tá Phạm Thị Hoa' },
    { email: 'gvcn.hoangvanquang@annd.edu.vn', name: 'Thượng tá Hoàng Văn Quang' }
  ],

  teachers: [
    { email: 'gv.nguyenthilan@annd.edu.vn', name: 'Đại tá, PGS.TS Nguyễn Thị Lan', subject: 'Lý luận chính trị' },
    { email: 'gv.vuvannam@annd.edu.vn', name: 'Thượng tá, TS Vũ Văn Nam', subject: 'An ninh quốc gia' },
    { email: 'gv.doanthihang@annd.edu.vn', name: 'Trung tá, ThS Đoàn Thị Hằng', subject: 'Nghiệp vụ trinh sát' },
    { email: 'gv.buiductuan@annd.edu.vn', name: 'Đại tá, TS Bùi Đức Tuấn', subject: 'Kỹ thuật nghiệp vụ' },
    { email: 'gv.tranvanhai@annd.edu.vn', name: 'Thượng tá, ThS Trần Văn Hải', subject: 'Công tác Đảng' },
    { email: 'gv.ngothiminh@annd.edu.vn', name: 'Trung tá, ThS Ngô Thị Minh', subject: 'Tâm lý học ứng dụng' },
    { email: 'gv.phanduclong@annd.edu.vn', name: 'Thiếu tá Phan Đức Long', subject: 'Võ thuật, Thể dục' },
    { email: 'gv.levanthanh@annd.edu.vn', name: 'Thượng tá, PGS.TS Lê Văn Thành', subject: 'Quản lý Nhà nước' },
    { email: 'gv.hoangthiphuong@annd.edu.vn', name: 'Trung tá, TS Hoàng Thị Phương', subject: 'Tin học ứng dụng' },
    { email: 'gv.dangvanson@annd.edu.vn', name: 'Đại tá Đặng Văn Sơn', subject: 'Chiến thuật nghiệp vụ' }
  ],

  classes: [
    { name: 'D31A', grade: '31', description: 'Lớp D31A - Khóa 31 - Ngành A - 20 học sinh', managerIndex: 0 },
    { name: 'D31A1', grade: '31', description: 'Lớp D31A1 - Khóa 31 - Ngành A1 - 20 học sinh', managerIndex: 1 },
    { name: 'D32C', grade: '32', description: 'Lớp D32C - Khóa 32 - Ngành C - 20 học sinh', managerIndex: 2 },
    { name: 'D33A1', grade: '33', description: 'Lớp D33A1 - Khóa 33 - Ngành A1 - 20 học sinh', managerIndex: 3 },
    { name: 'D34C2', grade: '34', description: 'Lớp D34C2 - Khóa 34 - Ngành C2 - 20 học sinh', managerIndex: 4 },
    { name: 'D34B1', grade: '34', description: 'Lớp D34B1 - Khóa 34 - Ngành B1 - 20 học sinh', managerIndex: 0 },
    { name: 'D35A', grade: '35', description: 'Lớp D35A - Khóa 35 - Ngành A - 20 học sinh', managerIndex: 1 },
    { name: 'D35B', grade: '35', description: 'Lớp D35B - Khóa 35 - Ngành B - 20 học sinh', managerIndex: 2 },
    { name: 'D36C', grade: '36', description: 'Lớp D36C - Khóa 36 - Ngành C - 20 học sinh', managerIndex: 3 },
    { name: 'D36A1', grade: '36', description: 'Lớp D36A1 - Khóa 36 - Ngành A1 - 20 học sinh', managerIndex: 4 }
  ],

  students: [
    // Lớp D31A (20 HS) - Ngành An ninh chính trị nội bộ
    { email: 'sv31a001@annd.edu.vn', name: 'Nguyễn Đức Anh', classIndex: 0, citizen_id: '001203012001', gender: 'Nam', date_of_birth: '2003-01-15' },
    { email: 'sv31a002@annd.edu.vn', name: 'Trần Thị Bảo Ngọc', classIndex: 0, citizen_id: '001203022002', gender: 'Nữ', date_of_birth: '2003-02-20' },
    { email: 'sv31a003@annd.edu.vn', name: 'Phạm Minh Cường', classIndex: 0, citizen_id: '001203013003', gender: 'Nam', date_of_birth: '2003-03-10' },
    { email: 'sv31a004@annd.edu.vn', name: 'Lê Văn Đạt', classIndex: 0, citizen_id: '001203014004', gender: 'Nam', date_of_birth: '2003-04-05' },
    { email: 'sv31a005@annd.edu.vn', name: 'Hoàng Thị Hương', classIndex: 0, citizen_id: '001203025005', gender: 'Nữ', date_of_birth: '2003-05-12' },
    { email: 'sv31a006@annd.edu.vn', name: 'Vũ Văn Khải', classIndex: 0, citizen_id: '001203016006', gender: 'Nam', date_of_birth: '2003-06-08' },
    { email: 'sv31a007@annd.edu.vn', name: 'Dương Thị Linh', classIndex: 0, citizen_id: '001203027007', gender: 'Nữ', date_of_birth: '2003-07-18' },
    { email: 'sv31a008@annd.edu.vn', name: 'Bùi Đức Mạnh', classIndex: 0, citizen_id: '001203018008', gender: 'Nam', date_of_birth: '2003-08-25' },
    { email: 'sv31a009@annd.edu.vn', name: 'Phan Thị Nga', classIndex: 0, citizen_id: '001203029009', gender: 'Nữ', date_of_birth: '2003-09-14' },
    { email: 'sv31a010@annd.edu.vn', name: 'Tô Văn Oai', classIndex: 0, citizen_id: '001203010010', gender: 'Nam', date_of_birth: '2003-10-22' },
    { email: 'sv31a011@annd.edu.vn', name: 'Ngô Thị Phương', classIndex: 0, citizen_id: '001203021011', gender: 'Nữ', date_of_birth: '2003-11-30' },
    { email: 'sv31a012@annd.edu.vn', name: 'Trịnh Văn Quang', classIndex: 0, citizen_id: '001203012012', gender: 'Nam', date_of_birth: '2003-12-05' },
    { email: 'sv31a013@annd.edu.vn', name: 'Lý Đức Sáng', classIndex: 0, citizen_id: '001203013013', gender: 'Nam', date_of_birth: '2003-01-28' },
    { email: 'sv31a014@annd.edu.vn', name: 'Hồ Thị Tâm', classIndex: 0, citizen_id: '001203024014', gender: 'Nữ', date_of_birth: '2003-02-16' },
    { email: 'sv31a015@annd.edu.vn', name: 'Lưu Văn Uy', classIndex: 0, citizen_id: '001203015015', gender: 'Nam', date_of_birth: '2003-03-22' },
    { email: 'sv31a016@annd.edu.vn', name: 'Hà Thị Vân', classIndex: 0, citizen_id: '001203026016', gender: 'Nữ', date_of_birth: '2003-04-19' },
    { email: 'sv31a017@annd.edu.vn', name: 'Chu Văn Xuân', classIndex: 0, citizen_id: '001203017017', gender: 'Nam', date_of_birth: '2003-05-27' },
    { email: 'sv31a018@annd.edu.vn', name: 'Đinh Thị Yến', classIndex: 0, citizen_id: '001203028018', gender: 'Nữ', date_of_birth: '2003-06-11' },
    { email: 'sv31a019@annd.edu.vn', name: 'Võ Văn Định', classIndex: 0, citizen_id: '001203019019', gender: 'Nam', date_of_birth: '2003-07-09' },
    { email: 'sv31a020@annd.edu.vn', name: 'Đỗ Thị Ánh', classIndex: 0, citizen_id: '001203020020', gender: 'Nữ', date_of_birth: '2003-08-13' },

    // Lớp D31A1 (20 HS) - Ngành An ninh kinh tế
    { email: 'sv31a101@annd.edu.vn', name: 'Nguyễn Thị Thủy', classIndex: 1, citizen_id: '001203021101', gender: 'Nữ', date_of_birth: '2003-01-19' },
    { email: 'sv31a102@annd.edu.vn', name: 'Trần Văn Oai', classIndex: 1, citizen_id: '001203012102', gender: 'Nam', date_of_birth: '2003-02-26' },
    { email: 'sv31a103@annd.edu.vn', name: 'Phạm Thị Phúc', classIndex: 1, citizen_id: '001203023103', gender: 'Nữ', date_of_birth: '2003-03-14' },
    { email: 'sv31a104@annd.edu.vn', name: 'Lê Văn Quốc', classIndex: 1, citizen_id: '001203014104', gender: 'Nam', date_of_birth: '2003-04-21' },
    { email: 'sv31a105@annd.edu.vn', name: 'Hoàng Đức Sang', classIndex: 1, citizen_id: '001203015105', gender: 'Nam', date_of_birth: '2003-05-18' },
    { email: 'sv31a106@annd.edu.vn', name: 'Vũ Thị Trang', classIndex: 1, citizen_id: '001203026106', gender: 'Nữ', date_of_birth: '2003-06-25' },
    { email: 'sv31a107@annd.edu.vn', name: 'Dương Văn Uy', classIndex: 1, citizen_id: '001203017107', gender: 'Nam', date_of_birth: '2003-07-12' },
    { email: 'sv31a108@annd.edu.vn', name: 'Bùi Thị Vân', classIndex: 1, citizen_id: '001203028108', gender: 'Nữ', date_of_birth: '2003-08-19' },
    { email: 'sv31a109@annd.edu.vn', name: 'Phan Văn Xuân', classIndex: 1, citizen_id: '001203019109', gender: 'Nam', date_of_birth: '2003-09-27' },
    { email: 'sv31a110@annd.edu.vn', name: 'Tô Thị Yến', classIndex: 1, citizen_id: '001203020110', gender: 'Nữ', date_of_birth: '2003-10-15' },
    { email: 'sv31a111@annd.edu.vn', name: 'Ngô Văn An', classIndex: 1, citizen_id: '001203011111', gender: 'Nam', date_of_birth: '2003-11-22' },
    { email: 'sv31a112@annd.edu.vn', name: 'Trịnh Thị Bình', classIndex: 1, citizen_id: '001203022112', gender: 'Nữ', date_of_birth: '2003-12-09' },
    { email: 'sv31a113@annd.edu.vn', name: 'Lý Văn Cường', classIndex: 1, citizen_id: '001203013113', gender: 'Nam', date_of_birth: '2003-01-16' },
    { email: 'sv31a114@annd.edu.vn', name: 'Hồ Thị Diệu', classIndex: 1, citizen_id: '001203024114', gender: 'Nữ', date_of_birth: '2003-02-23' },
    { email: 'sv31a115@annd.edu.vn', name: 'Lưu Văn Em', classIndex: 1, citizen_id: '001203015115', gender: 'Nam', date_of_birth: '2003-03-11' },
    { email: 'sv31a116@annd.edu.vn', name: 'Hà Thị Giang', classIndex: 1, citizen_id: '001203026116', gender: 'Nữ', date_of_birth: '2003-04-18' },
    { email: 'sv31a117@annd.edu.vn', name: 'Chu Văn Hải', classIndex: 1, citizen_id: '001203017117', gender: 'Nam', date_of_birth: '2003-05-26' },
    { email: 'sv31a118@annd.edu.vn', name: 'Đinh Thị Khanh', classIndex: 1, citizen_id: '001203028118', gender: 'Nữ', date_of_birth: '2003-06-13' },
    { email: 'sv31a119@annd.edu.vn', name: 'Võ Văn Long', classIndex: 1, citizen_id: '001203019119', gender: 'Nam', date_of_birth: '2003-07-21' },
    { email: 'sv31a120@annd.edu.vn', name: 'Đinh Thị Mai', classIndex: 1, citizen_id: '001203020120', gender: 'Nữ', date_of_birth: '2003-08-28' },

    // Lớp D32C (20 HS) - Ngành Điều tra hình sự
    { email: 'sv32c001@annd.edu.vn', name: 'Nguyễn Văn Hưng', classIndex: 2, citizen_id: '001204011201', gender: 'Nam', date_of_birth: '2004-01-12' },
    { email: 'sv32c002@annd.edu.vn', name: 'Trần Thị Huyền', classIndex: 2, citizen_id: '001204022202', gender: 'Nữ', date_of_birth: '2004-02-19' },
    { email: 'sv32c003@annd.edu.vn', name: 'Phạm Văn Kiên', classIndex: 2, citizen_id: '001204013203', gender: 'Nam', date_of_birth: '2004-03-07' },
    { email: 'sv32c004@annd.edu.vn', name: 'Lê Thị Lan', classIndex: 2, citizen_id: '001204024204', gender: 'Nữ', date_of_birth: '2004-04-14' },
    { email: 'sv32c005@annd.edu.vn', name: 'Hoàng Văn Minh', classIndex: 2, citizen_id: '001204015205', gender: 'Nam', date_of_birth: '2004-05-21' },
    { email: 'sv32c006@annd.edu.vn', name: 'Vũ Thị Nga', classIndex: 2, citizen_id: '001204026206', gender: 'Nữ', date_of_birth: '2004-06-18' },
    { email: 'sv32c007@annd.edu.vn', name: 'Dương Văn Phong', classIndex: 2, citizen_id: '001204017207', gender: 'Nam', date_of_birth: '2004-07-25' },
    { email: 'sv32c008@annd.edu.vn', name: 'Bùi Thị Quỳnh', classIndex: 2, citizen_id: '001204028208', gender: 'Nữ', date_of_birth: '2004-08-12' },
    { email: 'sv32c009@annd.edu.vn', name: 'Phan Văn Sơn', classIndex: 2, citizen_id: '001204019209', gender: 'Nam', date_of_birth: '2004-09-19' },
    { email: 'sv32c010@annd.edu.vn', name: 'Tô Thị Trang', classIndex: 2, citizen_id: '001204020210', gender: 'Nữ', date_of_birth: '2004-10-26' },
    { email: 'sv32c011@annd.edu.vn', name: 'Ngô Văn Uy', classIndex: 2, citizen_id: '001204011211', gender: 'Nam', date_of_birth: '2004-11-13' },
    { email: 'sv32c012@annd.edu.vn', name: 'Trịnh Thị Vân', classIndex: 2, citizen_id: '001204022212', gender: 'Nữ', date_of_birth: '2004-12-20' },
    { email: 'sv32c013@annd.edu.vn', name: 'Lý Văn Xuân', classIndex: 2, citizen_id: '001204013213', gender: 'Nam', date_of_birth: '2004-01-17' },
    { email: 'sv32c014@annd.edu.vn', name: 'Hồ Thị Yến', classIndex: 2, citizen_id: '001204024214', gender: 'Nữ', date_of_birth: '2004-02-24' },
    { email: 'sv32c015@annd.edu.vn', name: 'Lưu Văn An', classIndex: 2, citizen_id: '001204015215', gender: 'Nam', date_of_birth: '2004-03-12' },
    { email: 'sv32c016@annd.edu.vn', name: 'Hà Thị Bích', classIndex: 2, citizen_id: '001204026216', gender: 'Nữ', date_of_birth: '2004-04-19' },
    { email: 'sv32c017@annd.edu.vn', name: 'Chu Văn Cường', classIndex: 2, citizen_id: '001204017217', gender: 'Nam', date_of_birth: '2004-05-27' },
    { email: 'sv32c018@annd.edu.vn', name: 'Đinh Thị Dung', classIndex: 2, citizen_id: '001204028218', gender: 'Nữ', date_of_birth: '2004-06-14' },
    { email: 'sv32c019@annd.edu.vn', name: 'Võ Văn Em', classIndex: 2, citizen_id: '001204019219', gender: 'Nam', date_of_birth: '2004-07-21' },
    { email: 'sv32c020@annd.edu.vn', name: 'Đỗ Thị Hoa', classIndex: 2, citizen_id: '001204020220', gender: 'Nữ', date_of_birth: '2004-08-28' },

    // Lớp D33A1 (20 HS) - Ngành An ninh mạng
    { email: 'sv33a101@annd.edu.vn', name: 'Nguyễn Văn Thuận', classIndex: 3, citizen_id: '001205011301', gender: 'Nam', date_of_birth: '2005-01-15' },
    { email: 'sv33a102@annd.edu.vn', name: 'Trần Thị Thương', classIndex: 3, citizen_id: '001205022302', gender: 'Nữ', date_of_birth: '2005-02-22' },
    { email: 'sv33a103@annd.edu.vn', name: 'Phạm Văn Thanh', classIndex: 3, citizen_id: '001205013303', gender: 'Nam', date_of_birth: '2005-03-19' },
    { email: 'sv33a104@annd.edu.vn', name: 'Lê Thị Thơm', classIndex: 3, citizen_id: '001205024304', gender: 'Nữ', date_of_birth: '2005-04-16' },
    { email: 'sv33a105@annd.edu.vn', name: 'Hoàng Văn Thắng', classIndex: 3, citizen_id: '001205015305', gender: 'Nam', date_of_birth: '2005-05-23' },
    { email: 'sv33a106@annd.edu.vn', name: 'Vũ Thị Thu', classIndex: 3, citizen_id: '001205026306', gender: 'Nữ', date_of_birth: '2005-06-20' },
    { email: 'sv33a107@annd.edu.vn', name: 'Dương Văn Tiến', classIndex: 3, citizen_id: '001205017307', gender: 'Nam', date_of_birth: '2005-07-27' },
    { email: 'sv33a108@annd.edu.vn', name: 'Bùi Thị Trang', classIndex: 3, citizen_id: '001205028308', gender: 'Nữ', date_of_birth: '2005-08-14' },
    { email: 'sv33a109@annd.edu.vn', name: 'Phan Văn Trường', classIndex: 3, citizen_id: '001205019309', gender: 'Nam', date_of_birth: '2005-09-21' },
    { email: 'sv33a110@annd.edu.vn', name: 'Tô Thị Tuyết', classIndex: 3, citizen_id: '001205020310', gender: 'Nữ', date_of_birth: '2005-10-28' },
    { email: 'sv33a111@annd.edu.vn', name: 'Ngô Văn Uyên', classIndex: 3, citizen_id: '001205011311', gender: 'Nam', date_of_birth: '2005-11-15' },
    { email: 'sv33a112@annd.edu.vn', name: 'Trịnh Thị Vân', classIndex: 3, citizen_id: '001205022312', gender: 'Nữ', date_of_birth: '2005-12-22' },
    { email: 'sv33a113@annd.edu.vn', name: 'Lý Văn Vũ', classIndex: 3, citizen_id: '001205013313', gender: 'Nam', date_of_birth: '2005-01-19' },
    { email: 'sv33a114@annd.edu.vn', name: 'Hồ Thị Xanh', classIndex: 3, citizen_id: '001205024314', gender: 'Nữ', date_of_birth: '2005-02-26' },
    { email: 'sv33a115@annd.edu.vn', name: 'Lưu Văn Yên', classIndex: 3, citizen_id: '001205015315', gender: 'Nam', date_of_birth: '2005-03-14' },
    { email: 'sv33a116@annd.edu.vn', name: 'Hà Thị An', classIndex: 3, citizen_id: '001205026316', gender: 'Nữ', date_of_birth: '2005-04-21' },
    { email: 'sv33a117@annd.edu.vn', name: 'Chu Văn Bình', classIndex: 3, citizen_id: '001205017317', gender: 'Nam', date_of_birth: '2005-05-29' },
    { email: 'sv33a118@annd.edu.vn', name: 'Đinh Thị Châu', classIndex: 3, citizen_id: '001205028318', gender: 'Nữ', date_of_birth: '2005-06-16' },
    { email: 'sv33a119@annd.edu.vn', name: 'Võ Văn Đại', classIndex: 3, citizen_id: '001205019319', gender: 'Nam', date_of_birth: '2005-07-23' },
    { email: 'sv33a120@annd.edu.vn', name: 'Đỗ Thị Hằng', classIndex: 3, citizen_id: '001205020320', gender: 'Nữ', date_of_birth: '2005-08-30' },

    // Lớp D34C2 (20 HS) - Ngành C2
    { email: 'sv34c201@annd.edu.vn', name: 'Nguyễn Văn Vinh', classIndex: 4, citizen_id: '001205011401', gender: 'Nam', date_of_birth: '2004-01-18' },
    { email: 'sv34c202@annd.edu.vn', name: 'Trần Thị Vân', classIndex: 4, citizen_id: '001205022402', gender: 'Nữ', date_of_birth: '2004-02-25' },
    { email: 'sv34c203@annd.edu.vn', name: 'Phạm Văn Vũ', classIndex: 4, citizen_id: '001205013403', gender: 'Nam', date_of_birth: '2004-03-22' },
    { email: 'sv34c204@annd.edu.vn', name: 'Lê Thị Vy', classIndex: 4, citizen_id: '001205024404', gender: 'Nữ', date_of_birth: '2004-04-19' },
    { email: 'sv34c205@annd.edu.vn', name: 'Hoàng Văn Việt', classIndex: 4, citizen_id: '001205015405', gender: 'Nam', date_of_birth: '2004-05-26' },
    { email: 'sv34c206@annd.edu.vn', name: 'Vũ Thị Vượng', classIndex: 4, citizen_id: '001205026406', gender: 'Nữ', date_of_birth: '2004-06-23' },
    { email: 'sv34c207@annd.edu.vn', name: 'Dương Văn Vỹ', classIndex: 4, citizen_id: '001205017407', gender: 'Nam', date_of_birth: '2004-07-30' },
    { email: 'sv34c208@annd.edu.vn', name: 'Bùi Thị Xuân', classIndex: 4, citizen_id: '001205028408', gender: 'Nữ', date_of_birth: '2004-08-17' },
    { email: 'sv34c209@annd.edu.vn', name: 'Phan Văn Xuân', classIndex: 4, citizen_id: '001205019409', gender: 'Nam', date_of_birth: '2004-09-24' },
    { email: 'sv34c210@annd.edu.vn', name: 'Tô Thị Xuyến', classIndex: 4, citizen_id: '001205020410', gender: 'Nữ', date_of_birth: '2004-10-31' },
    { email: 'sv34c211@annd.edu.vn', name: 'Ngô Văn Xuyên', classIndex: 4, citizen_id: '001205011411', gender: 'Nam', date_of_birth: '2004-11-18' },
    { email: 'sv34c212@annd.edu.vn', name: 'Trịnh Thị Yến', classIndex: 4, citizen_id: '001205022412', gender: 'Nữ', date_of_birth: '2004-12-25' },
    { email: 'sv34c213@annd.edu.vn', name: 'Lý Văn Yên', classIndex: 4, citizen_id: '001205013413', gender: 'Nam', date_of_birth: '2004-01-21' },
    { email: 'sv34c214@annd.edu.vn', name: 'Hồ Thị Ánh', classIndex: 4, citizen_id: '001205024414', gender: 'Nữ', date_of_birth: '2004-02-28' },
    { email: 'sv34c215@annd.edu.vn', name: 'Lưu Văn Bình', classIndex: 4, citizen_id: '001205015415', gender: 'Nam', date_of_birth: '2004-03-16' },
    { email: 'sv34c216@annd.edu.vn', name: 'Hà Thị Cúc', classIndex: 4, citizen_id: '001205026416', gender: 'Nữ', date_of_birth: '2004-04-23' },
    { email: 'sv34c217@annd.edu.vn', name: 'Chu Văn Duy', classIndex: 4, citizen_id: '001205017417', gender: 'Nam', date_of_birth: '2004-05-30' },
    { email: 'sv34c218@annd.edu.vn', name: 'Đinh Thị Hà', classIndex: 4, citizen_id: '001205028418', gender: 'Nữ', date_of_birth: '2004-06-17' },
    { email: 'sv34c219@annd.edu.vn', name: 'Võ Văn Khánh', classIndex: 4, citizen_id: '001205019419', gender: 'Nam', date_of_birth: '2004-07-24' },
    { email: 'sv34c220@annd.edu.vn', name: 'Đỗ Thị Liên', classIndex: 4, citizen_id: '001205020420', gender: 'Nữ', date_of_birth: '2004-08-31' },

    // Lớp D34B1 (20 HS) - Ngành B1
    { email: 'sv34b501@annd.edu.vn', name: 'Nguyễn Văn Minh', classIndex: 5, citizen_id: '001205011501', gender: 'Nam', date_of_birth: '2004-01-14' },
    { email: 'sv34b502@annd.edu.vn', name: 'Trần Thị Ngân', classIndex: 5, citizen_id: '001205022502', gender: 'Nữ', date_of_birth: '2004-02-21' },
    { email: 'sv34b503@annd.edu.vn', name: 'Phạm Văn Phú', classIndex: 5, citizen_id: '001205013503', gender: 'Nam', date_of_birth: '2004-03-18' },
    { email: 'sv34b504@annd.edu.vn', name: 'Lê Thị Quế', classIndex: 5, citizen_id: '001205024504', gender: 'Nữ', date_of_birth: '2004-04-15' },
    { email: 'sv34b505@annd.edu.vn', name: 'Hoàng Văn Quân', classIndex: 5, citizen_id: '001205015505', gender: 'Nam', date_of_birth: '2004-05-22' },
    { email: 'sv34b506@annd.edu.vn', name: 'Vũ Thị Quyên', classIndex: 5, citizen_id: '001205026506', gender: 'Nữ', date_of_birth: '2004-06-19' },
    { email: 'sv34b507@annd.edu.vn', name: 'Dương Văn Quý', classIndex: 5, citizen_id: '001205017507', gender: 'Nam', date_of_birth: '2004-07-26' },
    { email: 'sv34b508@annd.edu.vn', name: 'Bùi Thị Thảo', classIndex: 5, citizen_id: '001205028508', gender: 'Nữ', date_of_birth: '2004-08-13' },
    { email: 'sv34b509@annd.edu.vn', name: 'Phan Văn Thắng', classIndex: 5, citizen_id: '001205019509', gender: 'Nam', date_of_birth: '2004-09-20' },
    { email: 'sv34b510@annd.edu.vn', name: 'Tô Thị Thanh', classIndex: 5, citizen_id: '001205020510', gender: 'Nữ', date_of_birth: '2004-10-27' },
    { email: 'sv34b511@annd.edu.vn', name: 'Ngô Văn Thiện', classIndex: 5, citizen_id: '001205011511', gender: 'Nam', date_of_birth: '2004-11-14' },
    { email: 'sv34b512@annd.edu.vn', name: 'Trịnh Thị Thu', classIndex: 5, citizen_id: '001205022512', gender: 'Nữ', date_of_birth: '2004-12-21' },
    { email: 'sv34b513@annd.edu.vn', name: 'Lý Văn Toàn', classIndex: 5, citizen_id: '001205013513', gender: 'Nam', date_of_birth: '2004-01-17' },
    { email: 'sv34b514@annd.edu.vn', name: 'Hồ Thị Trang', classIndex: 5, citizen_id: '001205024514', gender: 'Nữ', date_of_birth: '2004-02-24' },
    { email: 'sv34b515@annd.edu.vn', name: 'Lưu Văn Trí', classIndex: 5, citizen_id: '001205015515', gender: 'Nam', date_of_birth: '2004-03-12' },
    { email: 'sv34b516@annd.edu.vn', name: 'Hà Thị Uyên', classIndex: 5, citizen_id: '001205026516', gender: 'Nữ', date_of_birth: '2004-04-19' },
    { email: 'sv34b517@annd.edu.vn', name: 'Chu Văn Việt', classIndex: 5, citizen_id: '001205017517', gender: 'Nam', date_of_birth: '2004-05-26' },
    { email: 'sv34b518@annd.edu.vn', name: 'Đinh Thị Yến', classIndex: 5, citizen_id: '001205028518', gender: 'Nữ', date_of_birth: '2004-06-13' },
    { email: 'sv34b519@annd.edu.vn', name: 'Võ Văn Ánh', classIndex: 5, citizen_id: '001205019519', gender: 'Nam', date_of_birth: '2004-07-20' },
    { email: 'sv34b520@annd.edu.vn', name: 'Đỗ Thị Bình', classIndex: 5, citizen_id: '001205020520', gender: 'Nữ', date_of_birth: '2004-08-27' },

    // Lớp D35A (20 HS) - Ngành A
    { email: 'sv35a601@annd.edu.vn', name: 'Nguyễn Văn An', classIndex: 6, citizen_id: '001205011601', gender: 'Nam', date_of_birth: '2004-01-16' },
    { email: 'sv35a602@annd.edu.vn', name: 'Trần Thị Bích', classIndex: 6, citizen_id: '001205022602', gender: 'Nữ', date_of_birth: '2004-02-23' },
    { email: 'sv35a603@annd.edu.vn', name: 'Phạm Văn Cường', classIndex: 6, citizen_id: '001205013603', gender: 'Nam', date_of_birth: '2004-03-20' },
    { email: 'sv35a604@annd.edu.vn', name: 'Lê Thị Duyên', classIndex: 6, citizen_id: '001205024604', gender: 'Nữ', date_of_birth: '2004-04-17' },
    { email: 'sv35a605@annd.edu.vn', name: 'Hoàng Văn Đức', classIndex: 6, citizen_id: '001205015605', gender: 'Nam', date_of_birth: '2004-05-24' },
    { email: 'sv35a606@annd.edu.vn', name: 'Vũ Thị Giang', classIndex: 6, citizen_id: '001205026606', gender: 'Nữ', date_of_birth: '2004-06-21' },
    { email: 'sv35a607@annd.edu.vn', name: 'Dương Văn Hiếu', classIndex: 6, citizen_id: '001205017607', gender: 'Nam', date_of_birth: '2004-07-28' },
    { email: 'sv35a608@annd.edu.vn', name: 'Bùi Thị Hòa', classIndex: 6, citizen_id: '001205028608', gender: 'Nữ', date_of_birth: '2004-08-15' },
    { email: 'sv35a609@annd.edu.vn', name: 'Phan Văn Hùng', classIndex: 6, citizen_id: '001205019609', gender: 'Nam', date_of_birth: '2004-09-22' },
    { email: 'sv35a610@annd.edu.vn', name: 'Tô Thị Khánh', classIndex: 6, citizen_id: '001205020610', gender: 'Nữ', date_of_birth: '2004-10-29' },
    { email: 'sv35a611@annd.edu.vn', name: 'Ngô Văn Lâm', classIndex: 6, citizen_id: '001205011611', gender: 'Nam', date_of_birth: '2004-11-16' },
    { email: 'sv35a612@annd.edu.vn', name: 'Trịnh Thị Lan', classIndex: 6, citizen_id: '001205022612', gender: 'Nữ', date_of_birth: '2004-12-23' },
    { email: 'sv35a613@annd.edu.vn', name: 'Lý Văn Long', classIndex: 6, citizen_id: '001205013613', gender: 'Nam', date_of_birth: '2004-01-19' },
    { email: 'sv35a614@annd.edu.vn', name: 'Hồ Thị Mai', classIndex: 6, citizen_id: '001205024614', gender: 'Nữ', date_of_birth: '2004-02-26' },
    { email: 'sv35a615@annd.edu.vn', name: 'Lưu Văn Nam', classIndex: 6, citizen_id: '001205015615', gender: 'Nam', date_of_birth: '2004-03-13' },
    { email: 'sv35a616@annd.edu.vn', name: 'Hà Thị Oanh', classIndex: 6, citizen_id: '001205026616', gender: 'Nữ', date_of_birth: '2004-04-20' },
    { email: 'sv35a617@annd.edu.vn', name: 'Chu Văn Phong', classIndex: 6, citizen_id: '001205017617', gender: 'Nam', date_of_birth: '2004-05-27' },
    { email: 'sv35a618@annd.edu.vn', name: 'Đinh Thị Quyên', classIndex: 6, citizen_id: '001205028618', gender: 'Nữ', date_of_birth: '2004-06-14' },
    { email: 'sv35a619@annd.edu.vn', name: 'Võ Văn Quý', classIndex: 6, citizen_id: '001205019619', gender: 'Nam', date_of_birth: '2004-07-21' },
    { email: 'sv35a620@annd.edu.vn', name: 'Đỗ Thị Thảo', classIndex: 6, citizen_id: '001205020620', gender: 'Nữ', date_of_birth: '2004-08-28' },

    // Lớp D35B (20 HS) - Ngành B
    { email: 'sv35b801@annd.edu.vn', name: 'Nguyễn Văn Bình', classIndex: 7, citizen_id: '001205011701', gender: 'Nam', date_of_birth: '2005-01-18' },
    { email: 'sv35b802@annd.edu.vn', name: 'Trần Thị Chi', classIndex: 7, citizen_id: '001205022702', gender: 'Nữ', date_of_birth: '2005-02-25' },
    { email: 'sv35b803@annd.edu.vn', name: 'Phạm Văn Công', classIndex: 7, citizen_id: '001205013703', gender: 'Nam', date_of_birth: '2005-03-22' },
    { email: 'sv35b804@annd.edu.vn', name: 'Lê Thị Dung', classIndex: 7, citizen_id: '001205024704', gender: 'Nữ', date_of_birth: '2005-04-19' },
    { email: 'sv35b805@annd.edu.vn', name: 'Hoàng Văn Giang', classIndex: 7, citizen_id: '001205015705', gender: 'Nam', date_of_birth: '2005-05-26' },
    { email: 'sv35b806@annd.edu.vn', name: 'Vũ Thị Hà', classIndex: 7, citizen_id: '001205026706', gender: 'Nữ', date_of_birth: '2005-06-23' },
    { email: 'sv35b807@annd.edu.vn', name: 'Dương Văn Hào', classIndex: 7, citizen_id: '001205017707', gender: 'Nam', date_of_birth: '2005-07-30' },
    { email: 'sv35b808@annd.edu.vn', name: 'Bùi Thị Huyền', classIndex: 7, citizen_id: '001205028708', gender: 'Nữ', date_of_birth: '2005-08-17' },
    { email: 'sv35b809@annd.edu.vn', name: 'Phan Văn Khải', classIndex: 7, citizen_id: '001205019709', gender: 'Nam', date_of_birth: '2005-09-24' },
    { email: 'sv35b810@annd.edu.vn', name: 'Tô Thị Lan', classIndex: 7, citizen_id: '001205020710', gender: 'Nữ', date_of_birth: '2005-10-31' },
    { email: 'sv35b811@annd.edu.vn', name: 'Ngô Văn Long', classIndex: 7, citizen_id: '001205011711', gender: 'Nam', date_of_birth: '2005-11-18' },
    { email: 'sv35b812@annd.edu.vn', name: 'Trịnh Thị Mai', classIndex: 7, citizen_id: '001205022712', gender: 'Nữ', date_of_birth: '2005-12-25' },
    { email: 'sv35b813@annd.edu.vn', name: 'Lý Văn Nam', classIndex: 7, citizen_id: '001205013713', gender: 'Nam', date_of_birth: '2005-01-21' },
    { email: 'sv35b814@annd.edu.vn', name: 'Hồ Thị Oanh', classIndex: 7, citizen_id: '001205024714', gender: 'Nữ', date_of_birth: '2005-02-28' },
    { email: 'sv35b815@annd.edu.vn', name: 'Lưu Văn Quang', classIndex: 7, citizen_id: '001205015715', gender: 'Nam', date_of_birth: '2005-03-16' },
    { email: 'sv35b816@annd.edu.vn', name: 'Hà Thị Quỳnh', classIndex: 7, citizen_id: '001205026716', gender: 'Nữ', date_of_birth: '2005-04-23' },
    { email: 'sv35b817@annd.edu.vn', name: 'Chu Văn Sơn', classIndex: 7, citizen_id: '001205017717', gender: 'Nam', date_of_birth: '2005-05-30' },
    { email: 'sv35b818@annd.edu.vn', name: 'Đinh Thị Thảo', classIndex: 7, citizen_id: '001205028718', gender: 'Nữ', date_of_birth: '2005-06-17' },
    { email: 'sv35b819@annd.edu.vn', name: 'Võ Văn Thịnh', classIndex: 7, citizen_id: '001205019719', gender: 'Nam', date_of_birth: '2005-07-24' },
    { email: 'sv35b820@annd.edu.vn', name: 'Đỗ Thị Trang', classIndex: 7, citizen_id: '001205020720', gender: 'Nữ', date_of_birth: '2005-08-31' },

    // Lớp D36C (20 HS) - Ngành C
    { email: 'sv36c901@annd.edu.vn', name: 'Nguyễn Văn Hòa', classIndex: 8, citizen_id: '001206011801', gender: 'Nam', date_of_birth: '2005-01-20' },
    { email: 'sv36c902@annd.edu.vn', name: 'Trần Thị Hồng', classIndex: 8, citizen_id: '001206022802', gender: 'Nữ', date_of_birth: '2005-02-27' },
    { email: 'sv36c903@annd.edu.vn', name: 'Phạm Văn Huấn', classIndex: 8, citizen_id: '001206013803', gender: 'Nam', date_of_birth: '2005-03-24' },
    { email: 'sv36c904@annd.edu.vn', name: 'Lê Thị Huyền', classIndex: 8, citizen_id: '001206024804', gender: 'Nữ', date_of_birth: '2005-04-21' },
    { email: 'sv36c905@annd.edu.vn', name: 'Hoàng Văn Khoa', classIndex: 8, citizen_id: '001206015805', gender: 'Nam', date_of_birth: '2005-05-28' },
    { email: 'sv36c906@annd.edu.vn', name: 'Vũ Thị Lan', classIndex: 8, citizen_id: '001206026806', gender: 'Nữ', date_of_birth: '2005-06-25' },
    { email: 'sv36c907@annd.edu.vn', name: 'Dương Văn Lợi', classIndex: 8, citizen_id: '001206017807', gender: 'Nam', date_of_birth: '2005-07-30' },
    { email: 'sv36c908@annd.edu.vn', name: 'Bùi Thị Lý', classIndex: 8, citizen_id: '001206028808', gender: 'Nữ', date_of_birth: '2005-08-17' },
    { email: 'sv36c909@annd.edu.vn', name: 'Phan Văn Minh', classIndex: 8, citizen_id: '001206019809', gender: 'Nam', date_of_birth: '2005-09-24' },
    { email: 'sv36c910@annd.edu.vn', name: 'Tô Thị Ngân', classIndex: 8, citizen_id: '001206020810', gender: 'Nữ', date_of_birth: '2005-10-31' },
    { email: 'sv36c911@annd.edu.vn', name: 'Ngô Văn Phú', classIndex: 8, citizen_id: '001206011811', gender: 'Nam', date_of_birth: '2005-11-18' },
    { email: 'sv36c912@annd.edu.vn', name: 'Trịnh Thị Quyên', classIndex: 8, citizen_id: '001206022812', gender: 'Nữ', date_of_birth: '2005-12-25' },
    { email: 'sv36c913@annd.edu.vn', name: 'Lý Văn Quý', classIndex: 8, citizen_id: '001206013813', gender: 'Nam', date_of_birth: '2005-01-21' },
    { email: 'sv36c914@annd.edu.vn', name: 'Hồ Thị Sen', classIndex: 8, citizen_id: '001206024814', gender: 'Nữ', date_of_birth: '2005-02-28' },
    { email: 'sv36c915@annd.edu.vn', name: 'Lưu Văn Thái', classIndex: 8, citizen_id: '001206015815', gender: 'Nam', date_of_birth: '2005-03-16' },
    { email: 'sv36c916@annd.edu.vn', name: 'Hà Thị Thủy', classIndex: 8, citizen_id: '001206026816', gender: 'Nữ', date_of_birth: '2005-04-23' },
    { email: 'sv36c917@annd.edu.vn', name: 'Chu Văn Tùng', classIndex: 8, citizen_id: '001206017817', gender: 'Nam', date_of_birth: '2005-05-30' },
    { email: 'sv36c918@annd.edu.vn', name: 'Đinh Thị Vân', classIndex: 8, citizen_id: '001206028818', gender: 'Nữ', date_of_birth: '2005-06-17' },
    { email: 'sv36c919@annd.edu.vn', name: 'Võ Văn Việt', classIndex: 8, citizen_id: '001206019819', gender: 'Nam', date_of_birth: '2005-07-24' },
    { email: 'sv36c920@annd.edu.vn', name: 'Đỗ Thị Yến', classIndex: 8, citizen_id: '001206020820', gender: 'Nữ', date_of_birth: '2005-08-31' },

    // Lớp D36A1 (20 HS) - Ngành A1
    { email: 'sv36a1101@annd.edu.vn', name: 'Nguyễn Văn Bách', classIndex: 9, citizen_id: '001206011901', gender: 'Nam', date_of_birth: '2006-01-19' },
    { email: 'sv36a1102@annd.edu.vn', name: 'Trần Thị Chi', classIndex: 9, citizen_id: '001206022902', gender: 'Nữ', date_of_birth: '2006-02-26' },
    { email: 'sv36a1103@annd.edu.vn', name: 'Phạm Văn Dũng', classIndex: 9, citizen_id: '001206013903', gender: 'Nam', date_of_birth: '2006-03-23' },
    { email: 'sv36a1104@annd.edu.vn', name: 'Lê Thị Hà', classIndex: 9, citizen_id: '001206024904', gender: 'Nữ', date_of_birth: '2006-04-20' },
    { email: 'sv36a1105@annd.edu.vn', name: 'Hoàng Văn Huy', classIndex: 9, citizen_id: '001206015905', gender: 'Nam', date_of_birth: '2006-05-27' },
    { email: 'sv36a1106@annd.edu.vn', name: 'Vũ Thị Hương', classIndex: 9, citizen_id: '001206026906', gender: 'Nữ', date_of_birth: '2006-06-24' },
    { email: 'sv36a1107@annd.edu.vn', name: 'Dương Văn Khôi', classIndex: 9, citizen_id: '001206017907', gender: 'Nam', date_of_birth: '2006-07-31' },
    { email: 'sv36a1108@annd.edu.vn', name: 'Bùi Thị Lan', classIndex: 9, citizen_id: '001206028908', gender: 'Nữ', date_of_birth: '2006-08-18' },
    { email: 'sv36a1109@annd.edu.vn', name: 'Phan Văn Lộc', classIndex: 9, citizen_id: '001206019909', gender: 'Nam', date_of_birth: '2006-09-25' },
    { email: 'sv36a1110@annd.edu.vn', name: 'Tô Thị Mai', classIndex: 9, citizen_id: '001206020910', gender: 'Nữ', date_of_birth: '2006-10-12' },
    { email: 'sv36a1111@annd.edu.vn', name: 'Ngô Văn Nam', classIndex: 9, citizen_id: '001206011911', gender: 'Nam', date_of_birth: '2006-11-19' },
    { email: 'sv36a1112@annd.edu.vn', name: 'Trịnh Thị Nhung', classIndex: 9, citizen_id: '001206022912', gender: 'Nữ', date_of_birth: '2006-12-26' },
    { email: 'sv36a1113@annd.edu.vn', name: 'Lý Văn Phú', classIndex: 9, citizen_id: '001206013913', gender: 'Nam', date_of_birth: '2006-01-23' },
    { email: 'sv36a1114@annd.edu.vn', name: 'Hồ Thị Quỳnh', classIndex: 9, citizen_id: '001206024914', gender: 'Nữ', date_of_birth: '2006-02-28' },
    { email: 'sv36a1115@annd.edu.vn', name: 'Lưu Văn Sinh', classIndex: 9, citizen_id: '001206015915', gender: 'Nam', date_of_birth: '2006-03-15' },
    { email: 'sv36a1116@annd.edu.vn', name: 'Hà Thị Thảo', classIndex: 9, citizen_id: '001206026916', gender: 'Nữ', date_of_birth: '2006-04-22' },
    { email: 'sv36a1117@annd.edu.vn', name: 'Chu Văn Thành', classIndex: 9, citizen_id: '001206017917', gender: 'Nam', date_of_birth: '2006-05-29' },
    { email: 'sv36a1118@annd.edu.vn', name: 'Đinh Thị Trang', classIndex: 9, citizen_id: '001206028918', gender: 'Nữ', date_of_birth: '2006-06-16' },
    { email: 'sv36a1119@annd.edu.vn', name: 'Võ Văn Trọng', classIndex: 9, citizen_id: '001206019919', gender: 'Nam', date_of_birth: '2006-07-23' },
    { email: 'sv36a1120@annd.edu.vn', name: 'Đỗ Thị Yến', classIndex: 9, citizen_id: '001206020920', gender: 'Nữ', date_of_birth: '2006-08-30' }
  ],

  activities: [
    // Hoạt động học thuật
    {
      title: 'Seminar Khoa học và Công nghệ 2024',
      description: 'Seminar toàn khoa về những ứng dụng mới nhất của khoa học và công nghệ trong thực tế',
      daysFromNow: 7,
      location: 'Hội trường A - Tòa nhà chính',
      managerIndex: 0,
      maxParticipants: 300,
      classIndexes: [0, 1, 2, 3, 4, 5, 6],
      status: 'draft', // CHANGED: để test workflow "Teacher tạo (draft)"
      activityTypeIndex: 0,
      orgLevelIndex: 3
    },
    {
      title: 'Workshop Lập trình Python nâng cao',
      description: 'Khóa học lập trình Python nâng cao dành cho học viên yêu thích phát triển phần mềm',
      daysFromNow: 5,
      location: 'Phòng máy tính - Tòa nhà B',
      managerIndex: 0,
      maxParticipants: 50,
      classIndexes: [0, 1, 5, 6],
      status: 'pending', // Để test bước 2: "Teacher gửi phê duyệt → pending"
      activityTypeIndex: 0,
      orgLevelIndex: 3
    },
    {
      title: 'Cuộc thi Nghiên cứu khoa học - "Ý tưởng sáng tạo"',
      description: 'Cuộc thi toàn khoa dành cho học viên - Chủ đề: "Ý tưởng sáng tạo giải quyết vấn đề xã hội"',
      daysFromNow: 21,
      location: 'Thư viện - Tầng 2',
      managerIndex: 3,
      maxParticipants: 150,
      classIndexes: [0, 1, 2, 3, 4],
      status: 'published',
      activityTypeIndex: 2,
      orgLevelIndex: 2
    },
    {
      title: 'Hội thảo Phát triển kỹ năng quản lý dự án',
      description: 'Workshop về kỹ năng quản lý dự án, thuyết trình chuyên môn và lãnh đạo nhóm',
      daysFromNow: 10,
      location: 'Phòng đa năng - Tầng 3',
      managerIndex: 1,
      maxParticipants: 120,
      classIndexes: [2, 3, 4, 7, 8, 9],
      status: 'draft', // CHANGED: thêm hoạt động draft của teacher khác
      activityTypeIndex: 4,
      orgLevelIndex: 3
    },
    // Hoạt động thể thao
    {
      title: 'Giải bóng đá sinh viên - Vòng bán kết',
      description: 'Giải bóng đá giao hữu giữa các lớp - Vòng bán kết cấp khoa',
      daysFromNow: 14,
      location: 'Sân vận động đại học',
      managerIndex: 1,
      maxParticipants: 200,
      classIndexes: [0, 1, 2, 5, 6, 7],
      status: 'draft',
      activityTypeIndex: 1,
      orgLevelIndex: 3
    },
    {
      title: 'Giải bóng chuyền nữ - Giải vô địch sinh viên',
      description: 'Giải bóng chuyền nữ cấp đại học dành cho các lớp học',
      daysFromNow: 30,
      location: 'Sân vận động đại học',
      managerIndex: 1,
      maxParticipants: 100,
      classIndexes: [0, 1, 2, 3, 4],
      status: 'published',
      activityTypeIndex: 1,
      orgLevelIndex: 2
    },
    {
      title: 'Ngày hội thể thao sinh viên - Chạy 3km',
      description: 'Sự kiện thể thao toàn khoa - Chạy tiếp sức 3km kết hợp các hoạt động giao tiếp',
      daysFromNow: 45,
      location: 'Sân vận động đại học',
      managerIndex: 1,
      maxParticipants: 500,
      classIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      status: 'completed',
      activityTypeIndex: 1,
      orgLevelIndex: 3
    },
    // Hoạt động văn hóa - nghệ thuật
    {
      title: 'Cuộc thi Giọng hát sinh viên - "Ngôi sao ánh sáng"',
      description: 'Cuộc thi tìm kiếm tài năng ca hát của học viên khoa',
      daysFromNow: 18,
      location: 'Nhà hát đại học',
      managerIndex: 3,
      maxParticipants: 200,
      classIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      status: 'published',
      activityTypeIndex: 2,
      orgLevelIndex: 3
    },
    {
      title: 'Lễ kỷ niệm thành lập đại học - Chương trình gala',
      description: 'Chương trình gala kỷ niệm thành lập - Tôn vinh những đóng góp của cộng đồng sinh viên',
      daysFromNow: 60,
      location: 'Hội trường A',
      managerIndex: 0,
      maxParticipants: 500,
      classIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      status: 'published',
      activityTypeIndex: 2,
      orgLevelIndex: 3
    },
    // Hoạt động tình nguyện
    {
      title: 'Chiến dịch "Xanh hóa khuôn viên đại học"',
      description: 'Hoạt động tình nguyện vệ sinh môi trường - Trồng cây và làm sạch khuôn viên',
      daysFromNow: 3,
      location: 'Khuôn viên đại học',
      managerIndex: 2,
      maxParticipants: 300,
      classIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      status: 'published',
      activityTypeIndex: 3,
      orgLevelIndex: 3
    },
    {
      title: 'Tập huấn "Phát triển bền vững và bảo vệ môi trường"',
      description: 'Seminar giáo dục về phát triển bền vững và bảo vệ môi trường xanh',
      daysFromNow: 12,
      location: 'Phòng đa năng - Tầng 3',
      managerIndex: 0,
      maxParticipants: 250,
      classIndexes: [3, 4, 7, 8, 9],
      status: 'published',
      activityTypeIndex: 3,
      orgLevelIndex: 3
    },
    // Hoạt động khác
    {
      title: 'Khóa học ngoại khóa Tiếng Anh chuyên ngành',
      description: 'Lớp học ngoại khóa Tiếng Anh chuyên ngành dành cho học viên muốn nâng cao kỹ năng giao tiếp',
      daysFromNow: 3,
      location: 'Phòng 301 - Tòa nhà A',
      managerIndex: 4,
      maxParticipants: 50,
      classIndexes: [5, 6, 7, 8, 9],
      status: 'published',
      activityTypeIndex: 4,
      orgLevelIndex: 3
    },
    {
      title: 'Hội thảo "Chuẩn bị sự nghiệp và phỏng vấn việc làm"',
      description: 'Hội thảo tư vấn về chuẩn bị sự nghiệp, viết CV, chuẩn bị phỏng vấn và kỹ năng nộp đơn',
      daysFromNow: 25,
      location: 'Hội trường A',
      managerIndex: 0,
      maxParticipants: 200,
      classIndexes: [0, 1, 2],
      status: 'published',
      activityTypeIndex: 0,
      orgLevelIndex: 3
    },
    {
      title: 'Chương trình giao lưu sinh viên quốc tế',
      description: 'Buổi giới thiệu và giao lưu kinh nghiệm với sinh viên quốc tế từ các đại học bạn',
      daysFromNow: 40,
      location: 'Phòng đa năng - Tầng 3',
      managerIndex: 0,
      maxParticipants: 300,
      classIndexes: [0, 1, 2, 3, 4],
      status: 'published',
      activityTypeIndex: 4,
      orgLevelIndex: 1
    }
  ],

  devices: [
    { managerIndex: 0, mac_address: 'AA:BB:CC:DD:EE:01', name: 'Laptop - Thầy Tuấn', approved: 1 },
    { managerIndex: 1, mac_address: 'AA:BB:CC:DD:EE:02', name: 'Laptop - Thầy Hùng', approved: 1 },
    { managerIndex: 2, mac_address: 'AA:BB:CC:DD:EE:03', name: 'Laptop - Cô Hương', approved: 1 },
    { studentIndex: 0, mac_address: 'AA:BB:CC:DD:EE:04', name: 'iPhone - Trần Đức Anh', approved: 1 },
    { studentIndex: 5, mac_address: 'AA:BB:CC:DD:EE:05', name: 'Samsung - Vũ Văn Khánh', approved: 1 }
  ],

  departments: [
    { name: 'Phòng Đào tạo', code: 'PDT', managerIndex: 0 },
    { name: 'Phòng Công tác Sinh viên', code: 'PCSV', managerIndex: 1 },
    { name: 'Phòng Kỹ thuật', code: 'PKT', managerIndex: 2 },
    { name: 'Phòng Tài chính', code: 'PTC', managerIndex: 3 }
  ],

  activityTypes: [
    { name: 'Học thuật', base_points: 5, color: '#3B82F6', description: 'Hoạt động liên quan đến học tập' },
    { name: 'Thể thao', base_points: 4, color: '#10B981', description: 'Hoạt động thể dục thể thao' },
    { name: 'Văn hóa - Nghệ thuật', base_points: 4, color: '#8B5CF6', description: 'Hoạt động văn hóa, nghệ thuật' },
    { name: 'Tình nguyện', base_points: 6, color: '#F59E0B', description: 'Hoạt động tình nguyện, cộng đồng' },
    { name: 'Kỹ năng mềm', base_points: 3, color: '#EF4444', description: 'Workshop, training kỹ năng' }
  ],

  organizationLevels: [
    { name: 'Quốc tế', multiplier: 2.0, description: 'Cấp quốc tế' },
    { name: 'Quốc gia', multiplier: 1.5, description: 'Cấp quốc gia' },
    { name: 'Tỉnh/Thành phố', multiplier: 1.3, description: 'Cấp tỉnh/thành' },
    { name: 'Trường', multiplier: 1.0, description: 'Cấp trường' }
  ],

  // Activity time slots - để track khi nào activity diễn ra
  activityTimeSlots: [
    // Activity 0: 7 ngày tới - 9:00-11:00
    { activityIndex: 0, startTime: '09:00', endTime: '11:00', capacity: 300, description: 'Slot 1 (Sáng)' },
    // Activity 1: 5 ngày tới - 14:00-16:00
    { activityIndex: 1, startTime: '14:00', endTime: '16:00', capacity: 50, description: 'Slot 1 (Chiều)' },
    // Activity 2: 21 ngày tới - 09:00-12:00
    { activityIndex: 2, startTime: '09:00', endTime: '12:00', capacity: 150, description: 'Slot 1 (Sáng)' },
    // Activity 3: 10 ngày tới - 14:00-17:00
    { activityIndex: 3, startTime: '14:00', endTime: '17:00', capacity: 120, description: 'Slot 1 (Chiều)' },
    // Activity 4: 14 ngày tới - 17:00-19:00
    { activityIndex: 4, startTime: '17:00', endTime: '19:00', capacity: 200, description: 'Slot 1 (Tối)' },
    // Activity 5: 30 ngày tới - 18:00-20:00
    { activityIndex: 5, startTime: '18:00', endTime: '20:00', capacity: 100, description: 'Slot 1 (Tối)' },
    // Activity 6: 45 ngày tới - 06:00-08:30
    { activityIndex: 6, startTime: '06:00', endTime: '08:30', capacity: 500, description: 'Slot 1 (Sáng sớm)' },
    // Activity 7: 18 ngày tới - 19:00-21:00
    { activityIndex: 7, startTime: '19:00', endTime: '21:00', capacity: 300, description: 'Slot 1 (Tối)' },
    // Activity 8: 3 ngày tới - 07:00-09:00
    { activityIndex: 8, startTime: '07:00', endTime: '09:00', capacity: 300, description: 'Slot 1 (Sáng sớm)' },
    // Activity 9: 12 ngày tới - 14:00-17:00
    { activityIndex: 9, startTime: '14:00', endTime: '17:00', capacity: 250, description: 'Slot 1 (Chiều)' },
    // Activity 10: 3 ngày tới - 18:00-20:00
    { activityIndex: 10, startTime: '18:00', endTime: '20:00', capacity: 50, description: 'Slot 1 (Tối)' },
    // Activity 11: 25 ngày tới - 09:00-12:00
    { activityIndex: 11, startTime: '09:00', endTime: '12:00', capacity: 200, description: 'Slot 1 (Sáng)' },
    // Activity 12: 40 ngày tới - 14:00-17:00
    { activityIndex: 12, startTime: '14:00', endTime: '17:00', capacity: 300, description: 'Slot 1 (Chiều)' }
  ],

  participations: [
    // ========== Activity 0: Hội thảo KH&CN (80 HS) ==========
    // 32 attended + excellent, 24 attended + good, 16 attended + participated, 8 absent
    {
      activityIndex: 0,
      details: [
        // Attended with excellent (40% of 80 = 32 HS)
        ...Array.from({ length: 32 }, (_, i) => ({
          studentIndex: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        // Attended with good (30% of 80 = 24 HS)
        ...Array.from({ length: 24 }, (_, i) => ({
          studentIndex: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55][i],
          status: 'attended',
          achievement: 'good'
        })),
        // Attended with participated (20% of 80 = 16 HS)
        ...Array.from({ length: 16 }, (_, i) => ({
          studentIndex: [56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71][i],
          status: 'attended',
          achievement: 'participated'
        })),
        // Absent (10% of 80 = 8 HS)
        ...Array.from({ length: 8 }, (_, i) => ({
          studentIndex: [72, 73, 74, 75, 76, 77, 78, 79][i],
          status: 'absent',
          achievement: null
        }))
      ]
    },
    // ========== Activity 1: Workshop Python (30 HS) ==========
    {
      activityIndex: 1,
      details: [
        ...Array.from({ length: 12 }, (_, i) => ({
          studentIndex: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          studentIndex: [24, 26, 28, 30, 46, 48, 50, 52, 54][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          studentIndex: [56, 58, 60, 62, 64, 166][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          studentIndex: [168, 170, 172][i],
          status: 'absent',
          achievement: null
        }))
      ]
    },
    // ========== Activity 2: Cuộc thi Nghiên cứu (50 HS) ==========
    {
      activityIndex: 2,
      details: [
        ...Array.from({ length: 20 }, (_, i) => ({
          studentIndex: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          studentIndex: [41, 43, 47, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 71][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          studentIndex: [73, 75, 77, 79, 81, 83, 85, 87, 89, 91][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          studentIndex: [93, 95, 97, 99, 101][i],
          status: 'registered',
          achievement: null
        }))
      ]
    },
    // ========== Activity 3: Workshop Kỹ năng (60 HS) ==========
    {
      activityIndex: 3,
      details: [
        ...Array.from({ length: 24 }, (_, i) => ({
          studentIndex: [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 106, 107, 108, 109][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 18 }, (_, i) => ({
          studentIndex: [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 226, 227][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 12 }, (_, i) => ({
          studentIndex: [228, 229, 230, 231, 232, 233, 234, 235, 256, 257, 258, 259][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          studentIndex: [260, 261, 262, 263, 264, 265][i],
          status: 'registered',
          achievement: null
        }))
      ]
    },
    // ========== Activity 4: Giải bóng đá (70 HS) ==========
    {
      activityIndex: 4,
      details: [
        ...Array.from({ length: 28 }, (_, i) => ({
          studentIndex: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 21 }, (_, i) => ({
          studentIndex: [56, 58, 60, 62, 64, 166, 168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 226][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 14 }, (_, i) => ({
          studentIndex: [228, 230, 232, 234, 236, 238, 240, 242, 244, 246, 248, 250, 252, 254][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 7 }, (_, i) => ({
          studentIndex: [256, 258, 260, 262, 264, 286, 288][i],
          status: 'registered',
          achievement: null
        }))
      ]
    },
    // ========== Activity 5: Giải bóng chuyền (40 HS) ==========
    {
      activityIndex: 5,
      details: [
        ...Array.from({ length: 16 }, (_, i) => ({
          studentIndex: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 12 }, (_, i) => ({
          studentIndex: [47, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          studentIndex: [71, 73, 75, 77, 79, 81, 83, 85][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          studentIndex: [87, 89, 91, 93][i],
          status: 'registered',
          achievement: null
        }))
      ]
    },
    // ========== Activity 6: Marathon 5km (150 HS) - Hoạt động lớn ==========
    {
      activityIndex: 6,
      details: [
        ...Array.from({ length: 60 }, (_, i) => {
          const indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'excellent' }
        }),
        ...Array.from({ length: 45 }, (_, i) => {
          const indexes = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'good' }
        }),
        ...Array.from({ length: 30 }, (_, i) => {
          const indexes = [125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 226, 227, 228, 229, 230, 231, 232, 233, 234]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'participated' }
        }),
        ...Array.from({ length: 15 }, (_, i) => {
          const indexes = [235, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 286, 287, 288, 289]
          return { studentIndex: indexes[i], status: 'registered', achievement: null }
        })
      ]
    },
    // ========== Activity 7: Giọng hát sinh viên (90 HS) ==========
    {
      activityIndex: 7,
      details: [
        ...Array.from({ length: 36 }, (_, i) => {
          const indexes = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'excellent' }
        }),
        ...Array.from({ length: 27 }, (_, i) => {
          const indexes = [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 106, 107]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'good' }
        }),
        ...Array.from({ length: 18 }, (_, i) => {
          const indexes = [108, 109, 110, 111, 112, 113, 114, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'participated' }
        }),
        ...Array.from({ length: 9 }, (_, i) => {
          const indexes = [77, 78, 79, 80, 81, 82, 83, 84, 85]
          return { studentIndex: indexes[i], status: 'registered', achievement: null }
        })
      ]
    },
    // ========== Activity 8: Xanh hóa khuôn viên (120 HS) ==========
    {
      activityIndex: 8,
      details: [
        ...Array.from({ length: 48 }, (_, i) => {
          const indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'excellent' }
        }),
        ...Array.from({ length: 36 }, (_, i) => {
          const indexes = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'good' }
        }),
        ...Array.from({ length: 24 }, (_, i) => {
          const indexes = [84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'participated' }
        }),
        ...Array.from({ length: 12 }, (_, i) => {
          const indexes = [108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]
          return { studentIndex: indexes[i], status: 'registered', achievement: null }
        })
      ]
    },
    // ========== Activity 9: Phát triển bền vững (100 HS) ==========
    {
      activityIndex: 9,
      details: [
        ...Array.from({ length: 40 }, (_, i) => {
          const indexes = [76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 154]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'excellent' }
        }),
        ...Array.from({ length: 30 }, (_, i) => {
          const indexes = [156, 158, 160, 162, 164, 166, 168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 226, 228, 230, 232, 234, 236, 238, 240, 242, 244]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'good' }
        }),
        ...Array.from({ length: 20 }, (_, i) => {
          const indexes = [246, 248, 250, 252, 254, 256, 258, 260, 262, 264, 286, 288, 40, 42, 44, 46, 48, 50, 52, 54]
          return { studentIndex: indexes[i], status: 'attended', achievement: 'participated' }
        }),
        ...Array.from({ length: 10 }, (_, i) => {
          const indexes = [56, 58, 60, 270, 272, 274, 276, 278, 280, 282]
          return { studentIndex: indexes[i], status: 'registered', achievement: null }
        })
      ]
    },
    // ========== Activity 10: Tiếng Anh chuyên ngành (40 HS) ==========
    {
      activityIndex: 10,
      details: [
        ...Array.from({ length: 16 }, (_, i) => ({
          studentIndex: [166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 12 }, (_, i) => ({
          studentIndex: [182, 183, 184, 185, 226, 227, 228, 229, 230, 231, 232, 233][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          studentIndex: [234, 235, 256, 257, 258, 259, 260, 261][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          studentIndex: [262, 263, 264, 265][i],
          status: 'registered',
          achievement: null
        }))
      ]
    },
    // ========== Activity 11: Chuẩn bị sự nghiệp (50 HS) ==========
    {
      activityIndex: 11,
      details: [
        ...Array.from({ length: 20 }, (_, i) => ({
          studentIndex: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          studentIndex: [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          studentIndex: [70, 72, 74, 76, 78, 80, 82, 84, 86, 88][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          studentIndex: [90, 92, 94, 96, 98][i],
          status: 'registered',
          achievement: null
        }))
      ]
    },
    // ========== Activity 12: Giao lưu sinh viên quốc tế (70 HS) ==========
    {
      activityIndex: 12,
      details: [
        ...Array.from({ length: 28 }, (_, i) => ({
          studentIndex: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55][i],
          status: 'attended',
          achievement: 'excellent'
        })),
        ...Array.from({ length: 21 }, (_, i) => ({
          studentIndex: [57, 59, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97][i],
          status: 'attended',
          achievement: 'good'
        })),
        ...Array.from({ length: 14 }, (_, i) => ({
          studentIndex: [99, 101, 103, 105, 107, 109, 111, 113, 115, 117, 119, 121, 123, 125][i],
          status: 'attended',
          achievement: 'participated'
        })),
        ...Array.from({ length: 7 }, (_, i) => ({
          studentIndex: [127, 129, 131, 133, 135, 137, 139][i],
          status: 'registered',
          achievement: null
        }))
      ]
    }
  ]
}

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

async function ensureUserSeedColumns(): Promise<void> {
  const columns = await dbAll('PRAGMA table_info(users)') as Array<{ name: string }>
  const names = new Set(columns.map((c) => c.name))

  const add = async (sql: string) => {
    await dbRun(sql)
  }

  if (!names.has('username')) await add('ALTER TABLE users ADD COLUMN username TEXT')
  if (!names.has('phone')) await add('ALTER TABLE users ADD COLUMN phone TEXT')
  if (!names.has('avatar_url')) await add('ALTER TABLE users ADD COLUMN avatar_url TEXT')
  if (!names.has('gender')) await add('ALTER TABLE users ADD COLUMN gender TEXT')
  if (!names.has('date_of_birth')) await add('ALTER TABLE users ADD COLUMN date_of_birth TEXT')
  if (!names.has('citizen_id')) await add('ALTER TABLE users ADD COLUMN citizen_id TEXT')
  if (!names.has('student_id')) await add('ALTER TABLE users ADD COLUMN student_id TEXT')
  if (!names.has('student_code')) await add('ALTER TABLE users ADD COLUMN student_code TEXT')
  if (!names.has('province')) await add('ALTER TABLE users ADD COLUMN province TEXT')
  if (!names.has('district')) await add('ALTER TABLE users ADD COLUMN district TEXT')
  if (!names.has('ward')) await add('ALTER TABLE users ADD COLUMN ward TEXT')
  if (!names.has('address_detail')) await add('ALTER TABLE users ADD COLUMN address_detail TEXT')
  if (!names.has('address')) await add('ALTER TABLE users ADD COLUMN address TEXT')
  if (!names.has('code')) await add('ALTER TABLE users ADD COLUMN code TEXT')
  if (!names.has('is_active')) await add('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1')
  if (!names.has('updated_at')) {
    await add('ALTER TABLE users ADD COLUMN updated_at DATETIME')
    await dbRun('UPDATE users SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)')
  }

  // Best-effort indexes
  await dbRun('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)')
  await dbRun('CREATE INDEX IF NOT EXISTS idx_users_code ON users(code)')
  await dbRun('CREATE INDEX IF NOT EXISTS idx_users_student_code ON users(student_code)')

  // Teacher profile fields (for easier admin testing)
  if (!names.has('teacher_rank')) await add('ALTER TABLE users ADD COLUMN teacher_rank TEXT')
  if (!names.has('academic_title')) await add('ALTER TABLE users ADD COLUMN academic_title TEXT')
  if (!names.has('academic_degree')) await add('ALTER TABLE users ADD COLUMN academic_degree TEXT')
}

async function tableExists(tableName: string): Promise<boolean> {
  const row = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName])
  return !!row
}

async function ensureColumnIfMissing(tableName: string, columnName: string, definitionSql: string): Promise<void> {
  if (!await tableExists(tableName)) return
  const cols = await dbAll(`PRAGMA table_info(${tableName})`) as Array<{ name: string }>
  const hasColumn = cols.some((c) => c.name === columnName)
  if (!hasColumn) {
    await dbRun(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`)
  }
}

async function ensureCaseCoverageTables(): Promise<void> {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      manager_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      contest_name TEXT NOT NULL,
      level TEXT NOT NULL,
      rank TEXT NOT NULL,
      date DATETIME,
      evidence_url TEXT,
      awarded_points_suggested REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      role_type TEXT NOT NULL,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS activity_time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      slot_date DATE NOT NULL,
      slot_start TIME NOT NULL,
      slot_end TIME NOT NULL,
      max_concurrent INTEGER DEFAULT 50,
      current_registered INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS suggested_bonus_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      source_type TEXT,
      source_id INTEGER,
      points REAL,
      reason TEXT,
      status TEXT,
      author_id INTEGER,
      approver_id INTEGER,
      evidence_url TEXT,
      apply_to TEXT DEFAULT 'hoc_tap',
      source_provenance TEXT DEFAULT 'manual',
      term TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      components_json TEXT,
      final_score REAL NOT NULL,
      gpa_contrib REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS conduct_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      daily_score REAL,
      weekly_score REAL,
      final_conduct_score REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, term)
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      applies_to TEXT NOT NULL DEFAULT 'hoc_tap',
      trigger_type TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      points REAL NOT NULL DEFAULT 0,
      cap_per_term REAL,
      cap_per_year REAL,
      auto_apply INTEGER DEFAULT 1,
      requires_approval INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS security_question_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      success INTEGER DEFAULT 0,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS achievement_multipliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      achievement_level TEXT NOT NULL UNIQUE CHECK(achievement_level IN ('excellent', 'good', 'participated')),
      multiplier REAL NOT NULL DEFAULT 1.0,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await ensureColumnIfMissing('activity_types', 'description', 'TEXT')
  await ensureColumnIfMissing('organization_levels', 'description', 'TEXT')
  await ensureColumnIfMissing('activities', 'approval_status', "TEXT DEFAULT 'draft'")
  await ensureColumnIfMissing('activities', 'status', "TEXT DEFAULT 'draft'")
  await ensureColumnIfMissing('activities', 'organization_level_id', 'INTEGER')
  await ensureColumnIfMissing('activities', 'updated_at', 'DATETIME')
  await ensureColumnIfMissing('activity_time_slots', 'current_registered', 'INTEGER DEFAULT 0')
  await ensureColumnIfMissing('activity_time_slots', 'status', "TEXT DEFAULT 'open'")
  await ensureColumnIfMissing('suggested_bonus_points', 'apply_to', "TEXT DEFAULT 'hoc_tap'")
  await ensureColumnIfMissing('suggested_bonus_points', 'approver_id', 'INTEGER')
  await ensureColumnIfMissing('suggested_bonus_points', 'term', 'TEXT')
  await ensureColumnIfMissing('suggested_bonus_points', 'updated_at', 'TEXT')
  await ensureColumnIfMissing('notifications', 'is_read', 'INTEGER DEFAULT 0')
  await ensureColumnIfMissing('alerts', 'is_read', 'INTEGER DEFAULT 0')

  await dbRun(`
    INSERT OR IGNORE INTO achievement_multipliers (achievement_level, multiplier, description)
    VALUES
      ('excellent', 1.5, 'Tham gia xuất sắc'),
      ('good', 1.2, 'Tham gia tốt'),
      ('participated', 1.0, 'Tham gia')
  `)
}

async function clearTableIfExists(tableName: string): Promise<void> {
  if (!await tableExists(tableName)) return
  await dbRun(`DELETE FROM ${tableName}`)
  try {
    await dbRun('DELETE FROM sqlite_sequence WHERE name = ?', [tableName])
  } catch {
  }
}

async function clearData() {
  console.log('🧹 Đang xóa dữ liệu cũ...')

  const tablesToClear = [
    'attendance_records',
    'qr_sessions',
    'activity_approvals',
    'activity_classes',
    'point_calculations',
    'student_scores',
    'participations',
    'activity_time_slots',
    'suggested_bonus_points',
    'achievements',
    'role_assignments',
    'grades',
    'conduct_scores',
    'rules',
    'subjects',
    'notifications',
    'alerts',
    'audit_logs',
    'devices',
    'activities',
    'classes',
    'departments',
    'security_question_attempts',
    'webauthn_credentials'
  ]

  for (const tableName of tablesToClear) {
    await clearTableIfExists(tableName)
  }

  if (await tableExists('users')) {
    await dbRun('DELETE FROM users WHERE role IN ("admin", "teacher", "student")')
    try {
      await dbRun("DELETE FROM sqlite_sequence WHERE name = 'users'")
    } catch {
    }
  }

  console.log('✅ Đã xóa dữ liệu cũ')
}

async function seedDemo(): Promise<void> {
  console.log('🎯 Đang tạo dữ liệu demo...')

  const adminHash = bcrypt.hashSync('admin123', 12)
  const teacherHash = bcrypt.hashSync('teacher123', 12)
  const studentHash = bcrypt.hashSync('student123', 12)

  const adminAnndHash = bcrypt.hashSync(demoData.admin.password, 12)

  const adminProfile = {
    ...staffAddressFromIndex(1),
    phone: phoneFromIndex(9001),
    gender: 'nam' as const,
    date_of_birth: '1985-01-01',
    citizen_id: citizenIdFromIndex(9001),
    avatar_url: avatarUrlFromSeed('admin')
  }

  // 0. Create admin (phục vụ E2E)
  await dbRun(
    `INSERT OR IGNORE INTO users (
      email, username, password_hash, name, role,
      phone, gender, date_of_birth, citizen_id,
      province, district, ward, address_detail, address,
      avatar_url,
      code, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      'admin@school.edu',
      'admin',
      adminHash,
      'Admin Test',
      'admin',
      adminProfile.phone,
      adminProfile.gender,
      adminProfile.date_of_birth,
      adminProfile.citizen_id,
      adminProfile.province,
      adminProfile.district,
      adminProfile.ward,
      adminProfile.address_detail,
      adminProfile.address,
      adminProfile.avatar_url,
      'AD2025001'
    ]
  )

  // 0b. Create ANND admin (demo)
  await dbRun(
    `INSERT OR IGNORE INTO users (
      email, username, password_hash, name, role,
      phone, gender, date_of_birth, citizen_id,
      province, district, ward, address_detail, address,
      avatar_url,
      code, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      demoData.admin.email,
      'admin_annd',
      adminAnndHash,
      demoData.admin.name,
      'admin',
      phoneFromIndex(9002),
      'nữ',
      '1987-03-12',
      citizenIdFromIndex(9002),
      adminProfile.province,
      adminProfile.district,
      adminProfile.ward,
      'Học viện ANND - Phòng 102',
      buildAddress(adminProfile.province, adminProfile.district, adminProfile.ward, 'Học viện ANND - Phòng 102'),
      avatarUrlFromSeed('admin_annd'),
      'AD2025002'
    ]
  )

  // 1. Create managers
  const managerIds: number[] = []
  for (const manager of demoData.classManagers) {
    const username = usernameFromEmail(manager.email)
    const code = `GV2025${String(managerIds.length + 1).padStart(3, '0')}`
    const staffAddr = staffAddressFromIndex(200 + managerIds.length)
    const result = await dbRun(
      `INSERT INTO users (
        email, username, password_hash, name, role,
        phone, gender, date_of_birth, citizen_id,
        province, district, ward, address_detail, address,
        avatar_url,
        teacher_rank, academic_title, academic_degree,
        code, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        manager.email,
        username,
        teacherHash,
        manager.name,
        'teacher',
        phoneFromIndex(5000 + managerIds.length),
        manager.name.includes('Thị') ? 'nữ' : 'nam',
        '1980-01-01',
        citizenIdFromIndex(5000 + managerIds.length),
        staffAddr.province,
        staffAddr.district,
        staffAddr.ward,
        staffAddr.address_detail,
        staffAddr.address,
        avatarUrlFromSeed(username),
        'Cán bộ',
        'ThS',
        'Thạc sĩ',
        code
      ]
    )
    managerIds.push(result.lastID)
  }
  console.log(`   ✅ Tạo ${demoData.classManagers.length} cán bộ quản lý`)

  // 1c. Create teachers (demo)
  for (let i = 0; i < demoData.teachers.length; i++) {
    const t = demoData.teachers[i]
    const username = usernameFromEmail(t.email)
    const code = `GV2025${String(100 + i).padStart(3, '0')}`
    const staffAddr = staffAddressFromIndex(300 + i)

    const ranks = ['Giảng viên', 'Trợ giảng', 'Cán bộ', 'Giáo viên']
    const titles = ['CN', 'ThS', 'TS', 'PGS.TS']
    const degrees = ['Cử nhân', 'Thạc sĩ', 'Tiến sĩ']
    const teacher_rank = ranks[i % ranks.length]
    const academic_title = titles[i % titles.length]
    const academic_degree = degrees[i % degrees.length]

    await dbRun(
      `INSERT OR IGNORE INTO users (
        email, username, password_hash, name, role,
        phone, gender, date_of_birth, citizen_id,
        province, district, ward, address_detail, address,
        avatar_url,
        teacher_rank, academic_title, academic_degree,
        code, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        t.email,
        username,
        teacherHash,
        t.name,
        'teacher',
        phoneFromIndex(500 + i),
        t.name.includes('Thị') ? 'nữ' : 'nam',
        '1982-06-10',
        citizenIdFromIndex(600 + i),
        staffAddr.province,
        staffAddr.district,
        staffAddr.ward,
        staffAddr.address_detail,
        staffAddr.address,
        avatarUrlFromSeed(username),
        teacher_rank,
        academic_title,
        academic_degree,
        code
      ]
    )
  }

  // 1d. Create extra teachers for pagination testing
  // This ensures /admin/teachers has enough rows to test paging + bulk actions.
  const extraTeacherCount = 60
  for (let i = 0; i < extraTeacherCount; i++) {
    const email = `gvx${String(i + 1).padStart(4, '0')}@annd.edu.vn`
    const username = usernameFromEmail(email)
    const code = `GV2025${String(200 + i).padStart(3, '0')}`
    const staffAddr = staffAddressFromIndex(800 + i)

    const ranks = ['Giảng viên', 'Trợ giảng', 'Cán bộ', 'Giáo viên']
    const titles = ['CN', 'ThS', 'TS', 'PGS.TS']
    const degrees = ['Cử nhân', 'Thạc sĩ', 'Tiến sĩ']
    const teacher_rank = ranks[i % ranks.length]
    const academic_title = titles[i % titles.length]
    const academic_degree = degrees[i % degrees.length]

    await dbRun(
      `INSERT OR IGNORE INTO users (
        email, username, password_hash, name, role,
        phone, gender, date_of_birth, citizen_id,
        province, district, ward, address_detail, address,
        avatar_url,
        teacher_rank, academic_title, academic_degree,
        code, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        email,
        username,
        teacherHash,
        `Giảng viên bổ sung ${i + 1}`,
        'teacher',
        phoneFromIndex(7000 + i),
        i % 2 === 0 ? 'nam' : 'nữ',
        '1984-01-01',
        citizenIdFromIndex(7000 + i),
        staffAddr.province,
        staffAddr.district,
        staffAddr.ward,
        staffAddr.address_detail,
        staffAddr.address,
        avatarUrlFromSeed(username),
        teacher_rank,
        academic_title,
        academic_degree,
        code
      ]
    )
  }

  // 1b. Create specific teachers used by E2E
  await dbRun(
    `INSERT OR IGNORE INTO users (
      email, username, password_hash, name, role,
      phone, gender, date_of_birth, citizen_id,
      province, district, ward, address_detail, address,
      avatar_url,
      teacher_rank, academic_title, academic_degree,
      code, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      'nguyen.van.tuan@school.edu',
      usernameFromEmail('nguyen.van.tuan@school.edu'),
      teacherHash,
      'Thầy Nguyễn Văn Tuấn',
      'teacher',
      phoneFromIndex(5988),
      'nam',
      '1981-09-09',
      citizenIdFromIndex(5988),
      staffAddressFromIndex(5988).province,
      staffAddressFromIndex(5988).district,
      staffAddressFromIndex(5988).ward,
      staffAddressFromIndex(5988).address_detail,
      staffAddressFromIndex(5988).address,
      avatarUrlFromSeed(usernameFromEmail('nguyen.van.tuan@school.edu')),
      'Giảng viên',
      'ThS',
      'Thạc sĩ',
      'GV2025988'
    ]
  )
  await dbRun(
    `INSERT OR IGNORE INTO users (
      email, username, password_hash, name, role,
      phone, gender, date_of_birth, citizen_id,
      province, district, ward, address_detail, address,
      avatar_url,
      teacher_rank, academic_title, academic_degree,
      code, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      'tran.minh.hung@school.edu',
      usernameFromEmail('tran.minh.hung@school.edu'),
      teacherHash,
      'Thầy Trần Minh Hùng',
      'teacher',
      phoneFromIndex(5989),
      'nam',
      '1983-11-11',
      citizenIdFromIndex(5989),
      staffAddressFromIndex(5989).province,
      staffAddressFromIndex(5989).district,
      staffAddressFromIndex(5989).ward,
      staffAddressFromIndex(5989).address_detail,
      staffAddressFromIndex(5989).address,
      avatarUrlFromSeed(usernameFromEmail('tran.minh.hung@school.edu')),
      'Giảng viên',
      'TS',
      'Tiến sĩ',
      'GV2025989'
    ]
  )

  // 2. Create classes
  const classIds: number[] = []
  for (const cls of demoData.classes) {
    const result = await dbRun(
      'INSERT INTO classes (name, grade, teacher_id, description) VALUES (?, ?, ?, ?)',
      [cls.name, cls.grade, managerIds[cls.managerIndex], cls.description]
    )
    classIds.push(result.lastID)
  }
  console.log(`   ✅ Tạo ${demoData.classes.length} lớp học`)

  // Assign some teachers as primary teachers for classes (for teaching_class_name display)
  try {
    const teacherRows = await dbAll(
      `SELECT id FROM users WHERE role = 'teacher' ORDER BY created_at DESC, id DESC LIMIT ?`,
      [classIds.length]
    ) as Array<{ id: number }>
    for (let i = 0; i < classIds.length; i++) {
      const teacherId = teacherRows[i]?.id
      if (!teacherId) continue
      const classId = classIds[i]
      await dbRun('UPDATE classes SET teacher_id = ? WHERE id = ?', [teacherId, classId])
      await dbRun(
        "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
        [classId, teacherId]
      )
    }
  } catch (e) {
    console.warn('⚠️  Could not assign teachers to classes (non-fatal):', e)
  }

  // 3. Create students
  const studentIds: number[] = []
  for (let i = 0; i < demoData.students.length; i++) {
    const student = demoData.students[i]
    const username = usernameFromEmail(student.email)
    const code = `SV2025${String(i + 1).padStart(6, '0')}`
    const studentAddr = studentAddressFromIndex(i)
    const result = await dbRun(
      `INSERT INTO users (
        email, username, password_hash, name, role, class_id,
        phone, gender, date_of_birth, citizen_id,
        province, district, ward, address_detail,
        address,
        student_id,
        student_code, code, avatar_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.email,
        username,
        studentHash,
        student.name,
        'student',
        classIds[student.classIndex],
        phoneFromIndex(i + 1),
        normalizeGender(student.gender) || null,
        student.date_of_birth || null,
        student.citizen_id || citizenIdFromIndex(i + 1),
        studentAddr.province,
        studentAddr.district,
        studentAddr.ward,
        studentAddr.address_detail,
        studentAddr.address,
        code,
        code,
        code,
        avatarUrlFromSeed(username),
        1
      ]
    )
    studentIds.push(result.lastID)
  }

  const ensureStudentCount = async (requiredCount: number) => {
    if (!Number.isFinite(requiredCount) || requiredCount <= studentIds.length) return

    const extras = requiredCount - studentIds.length
    console.log(`   ℹ️ Bổ sung ${extras} học sinh để khớp data (max index = ${requiredCount - 1})`)

    for (let i = studentIds.length; i < requiredCount; i++) {
      const email = `svx${String(i + 1).padStart(4, '0')}@annd.edu.vn`
      const username = usernameFromEmail(email)
      const code = `SV2025${String(i + 1).padStart(6, '0')}`
      const studentAddr = studentAddressFromIndex(i)

      const result = await dbRun(
        `INSERT INTO users (
          email, username, password_hash, name, role, class_id,
          phone, gender, date_of_birth, citizen_id,
          province, district, ward, address_detail,
          address,
          student_id,
          student_code, code, avatar_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email,
          username,
          studentHash,
          `Học viên bổ sung ${i + 1}`,
          'student',
          classIds[i % classIds.length],
          phoneFromIndex(10000 + i),
          i % 2 === 0 ? 'nam' : 'nữ',
          '2004-01-01',
          citizenIdFromIndex(10000 + i),
          studentAddr.province,
          studentAddr.district,
          studentAddr.ward,
          studentAddr.address_detail,
          studentAddr.address,
          code,
          code,
          code,
          avatarUrlFromSeed(username),
          1
        ]
      )

      studentIds.push(result.lastID)
    }
  }

  // Some demo datasets reference student indexes beyond demoData.students length (e.g., participations/devices)
  const maxStudentIndexFromParticipations = (() => {
    let maxIdx = -1
    for (const p of (demoData.participations as any[])) {
      if (Array.isArray(p?.details)) {
        for (const d of (p.details as any[])) {
          const idx = typeof d?.studentIndex === 'number' ? d.studentIndex : Number(d?.studentIndex)
          if (Number.isFinite(idx)) maxIdx = Math.max(maxIdx, idx)
        }
      } else if (Array.isArray(p?.studentIndexes)) {
        for (const idxRaw of (p.studentIndexes as any[])) {
          const idx = typeof idxRaw === 'number' ? idxRaw : Number(idxRaw)
          if (Number.isFinite(idx)) maxIdx = Math.max(maxIdx, idx)
        }
      }
    }
    return maxIdx
  })()

  const maxStudentIndexFromDevices = (() => {
    let maxIdx = -1
    for (const d of (demoData.devices as any[])) {
      if (d?.studentIndex === undefined || d?.studentIndex === null) continue
      const idx = typeof d.studentIndex === 'number' ? d.studentIndex : Number(d.studentIndex)
      if (Number.isFinite(idx)) maxIdx = Math.max(maxIdx, idx)
    }
    return maxIdx
  })()

  const requiredStudents = Math.max(maxStudentIndexFromParticipations, maxStudentIndexFromDevices) + 1
  await ensureStudentCount(requiredStudents)

  console.log(`   ✅ Tạo ${studentIds.length} học sinh`)

  // 3b. Create a specific student used by E2E: sv001.12a1@school.edu
  const class12A1 = classIds[0]
  const e2eStudentAddr = studentAddressFromIndex(999)
  await dbRun(
    `INSERT OR IGNORE INTO users (
      email, username, password_hash, name, role, class_id,
      phone, gender, date_of_birth, citizen_id,
      province, district, ward, address_detail, address,
      student_id,
      student_code, code, avatar_url, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'sv001.12a1@school.edu',
      usernameFromEmail('sv001.12a1@school.edu'),
      studentHash,
      'SV 001 12A1',
      'student',
      class12A1,
      phoneFromIndex(9991),
      'nam',
      '2003-01-01',
      citizenIdFromIndex(9991),
      e2eStudentAddr.province,
      e2eStudentAddr.district,
      e2eStudentAddr.ward,
      e2eStudentAddr.address_detail,
      e2eStudentAddr.address,
      'SV2025000999',
      'SV2025000999',
      'SV2025000999',
      avatarUrlFromSeed('sv001.12a1'),
      1
    ]
  )

  // 3c. Create activity types
  const activityTypeIds: number[] = []
  for (const type of demoData.activityTypes) {
    const result = await dbRun(
      'INSERT INTO activity_types (name, base_points, color, description) VALUES (?, ?, ?, ?)',
      [type.name, type.base_points, type.color, type.description]
    )
    activityTypeIds.push(result.lastID)
  }
  console.log(`   ✅ Tạo ${demoData.activityTypes.length} loại hoạt động`)

  // 3d. Create organization levels
  const orgLevelIds: number[] = []
  for (const level of demoData.organizationLevels) {
    const result = await dbRun(
      'INSERT INTO organization_levels (name, multiplier, description) VALUES (?, ?, ?)',
      [level.name, level.multiplier, level.description]
    )
    orgLevelIds.push(result.lastID)
  }
  console.log(`   ✅ Tạo ${demoData.organizationLevels.length} cấp tổ chức`)

  // 4. Create activities
  const activityIds: number[] = []
  const now = new Date()
  for (const activity of demoData.activities) {
    const activityDateTime = new Date(now.getTime() + activity.daysFromNow * 24 * 60 * 60 * 1000)
    const classIndexesForActivity = activity.classIndexes.map(idx => classIds[idx])

    const result = await dbRun(
      `INSERT INTO activities (title, description, date_time, location, teacher_id, max_participants, status, activity_type_id, organization_level_id, base_points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.title,
        activity.description,
        activityDateTime.toISOString(),
        activity.location,
        managerIds[activity.managerIndex],
        activity.maxParticipants,
        activity.status,
        activityTypeIds[activity.activityTypeIndex],
        orgLevelIds[activity.orgLevelIndex],
        demoData.activityTypes[activity.activityTypeIndex].base_points
      ]
    )
    activityIds.push(result.lastID)

    // Map classes via junction table for normalized schema
    for (const classId of classIndexesForActivity) {
      await dbRun(
        'INSERT OR IGNORE INTO activity_classes (activity_id, class_id) VALUES (?, ?)',
        [result.lastID, classId]
      )
    }
  }
  console.log(`   ✅ Tạo ${demoData.activities.length} hoạt động`)

  // 4b. Create activity time slots
  for (const slot of demoData.activityTimeSlots) {
    const activityId = activityIds[slot.activityIndex]
    const activityDateTime = new Date(now.getTime() + demoData.activities[slot.activityIndex].daysFromNow * 24 * 60 * 60 * 1000)
    
    // Get date string (YYYY-MM-DD)
    const slotDate = activityDateTime.toISOString().split('T')[0]
    
    await dbRun(
      'INSERT INTO activity_time_slots (activity_id, slot_date, slot_start, slot_end, max_concurrent) VALUES (?, ?, ?, ?, ?)',
      [activityId, slotDate, slot.startTime, slot.endTime, slot.capacity]
    )
  }
  console.log(`   ✅ Tạo ${demoData.activityTimeSlots.length} time slots`)

  // 5. Create participations
  let totalParticipations = 0
  for (const participation of demoData.participations as any[]) {
    // Handle new format with details array
    if (Array.isArray(participation.details)) {
      for (const detail of participation.details as any[]) {
        await dbRun(
          'INSERT INTO participations (activity_id, student_id, attendance_status, achievement_level) VALUES (?, ?, ?, ?)',
          [activityIds[participation.activityIndex], studentIds[detail.studentIndex], detail.status, detail.achievement]
        )
        totalParticipations++
      }
    } else if (Array.isArray(participation.studentIndexes)) {
      // Fallback for old format (if any)
      for (const studentIndex of participation.studentIndexes as number[]) {
        await dbRun(
          'INSERT INTO participations (activity_id, student_id, attendance_status) VALUES (?, ?, ?)',
          [activityIds[participation.activityIndex], studentIds[studentIndex], participation.status]
        )
        totalParticipations++
      }
    }
  }
  console.log(`   ✅ Tạo ${totalParticipations} đăng ký tham gia`)

  // 6. Create devices
  for (const device of demoData.devices) {
    const userId = device.managerIndex !== undefined 
      ? managerIds[device.managerIndex] 
      : studentIds[device.studentIndex as number]
    await dbRun(
      'INSERT INTO devices (user_id, mac_address, device_name, approved) VALUES (?, ?, ?, ?)',
      [userId, device.mac_address, device.name, device.approved]
    )
  }
  console.log(`   ✅ Tạo ${demoData.devices.length} thiết bị`)

  // 7. Create departments
  for (const dept of demoData.departments) {
    await dbRun(
      'INSERT INTO departments (name, code, manager_id) VALUES (?, ?, ?)',
      [dept.name, dept.code, managerIds[dept.managerIndex]]
    )
  }
  console.log(`   ✅ Tạo ${demoData.departments.length} phòng ban`)

  // 8. Seed sample achievements (expanded to 40)
  const achievementIds: number[] = []
  const sampleAchievements = [
    // School level - 15 records
    { studentIndex: 0, contest_name: 'Olympic Toán Trường', level: 'school', rank: 'first', daysAgo: 30 },
    { studentIndex: 2, contest_name: 'Cuộc thi Tin học - Trường', level: 'school', rank: 'second', daysAgo: 35 },
    { studentIndex: 5, contest_name: 'Olympic Hóa học - Trường', level: 'school', rank: 'first', daysAgo: 45 },
    { studentIndex: 8, contest_name: 'Cuộc thi Văn - Trường', level: 'school', rank: 'third', daysAgo: 20 },
    { studentIndex: 10, contest_name: 'Olympic Anh văn - Trường', level: 'school', rank: 'first', daysAgo: 60 },
    { studentIndex: 15, contest_name: 'Nghiên cứu khoa học - Trường', level: 'school', rank: 'second', daysAgo: 75 },
    { studentIndex: 20, contest_name: 'Cuộc thi Lịch sử - Trường', level: 'school', rank: 'first', daysAgo: 15 },
    { studentIndex: 25, contest_name: 'Olympic Sinh học - Trường', level: 'school', rank: 'second', daysAgo: 50 },
    { studentIndex: 30, contest_name: 'Cuộc thi Địa lý - Trường', level: 'school', rank: 'first', daysAgo: 40 },
    { studentIndex: 35, contest_name: 'Olympic Vật lý - Trường', level: 'school', rank: 'second', daysAgo: 70 },
    { studentIndex: 40, contest_name: 'Cuộc thi Kỹ năng - Trường', level: 'school', rank: 'first', daysAgo: 25 },
    { studentIndex: 46, contest_name: 'Olympic Hóa - Trường 2', level: 'school', rank: 'third', daysAgo: 55 },
    { studentIndex: 50, contest_name: 'Cuộc thi Đạo đức - Trường', level: 'school', rank: 'first', daysAgo: 80 },
    { studentIndex: 60, contest_name: 'Olympic Toán 2 - Trường', level: 'school', rank: 'second', daysAgo: 90 },
    { studentIndex: 70, contest_name: 'Cuộc thi Sáng tạo - Trường', level: 'school', rank: 'first', daysAgo: 18 },
    // Provincial level - 15 records
    { studentIndex: 1, contest_name: 'Nghiên cứu khoa học - Tỉnh', level: 'provincial', rank: 'second', daysAgo: 120 },
    { studentIndex: 3, contest_name: 'Cuộc thi Tiếng Anh - Tỉnh', level: 'provincial', rank: 'first', daysAgo: 105 },
    { studentIndex: 7, contest_name: 'Olympic Toán - Tỉnh', level: 'provincial', rank: 'third', daysAgo: 150 },
    { studentIndex: 12, contest_name: 'Cuộc thi Văn học - Tỉnh', level: 'provincial', rank: 'second', daysAgo: 100 },
    { studentIndex: 18, contest_name: 'Olympic Vật lý - Tỉnh', level: 'provincial', rank: 'first', daysAgo: 140 },
    { studentIndex: 28, contest_name: 'Cuộc thi Sinh học - Tỉnh', level: 'provincial', rank: 'second', daysAgo: 125 },
    { studentIndex: 38, contest_name: 'Olympic Hóa - Tỉnh', level: 'provincial', rank: 'first', daysAgo: 110 },
    { studentIndex: 48, contest_name: 'Cuộc thi Tin học - Tỉnh', level: 'provincial', rank: 'second', daysAgo: 95 },
    { studentIndex: 58, contest_name: 'Olympic Anh - Tỉnh', level: 'provincial', rank: 'first', daysAgo: 130 },
    { studentIndex: 68, contest_name: 'Cuộc thi Địa lý - Tỉnh', level: 'provincial', rank: 'second', daysAgo: 115 },
    { studentIndex: 78, contest_name: 'Olympic Lịch sử - Tỉnh', level: 'provincial', rank: 'third', daysAgo: 160 },
    { studentIndex: 106, contest_name: 'Cuộc thi Khoa học - Tỉnh', level: 'provincial', rank: 'first', daysAgo: 135 },
    { studentIndex: 126, contest_name: 'Olympic Toán - Tỉnh 2', level: 'provincial', rank: 'second', daysAgo: 145 },
    { studentIndex: 166, contest_name: 'Cuộc thi Kỹ năng - Tỉnh', level: 'provincial', rank: 'first', daysAgo: 85 },
    { studentIndex: 226, contest_name: 'Olympic Anh 2 - Tỉnh', level: 'provincial', rank: 'second', daysAgo: 170 },
    // National level - 7 records
    { studentIndex: 4, contest_name: 'Cuộc thi văn học - Quốc gia', level: 'national', rank: 'third', daysAgo: 200 },
    { studentIndex: 11, contest_name: 'Olympic Vật lý - Quốc gia', level: 'national', rank: 'first', daysAgo: 250 },
    { studentIndex: 22, contest_name: 'Nghiên cứu khoa học - Quốc gia', level: 'national', rank: 'second', daysAgo: 300 },
    { studentIndex: 44, contest_name: 'Cuộc thi Công nghệ - Quốc gia', level: 'national', rank: 'first', daysAgo: 220 },
    { studentIndex: 99, contest_name: 'Olympic Toán - Quốc gia', level: 'national', rank: 'second', daysAgo: 280 },
    { studentIndex: 156, contest_name: 'Cuộc thi Khoa học - Quốc gia', level: 'national', rank: 'third', daysAgo: 310 },
    { studentIndex: 234, contest_name: 'Olympic Hóa - Quốc gia', level: 'national', rank: 'first', daysAgo: 290 },
    // International level - 3 records
    { studentIndex: 9, contest_name: 'Cuộc thi Công nghệ - Quốc tế', level: 'international', rank: 'third', daysAgo: 350 },
    { studentIndex: 19, contest_name: 'Olympic Toán Quốc tế', level: 'international', rank: 'second', daysAgo: 400 },
    { studentIndex: 99, contest_name: 'Hội thảo Khoa học Quốc tế', level: 'international', rank: 'first', daysAgo: 450 }
  ]

  await ensureStudentCount(Math.max(...sampleAchievements.map(a => a.studentIndex)) + 1)

  for (const a of sampleAchievements) {
    const studentId = studentIds[a.studentIndex]
    const result = await dbRun(
      'INSERT INTO achievements (student_id, contest_name, level, rank, date, evidence_url, awarded_points_suggested) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [studentId, a.contest_name, a.level, a.rank, new Date(Date.now() - a.daysAgo * 24 * 3600 * 1000).toISOString(), '', 0]
    )
    achievementIds.push(result.lastID)
  }
  console.log(`   ✅ Tạo ${achievementIds.length} achievements`)

  // 9. Seed role assignments (new) - 30 HS có vai trò lãnh đạo
  const roleIds: number[] = []
  const sampleRoles = [
    { studentIndex: 0, role_type: 'squad_leader', startOffsetDays: 60 },
    { studentIndex: 5, role_type: 'team_leader', startOffsetDays: 30 },
    { studentIndex: 10, role_type: 'squad_leader', startOffsetDays: 45 },
    { studentIndex: 15, role_type: 'team_leader', startOffsetDays: 50 },
    { studentIndex: 20, role_type: 'squad_leader', startOffsetDays: 70 },
    { studentIndex: 25, role_type: 'team_leader', startOffsetDays: 40 },
    { studentIndex: 30, role_type: 'squad_leader', startOffsetDays: 55 },
    { studentIndex: 46, role_type: 'squad_leader', startOffsetDays: 60 },
    { studentIndex: 50, role_type: 'team_leader', startOffsetDays: 35 },
    { studentIndex: 55, role_type: 'squad_leader', startOffsetDays: 65 },
    { studentIndex: 60, role_type: 'team_leader', startOffsetDays: 45 },
    { studentIndex: 65, role_type: 'squad_leader', startOffsetDays: 50 },
    { studentIndex: 70, role_type: 'team_leader', startOffsetDays: 40 },
    { studentIndex: 106, role_type: 'squad_leader', startOffsetDays: 55 },
    { studentIndex: 110, role_type: 'team_leader', startOffsetDays: 50 },
    { studentIndex: 115, role_type: 'squad_leader', startOffsetDays: 60 },
    { studentIndex: 136, role_type: 'squad_leader', startOffsetDays: 65 },
    { studentIndex: 140, role_type: 'team_leader', startOffsetDays: 45 },
    { studentIndex: 145, role_type: 'squad_leader', startOffsetDays: 55 },
    { studentIndex: 166, role_type: 'squad_leader', startOffsetDays: 50 },
    { studentIndex: 170, role_type: 'team_leader', startOffsetDays: 40 },
    { studentIndex: 175, role_type: 'squad_leader', startOffsetDays: 60 },
    { studentIndex: 196, role_type: 'squad_leader', startOffsetDays: 65 },
    { studentIndex: 200, role_type: 'team_leader', startOffsetDays: 50 },
    { studentIndex: 226, role_type: 'squad_leader', startOffsetDays: 55 },
    { studentIndex: 230, role_type: 'team_leader', startOffsetDays: 45 },
    { studentIndex: 256, role_type: 'squad_leader', startOffsetDays: 60 },
    { studentIndex: 260, role_type: 'team_leader', startOffsetDays: 40 },
    { studentIndex: 286, role_type: 'squad_leader', startOffsetDays: 70 },
    { studentIndex: 290, role_type: 'team_leader', startOffsetDays: 50 }
  ]

  await ensureStudentCount(Math.max(...sampleRoles.map(r => r.studentIndex)) + 1)

  for (const r of sampleRoles) {
    const studentId = studentIds[r.studentIndex]
    const result = await dbRun(
      'INSERT INTO role_assignments (student_id, role_type, start_date) VALUES (?, ?, ?)',
      [studentId, r.role_type, new Date(Date.now() - r.startOffsetDays * 24 * 3600 * 1000).toISOString()]
    )
    roleIds.push(result.lastID)
  }
  console.log(`   ✅ Tạo ${roleIds.length} role assignments`)

  // 10. Suggested bonus points - Thêm bonus cho achievements
  let bonusCount = 0
  
  // Tính điểm bonus dựa trên level và rank của achievement
  const bonusMapping: Record<string, Record<string, number>> = {
    school: { first: 8, second: 6, third: 4 },
    provincial: { first: 15, second: 12, third: 10 },
    national: { first: 25, second: 20, third: 15 },
    international: { first: 40, second: 35, third: 30 }
  }
  
  for (let i = 0; i < sampleAchievements.length; i++) {
    const ach = sampleAchievements[i]
    const points = bonusMapping[ach.level]?.[ach.rank] || 5
    
    // Thêm bonus points proposal
    await dbRun(
      'INSERT INTO suggested_bonus_points (student_id, source_type, source_id, points, reason, status, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        studentIds[ach.studentIndex],
        'achievement',
        achievementIds[i],
        points,
        `Đề xuất thưởng từ giải ${ach.contest_name} (${ach.level}/${ach.rank})`,
        'pending',
        managerIds[0]
      ]
    )
    bonusCount++
  }
  console.log(`   ✅ Tạo ${bonusCount} suggested bonus points`)

  await seedComprehensiveCoverage({
    managerIds,
    studentIds,
    activityIds,
    activityTypeIds,
    orgLevelIds
  })

  console.log('\n📊 Tóm tắt dữ liệu demo:')
  console.log(`   👨‍🏫 Cán bộ quản lý: ${demoData.classManagers.length}`)
  console.log(`   👨‍🎓 Học sinh: ${studentIds.length}`)
  console.log(`   🏫 Lớp học: ${demoData.classes.length}`)
  console.log(`   🎯 Hoạt động: ${demoData.activities.length}`)
  console.log(`   📱 Thiết bị: ${demoData.devices.length}`)
  console.log(`   🏢 Phòng ban: ${demoData.departments.length}`)

  // Ensure updated_at is populated for all seeded records (even when the column already exists)
  await dbRun('UPDATE users SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)')
}

async function seedComprehensiveCoverage(input: {
  managerIds: number[]
  studentIds: number[]
  activityIds: number[]
  activityTypeIds: number[]
  orgLevelIds: number[]
}): Promise<void> {
  const { managerIds, studentIds, activityIds, activityTypeIds, orgLevelIds } = input
  if (!managerIds.length || !studentIds.length || !activityIds.length) return

  const adminRow = await dbGet('SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1', ['admin']) as { id?: number } | undefined
  const adminId = adminRow?.id || managerIds[0]
  const reviewerId = managerIds[1] || managerIds[0]

  const requestedActivityId = activityIds[0]
  const approvedActivityId = activityIds[2] || activityIds[1] || activityIds[0]
  const rejectedActivityId = activityIds[4] || activityIds[3] || activityIds[0]

  await dbRun('UPDATE activities SET approval_status = ?, status = ? WHERE id = ?', ['requested', 'draft', requestedActivityId])
  await dbRun('UPDATE activities SET approval_status = ?, status = ? WHERE id = ?', ['approved', 'published', approvedActivityId])
  await dbRun('UPDATE activities SET approval_status = ?, status = ? WHERE id = ?', ['rejected', 'draft', rejectedActivityId])

  const now = Date.now()
  const requestedAt = new Date(now - 4 * 3600 * 1000).toISOString()
  const decidedAt1 = new Date(now - 2 * 3600 * 1000).toISOString()
  const decidedAt2 = new Date(now - 90 * 60 * 1000).toISOString()

  await dbRun(
    'INSERT INTO activity_approvals (activity_id, requested_by, status, note, requested_at) VALUES (?, ?, ?, ?, ?)',
    [requestedActivityId, managerIds[0], 'requested', 'Chờ admin duyệt', requestedAt]
  )
  await dbRun(
    'INSERT INTO activity_approvals (activity_id, requested_by, approver_id, status, note, requested_at, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [approvedActivityId, managerIds[0], adminId, 'approved', 'Đã duyệt', requestedAt, decidedAt1]
  )
  await dbRun(
    'INSERT INTO activity_approvals (activity_id, requested_by, approver_id, status, note, requested_at, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [rejectedActivityId, managerIds[2] || managerIds[0], reviewerId, 'rejected', 'Thiếu minh chứng', requestedAt, decidedAt2]
  )

  const activeExpires = new Date(now + 60 * 60 * 1000).toISOString()
  const expiredAt = new Date(now - 60 * 60 * 1000).toISOString()

  const activeSession = await dbRun(
    'INSERT INTO qr_sessions (activity_id, creator_id, session_token, expires_at, metadata, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [approvedActivityId, managerIds[0], `qa-active-${now}`, activeExpires, JSON.stringify({ single_use: false, max_scans: 300 }), 1]
  )

  await dbRun(
    'INSERT INTO qr_sessions (activity_id, creator_id, session_token, expires_at, metadata, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [requestedActivityId, managerIds[0], `qa-expired-${now}`, expiredAt, '{invalid-json', 0]
  )

  const attendanceTargets = await dbAll(
    'SELECT id, student_id, activity_id FROM participations WHERE activity_id = ? ORDER BY id LIMIT 8',
    [approvedActivityId]
  ) as Array<{ id: number; student_id: number; activity_id: number }>

  const attendanceStatuses = ['present', 'present', 'late', 'excused', 'absent', 'present', 'late', 'present']
  for (let i = 0; i < attendanceTargets.length; i++) {
    const row = attendanceTargets[i]
    await dbRun(
      'INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, status, location, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [activeSession.lastID, row.activity_id, row.student_id, managerIds[0], 'qr', attendanceStatuses[i] || 'present', 'Khu A', 'QA seeded attendance']
    )
  }

  const scoredParticipations = await dbAll(
    "SELECT id, student_id, activity_id, COALESCE(achievement_level, 'participated') as achievement_level FROM participations WHERE attendance_status = 'attended' ORDER BY id LIMIT 36"
  ) as Array<{ id: number; student_id: number; activity_id: number; achievement_level: string }>

  for (let i = 0; i < scoredParticipations.length; i++) {
    const row = scoredParticipations[i]
    const basePoints = 10
    const typeMultiplier = 1
    const levelMultiplier = 1
    const achievementMultiplier = row.achievement_level === 'excellent' ? 1.5 : row.achievement_level === 'good' ? 1.2 : 1.0
    const subtotal = Math.round(basePoints * typeMultiplier * levelMultiplier * achievementMultiplier * 100) / 100
    const bonusPoints = i % 6 === 0 ? 2 : 0
    const penaltyPoints = i % 11 === 0 ? 1 : 0
    const totalPoints = Math.max(0, Math.round((subtotal + bonusPoints - penaltyPoints) * 100) / 100)
    const formula = `(${basePoints} × ${typeMultiplier} × ${levelMultiplier} × ${achievementMultiplier}) + ${bonusPoints} - ${penaltyPoints} = ${totalPoints}`

    await dbRun(
      'INSERT INTO student_scores (student_id, activity_id, points, source, calculated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))',
      [row.student_id, row.activity_id, Math.round(totalPoints), 'participation']
    )

    await dbRun(
      `INSERT INTO point_calculations (
        participation_id, base_points, type_multiplier, level_multiplier,
        achievement_multiplier, subtotal, bonus_points, penalty_points, total_points, formula
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.id, basePoints, typeMultiplier, levelMultiplier, achievementMultiplier, subtotal, bonusPoints, penaltyPoints, totalPoints, formula]
    )
  }

  const slotRows = await dbAll('SELECT id FROM activity_time_slots ORDER BY id LIMIT 2') as Array<{ id: number }>
  if (slotRows.length > 0) {
    const fullSlotId = slotRows[0].id
    await dbRun('UPDATE activity_time_slots SET max_concurrent = ?, current_registered = ?, status = ? WHERE id = ?', [5, 0, 'open', fullSlotId])
    const fillRows = await dbAll('SELECT id FROM participations WHERE time_slot_id IS NULL ORDER BY id LIMIT 5') as Array<{ id: number }>
    for (const row of fillRows) {
      await dbRun('UPDATE participations SET time_slot_id = ? WHERE id = ?', [fullSlotId, row.id])
    }
    await dbRun('UPDATE activity_time_slots SET current_registered = ?, status = ? WHERE id = ?', [fillRows.length, 'full', fullSlotId])
  }

  if (slotRows.length > 1) {
    const openSlotId = slotRows[1].id
    await dbRun('UPDATE activity_time_slots SET max_concurrent = ?, current_registered = ?, status = ? WHERE id = ?', [20, 0, 'open', openSlotId])
    const openRows = await dbAll('SELECT id FROM participations WHERE time_slot_id IS NULL ORDER BY id LIMIT 3') as Array<{ id: number }>
    for (const row of openRows) {
      await dbRun('UPDATE participations SET time_slot_id = ? WHERE id = ?', [openSlotId, row.id])
    }
    await dbRun('UPDATE activity_time_slots SET current_registered = ?, status = ? WHERE id = ?', [openRows.length, 'open', openSlotId])
  }

  await dbRun(`
    INSERT OR IGNORE INTO subjects (code, name, credits)
    VALUES
      ('MATH101', 'Giải tích', 3),
      ('LAW102', 'Pháp luật đại cương', 2),
      ('IT103', 'Tin học ứng dụng', 3),
      ('POL104', 'Lý luận chính trị', 2)
  `)

  const subjectRows = await dbAll('SELECT id, COALESCE(credits, 3) as credits FROM subjects ORDER BY id LIMIT 4') as Array<{ id: number; credits: number }>
  const terms = ['2025-HK1', '2025-HK2']
  const sampledStudents = studentIds.slice(0, Math.min(16, studentIds.length))

  for (let i = 0; i < sampledStudents.length; i++) {
    for (let termIndex = 0; termIndex < terms.length; termIndex++) {
      const subject = subjectRows[(i + termIndex) % subjectRows.length]
      const finalScore = Math.max(45, Math.min(98, 60 + ((i * 7 + termIndex * 5) % 38)))
      const components = {
        midterm: Math.max(40, finalScore - 8),
        final: finalScore,
        assignment: Math.max(40, finalScore - 5)
      }
      const gpaContrib = finalScore * (Number(subject?.credits) || 3)

      await dbRun(
        'INSERT INTO grades (student_id, subject_id, term, components_json, final_score, gpa_contrib, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
        [sampledStudents[i], subject.id, terms[termIndex], JSON.stringify(components), finalScore, gpaContrib]
      )

      const finalConductScore = Math.max(40, Math.min(98, 55 + ((i * 9 + termIndex * 6) % 43)))
      await dbRun(
        'INSERT OR REPLACE INTO conduct_scores (student_id, term, daily_score, weekly_score, final_conduct_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
        [sampledStudents[i], terms[termIndex], finalConductScore - 5, finalConductScore - 2, finalConductScore]
      )
    }
  }

  const rules = [
    {
      code: 'QA_GPA_85',
      name: 'Thưởng GPA từ 85',
      description: 'Thưởng tự động cho học tập tốt',
      applies_to: 'hoc_tap',
      trigger_type: 'grade',
      criteria_json: JSON.stringify({ gpa_gte: 85 }),
      points: 8,
      cap_per_term: 30,
      cap_per_year: 60,
      auto_apply: 1,
      requires_approval: 0
    },
    {
      code: 'QA_CONDUCT_90',
      name: 'Thưởng rèn luyện từ 90',
      description: 'Thưởng rèn luyện cao',
      applies_to: 'ren_luyen',
      trigger_type: 'conduct',
      criteria_json: JSON.stringify({ conduct_gte: 90 }),
      points: 6,
      cap_per_term: 20,
      cap_per_year: 40,
      auto_apply: 1,
      requires_approval: 0
    },
    {
      code: 'QA_CONDUCT_LOW',
      name: 'Cảnh báo rèn luyện thấp',
      description: 'Điểm trừ khi rèn luyện thấp',
      applies_to: 'ren_luyen',
      trigger_type: 'conduct',
      criteria_json: JSON.stringify({ conduct_lte: 55 }),
      points: -4,
      cap_per_term: 10,
      cap_per_year: 20,
      auto_apply: 0,
      requires_approval: 1
    },
    {
      code: 'QA_ACTIVITY_MATCH',
      name: 'Thưởng hoạt động theo loại/cấp',
      description: 'Match theo activity_type + level',
      applies_to: 'hoc_tap',
      trigger_type: 'activity',
      criteria_json: JSON.stringify({ activity_type: activityTypeIds[0] || 1, level: orgLevelIds[0] || 1 }),
      points: 5,
      cap_per_term: 20,
      cap_per_year: 40,
      auto_apply: 0,
      requires_approval: 1
    }
  ]

  for (const rule of rules) {
    await dbRun(
      `INSERT OR IGNORE INTO rules (
        code, name, description, applies_to, trigger_type, criteria_json,
        points, cap_per_term, cap_per_year, auto_apply, requires_approval,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        rule.code,
        rule.name,
        rule.description,
        rule.applies_to,
        rule.trigger_type,
        rule.criteria_json,
        rule.points,
        rule.cap_per_term,
        rule.cap_per_year,
        rule.auto_apply,
        rule.requires_approval
      ]
    )
  }

  await dbRun(
    "UPDATE suggested_bonus_points SET status = 'approved', approver_id = ?, apply_to = 'hoc_tap', term = '2025-HK1', updated_at = datetime('now') WHERE id IN (SELECT id FROM suggested_bonus_points ORDER BY id LIMIT 12)",
    [adminId]
  )

  await dbRun(
    "UPDATE suggested_bonus_points SET status = 'rejected', approver_id = ?, apply_to = 'ren_luyen', term = '2025-HK1', updated_at = datetime('now') WHERE id IN (SELECT id FROM suggested_bonus_points WHERE status = 'pending' ORDER BY id LIMIT 8)",
    [reviewerId]
  )

  const noticeTargets = studentIds.slice(0, 3)
  for (let i = 0; i < noticeTargets.length; i++) {
    await dbRun(
      'INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [
        noticeTargets[i],
        i === 0 ? 'warning' : 'info',
        i === 0 ? 'Thiếu điểm danh' : 'Thông báo hệ thống',
        i === 0 ? 'Bạn có buổi điểm danh cần xác nhận' : 'Dữ liệu QA đã được seed',
        'activities',
        approvedActivityId,
        i === 0 ? 0 : 1
      ]
    )
  }

  await dbRun(
    'INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['warning', 'QA: Có hoạt động chờ phê duyệt', 'activities', requestedActivityId, 0]
  )

  await dbRun(
    'INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    ['error', 'QA: Có đề xuất bonus bị từ chối', 'suggested_bonus_points', 1, 0]
  )

  await dbRun(
    'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    [adminId, 'qa_seed_activity_approval', 'activities', approvedActivityId, JSON.stringify({ seeded: true })]
  )

  await dbRun(
    'INSERT OR IGNORE INTO devices (user_id, mac_address, device_name, approved) VALUES (?, ?, ?, ?)',
    [studentIds[1], 'AA:BB:CC:DD:EE:99', 'QA Device Pending', 0]
  )

  await dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [studentIds[studentIds.length - 1]])

  const approvalCount = await dbGet('SELECT COUNT(*) as count FROM activity_approvals') as { count?: number } | undefined
  const qrCount = await dbGet('SELECT COUNT(*) as count FROM qr_sessions') as { count?: number } | undefined
  const scoreCount = await dbGet('SELECT COUNT(*) as count FROM student_scores') as { count?: number } | undefined
  const gradeCount = await dbGet('SELECT COUNT(*) as count FROM grades') as { count?: number } | undefined
  const ruleCount = await dbGet('SELECT COUNT(*) as count FROM rules') as { count?: number } | undefined

  console.log(`   ✅ QA coverage: approvals=${approvalCount?.count || 0}, qr_sessions=${qrCount?.count || 0}, student_scores=${scoreCount?.count || 0}, grades=${gradeCount?.count || 0}, rules=${ruleCount?.count || 0}`)
}

async function seedMinimal(): Promise<void> {
  console.log('🎯 Đang tạo dữ liệu minimal (admin only)...')
  
  const passwordHash = bcrypt.hashSync('admin123', 12)
  const profile = {
    ...staffAddressFromIndex(2),
    phone: phoneFromIndex(9003),
    gender: 'nam' as const,
    date_of_birth: '1985-01-01',
    citizen_id: citizenIdFromIndex(9003),
    avatar_url: avatarUrlFromSeed('admin')
  }
  await dbRun(
    `INSERT INTO users (
      email, username, password_hash, name, role,
      phone, gender, date_of_birth, citizen_id,
      province, district, ward, address_detail, address,
      avatar_url,
      code, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      'admin@school.edu',
      'admin',
      passwordHash,
      'Admin Test',
      'admin',
      profile.phone,
      profile.gender,
      profile.date_of_birth,
      profile.citizen_id,
      profile.province,
      profile.district,
      profile.ward,
      profile.address_detail,
      profile.address,
      profile.avatar_url,
      'AD2025001'
    ]
  )

  await dbRun('UPDATE users SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)')
  
  console.log('   ✅ Tạo 1 admin: admin@school.edu / admin123')
}

async function seedEnhanced(): Promise<void> {
  console.log('🎯 Đang tạo dữ liệu enhanced (nhiều data hơn)...')
  
  // First seed demo data
  await seedDemo()
  
  // Then add more students, activities, etc.
  const passwordHash = bcrypt.hashSync('password123', 12)
  
  // Add 10 more students to an existing class (pick the first one from demo seed)
  const targetClass = await dbGet('SELECT id, name FROM classes ORDER BY id LIMIT 1') as { id?: number; name?: string } | undefined
  if (!targetClass?.id) throw new Error('seedEnhanced: No classes found to attach students')
  for (let i = 26; i <= 35; i++) {
    const email = `student.${String(i).padStart(3, '0')}@school.edu`
    const username = usernameFromEmail(email)
    const code = `SV2025${String(i).padStart(6, '0')}`
    const addr = studentAddressFromIndex(i)
    const gender = i % 2 === 0 ? 'nam' : 'nữ'
    await dbRun(
      `INSERT INTO users (
        email, username, password_hash, name, role, class_id,
        phone, gender, date_of_birth, citizen_id,
        province, district, ward, address_detail, address,
        student_id,
        student_code, code, avatar_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        username,
        passwordHash,
        `Học sinh ${i}`,
        'student',
        targetClass.id,
        phoneFromIndex(2000 + i),
        gender,
        '2004-01-01',
        citizenIdFromIndex(2000 + i),
        addr.province,
        addr.district,
        addr.ward,
        addr.address_detail,
        addr.address,
        code,
        code,
        code,
        avatarUrlFromSeed(username),
        1
      ]
    )
  }
  
  console.log(`   ✅ Thêm 10 học sinh vào lớp ${targetClass.name || targetClass.id}`)
  await dbRun('UPDATE users SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)')
  console.log('\n✅ Enhanced data seeded!')
}

// =============================================================================
// CLI MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  const modeArg = args.find(arg => arg.startsWith('--mode='))
  const mode = modeArg ? modeArg.split('=')[1] : 'demo'

  console.log(`\n🌱 UniAct - Unified Data Seeder`)
  console.log(`📝 Mode: ${mode}\n`)

  // Ensure optional SQL migration file for bonus tables is applied (if present)
  try {
    const bonusSqlPath = path.join(process.cwd(), 'migrations', '20251214_add_bonus_tables.sql')
    if (fs.existsSync(bonusSqlPath)) {
      const sql = fs.readFileSync(bonusSqlPath, 'utf8')
      console.log('🔧 Applying SQL migration for bonus tables...')
      await dbExec(sql)
      console.log('✅ Applied bonus tables SQL (idempotent)')
    }
  } catch (err) {
    console.warn('⚠️ Không thể apply bonus SQL automatically:', err)
  }

  try {
    await ensureUserSeedColumns().catch(() => {})
    await ensureCaseCoverageTables().catch(() => {})

    switch (mode) {
      case 'reset':
      case 'qa':
        await clearData()
        await seedDemo()
        break

      case 'demo': {
        const userCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE role IN ("teacher", "student")') as { count?: number }
        if ((userCount?.count || 0) > 0) {
          console.log('⚠️  Dữ liệu đã tồn tại!')
          console.log('💡 Dùng --mode=reset hoặc --mode=qa để xóa và tạo lại full data')
          break
        }
        await seedDemo()
        break
      }

      case 'minimal':
        await clearData()
        await seedMinimal()
        break

      case 'enhanced':
        await clearData()
        await seedEnhanced()
        break

      default:
        console.error(`❌ Mode không hợp lệ: ${mode}`)
        console.log('✅ Các mode hợp lệ: reset, demo, minimal, enhanced, qa')
        process.exit(1)
    }

    console.log('\n✅ Seeding hoàn tất!')
    console.log('🎯 Khởi động lại dev server: npm run dev\n')
    
  } catch (error) {
    console.error('\n❌ Lỗi seeding:', error)
    process.exit(1)
  } finally {
    db.close()
    process.exit(0)
  }
}

// Run
main()
