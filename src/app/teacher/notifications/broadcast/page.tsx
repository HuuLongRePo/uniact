'use client';

import { useState, useEffect } from 'react';
import { Send, Clock, Users, Trash2, Edit2, Save } from 'lucide-react';
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

export default function BroadcastNotificationsPage() {
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'sent'>('all');
  const [pendingAction, setPendingAction] = useState<PendingBroadcastAction>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_type: 'all' as 'all' | 'class' | 'grade',
    target_ids: [] as number[],
    scheduled_at: '',
    is_draft: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notificationsRes, classesRes] = await Promise.all([
        fetch(`/api/teacher/broadcast-notifications?status=${filter}`),
        fetch('/api/classes'),
      ]);

      if (!notificationsRes.ok) throw new Error('Không thể tải thông báo');

      const notificationsData = await notificationsRes.json();
      setNotifications(notificationsData.notifications || []);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
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
      toast.error('Vui lòng chọn đối tượng nhận thông báo');
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
        const error = await response.json();
        throw new Error(error.message || 'Không thể tạo thông báo');
      }

      toast.success(formData.is_draft ? 'Lưu nháp thành công' : 'Tạo thông báo thành công');
      resetForm();
      fetchData();
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
        const error = await response.json();
        throw new Error(error.message || 'Không thể cập nhật thông báo');
      }

      toast.success('Cập nhật thông báo thành công');
      resetForm();
      fetchData();
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
        const error = await response.json();
        throw new Error(error.message || 'Không thể gửi thông báo');
      }

      toast.success('Gửi thông báo thành công');
      fetchData();
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
        const error = await response.json();
        throw new Error(error.message || 'Không thể xóa thông báo');
      }

      toast.success('Xóa thông báo thành công');
      fetchData();
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
        return 'bg-yellow-100 text-yellow-700';
      case 'sent':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return '📝 Nháp';
      case 'scheduled':
        return '⏳ Đã lên lịch';
      case 'sent':
        return '✓ Đã gửi';
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Thông báo quảng bá</h1>
          <p className="text-gray-600 mt-2">Gửi thông báo đến các lớp học hoặc toàn trường</p>
        </div>

        {/* Create Button */}
        {!isCreating && !editingId ? (
          <button
            onClick={() => setIsCreating(true)}
            className="mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Tạo thông báo mới
          </button>
        ) : null}

        {/* Form */}
        {(isCreating || editingId) && (
          <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Nhập nội dung thông báo"
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đối tượng nhận *
                  </label>
                  <select
                    value={formData.target_type}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        target_type: e.target.value as typeof formData.target_type,
                        target_ids: [],
                      });
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">👥 Tất cả học viên</option>
                    <option value="class">📚 Lớp cụ thể</option>
                    <option value="grade">🎓 Khối cụ thể</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian gửi (tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Để trống để gửi ngay</p>
                </div>
              </div>

              {formData.target_type !== 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.target_type === 'class' ? 'Chọn lớp *' : 'Chọn khối *'}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {classes.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.target_ids.includes(cls.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                target_ids: [...formData.target_ids, cls.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                target_ids: formData.target_ids.filter((id) => id !== cls.id),
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
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
                  onClick={resetForm}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (editingId) {
                      handleUpdate(editingId);
                    } else {
                      handleCreate();
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {(['all', 'draft', 'scheduled', 'sent'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-3 px-4 font-medium transition ${
                filter === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'all' && '📋 Tất cả'}
              {tab === 'draft' && '📝 Nháp'}
              {tab === 'scheduled' && '⏳ Đã lên lịch'}
              {tab === 'sent' && '✓ Đã gửi'}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600">Không có thông báo nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{notification.title}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(notification.status)}`}
                      >
                        {getStatusLabel(notification.status)}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{notification.message}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {notification.recipient_count} người nhận
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(notification.created_at).toLocaleString('vi-VN')}
                      </span>
                      {notification.scheduled_at && notification.status === 'scheduled' && (
                        <span className="flex items-center gap-1 text-blue-600">
                          ⏰ Gửi: {new Date(notification.scheduled_at).toLocaleString('vi-VN')}
                        </span>
                      )}
                      {notification.sent_at && (
                        <span className="flex items-center gap-1 text-green-600">
                          ✓ Đã gửi: {new Date(notification.sent_at).toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {notification.status === 'draft' && (
                      <>
                        <button
                          onClick={() => startEditing(notification)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setPendingAction({ type: 'delete', notification })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {notification.status === 'scheduled' && (
                      <button
                        onClick={() => setPendingAction({ type: 'send', notification })}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Gửi ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
