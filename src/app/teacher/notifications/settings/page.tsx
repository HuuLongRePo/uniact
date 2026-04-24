'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Bell,
  Copy,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Settings,
  Trash2,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

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
      toast.error('Chỉ giảng viên hoặc quản trị viên mới được quản lý cài đặt thông báo');
      router.push('/teacher/dashboard');
      return;
    }

    if (user) {
      void fetchSettings();
    }
  }, [authLoading, router, user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/notifications/settings');
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải cài đặt thông báo');
      }

      const nextSettings = payload?.settings || payload?.data?.settings || null;
      setSettings(nextSettings);
      setTemplates(nextSettings?.templates || []);
    } catch (error: unknown) {
      console.error('Error fetching settings:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải cài đặt thông báo');
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

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || payload?.message || 'Không thể lưu cài đặt');
        return;
      }
      toast.success(payload?.message || 'Đã lưu cài đặt');
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) {
      toast.error('Vui lòng điền đầy đủ tên mẫu và nội dung');
      return;
    }

    try {
      const response = await fetch('/api/teacher/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || payload?.message || 'Không thể thêm mẫu');
        return;
      }

      const created = payload?.template || payload?.data?.template;
      if (created) {
        setTemplates((prev) => [...prev, created]);
      }
      setNewTemplate({ name: '', subject: '', body: '', category: '' });
      setShowTemplateForm(false);
      toast.success(payload?.message || 'Đã thêm mẫu thông báo');
    } catch (error: unknown) {
      console.error('Error adding template:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể thêm mẫu');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/notifications/templates/${id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || payload?.message || 'Không thể xóa mẫu');
        return;
      }

      setTemplates((prev) => prev.filter((template) => template.id !== id));
      toast.success(payload?.message || 'Đã xóa mẫu thông báo');
    } catch (error: unknown) {
      console.error('Error deleting template:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa mẫu');
    }
  };

  const handleCopyTemplate = (body: string) => {
    void navigator.clipboard.writeText(body);
    toast.success('Đã sao chép nội dung');
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!settings) {
    return (
      <div className="page-shell">
        <section className="page-surface rounded-[1.75rem] p-8 text-center text-gray-600">
          Không thể tải cài đặt thông báo
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <header className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                <Settings className="h-6 w-6 text-blue-600" />
                Cài đặt thông báo
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                Quản lý kênh gửi, chính sách lịch gửi và thư viện mẫu thông báo dùng chung.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:bg-gray-400"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <section className="content-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Bell className="h-5 w-5 text-blue-600" />
              Kênh thông báo
            </h2>
            <div className="space-y-4">
              {settings.channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {channel.type === 'email' ? (
                      <Mail className="h-5 w-5 text-blue-600" />
                    ) : channel.type === 'sms' ? (
                      <MessageSquare className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Bell className="h-5 w-5 text-purple-600" />
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
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={channel.is_enabled}
                        onChange={(event) => {
                          const next = settings.channels.map((item) =>
                            item.id === channel.id
                              ? { ...item, is_enabled: event.target.checked }
                              : item
                          );
                          setSettings({ ...settings, channels: next });
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {channel.is_enabled ? 'Bật' : 'Tắt'}
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        checked={channel.is_default}
                        onChange={() => {
                          const next = settings.channels.map((item) =>
                            item.id === channel.id
                              ? { ...item, is_default: true }
                              : { ...item, is_default: false }
                          );
                          setSettings({ ...settings, channels: next });
                        }}
                        className="h-4 w-4 rounded-full border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Mặc định</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="content-card p-5">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Chính sách gửi</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Thời gian gửi mặc định
                </label>
                <input
                  type="time"
                  value={settings.default_time}
                  onChange={(event) =>
                    setSettings({ ...settings, default_time: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Dùng khi lên lịch nhưng chưa chọn giờ cụ thể.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.batch_notifications}
                  onChange={(event) =>
                    setSettings({ ...settings, batch_notifications: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Gộp thông báo theo lô</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allow_scheduling}
                  onChange={(event) =>
                    setSettings({ ...settings, allow_scheduling: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Cho phép lên lịch gửi</span>
              </label>
            </div>
          </section>

          <section className="content-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Mẫu thông báo</h2>
              <button
                type="button"
                onClick={() => setShowTemplateForm((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Thêm mẫu
              </button>
            </div>

            {showTemplateForm && (
              <div className="mb-6 border-b border-gray-200 pb-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Tên mẫu</label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(event) =>
                        setNewTemplate((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Ví dụ: Nhắc điểm danh đầu tuần"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Danh mục</label>
                    <select
                      value={newTemplate.category}
                      onChange={(event) =>
                        setNewTemplate((prev) => ({ ...prev, category: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      <option value="announcement">Thông báo</option>
                      <option value="event">Sự kiện</option>
                      <option value="award">Khen thưởng</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tiêu đề (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={newTemplate.subject}
                      onChange={(event) =>
                        setNewTemplate((prev) => ({ ...prev, subject: event.target.value }))
                      }
                      placeholder="Tiêu đề dùng cho email"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Nội dung</label>
                    <textarea
                      value={newTemplate.body}
                      onChange={(event) =>
                        setNewTemplate((prev) => ({ ...prev, body: event.target.value }))
                      }
                      placeholder="Nội dung thông báo..."
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAddTemplate()}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      Lưu mẫu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTemplateForm(false)}
                      className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {templates.length === 0 ? (
                <p className="py-6 text-center text-gray-500">Chưa có mẫu nào</p>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500">
                          {template.category} •{' '}
                          {formatVietnamDateTime(template.created_at, 'date')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyTemplate(template.body)}
                          className="rounded p-2 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Sao chép"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateToDelete(template)}
                          className="rounded p-2 text-red-600 transition-colors hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {template.subject && (
                      <div className="mb-1 text-sm font-medium text-gray-700">
                        Tiêu đề: {template.subject}
                      </div>
                    )}
                    <div className="line-clamp-3 rounded bg-gray-50 p-2 text-sm text-gray-600">
                      {template.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
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
      </section>
    </div>
  );
}
