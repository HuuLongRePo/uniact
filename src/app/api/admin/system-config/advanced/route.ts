import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbGet, dbRun } from '@/lib/database';

// GET - Lấy cấu hình hệ thống
export async function GET() {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const configs = (await dbAll(
      'SELECT * FROM system_config WHERE category IN (?, ?, ?)',
      ['email', 'backup', 'maintenance']
    )) as any[];

    const result: any = {
      email: {
        provider: 'nodemailer',
        smtpHost: '',
        smtpPort: '587',
        smtpUser: '',
        smtpPass: '',
        smtpFrom: '',
        enabled: false,
      },
      backup: {
        autoBackup: true,
        backupTime: '02:00',
        retentionDays: 7,
        backupLocation: '/backups',
      },
      maintenance: {
        enabled: false,
        message: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',
      },
    };

    configs.forEach((config) => {
      try {
        const value = JSON.parse(config.value);
        if (config.category === 'email') {
          result.email = { ...result.email, ...value };
        } else if (config.category === 'backup') {
          result.backup = { ...result.backup, ...value };
        } else if (config.category === 'maintenance') {
          result.maintenance = { ...result.maintenance, ...value };
        }
      } catch (e) {
        console.error('Parse config error:', e);
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /api/admin/system-config/advanced error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Cập nhật cấu hình
export async function PUT(request: Request) {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const validTypes = ['email', 'backup', 'maintenance'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const value = JSON.stringify(data);

    // Kiểm tra xem config đã tồn tại chưa
    const existing = (await dbGet(
      'SELECT id FROM system_config WHERE category = ? AND key = ?',
      [type, 'config']
    )) as any;

    if (existing) {
      // Cập nhật
      await dbRun(
        'UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [value, existing.id]
      );
    } else {
      // Tạo mới
      await dbRun(
        'INSERT INTO system_config (category, key, value, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [type, 'config', value]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/admin/system-config/advanced error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
