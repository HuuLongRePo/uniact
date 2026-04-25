import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { toVietnamFileTimestamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';
import fs from 'fs';
import path from 'path';

// POST - Tạo backup ngay
export async function POST(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const configuredPath = process.env.DATABASE_PATH || './uniact.db';
    const dbPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);

    if (!fs.existsSync(dbPath)) {
      return errorResponse(ApiError.notFound('Không tìm thấy cơ sở dữ liệu'));
    }

    const dbBuffer = fs.readFileSync(dbPath);
    const filename = `uniact-${toVietnamFileTimestamp(new Date())}.db`;

    return new NextResponse(dbBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
        'Content-Length': dbBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('POST /api/admin/backup error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tạo file backup', { details: error?.message })
    );
  }
}
