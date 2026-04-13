import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { db } from '@/lib/database';
import fs from 'fs';
import path from 'path';

function getDefaultDesign() {
  return {
    bgColor: '#ffffff',
    textColor: '#000000',
    cornerRadius: 0,
    dotRadius: 0,
    eyeColor: '#000000',
    logoEnabled: false,
    logoUrl: null,
    logoSize: 25,
    errorCorrection: 'H',
    expirationTime: 5,
    customText: '',
  };
}

// GET - Lấy cấu hình QR design
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const stmt = db.prepare('SELECT * FROM system_config WHERE category = ?');
    const configs = stmt.all('qr_design') as unknown as any[];

    const design: Record<string, any> = getDefaultDesign();

    configs.forEach((config) => {
      try {
        const value = JSON.parse(config.value);
        Object.assign(design, value);
      } catch (e) {
        console.error('Parse config error:', e);
      }
    });

    return successResponse(design);
  } catch (error: any) {
    console.error('GET /api/admin/qr-design error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải cấu hình QR', { details: error?.message })
    );
  }
}

// PUT - Cập nhật cấu hình QR design
export async function PUT(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const formData = await request.formData();
    const designJson = formData.get('design') as string | null;
    const logoFile = formData.get('logo') as File | null;

    if (!designJson) {
      return errorResponse(ApiError.validation('Thiếu dữ liệu thiết kế QR'));
    }

    let design: Record<string, any>;
    try {
      design = JSON.parse(designJson);
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu thiết kế QR không hợp lệ'));
    }

    if (logoFile) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'qr-logos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `qr-logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
      const filepath = path.join(uploadDir, filename);

      const bytes = await logoFile.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(bytes));

      design.logoUrl = `/uploads/qr-logos/${filename}`;
    }

    const value = JSON.stringify(design);
    const existing = db
      .prepare('SELECT id FROM system_config WHERE category = ? AND key = ?')
      .get('qr_design', 'config') as any;

    if (existing) {
      db.prepare(
        'UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(value, existing.id);
    } else {
      db.prepare(
        'INSERT INTO system_config (category, key, value, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      ).run('qr_design', 'config', value);
    }

    return successResponse({ success: true, design }, 'Lưu cấu hình QR thành công');
  } catch (error: any) {
    console.error('PUT /api/admin/qr-design error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật cấu hình QR', { details: error?.message })
    );
  }
}
