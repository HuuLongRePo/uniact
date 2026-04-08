'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { QrCode, Palette, Upload, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';

const QRCodeComponent = dynamic(() => import('react-qr-code'), { ssr: false });

export default function QRSettingsConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    qr_expiration_time: '5',
    qr_bg_color: '#ffffff',
    qr_text_color: '#000000',
    qr_logo_enabled: 'false',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchConfig();
  }, [user, authLoading, router]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system-config?category=attendance');
      const data = await response.json();
      if (response.ok && data.configs) {
        const configMap: Record<string, string> = {};
        data.configs.forEach((c: any) => {
          configMap[c.config_key] = c.config_value;
        });
        setConfig((prev) => ({
          ...prev,
          qr_expiration_time: configMap['qr_expiration_time'] || '5',
          qr_bg_color: configMap['qr_bg_color'] || '#ffffff',
          qr_text_color: configMap['qr_text_color'] || '#000000',
          qr_logo_enabled: configMap['qr_logo_enabled'] || 'false',
        }));
        if (configMap['qr_logo_url']) {
          setLogoPreviewUrl(configMap['qr_logo_url']);
        }
      }
    } catch (e) {
      console.error('Fetch config error:', e);
      toast.error('Lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn tệp hình ảnh');
        return;
      }
      if (file.size > 1024 * 1024) {
        toast.error('Kích thước hình ảnh không được vượt quá 1MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const expirationTime = parseInt(config.qr_expiration_time);
      if (expirationTime <= 0 || expirationTime > 1440) {
        toast.error('Thời gian hết hạn phải từ 1 đến 1440 phút');
        setSaving(false);
        return;
      }

      const updates = [
        { key: 'qr_expiration_time', value: config.qr_expiration_time },
        { key: 'qr_bg_color', value: config.qr_bg_color },
        { key: 'qr_text_color', value: config.qr_text_color },
        { key: 'qr_logo_enabled', value: config.qr_logo_enabled },
      ];

      // Upload logo nếu có
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          updates.push({ key: 'qr_logo_url', value: uploadData.url });
        }
      }

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Cập nhật cấu hình QR thành công');
        setLogoFile(null);
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <QrCode className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Cấu Hình QR Code</h1>
        </div>
        <p className="text-gray-600">Tùy chỉnh giao diện và hết hạn của mã QR điểm danh</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expiration Time */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              ⏱️ Thời Gian Hết Hạn (phút)
            </label>
            <p className="text-sm text-gray-600 mb-4">Mã QR sẽ hết hạn sau bao lâu kể từ khi tạo</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="1440"
                step="1"
                value={config.qr_expiration_time}
                onChange={(e) => setConfig({ ...config, qr_expiration_time: e.target.value })}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="5"
              />
              <span className="text-gray-500 font-medium">phút</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Khuyên nghị: 5-30 phút</p>
          </div>

          {/* Background Color */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-2">🎨 Màu Nền QR</label>
            <p className="text-sm text-gray-600 mb-4">Màu nền của mã QR</p>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={config.qr_bg_color}
                onChange={(e) => setConfig({ ...config, qr_bg_color: e.target.value })}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={config.qr_bg_color}
                  onChange={(e) => setConfig({ ...config, qr_bg_color: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                  placeholder="#ffffff"
                />
                <p className="text-xs text-gray-500 mt-1">Định dạng hex (VD: #ffffff)</p>
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              🖍️ Màu Ký Tự QR
            </label>
            <p className="text-sm text-gray-600 mb-4">Màu của các mô-đun QR</p>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={config.qr_text_color}
                onChange={(e) => setConfig({ ...config, qr_text_color: e.target.value })}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={config.qr_text_color}
                  onChange={(e) => setConfig({ ...config, qr_text_color: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                  placeholder="#000000"
                />
                <p className="text-xs text-gray-500 mt-1">Định dạng hex (VD: #000000)</p>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              🏫 Logo Trung Tâm (tùy chọn)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Tải lên logo để hiển thị ở giữa QR code (max 1MB, định dạng hình ảnh)
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">Nhấp để chọn hoặc kéo thả hình ảnh</span>
              </label>
            </div>
            {logoPreviewUrl && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Logo xem trước:</p>
                <img src={logoPreviewUrl} alt="Logo preview" className="max-h-32 mx-auto rounded" />
              </div>
            )}
          </div>

          {/* Save Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
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
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            <div className="flex items-center gap-2 mb-6">
              <Eye className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Xem Trước</h3>
            </div>

            <div
              className="border-2 border-gray-200 rounded-lg p-6 flex items-center justify-center"
              style={{ backgroundColor: config.qr_bg_color }}
            >
              <QRCodeComponent
                value="https://uniact.local/attendance/verify?token=SAMPLE"
                size={200}
                level="H"
                fgColor={config.qr_text_color}
                bgColor={config.qr_bg_color}
              />
            </div>

            <div className="mt-6 space-y-2 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Hết hạn:</strong> {config.qr_expiration_time} phút
              </p>
              <p className="text-xs text-gray-600">
                <strong>Nền:</strong> {config.qr_bg_color}
              </p>
              <p className="text-xs text-gray-600">
                <strong>Ký tự:</strong> {config.qr_text_color}
              </p>
              {logoPreviewUrl && (
                <p className="text-xs text-green-600">
                  ✓ <strong>Logo:</strong> Sẽ hiển thị ở giữa
                </p>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                💡 Đảm bảo độ tương phản cao giữa nền và ký tự để QR code dễ quét
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
