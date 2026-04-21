import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';

// GET /api/notifications/settings - Lấy cài đặt thông báo
export const GET = apiHandler(async (request: NextRequest) => {
  const token = request.cookies.get('token')?.value;
  if (!token) throw ApiError.unauthorized('Chưa đăng nhập');

  const user = await getUserFromToken(token);
  if (!user) throw ApiError.unauthorized('Chưa đăng nhập');

  // Ensure table exists
  await dbRun(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        email_enabled INTEGER DEFAULT 1,
        new_activity_enabled INTEGER DEFAULT 1,
        reminder_enabled INTEGER DEFAULT 1,
        reminder_days INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

  // Get or create settings
  let settings = await dbGet('SELECT * FROM notification_settings WHERE user_id = ?', [user.id]);

  if (!settings) {
    // Create default settings
    await dbRun(
      `INSERT INTO notification_settings (user_id, email_enabled, new_activity_enabled, reminder_enabled, reminder_days)
         VALUES (?, 1, 1, 1, 1)`,
      [user.id]
    );
    settings = await dbGet('SELECT * FROM notification_settings WHERE user_id = ?', [user.id]);
  }

  return successResponse({ settings });
});

// PUT /api/notifications/settings - Cập nhật cài đặt
export const PUT = apiHandler(async (request: NextRequest) => {
  const token = request.cookies.get('token')?.value;
  if (!token) throw ApiError.unauthorized('Chưa đăng nhập');

  const user = await getUserFromToken(token);
  if (!user) throw ApiError.unauthorized('Chưa đăng nhập');

  const { email_enabled, new_activity_enabled, reminder_enabled, reminder_days } =
    await request.json();

  // Ensure table exists
  await dbRun(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        email_enabled INTEGER DEFAULT 1,
        new_activity_enabled INTEGER DEFAULT 1,
        reminder_enabled INTEGER DEFAULT 1,
        reminder_days INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

  // Check if settings exist
  const existing = await dbGet('SELECT * FROM notification_settings WHERE user_id = ?', [user.id]);

  if (!existing) {
    // Create
    await dbRun(
      `INSERT INTO notification_settings (user_id, email_enabled, new_activity_enabled, reminder_enabled, reminder_days)
         VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        email_enabled !== undefined ? (email_enabled ? 1 : 0) : 1,
        new_activity_enabled !== undefined ? (new_activity_enabled ? 1 : 0) : 1,
        reminder_enabled !== undefined ? (reminder_enabled ? 1 : 0) : 1,
        reminder_days !== undefined ? reminder_days : 1,
      ]
    );
  } else {
    // Update
    const updates: string[] = [];
    const params: any[] = [];

    if (email_enabled !== undefined) {
      updates.push('email_enabled = ?');
      params.push(email_enabled ? 1 : 0);
    }
    if (new_activity_enabled !== undefined) {
      updates.push('new_activity_enabled = ?');
      params.push(new_activity_enabled ? 1 : 0);
    }
    if (reminder_enabled !== undefined) {
      updates.push('reminder_enabled = ?');
      params.push(reminder_enabled ? 1 : 0);
    }
    if (reminder_days !== undefined) {
      updates.push('reminder_days = ?');
      params.push(reminder_days);
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      params.push(user.id);

      await dbRun(
        `UPDATE notification_settings SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    }
  }

  // Get updated settings
  const settings = await dbGet('SELECT * FROM notification_settings WHERE user_id = ?', [user.id]);

  return successResponse({ settings }, 'Cập nhật cài đặt thành công');
});
