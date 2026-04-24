'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { resolveDownloadFilename } from '@/lib/download-filename';
import {
  Mail,
  Database,
  AlertTriangle,
  Save,
  Download,
  Upload,
  Power,
  RefreshCw,
  Server,
  HardDrive,
  Zap,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { formatVietnamDateTime, toVietnamFileTimestamp } from '@/lib/timezone';
interface SystemStats {
  dbSize: string;
  dbPath: string;
  uptime: string;
  lastBackup: string | null;
}

export default function SystemConfigAdvancedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);

  // Email settings
  const [emailConfig, setEmailConfig] = useState({
    provider: 'nodemailer',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    enabled: false,
  });

  // Backup settings
  const [backupConfig, setBackupConfig] = useState({
    autoBackup: true,
    backupTime: '02:00',
    retentionDays: 7,
    backupLocation: '/backups',
  });

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Hệ thống đang bảo trì. Vui lòng quay lại sau.'
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [configRes, statsRes] = await Promise.all([
        fetch('/api/admin/system-config/advanced'),
        fetch('/api/admin/system-stats'),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        if (data.email) setEmailConfig(data.email);
        if (data.backup) setBackupConfig(data.backup);
        if (data.maintenance) {
          setMaintenanceMode(data.maintenance.enabled);
          setMaintenanceMessage(data.maintenance.message);
        }
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error: any) {
      console.error('Fetch config error:', error);
      toast.error('Không thể tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/system-config/advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', data: emailConfig }),
      });

      if (!response.ok) throw new Error('Không thể lưu cấu hình');

      toast.success('Cấu hình email đã lưu!');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBackup = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/system-config/advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'backup', data: backupConfig }),
      });

      if (!response.ok) throw new Error('Không thể lưu cấu hình');

      toast.success('Cấu hình backup đã lưu!');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      setSaving(true);
      toast.loading('Đang tạo backup...', { id: 'backup' });

      const response = await fetch('/api/admin/backup', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Backup failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resolveDownloadFilename(
        response.headers.get('Content-Disposition'),
        `uniact-${toVietnamFileTimestamp(new Date())}.db`
      );
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup thành công!', { id: 'backup' });
      fetchConfig();
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message, { id: 'backup' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      setSaving(true);
      const newMode = !maintenanceMode;

      const response = await fetch('/api/admin/system-config/advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'maintenance',
          data: { enabled: newMode, message: maintenanceMessage },
        }),
      });

      if (!response.ok) throw new Error('Không thể chuyển trạng thái');

      setMaintenanceMode(newMode);
      toast.success(newMode ? 'Chế độ bảo trì đã BẬT' : 'Chế độ bảo trì đã TẮT');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setSaving(true);
      toast.loading('Đang gửi email kiểm tra...', { id: 'test-email' });

      const response = await fetch('/api/admin/system-config/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Email test đã gửi thành công!', { id: 'test-email' });
      } else {
        toast.error(data.error || 'Gửi thất bại', { id: 'test-email' });
      }
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message, { id: 'test-email' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Server className="w-8 h-8 mr-3 text-purple-600" />
            Cấu Hình Hệ Thống Nâng Cao
          </h1>
          <p className="mt-2 text-gray-600">
            Quản lý email, backup, bảo trì và các cài đặt hệ thống
          </p>
        </div>

        {/* System Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <HardDrive className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.dbSize}</div>
                  <div className="text-sm text-gray-600">Dung lượng DB</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <Zap className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.uptime}</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    {stats.lastBackup || 'Chưa có'}
                  </div>
                  <div className="text-sm text-gray-600">Backup cuối</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <div
                    className={`text-xl font-bold ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {maintenanceMode ? 'BẢO TRÌ' : 'HOẠT ĐỘNG'}
                  </div>
                  <div className="text-sm text-gray-600">Trạng thái</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Configuration */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              Cấu Hình Email
            </h2>

            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    checked={emailConfig.enabled}
                    onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Bật dịch vụ email</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={emailConfig.smtpHost}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!emailConfig.enabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="text"
                    value={emailConfig.smtpPort}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
                    placeholder="587"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={!emailConfig.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={emailConfig.provider}
                    onChange={(e) => setEmailConfig({ ...emailConfig, provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={!emailConfig.enabled}
                  >
                    <option value="nodemailer">Nodemailer (SMTP)</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="local">Local (No email)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={emailConfig.smtpUser}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                  placeholder="user@gmail.com"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!emailConfig.enabled}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={emailConfig.smtpPass}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!emailConfig.enabled}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input
                  type="email"
                  value={emailConfig.smtpFrom}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpFrom: e.target.value })}
                  placeholder="noreply@uniact.local"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={!emailConfig.enabled}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveEmail}
                  disabled={saving || !emailConfig.enabled}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu cấu hình
                </button>
                <button
                  onClick={handleTestEmail}
                  disabled={saving || !emailConfig.enabled}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  Test
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Chỉ bật khi server có kết nối Internet
              </p>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-purple-600" />
              Backup & Phục Hồi
            </h2>

            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    checked={backupConfig.autoBackup}
                    onChange={(e) =>
                      setBackupConfig({ ...backupConfig, autoBackup: e.target.checked })
                    }
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Tự động backup hàng ngày
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ backup</label>
                <input
                  type="time"
                  value={backupConfig.backupTime}
                  onChange={(e) => setBackupConfig({ ...backupConfig, backupTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
                  disabled={!backupConfig.autoBackup}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lưu giữ (ngày)
                </label>
                <input
                  type="number"
                  value={backupConfig.retentionDays}
                  onChange={(e) =>
                    setBackupConfig({ ...backupConfig, retentionDays: parseInt(e.target.value) })
                  }
                  min="1"
                  max="30"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tự động xóa backup cũ hơn {backupConfig.retentionDays} ngày
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thư mục lưu</label>
                <input
                  type="text"
                  value={backupConfig.backupLocation}
                  onChange={(e) =>
                    setBackupConfig({ ...backupConfig, backupLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveBackup}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu cấu hình
                </button>
              </div>

              <div className="border-t pt-4 space-y-3">
                <button
                  onClick={handleBackupNow}
                  disabled={saving}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Tạo backup ngay
                </button>

                <button
                  disabled
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-md opacity-50 cursor-not-allowed"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Khôi phục từ file (Coming soon)
                </button>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
              Chế Độ Bảo Trì
            </h2>

            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${maintenanceMode ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Power
                      className={`w-6 h-6 mr-3 ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}
                    />
                    <div>
                      <div
                        className={`font-semibold ${maintenanceMode ? 'text-red-900' : 'text-green-900'}`}
                      >
                        {maintenanceMode
                          ? 'Hệ thống đang bảo trì'
                          : 'Hệ thống hoạt động bình thường'}
                      </div>
                      <div
                        className={`text-sm ${maintenanceMode ? 'text-red-700' : 'text-green-700'}`}
                      >
                        {maintenanceMode
                          ? 'Người dùng không thể truy cập'
                          : 'Tất cả chức năng hoạt động'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thông báo bảo trì
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-500"
                  placeholder="Thông báo hiển thị cho người dùng khi hệ thống bảo trì..."
                />
              </div>

              <button
                onClick={handleToggleMaintenance}
                disabled={saving}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-md text-white disabled:opacity-50 ${
                  maintenanceMode
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Power className="w-5 h-5 mr-2" />
                {maintenanceMode ? 'TẮT chế độ bảo trì' : 'BẬT chế độ bảo trì'}
              </button>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Cảnh báo:</strong> Khi bật chế độ bảo trì, tất cả người dùng (trừ
                  admin) sẽ bị đăng xuất và không thể truy cập hệ thống.
                </p>
              </div>
            </div>
          </div>

          {/* System Tools */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-gray-600" />
              Công Cụ Hệ Thống
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Làm mới trang
              </button>

              <button
                onClick={() => router.push('/admin/audit-logs')}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Database className="w-5 h-5 mr-2" />
                Xem Audit Logs
              </button>

              <button
                onClick={() => router.push('/admin/system-health')}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Server className="w-5 h-5 mr-2" />
                System Health Check
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Mẹo:</strong> Thực hiện backup trước khi cập nhật hệ thống hoặc thay
                  đổi cấu hình quan trọng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
