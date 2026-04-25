import { NextRequest } from 'next/server'
import { requireApiRole } from '@/lib/guards'
import { dbAll } from '@/lib/database'
import { ApiError, errorResponse, successResponse } from '@/lib/api-response'
import fs from 'fs'
import path from 'path'

type BackupHistoryRow = {
  filename?: string | null
  size_mb?: number | null
  created_at?: string | null
  created_by?: string | null
  status?: string | null
}

type BackupItem = {
  id: number
  filename: string
  size_mb: number
  created_at: string
  created_by: string
  status: string
}

function toIsoString(value: unknown): string {
  if (!value) return new Date(0).toISOString()
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return new Date(0).toISOString()
  return parsed.toISOString()
}

// GET /api/admin/database/backups - List backup files
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin'])

    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      return successResponse({ backups: [] as BackupItem[] })
    }

    let historyRows: BackupHistoryRow[] = []
    try {
      historyRows = (await dbAll(
        `
          SELECT filename, size_mb, created_at, created_by, status
          FROM backup_history
          ORDER BY created_at DESC
          LIMIT 500
        `
      )) as BackupHistoryRow[]
    } catch {
      historyRows = []
    }

    const historyByFilename = new Map<string, BackupHistoryRow>()
    for (const row of historyRows) {
      const filename = String(row.filename || '')
      if (!filename || historyByFilename.has(filename)) continue
      historyByFilename.set(filename, row)
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((name) => name.toLowerCase().endsWith('.db'))

    const backups: BackupItem[] = files.map((filename, index) => {
      const fullPath = path.join(backupDir, filename)
      const stats = fs.statSync(fullPath)
      const history = historyByFilename.get(filename)
      const createdAt = history?.created_at ? toIsoString(history.created_at) : new Date(stats.mtime).toISOString()

      return {
        id: index + 1,
        filename,
        size_mb: Number.isFinite(stats.size) ? stats.size / (1024 * 1024) : Number(history?.size_mb || 0),
        created_at: createdAt,
        created_by: String(history?.created_by || 'system'),
        status: String(history?.status || 'success'),
      }
    })

    backups.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return bTime - aTime
    })

    return successResponse({ backups })
  } catch (error: any) {
    console.error('List backups error:', error)
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách bản sao lưu', { details: error?.message })
    )
  }
}

