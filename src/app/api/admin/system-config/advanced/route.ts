import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

const VALID_CONFIG_TYPES = ['email', 'backup', 'maintenance'] as const;
type ConfigType = (typeof VALID_CONFIG_TYPES)[number];

function getDefaultConfig() {
  return {
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
}

// GET - Lấy cấu hình hệ thống
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const configs = (await dbAll('SELECT * FROM system_config WHERE category IN (?, ?, ?)', [
      'email',
      'backup',
      'maintenance',
    ])) as any[];

    const result = getDefaultConfig() as any;

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

    return successResponse(result);
  } catch (error: any) {
    console.error('GET /api/admin/system-config/advanced error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải cấu hình hệ thống', { details: error?.message })
    );
  }
}

// PUT - Cập nhật cấu hình
export async function PUT(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    let body: { type?: ConfigType; data?: unknown };
    try {
      body = await request.json();
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu JSON không hợp lệ'));
    }

    const { type, data } = body;

    if (!type || data === undefined) {
      return errorResponse(ApiError.validation('Thiếu type hoặc data'));
    }

    if (!VALID_CONFIG_TYPES.includes(type)) {
      return errorResponse(ApiError.validation('Loại cấu hình không hợp lệ'));
    }

    const value = JSON.stringify(data);
    const existing = (await dbGet('SELECT id FROM system_config WHERE category = ? AND key = ?', [
      type,
      'config',
    ])) as any;

    if (existing) {
      await dbRun(
        'UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [value, existing.id]
      );
    } else {
      await dbRun(
        'INSERT INTO system_config (category, key, value, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [type, 'config', value]
      );
    }

    return successResponse({ success: true }, 'Cập nhật cấu hình thành công');
  } catch (error: any) {
    console.error('PUT /api/admin/system-config/advanced error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật cấu hình hệ thống', {
            details: error?.message,
          })
    );
  }
}
