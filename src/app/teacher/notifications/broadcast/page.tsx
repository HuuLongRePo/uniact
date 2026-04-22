'use client';

import { useEffect, useState } from 'react';
import { Clock, Edit2, Plus, Save, Send, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Class {
  id: number;
  name: string;
  student_count: number;
}

interface BroadcastNotification {
  id: number;
  title: string;
  message: string;
  target_type: 'all' | 'class' | 'grade';
  target_ids?: number[];
  target_names?: string;
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  status: 'draft' | 'scheduled' | 'sent';
  created_at: string;
  created_by: string;
}

type PendingBroadcastAction = {
  type: 'send' | 'delete';
  notification: BroadcastNotification;
} | null;

function getClasses(payload: unknown): Class[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as {
    classes?: Class[];
    data?: {
      classes?: Class[];
    };
  };
  return data.data?.classes ?? data.classes ?? [];
}

function getNotifications(payload: unknown): BroadcastNotification[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as {
    notifications?: BroadcastNotification[];
    data?: {
      notifications?: BroadcastNotification[];
    };
  };
  return data.data?.notifications ?? data.notifications ?? [];
}

export default function BroadcastNotificationsPage() {
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'sent'>('all');
  const [pendingAction, setPendingAction] = useState<PendingBroadcastAction>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_type: 'all' as 'all' | 'class' | 'grade',
    target_ids: [] as number[],
    scheduled_at: '',
    is_draft: true,
  });

  useEffect(() => {
    void fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notificationsRes, classesRes] = await Promise.all([
        fetch(`/api/teacher/broadcast-notifications?status=${filter}`),
        fetch('/api/classes'),
      ]);

      if (!notificationsRes.ok) throw new Error('Không thể tải thông báo quảng bá');
      const notificationsData = await notificationsRes.json();
      setNotifications(getNotifications(notificationsData));

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(getClasses(classesData));
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Vui lòng nhập nội dung');
      return;
    }
    if (formData.target_type !== 'all' && formData.target_ids.length === 0) {
      toast.error('Vui lòng chọn đối tượng nhận');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/teacher/broadcast-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          is_draft: !formData.scheduled_at,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Không thể tạo thông báo');
      }

      toast.success(formData.scheduled_at ? 'Đã tạo thông báo theo lịch' : 'Đã lưu bản nháp');
      resetForm();
      await fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể tạo thông báo');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Vui lòng nhập nội dung');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/teacher/broadcast-notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          is_draft: !formData.scheduled_at,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Không thể cập nhật thông báo');
      }

      toast.success('Đã cập nhật thông báo');
      resetForm();
      await fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thông báo');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/broadcast-notifications/${id}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Không thể gửi thông báo');
      }

      toast.success('Đã gửi thông báo');
      await fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể gửi thông báo');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/broadcast-notifications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Không thể xóa thông báo');
      }

      toast.success('Đã xóa thông báo');
      await fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa thông báo');
    }
  };

  const startEditing = (notification: BroadcastNotification) => {
    setFormData({
      title: notification.title,
      message: notification.message,
      target_type: notification.target_type,
      target_ids: notification.target_ids || [],
      scheduled_at: notification.scheduled_at || '',
      is_draft: notification.status === 'draft',
    });
    setEditingId(notification.id);
    setIsCreating(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      target_type: 'all',
      target_ids: [],
      scheduled_at: '',
      is_draft: true,
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-blue-100 text-blue-700';
      case 'scheduled':
        return 'bg-amber-100 text-amber-700';
      case 'sent':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Nháp';
      case 'scheduled':
        return 'Đã lên lịch';
      case 'sent':
        return 'Đã gửi';
      default:
        return status;
    }
  };

  const confirmConfig =
    pendingAction?.type === 'send'
      ? {
          title: 'Gửi thông báo ngay',
          message: pendingAction
            ? `Bạn có chắc chắn muốn gửi ngay thông báo "${pendingAction.notification.title}"?`
            : '',
          confirmText: 'Gửi ngay',
          variant: 'warning' as const,
        }
      : {
          title: 'Xóa thông báo',
          message: pendingAction
            ? `Bạn có chắc chắn muốn xóa thông báo "${pendingAction.notification.title}"?`
            : '',
          confirmText: 'Xóa thông báo',
          variant: 'danger' as const,
        };

  if (loading && !isCreating && !editingId) {
    return (
      <div className="page-shell">
        <section className="page-surface rounded-[1.75rem] p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <header className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Thông báo quảng bá</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
            Gửi broadcast đến lớp học hoặc toàn trường theo hình thức nháp, lên lịch hoặc gửi ngay.
          </p>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          {!isCreating && !editingId && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Tạo thông báo mới
            </button>
          )}

          {(isCreating || editingId) && (
            <div className="content-card p-5">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                {editingId ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Tiêu đề *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Nhập tiêu đề thông báo"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Nội dung *</label>
                  <textarea
                    value={formData.message}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="Nhập nội dung thông báo"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Đối tượng nhận *
                    </label>
                    <select
                      value={formData.target_type}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          target_type: event.target.value as typeof formData.target_type,
                          target_ids: [],
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Tất cả học viên</option>
                      <option value="class">Lớp cụ thể</option>
                      <option value="grade">Khối cụ thể</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Thời gian gửi (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, scheduled_at: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Để trống nếu muốn lưu nháp hoặc gửi ngay.
                    </p>
                  </div>
                </div>

                {formData.target_type !== 'all' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {formData.target_type === 'class' ? 'Chọn lớp *' : 'Chọn khối *'}
                    </label>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-4">
                      {classes.map((cls) => (
                        <label key={cls.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.target_ids.includes(cls.id)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  target_ids: [...prev.target_ids, cls.id],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  target_ids: prev.target_ids.filter((id) => id !== cls.id),
                                }));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            {cls.name} ({cls.student_count} học viên)
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId) {
                        void handleUpdate(editingId);
                      } else {
                        void handleCreate();
                      }
                    }}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 border-b border-gray-200">
            {(['all', 'draft', 'scheduled', 'sent'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-4 py-3 text-sm font-medium transition ${
                  filter === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'all' && 'Tất cả'}
                {tab === 'draft' && 'Nháp'}
                {tab === 'scheduled' && 'Đã lên lịch'}
                {tab === 'sent' && 'Đã gửi'}
              </button>
            ))}
          </div>

          {notifications.length === 0 ? (
            <div className="content-card p-12 text-center">
              <p className="text-gray-600">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className="content-card p-6 transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{notification.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(notification.status)}`}
                        >
                          {getStatusLabel(notification.status)}
                        </span>
                      </div>
                      <p className="mb-3 whitespace-pre-wrap text-gray-700">
                        {notification.message}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {notification.recipient_count} người nhận
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(notification.created_at).toLocaleString('vi-VN')}
                        </span>
                        {notification.scheduled_at && notification.status === 'scheduled' && (
                          <span className="text-blue-600">
                            Gửi lúc {new Date(notification.scheduled_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                        {notification.sent_at && (
                          <span className="text-emerald-600">
                            Đã gửi lúc {new Date(notification.sent_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {notification.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(notification)}
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'delete', notification })}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                            title="Xóa"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {notification.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => setPendingAction({ type: 'send', notification })}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
                        >
                          <Send className="h-4 w-4" />
                          Gửi ngay
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Hủy"
        variant={confirmConfig.variant}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          if (pendingAction.type === 'send') {
            await handleSend(pendingAction.notification.id);
          } else {
            await handleDelete(pendingAction.notification.id);
          }
          setPendingAction(null);
        }}
      />
    </div>
  );
}
