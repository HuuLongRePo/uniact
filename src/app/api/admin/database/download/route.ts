import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';
import fs from 'fs';
import path from 'path';

function validateBackupFilename(filename: string | null): string {
  if (!filename) {
    throw ApiError.validation('Thieu ten file backup');
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw ApiError.validation('Ten file backup khong hop le');
  }

  return filename;
}

// GET /api/admin/database/download - Download backup file
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const filename = validateBackupFilename(request.nextUrl.searchParams.get('file'));
    const backupPath = path.join(process.cwd(), 'backups', filename);

    if (!fs.existsSync(backupPath)) {
      return errorResponse(ApiError.notFound('Khong tim thay file backup'));
    }

    const fileBuffer = fs.readFileSync(backupPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
      },
    });
  } catch (error: any) {
    console.error('Download backup error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Khong the tai file backup', { details: error?.message })
    );
  }
}
