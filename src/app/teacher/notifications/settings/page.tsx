'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Save,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';

interface NotificationChannel {
  id: number;
  type: 'email' | 'sms' | 'in_app';
  is_enabled: boolean;
  is_default: boolean;
}

interface NotificationTemplate {
  id: number;
  name: string;
  subject?: string;
  body: string;
  category: string;
  created_at: string;
}

interface NotificationSettings {
  channels: NotificationChannel[];
  templates: NotificationTemplate[];
  default_time: string;
  batch_notifications: boolean;
  allow_scheduling: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    category: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền quản lý cài đặt thông báo');
      router.push('/dashboard');
      return;
    }

    if (user) {
      fetchSettings();
    }
  }, [user, authLoading, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setTemplates(data.settings.templates || []);
      }
    } catch (error: unknown) {
      console.error('Error fetching settings:', error);
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch('/api/teacher/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Đã lưu cài đặt');
      } else {
        toast.error('Không thể lưu cài đặt');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const response = await fetch('/api/teacher/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates([...templates, data.template]);
        setNewTemplate({ name: '', subject: '', body: '', category: '' });
        setShowTemplateForm(false);
        toast.success('Đã thêm mẫu thông báo');
      } else {
        toast.error('Không thể thêm mẫu');
      }
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Lỗi khi thêm mẫu');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/notifications/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
        toast.success('Đã xóa mẫu');
      } else {
        toast.error('Không thể xóa mẫu');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Lỗi khi xóa mẫu');
    }
  };

  const handleCopyTemplate = (body: string) => {
    navigator.clipboard.writeText(body);
    toast.success('Đã sao chép nội dung');
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">Không thể tải cài đặt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  Cài đặt thông báo
                </h1>
                <p className="text-gray-600 mt-2">
                  Quản lý kênh thông báo, mẫu nội dung và tùy chọn gửi
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>

        {/* Channels Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Kênh thông báo
          </h2>

          <div className="space-y-4">
            {settings.channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {channel.type === 'email' ? (
                    <Mail className="w-5 h-5 text-blue-600" />
                  ) : channel.type === 'sms' ? (
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-purple-600" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {channel.type === 'email'
                        ? 'Email'
                        : channel.type === 'sms'
                          ? 'SMS'
                          : 'Thông báo trong ứng dụng'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {channel.is_default ? 'Kênh mặc định' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channel.is_enabled}
                      onChange={(e) => {
                        const newChannels = settings.channels.map((c) =>
                          c.id === channel.id ? { ...c, is_enabled: e.target.checked } : c
                        );
                        setSettings({ ...settings, channels: newChannels });
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {channel.is_enabled ? 'Bật' : 'Tắt'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={channel.is_default}
                      onChange={() => {
                        const newChannels = settings.channels.map((c) =>
                          c.id === channel.id
                            ? { ...c, is_default: true }
                            : { ...c, is_default: false }
                        );
                        setSettings({ ...settings, channels: newChannels });
                      }}
                      className="w-4 h-4 rounded-full border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Mặc định</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cài đặt gửi</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian gửi mặc định
              </label>
              <input
                type="time"
                value={settings.default_time}
                onChange={(e) => setSettings({ ...settings, default_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Giờ gửi thông báo lên lịch nếu không chỉ định thời gian cụ thể
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.batch_notifications}
                  onChange={(e) =>
                    setSettings({ ...settings, batch_notifications: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Gộp thông báo (gửi hàng loạt thay vì từng cái)
                </span>
              </label>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_scheduling}
                  onChange={(e) => setSettings({ ...settings, allow_scheduling: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Cho phép lên lịch thông báo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Mẫu thông báo</h2>
            <button
              onClick={() => setShowTemplateForm(!showTemplateForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm mẫu
            </button>
          </div>

          {showTemplateForm && (
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên mẫu</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="VD: Chúc mừng sinh nhật"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    <option value="announcement">Thông báo</option>
                    <option value="event">Sự kiện</option>
                    <option value="award">Khen thưởng</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="Tiêu đề cho email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
                  <textarea
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                    placeholder="Nội dung thông báo..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddTemplate}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Lưu mẫu
                  </button>
                  <button
                    onClick={() => setShowTemplateForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates List */}
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-center text-gray-500 py-6">Chưa có mẫu nào</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500">
                        {template.category} •{' '}
                        {new Date(template.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyTemplate(template.body)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Sao chép"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(template)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {template.subject && (
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Tiêu đề: {template.subject}
                    </div>
                  )}
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded line-clamp-3">
                    {template.body}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={templateToDelete !== null}
          title="Xóa mẫu thông báo"
          message={
            templateToDelete ? `Bạn có chắc chắn muốn xóa mẫu "${templateToDelete.name}"?` : ''
          }
          confirmText="Xóa mẫu"
          cancelText="Hủy"
          variant="danger"
          onCancel={() => setTemplateToDelete(null)}
          onConfirm={async () => {
            if (!templateToDelete) return;
            await handleDeleteTemplate(templateToDelete.id);
            setTemplateToDelete(null);
          }}
        />
      </div>
    </div>
  );
}
