'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function ApprovalDeadlineConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    approval_deadline_hours: '48',
    warning_threshold_hours: '24',
    enable_notifications: 'true',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchConfig();
  }, [user, authLoading, router]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system-config?category=approval');
      const data = await response.json();
      if (response.ok && data.configs) {
        const configMap: Record<string, string> = {};
        data.configs.forEach((c: any) => {
          configMap[c.config_key] = c.config_value;
        });
        setConfig((prev) => ({
          ...prev,
          approval_deadline_hours: configMap['approval_deadline_hours'] || '48',
          warning_threshold_hours: configMap['warning_threshold_hours'] || '24',
          enable_notifications: configMap['enable_notifications'] || 'true',
        }));
      }
    } catch (e) {
      console.error('Fetch config error:', e);
      toast.error('Lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const deadlineHours = parseInt(config.approval_deadline_hours);
      const warningThreshold = parseInt(config.warning_threshold_hours);

      if (deadlineHours <= 0 || warningThreshold <= 0) {
        toast.error('Giờ phải lớn hơn 0');
        setSaving(false);
        return;
      }

      if (warningThreshold >= deadlineHours) {
        toast.error('Ngưỡng cảnh báo phải nhỏ hơn deadline');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { key: 'approval_deadline_hours', value: config.approval_deadline_hours },
            { key: 'warning_threshold_hours', value: config.warning_threshold_hours },
            { key: 'enable_notifications', value: config.enable_notifications },
          ],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Cập nhật cấu hình thành công');
      } else {
        toast.error(data.error || 'Cập nhật thất bại');
      }
    } catch (e) {
      console.error('Save config error:', e);
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Cấu Hình Hạn Chót Phê Duyệt</h1>
        </div>
        <p className="text-gray-600">Quản lý thời hạn phê duyệt hoạt động và cảnh báo</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
        {/* Approval Deadline Hours */}
        <div className="border-b pb-6">
          <div className="mb-4">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              ⏱️ Hạn Chót Phê Duyệt (giờ)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Số giờ tối đa mà hoạt động phải được phê duyệt trước khi bắt đầu
            </p>
          </div>
          <input
            type="number"
            min="1"
            max="720"
            step="1"
            value={config.approval_deadline_hours}
            onChange={(e) => setConfig({ ...config, approval_deadline_hours: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="48"
          />
          <div className="mt-3 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Ví dụ:</strong> Nếu đặt 48 giờ, hoạt động phải được phê duyệt trước khi bắt
              đầu ít nhất 48 giờ.
            </p>
          </div>
        </div>

        {/* Warning Threshold */}
        <div className="border-b pb-6">
          <div className="mb-4">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              ⚠️ Ngưỡng Cảnh Báo (giờ)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Nếu hoạt động gần đến deadline mà chưa phê duyệt, hệ thống sẽ gửi cảnh báo
            </p>
          </div>
          <input
            type="number"
            min="1"
            max="720"
            step="1"
            value={config.warning_threshold_hours}
            onChange={(e) => setConfig({ ...config, warning_threshold_hours: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="24"
          />
          <div className="mt-3 p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Ví dụ:</strong> Nếu đặt 24 giờ, cảnh báo sẽ gửi khi còn 24 giờ trước deadline.
            </p>
          </div>
        </div>

        {/* Enable Notifications */}
        <div className="border-b pb-6">
          <div className="mb-4">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              🔔 Bật Thông Báo
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Gửi thông báo cho giảng viên khi deadline sắp đến hoặc quá hạn
            </p>
          </div>
          <div className="space-y-3">
            {[
              { value: 'true', label: '✅ Bật' },
              { value: 'false', label: '❌ Tắt' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="notifications"
                  value={option.value}
                  checked={config.enable_notifications === option.value}
                  onChange={(e) => setConfig({ ...config, enable_notifications: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview/Summary */}
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Tóm Tắt Cấu Hình
          </h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li>
              ✓ <strong>Hạn chót phê duyệt:</strong> {config.approval_deadline_hours} giờ trước khi
              hoạt động bắt đầu
            </li>
            <li>
              ✓ <strong>Cảnh báo:</strong> {config.warning_threshold_hours} giờ trước deadline
            </li>
            <li>
              ✓ <strong>Thông báo:</strong> {config.enable_notifications === 'true' ? 'Bật' : 'Tắt'}
            </li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {saving ? '⏳ Đang lưu...' : '💾 Lưu Cấu Hình'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition"
          >
            🔄 Tải Lại
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 flex gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p>
              <strong>Lưu ý:</strong> Những cài đặt này sẽ áp dụng cho tất cả hoạt động mới được tạo
              sau khi cập nhật.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
