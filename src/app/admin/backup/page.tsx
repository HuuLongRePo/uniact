'use client';

import { useEffect, useState } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface BackupHistory {
  id: number;
  filename: string;
  size_mb: number;
  created_at: string;
  created_by: string;
  status: string;
}

type BackupConfirmState =
  | { action: 'backup' }
  | { action: 'restore'; filename: string }
  | { action: 'delete'; filename: string }
  | null;

export default function BackupRestorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmState, setConfirmState] = useState<BackupConfirmState>(null);
  const [dbStats, setDbStats] = useState({
    size_mb: 0,
    tables: 0,
    records: 0,
    last_backup: null as string | null,
  });

  const fetchDbStats = useEffectEventCompat(async () => {
    try {
      const response = await fetch('/api/admin/database/stats');
      const data = await response.json();
      if (response.ok) {
        setDbStats((prev) => data.stats || prev);
      }
    } catch (error) {
      console.error('Fetch DB stats error:', error);
    }
  });

  const fetchBackups = useEffectEventCompat(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/database/backups');
      const data = await response.json();
      if (response.ok) {
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Fetch backups error:', error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchDbStats();
      fetchBackups();
    }
  }, [user, authLoading, router, fetchDbStats, fetchBackups]);

  const handleBackup = async () => {
    try {
      setBacking(true);
      const response = await fetch('/api/admin/database/backup', {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Đã tạo backup thành công');

        // Download backup file
        const downloadResponse = await fetch(`/api/admin/database/download?file=${data.filename}`);
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        fetchBackups();
        fetchDbStats();
      } else {
        toast.error(data.error || 'Backup thất bại');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Lỗi khi backup');
    } finally {
      setBacking(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/database/download?file=${filename}`);
      if (!response.ok) {
        toast.error('Tải xuống thất bại');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Đã tải xuống backup');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi khi tải xuống');
    }
  };

  const handleRestore = async (filename: string) => {
    try {
      setRestoring(true);
      const response = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Khôi phục thành công. Hệ thống sẽ reload...');
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 2000);
      } else {
        toast.error(data.error || 'Khôi phục thất bại');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Lỗi khi khôi phục');
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/database/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Đã xóa backup');
        fetchBackups();
      } else {
        toast.error(data.error || 'Xóa thất bại');
      }
    } catch (error) {
      console.error('Delete backup error:', error);
      toast.error('Lỗi khi xóa');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Database className="w-8 h-8" />
          Sao Lưu & Khôi Phục Database
        </h1>
        <p className="text-gray-600">Quản lý backup và khôi phục dữ liệu hệ thống</p>
      </div>

      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 mb-1">⚠️ Cảnh Báo Quan Trọng</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>
                • Khôi phục sẽ <strong>GHI ĐÈ HOÀN TOÀN</strong> dữ liệu hiện tại
              </li>
              <li>• Luôn tạo backup mới trước khi khôi phục</li>
              <li>• Chỉ thực hiện khi thực sự cần thiết</li>
              <li>• Đảm bảo không có user nào đang sử dụng hệ thống</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Database Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Thống Kê Database
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Kích thước</div>
                <div className="text-2xl font-bold text-blue-600">
                  {dbStats.size_mb.toFixed(2)} MB
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Số bảng</div>
                <div className="text-2xl font-bold text-green-600">{dbStats.tables}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Tổng records</div>
                <div className="text-2xl font-bold text-purple-600">
                  {dbStats.records.toLocaleString()}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Backup cuối</div>
                <div className="text-sm font-medium text-orange-600">
                  {dbStats.last_backup
                    ? new Date(dbStats.last_backup).toLocaleDateString('vi-VN')
                    : 'Chưa có'}
                </div>
              </div>
            </div>
          </div>

          {/* Backup History */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Lịch Sử Backup
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kích thước
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày tạo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Người tạo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                            <Database className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-sm">{backup.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {backup.size_mb.toFixed(2)} MB
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(backup.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{backup.created_by}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownload(backup.filename)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Tải xuống"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmState({ action: 'restore', filename: backup.filename })
                              }
                              disabled={restoring}
                              className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                              title="Khôi phục"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmState({ action: 'delete', filename: backup.filename })
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Xóa"
                            >
                              <AlertTriangle className="w-4 h-4" />
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

        {/* Actions Panel */}
        <div className="space-y-6">
          {/* Create Backup */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Tạo Backup Mới
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Tạo bản sao lưu đầy đủ toàn bộ database. File backup sẽ được tự động tải xuống.
            </p>

            <button
              onClick={() => setConfirmState({ action: 'backup' })}
              disabled={backing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Database className="w-5 h-5" />
              {backing ? 'Đang backup...' : 'Tạo Backup Ngay'}
            </button>
          </div>

          {/* Refresh */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Làm Mới Dữ Liệu</h3>

            <button
              onClick={() => {
                fetchBackups();
                fetchDbStats();
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className="w-5 h-5" />
              Làm mới
            </button>
          </div>

          {/* Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">💡 Lưu Ý</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Backup định kỳ hàng ngày/tuần</li>
              <li>• Lưu backup ở nơi an toàn</li>
              <li>• Test khôi phục định kỳ</li>
              <li>• Giữ ít nhất 3-5 backup gần nhất</li>
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
          if (!confirmState) return;
          if (confirmState.action === 'backup') {
            await handleBackup();
          } else if (confirmState.action === 'restore') {
            await handleRestore(confirmState.filename);
          } else {
            await handleDelete(confirmState.filename);
          }
          setConfirmState(null);
        }}
      />
    </div>
  );
}
