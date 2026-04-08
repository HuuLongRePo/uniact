'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Clock, Shield, RefreshCw, Save, QrCode } from 'lucide-react';

interface QRConfig {
  qr_expiry_minutes: number;
  qr_refresh_interval_seconds: number;
  qr_security_level: 'low' | 'medium' | 'high';
  max_scan_distance_meters: number;
  require_location: boolean;
  allow_offline_scan: boolean;
}

interface SystemConfigItem {
  config_key: string;
  config_value: string;
}

const SECURITY_LEVELS: Array<{
  value: QRConfig['qr_security_level'];
  label: string;
  description: string;
}> = [
  { value: 'low', label: 'Thấp - Chỉ QR code', description: 'Chỉ cần quét QR' },
  { value: 'medium', label: 'Trung bình - QR + Location', description: 'QR + vị trí GPS' },
  { value: 'high', label: 'Cao - QR + Location + Time', description: 'QR + GPS + khung giờ' },
];

export default function QRConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [config, setConfig] = useState<QRConfig>({
    qr_expiry_minutes: 5,
    qr_refresh_interval_seconds: 30,
    qr_security_level: 'medium',
    max_scan_distance_meters: 50,
    require_location: true,
    allow_offline_scan: false,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchConfig();
    }
  }, [user, authLoading, router]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-config?category=qr');
      const data = await response.json();

      if (response.ok && data.configs) {
        const configMap: Record<string, string> = {};
        data.configs.forEach((c: SystemConfigItem) => {
          configMap[c.config_key] = c.config_value;
        });

        setConfig({
          qr_expiry_minutes: parseInt(configMap.qr_expiry_minutes || '5'),
          qr_refresh_interval_seconds: parseInt(configMap.qr_refresh_interval_seconds || '30'),
          qr_security_level: (configMap.qr_security_level || 'medium') as QRConfig['qr_security_level'],
          max_scan_distance_meters: parseInt(configMap.max_scan_distance_meters || '50'),
          require_location: configMap.require_location === 'true',
          allow_offline_scan: configMap.allow_offline_scan === 'true',
        });
      }
    } catch (error) {
      console.error('Fetch QR config error:', error);
      toast.error('Không thể tải cấu hình QR');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = [
        { key: 'qr_expiry_minutes', value: config.qr_expiry_minutes.toString() },
        {
          key: 'qr_refresh_interval_seconds',
          value: config.qr_refresh_interval_seconds.toString(),
        },
        { key: 'qr_security_level', value: config.qr_security_level },
        { key: 'max_scan_distance_meters', value: config.max_scan_distance_meters.toString() },
        { key: 'require_location', value: config.require_location.toString() },
        { key: 'allow_offline_scan', value: config.allow_offline_scan.toString() },
      ];

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Đã lưu cấu hình QR');
        fetchConfig();
      } else {
        toast.error(data.error || 'Lưu thất bại');
      }
    } catch (error) {
      console.error('Save QR config error:', error);
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      qr_expiry_minutes: 5,
      qr_refresh_interval_seconds: 30,
      qr_security_level: 'medium',
      max_scan_distance_meters: 50,
      require_location: true,
      allow_offline_scan: false,
    });
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <QrCode className="w-8 h-8" />
          Cấu Hình QR Code
        </h1>
        <p className="text-gray-600">
          Quản lý cài đặt bảo mật và thời gian hiệu lực của QR code điểm danh
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold">Cài Đặt Thời Gian</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Thời gian hết hạn QR (phút)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={config.qr_expiry_minutes}
                  onChange={(e) =>
                    setConfig({ ...config, qr_expiry_minutes: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  QR code sẽ tự động hết hạn sau {config.qr_expiry_minutes} phút
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Khoảng thời gian refresh (giây)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={config.qr_refresh_interval_seconds}
                  onChange={(e) =>
                    setConfig({ ...config, qr_refresh_interval_seconds: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  QR code sẽ tự động làm mới sau mỗi {config.qr_refresh_interval_seconds} giây
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold">Cài Đặt Bảo Mật</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mức độ bảo mật</label>
                <div className="space-y-2">
                  {SECURITY_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        config.qr_security_level === level.value ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="security_level"
                        value={level.value}
                        checked={config.qr_security_level === level.value}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            qr_security_level: e.target.value as QRConfig['qr_security_level'],
                          })
                        }
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-gray-600">{level.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Khoảng cách tối đa (mét)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={config.max_scan_distance_meters}
                  onChange={(e) =>
                    setConfig({ ...config, max_scan_distance_meters: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Sinh viên phải ở trong bán kính {config.max_scan_distance_meters}m để quét QR
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={config.require_location}
                    onChange={(e) => setConfig({ ...config, require_location: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Yêu cầu vị trí GPS</div>
                    <div className="text-sm text-gray-600">
                      Sinh viên phải bật GPS khi điểm danh
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={config.allow_offline_scan}
                    onChange={(e) => setConfig({ ...config, allow_offline_scan: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Cho phép điểm danh offline</div>
                    <div className="text-sm text-gray-600">
                      Sinh viên có thể quét QR khi mất kết nối internet
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Xem Trước Cấu Hình</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Hết hạn:</span>
                <span className="font-medium">{config.qr_expiry_minutes} phút</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Refresh:</span>
                <span className="font-medium">{config.qr_refresh_interval_seconds}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bảo mật:</span>
                <span className="font-medium capitalize">{config.qr_security_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Khoảng cách:</span>
                <span className="font-medium">{config.max_scan_distance_meters}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GPS:</span>
                <span
                  className={`font-medium ${config.require_location ? 'text-green-600' : 'text-red-600'}`}
                >
                  {config.require_location ? 'Bắt buộc' : 'Không bắt buộc'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Offline:</span>
                <span
                  className={`font-medium ${config.allow_offline_scan ? 'text-green-600' : 'text-red-600'}`}
                >
                  {config.allow_offline_scan ? 'Cho phép' : 'Không cho phép'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Hành Động</h3>

            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
              </button>

              <button
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Khôi Phục Mặc Định
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Lưu Ý</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Cấu hình sẽ áp dụng cho tất cả QR code mới</li>
              <li>• QR code đang hoạt động không bị ảnh hưởng</li>
              <li>• Khuyến nghị bảo mật &quot;Trung bình&quot; trở lên</li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Khôi phục cấu hình QR mặc định"
        message="Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình QR về giá trị mặc định không?"
        confirmText="Khôi phục mặc định"
        cancelText="Hủy"
        variant="warning"
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={async () => {
          handleReset();
          setIsResetConfirmOpen(false);
        }}
      />
    </div>
  );
}
