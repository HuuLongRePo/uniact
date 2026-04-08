/**
 * Database Admin & Setup Module
 * - Admin user creation & security
 * - Default data initialization
 */

import bcrypt from 'bcryptjs';
import { db, dbGet, dbRun, dbAll } from './db-core';

/**
 * 🔐 SECURITY: Gets or creates admin user
 * In production, MUST change password immediately after first login
 * Set ADMIN_PASSWORD env var to override default (set ADMIN_EMAIL too)
 */
export async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.edu';
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'CRITICAL: ADMIN_PASSWORD must be set via environment variable in production'
        );
      }
      console.warn('⚠️  WARNING: Using default admin password. Set ADMIN_PASSWORD env var!');
      return 'admin123'; // Development only!
    })();

  const adminCheck = (await dbGet('SELECT COUNT(*) as count FROM users WHERE role = "admin"')) as {
    count: number;
  };
  if (adminCheck.count === 0) {
    const rounds = process.env.NODE_ENV === 'test' ? 4 : 12;
    const passwordHash = bcrypt.hashSync(adminPassword, rounds);
    await dbRun('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, "admin")', [
      adminEmail,
      passwordHash,
      'Quản Trị Viên',
    ]);
    console.warn(`👑 Created admin user: ${adminEmail}`);
    console.warn(
      `⚠️  SECURITY: Admin password is set to: "${adminPassword}". Change it immediately!`
    );
  }
}

export async function insertDefaultData(): Promise<void> {
  // Verify activity_types table exists before inserting default data
  try {
    console.warn('🔍 Checking if activity_types table exists...');
    const tableCheck = await dbGet(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='activity_types'"
    );
    if (!tableCheck) {
      console.warn('⚠️  activity_types table not found! Skipping default data insertion');
      console.warn(
        '   Available tables:',
        await dbAll("SELECT name FROM sqlite_master WHERE type='table'")
      );
      return;
    }
    console.warn('✅ activity_types table found, proceeding with data insertion');
  } catch (err) {
    console.warn('⚠️  Could not verify activity_types table:', err);
    return; // Skip on error to not crash
  }

  const batchSQL = `
    INSERT OR IGNORE INTO activity_types (name, base_points, color) VALUES
      ('Học thuật',10,'#EF4444'),
      ('Thể thao',8,'#10B981'),
      ('Văn nghệ',7,'#8B5CF6'),
      ('Thiện nguyện',9,'#F59E0B'),
      ('Kỹ năng',6,'#06B6D4'),
      ('Chính trị',10,'#DC2626'),
      ('Văn hóa',7,'#7C3AED'),
      ('Khác',5,'#6B7280');
    INSERT OR IGNORE INTO organization_levels (name, multiplier) VALUES
      ('Cấp Lớp',1.0),
      ('Cấp Khoa',1.4),
      ('Cấp Trường',2.0),
      ('Cấp Bộ',2.5),
      ('Liên kết',1.2);
    INSERT OR IGNORE INTO system_config (config_key, config_value, data_type, category, description) VALUES
      ('qr_expiration_time','5','number','attendance','Thời gian hết hạn QR code (phút)'),
      ('gps_radius','100','number','attendance','Bán kính điểm danh GPS (mét)'),
      ('point_formula','Base × Coefficient + Bonus - Penalty','string','scoring','Công thức tính điểm'),
      ('warning_green_min','80','number','warning','Ngưỡng cảnh báo Xanh'),
      ('warning_yellow_min','60','number','warning','Ngưỡng cảnh báo Vàng'),
      ('warning_orange_min','40','number','warning','Ngưỡng cảnh báo Cam'),
      ('academic_year','2024-2025','string','system','Năm học hiện tại');
  `;
  await new Promise<void>((resolve, reject) => {
    db.exec(batchSQL, (err: Error | null) => (err ? reject(err) : resolve()));
  });
}
