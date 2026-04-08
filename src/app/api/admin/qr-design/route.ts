import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// GET - Lấy cấu hình QR design
export async function GET() {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const stmt = db.prepare('SELECT * FROM system_config WHERE category = ?');
    const configs = stmt.all('qr_design') as unknown as any[];

    const design: Record<string, any> = {
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

    configs.forEach((config) => {
      try {
        const value = JSON.parse(config.value);
        Object.assign(design, value);
      } catch (e) {
        console.error('Parse config error:', e);
      }
    });

    return NextResponse.json(design);
  } catch (error: any) {
    console.error('GET /api/admin/qr-design error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Cập nhật cấu hình QR design
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const designJson = formData.get('design') as string;
    const logoFile = formData.get('logo') as File | null;

    if (!designJson) {
      return NextResponse.json({ error: 'Missing design data' }, { status: 400 });
    }

    const design = JSON.parse(designJson);

    // Nếu có file logo, lưu vào public folder
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

    // Lưu cấu hình vào database
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

    return NextResponse.json({ success: true, design });
  } catch (error: any) {
    console.error('PUT /api/admin/qr-design error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
