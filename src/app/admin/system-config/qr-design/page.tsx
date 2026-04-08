'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { QrCode, Palette, Upload, Eye, ArrowLeft, Copy, Download } from 'lucide-react';
import dynamic from 'next/dynamic';

const QRCodeComponent = dynamic(() => import('react-qr-code'), { ssr: false });

interface QRDesign {
  bgColor: string;
  textColor: string;
  cornerRadius: number;
  dotRadius: number;
  eyeColor: string;
  logoEnabled: boolean;
  logoUrl: string | null;
  logoSize: number; // 0-40 (percentage of QR size)
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  expirationTime: number;
  customText: string;
}

export default function QRDesignCustomizationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [design, setDesign] = useState<QRDesign>({
    bgColor: '#ffffff',
    textColor: '#000000',
    cornerRadius: 0,
    dotRadius: 0,
    eyeColor: '#000000',
    logoEnabled: false,
    logoUrl: null,
    logoSize: 25,
    errorCorrection: 'H',
    expirationTime: 5,
    customText: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'logo' | 'advanced'>('colors');
  const [presetLoaded, setPresetLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchDesign();
  }, [user, authLoading, router]);

  const fetchDesign = async () => {
    try {
      const response = await fetch('/api/admin/qr-design');
      if (response.ok) {
        const data = await response.json();
        setDesign((prev) => ({ ...prev, ...data }));
        setPresetLoaded(true);
      }
    } catch (e) {
      console.error('Fetch design error:', e);
      setPresetLoaded(true);
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
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Kích thước hình ảnh không được vượt quá 2MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setDesign((prev) => ({ ...prev, logoUrl: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append(
        'design',
        JSON.stringify({
          bgColor: design.bgColor,
          textColor: design.textColor,
          cornerRadius: design.cornerRadius,
          dotRadius: design.dotRadius,
          eyeColor: design.eyeColor,
          logoEnabled: design.logoEnabled,
          logoSize: design.logoSize,
          errorCorrection: design.errorCorrection,
          expirationTime: design.expirationTime,
          customText: design.customText,
        })
      );
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('/api/admin/qr-design', {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success('Cấu hình QR design đã lưu!');
        setLogoFile(null);
      } else {
        toast.error('Lỗi khi lưu cấu hình');
      }
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadQRCode = () => {
    const svg = document.querySelector('#qr-preview svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'uniact-qr.png';
      link.click();
      toast.success('QR code đã tải xuống');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const applyPreset = (preset: string) => {
    const presets: Record<string, Partial<QRDesign>> = {
      default: {
        bgColor: '#ffffff',
        textColor: '#000000',
        eyeColor: '#000000',
        cornerRadius: 0,
        dotRadius: 0,
      },
      modern: {
        bgColor: '#f8f9fa',
        textColor: '#1a202c',
        eyeColor: '#3b82f6',
        cornerRadius: 2,
        dotRadius: 1,
      },
      vibrant: {
        bgColor: '#fef3c7',
        textColor: '#92400e',
        eyeColor: '#dc2626',
        cornerRadius: 3,
        dotRadius: 1,
      },
      elegant: {
        bgColor: '#f3e8ff',
        textColor: '#5b21b6',
        eyeColor: '#a855f7',
        cornerRadius: 1,
        dotRadius: 0,
      },
    };

    if (presets[preset]) {
      setDesign((prev) => ({ ...prev, ...presets[preset] }));
      toast.success(`Áp dụng style "${preset}"`);
    }
  };

  if (authLoading || loading || !presetLoaded) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </button>
          <h1 className="text-3xl font-bold flex items-center">
            <QrCode className="w-8 h-8 mr-3 text-purple-600" />
            QR Code Design Customization
          </h1>
          <p className="text-gray-600 mt-2">
            Tùy chỉnh giao diện mã QR điểm danh với độ chân thực cao
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('colors')}
                  className={`flex-1 px-6 py-3 text-center font-medium transition ${
                    activeTab === 'colors'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Palette className="w-4 h-4 inline mr-2" />
                  Màu sắc
                </button>
                <button
                  onClick={() => setActiveTab('logo')}
                  className={`flex-1 px-6 py-3 text-center font-medium transition ${
                    activeTab === 'logo'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Logo
                </button>
                <button
                  onClick={() => setActiveTab('advanced')}
                  className={`flex-1 px-6 py-3 text-center font-medium transition ${
                    activeTab === 'advanced'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⚙️ Nâng cao
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6 space-y-6">
                {/* Colors Tab */}
                {activeTab === 'colors' && (
                  <div className="space-y-6">
                    {/* Presets */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Style Presets
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['default', 'modern', 'vibrant', 'elegant'].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => applyPreset(preset)}
                            className="px-3 py-2 border rounded-lg hover:bg-gray-50 capitalize text-sm font-medium"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Màu nền
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={design.bgColor}
                          onChange={(e) => setDesign({ ...design, bgColor: e.target.value })}
                          className="w-12 h-12 rounded border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={design.bgColor}
                          onChange={(e) => setDesign({ ...design, bgColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Màu ký tự (modules)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={design.textColor}
                          onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
                          className="w-12 h-12 rounded border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={design.textColor}
                          onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Eye Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Màu mắt (corner patterns)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={design.eyeColor}
                          onChange={(e) => setDesign({ ...design, eyeColor: e.target.value })}
                          className="w-12 h-12 rounded border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={design.eyeColor}
                          onChange={(e) => setDesign({ ...design, eyeColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Contrast Check */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 Độ tương phản:{' '}
                        {Math.abs(
                          parseInt(design.bgColor.slice(1), 16) -
                            parseInt(design.textColor.slice(1), 16)
                        ) > 8355711
                          ? '✓ Tốt'
                          : '⚠ Có thể khó quét'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Logo Tab */}
                {activeTab === 'logo' && (
                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center space-x-2 mb-4">
                        <input
                          type="checkbox"
                          checked={design.logoEnabled}
                          onChange={(e) => setDesign({ ...design, logoEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Sử dụng logo</span>
                      </label>
                    </div>

                    {design.logoEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Upload Logo
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="hidden"
                              id="logo-input"
                            />
                            <label htmlFor="logo-input" className="cursor-pointer block">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Nhấp để chọn hoặc kéo thả</p>
                              <p className="text-xs text-gray-500 mt-1">Max 2MB, PNG/JPG</p>
                            </label>
                          </div>
                        </div>

                        {design.logoUrl && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Kích thước logo: {design.logoSize}%
                            </label>
                            <input
                              type="range"
                              min="15"
                              max="40"
                              value={design.logoSize}
                              onChange={(e) =>
                                setDesign({ ...design, logoSize: parseInt(e.target.value) })
                              }
                              className="w-full"
                            />
                          </div>
                        )}

                        {design.logoUrl && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-2">Logo xem trước:</p>
                            <img
                              src={design.logoUrl}
                              alt="Logo"
                              className="max-h-32 mx-auto rounded"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Error Correction Level
                      </label>
                      <select
                        value={design.errorCorrection}
                        onChange={(e) =>
                          setDesign({ ...design, errorCorrection: e.target.value as any })
                        }
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="L">L (7% - Thấp)</option>
                        <option value="M">M (15% - Trung bình)</option>
                        <option value="Q">Q (25% - Cao)</option>
                        <option value="H">H (30% - Rất cao)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Khả năng phục hồi nếu QR code bị hư hỏng. Khuyên: H
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hết hạn (phút)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={design.expirationTime}
                        onChange={(e) =>
                          setDesign({ ...design, expirationTime: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Góc bo tròn
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={design.cornerRadius}
                        onChange={(e) =>
                          setDesign({ ...design, cornerRadius: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">{design.cornerRadius} pixel</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Độ tròn của modules
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        value={design.dotRadius}
                        onChange={(e) =>
                          setDesign({ ...design, dotRadius: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {design.dotRadius} (0=vuông, 1=tròn)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ghi chú tùy chỉnh (không bắt buộc)
                      </label>
                      <textarea
                        value={design.customText}
                        onChange={(e) => setDesign({ ...design, customText: e.target.value })}
                        placeholder="VD: UniAct | Điểm danh"
                        className="w-full px-3 py-2 border rounded resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                💾 {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Xem trước
              </h3>

              <div
                id="qr-preview"
                className="flex items-center justify-center p-6 rounded-lg border-2 border-gray-200"
                style={{ backgroundColor: design.bgColor }}
              >
                <QRCodeComponent
                  value={`https://uniact.local/qr?exp=${design.expirationTime}`}
                  size={220}
                  level={design.errorCorrection}
                  fgColor={design.textColor}
                  bgColor={design.bgColor}
                />
              </div>

              <div className="space-y-2 p-4 bg-gray-50 rounded-lg border text-sm">
                <p>
                  <strong>Nền:</strong> {design.bgColor}
                </p>
                <p>
                  <strong>Ký tự:</strong> {design.textColor}
                </p>
                <p>
                  <strong>Mắt:</strong> {design.eyeColor}
                </p>
                <p>
                  <strong>Hết hạn:</strong> {design.expirationTime} phút
                </p>
                <p>
                  <strong>Error:</strong> {design.errorCorrection}
                </p>
                {design.logoEnabled && design.logoUrl && (
                  <p className="text-green-700">✓ Logo: {design.logoSize}%</p>
                )}
              </div>

              <button
                onClick={downloadQRCode}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Tải QR code
              </button>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                ⚠️ Kiểm tra tương phản và khả năng quét trước khi sử dụng
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
