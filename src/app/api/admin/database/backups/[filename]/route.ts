import { NextRequest } from 'next/server'
import { dbRun } from '@/lib/database'
import { requireApiRole } from '@/lib/guards'
import { ApiError, errorResponse, successResponse } from '@/lib/api-response'
import fs from 'fs'
import path from 'path'

function validateBackupFilename(filename: string | null | undefined): string {
  if (!filename) {
    throw ApiError.validation('Thiếu tên file backup')
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw ApiError.validation('Tên file backup không hợp lệ')
  }

  if (!filename.toLowerCase().endsWith('.db')) {
    throw ApiError.validation('Tên file backup không hợp lệ')
  }

  return filename
}

// DELETE /api/admin/database/backups/[filename] - Delete backup file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const user = await requireApiRole(request, ['admin'])
    const resolvedParams = await params
    const filename = validateBackupFilename(resolvedParams.filename)

    const backupPath = path.join(process.cwd(), 'backups', filename)
    if (!fs.existsSync(backupPath)) {
      return errorResponse(ApiError.notFound('Không tìm thấy file backup'))
    }

    fs.unlinkSync(backupPath)

    try {
      await dbRun('DELETE FROM backup_history WHERE filename = ?', [filename])
    } catch (cleanupError) {
      console.error('Failed to cleanup backup_history after delete:', cleanupError)
    }

    try {
      await dbRun(
        `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
         VALUES (?, 'DATABASE_BACKUP_DELETE', 'system', 0, ?, datetime('now'))`,
        [user.id, JSON.stringify({ filename })]
      )
    } catch (auditError) {
      console.error('Failed to write audit log (backup delete):', auditError)
    }

    return successResponse(
      {
        deleted: true,
        filename,
      },
      'Đã xóa bản sao lưu'
    )
  } catch (error: any) {
    console.error('Delete backup error:', error)
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể xóa file backup', { details: error?.message })
    )
  }
}

