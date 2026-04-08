import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// POST - Tạo backup ngay
export async function POST() {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const dbPath = process.env.DATABASE_PATH || './uniact.db';

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    // Đọc file database
    const dbBuffer = fs.readFileSync(dbPath);

    // Tạo tên file backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `uniact-${timestamp}.db`;

    // Trả về file backup
    return new NextResponse(dbBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': dbBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('POST /api/admin/backup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
