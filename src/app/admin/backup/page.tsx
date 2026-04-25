'use client'

import { useEffect, useState } from 'react'
import { useEffectEventCompat } from '@/lib/useEffectEventCompat'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { resolveDownloadFilename } from '@/lib/download-filename'
import { formatVietnamDateTime } from '@/lib/timezone'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle, Clock, Database, Download, RefreshCw, Upload } from 'lucide-react'

interface BackupHistory {
  id: number
  filename: string
  size_mb: number
  created_at: string
  created_by: string
  status: string
}

type BackupConfirmState =
  | { action: 'backup' }
  | { action: 'restore'; filename: string }
  | { action: 'delete'; filename: string }
  | null

type DatabaseStats = {
  size_mb: number
  tables: number
  records: number
  last_backup: string | null
}

const INITIAL_DB_STATS: DatabaseStats = {
  size_mb: 0,
  tables: 0,
  records: 0,
  last_backup: null,
}

export default function BackupRestorePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [backups, setBackups] = useState<BackupHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [backing, setBacking] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmState, setConfirmState] = useState<BackupConfirmState>(null)
  const [dbStats, setDbStats] = useState<DatabaseStats>(INITIAL_DB_STATS)

  const fetchDbStats = useEffectEventCompat(async () => {
    try {
      const response = await fetch('/api/admin/database/stats')
      const data = await response.json()
      if (response.ok) {
        setDbStats((prev) => data.stats || prev)
      }
    } catch (error) {
      console.error('Fetch DB stats error:', error)
    }
  })

  const fetchBackups = useEffectEventCompat(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/database/backups')
      const data = await response.json()
      if (response.ok) {
        setBackups(data.backups || [])
      }
    } catch (error) {
      console.error('Fetch backups error:', error)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
      return
    }
    if (user) {
      fetchDbStats()
      fetchBackups()
    }
  }, [authLoading, fetchBackups, fetchDbStats, router, user])

  const handleBackup = async () => {
    try {
      setBacking(true)
      const response = await fetch('/api/admin/database/backup', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Tạo backup thất bại')
        return
      }

      const filename = String(data.filename || '').trim()
      if (!filename) {
        toast.error('Phản hồi tạo backup thiếu tên file')
        return
      }

      toast.success('Đã tạo backup thành công')

      const downloadResponse = await fetch(
        `/api/admin/database/download?file=${encodeURIComponent(filename)}`
      )
      if (!downloadResponse.ok) {
        toast.error('Không thể tải xuống file backup vừa tạo')
        return
      }

      const blob = await downloadResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = resolveDownloadFilename(
        downloadResponse.headers?.get?.('Content-Disposition') ?? null,
        filename
      )
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)

      fetchBackups()
      fetchDbStats()
    } catch (error) {
      console.error('Backup error:', error)
      toast.error('Lỗi khi tạo backup')
    } finally {
      setBacking(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(
        `/api/admin/database/download?file=${encodeURIComponent(filename)}`
      )
      if (!response.ok) {
        toast.error('Tải xuống thất bại')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        filename
      )
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Đã tải xuống backup')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Lỗi khi tải xuống')
    }
  }

  const handleRestore = async (filename: string) => {
    try {
      setRestoring(true)
      const response = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Khôi phục thất bại')
        return
      }

      toast.success('Khôi phục thành công. Hệ thống sẽ tải lại...')
      setTimeout(() => {
        window.location.href = '/admin/dashboard'
      }, 2000)
    } catch (error) {
      console.error('Restore error:', error)
      toast.error('Lỗi khi khôi phục')
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/database/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (response.ok) {
        toast.success('Đã xóa backup')
        fetchBackups()
      } else {
        toast.error(data.error || 'Xóa thất bại')
      }
    } catch (error) {
      console.error('Delete backup error:', error)
      toast.error('Lỗi khi xóa')
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
          <Database className="h-8 w-8" />
          Sao lưu và khôi phục database
        </h1>
        <p className="text-gray-600">Quản lý backup và khôi phục dữ liệu hệ thống</p>
      </div>

      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="mb-1 font-bold text-red-800">Cảnh báo quan trọng</h3>
            <ul className="space-y-1 text-sm text-red-700">
              <li>
                Khôi phục sẽ <strong>ghi đè hoàn toàn</strong> dữ liệu hiện tại.
              </li>
              <li>Luôn tạo backup mới trước khi khôi phục.</li>
              <li>Chỉ thực hiện khi thực sự cần thiết.</li>
              <li>Đảm bảo không có người dùng đang thao tác trên hệ thống.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Database className="h-5 w-5 text-blue-600" />
              Thống kê database
            </h2>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="text-sm text-gray-600">Kích thước</div>
                <div className="text-2xl font-bold text-blue-600">{dbStats.size_mb.toFixed(2)} MB</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <div className="text-sm text-gray-600">Số bảng</div>
                <div className="text-2xl font-bold text-green-600">{dbStats.tables}</div>
              </div>
              <div className="rounded-lg bg-purple-50 p-4">
                <div className="text-sm text-gray-600">Tổng records</div>
                <div className="text-2xl font-bold text-purple-600">
                  {dbStats.records.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <div className="text-sm text-gray-600">Backup cuối</div>
                <div className="text-sm font-medium text-orange-600">
                  {dbStats.last_backup ? formatVietnamDateTime(dbStats.last_backup, 'date') : 'Chưa có'}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Clock className="h-5 w-5 text-purple-600" />
                Lịch sử backup
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Kích thước</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Ngày tạo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Người tạo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Chưa có backup nào
                      </td>
                    </tr>
                  ) : (
                    backups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{backup.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{backup.size_mb.toFixed(2)} MB</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatVietnamDateTime(backup.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{backup.created_by}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownload(backup.filename)}
                              className="rounded p-2 text-blue-600 hover:bg-blue-50"
                              title="Tải xuống"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmState({ action: 'restore', filename: backup.filename })}
                              disabled={restoring}
                              className="rounded p-2 text-green-600 hover:bg-green-50 disabled:opacity-50"
                              title="Khôi phục"
                            >
                              <Upload className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmState({ action: 'delete', filename: backup.filename })}
                              className="rounded p-2 text-red-600 hover:bg-red-50"
                              title="Xóa"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Tạo backup mới
            </h3>

            <p className="mb-4 text-sm text-gray-600">
              Tạo bản sao lưu đầy đủ toàn bộ database. File backup sẽ được tự động tải xuống.
            </p>

            <button
              onClick={() => setConfirmState({ action: 'backup' })}
              disabled={backing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Database className="h-5 w-5" />
              {backing ? 'Đang tạo backup...' : 'Tạo backup ngay'}
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 font-bold">Làm mới dữ liệu</h3>

            <button
              onClick={() => {
                fetchBackups()
                fetchDbStats()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-6 py-3 text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className="h-5 w-5" />
              Làm mới
            </button>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h4 className="mb-2 font-medium text-green-800">Lưu ý</h4>
            <ul className="space-y-1 text-sm text-green-700">
              <li>Backup định kỳ hằng ngày hoặc hằng tuần.</li>
              <li>Lưu backup ở nơi an toàn.</li>
              <li>Kiểm thử khôi phục định kỳ.</li>
              <li>Giữ ít nhất 3-5 backup gần nhất.</li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmState !== null}
        title={
          confirmState?.action === 'backup'
            ? 'Tạo bản sao lưu database'
            : confirmState?.action === 'restore'
              ? 'Khôi phục dữ liệu từ backup'
              : 'Xóa bản sao lưu'
        }
        message={
          confirmState?.action === 'backup'
            ? 'Bạn có chắc chắn muốn tạo bản sao lưu database ngay bây giờ không?'
            : confirmState?.action === 'restore'
              ? `Cảnh báo: thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại. Bạn có chắc chắn muốn khôi phục từ "${confirmState.filename}" không?`
              : confirmState?.action === 'delete'
                ? `Bạn có chắc chắn muốn xóa backup "${confirmState.filename}" không?`
                : ''
        }
        confirmText={
          confirmState?.action === 'backup'
            ? 'Tạo backup'
            : confirmState?.action === 'restore'
              ? 'Khôi phục dữ liệu'
              : 'Xóa backup'
        }
        cancelText="Hủy"
        variant={confirmState?.action === 'backup' ? 'warning' : 'danger'}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return

          if (confirmState.action === 'backup') {
            await handleBackup()
          } else if (confirmState.action === 'restore') {
            await handleRestore(confirmState.filename)
          } else {
            await handleDelete(confirmState.filename)
          }
          setConfirmState(null)
        }}
      />
    </div>
  )
}

