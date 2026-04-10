'use client';

import { useState, useEffect } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_table: string | null;
  related_id: number | null;
  is_read: number;
  created_at: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  new_activity_enabled: boolean;
  reminder_enabled: boolean;
  reminder_days: number;
}

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    new_activity_enabled: true,
    reminder_enabled: true,
    reminder_days: 1,
  });

  const fetchNotifications = useEffectEventCompat(async () => {
    try {
      setLoading(true);
      const query = filter === 'unread' ? '?unread=1' : '';
      const res = await fetch(`/api/notifications${query}`);
      const data = await res.json();

      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.meta?.total_unread || 0);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  });

  const fetchSettings = useEffectEventCompat(async () => {
    try {
      const res = await fetch('/api/notifications/settings');
      const data = await res.json();

      if (res.ok && data.settings) {
        setSettings({
          email_enabled: !!data.settings.email_enabled,
          new_activity_enabled: !!data.settings.new_activity_enabled,
          reminder_enabled: !!data.settings.reminder_enabled,
          reminder_days: data.settings.reminder_days || 1,
        });
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
    }
  });

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchSettings();
    }
  }, [user, filter, fetchNotifications, fetchSettings]);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const toggleSelectNotification = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      const res = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        toast.success('Đã xóa thông báo đã chọn');
        setSelectedIds(new Set());
        fetchNotifications();
      } else {
        toast.error('Không thể xóa thông báo');
      }
    } catch (error) {
      console.error('Delete notifications error:', error);
      toast.error('Không thể xóa thông báo');
    }
  };

  const markSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        toast.success('Đã đánh dấu là đã đọc');
        setSelectedIds(new Set());
        fetchNotifications();
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('Đã lưu cài đặt thông báo');
        setShowSettings(false);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Lỗi khi lưu cài đặt');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return '📝';
      case 'activity_update':
        return '📢';
      case 'attendance':
        return '✅';
      case 'award':
        return '🏆';
      case 'system':
        return '🔔';
      default:
        return '💬';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (!user) {
    return <div className="p-8 text-center">Vui lòng đăng nhập</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 data-testid="notifications-heading" className="text-3xl font-bold text-gray-900">
            Thông báo
          </h1>
          {unreadCount > 0 && (
            <p className="text-gray-600 mt-1">{unreadCount} thông báo chưa đọc</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Đánh dấu tất cả đã đọc
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ⚙️ Cài đặt
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`pb-2 px-4 font-medium ${
              filter === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`pb-2 px-4 font-medium ${
              filter === 'unread'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">{selectedIds.size} đã chọn</span>
            <button
              onClick={markSelectedAsRead}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              Đánh dấu đã đọc
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Xóa
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">
            {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={selectedIds.size === notifications.length}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">
              {selectedIds.size === notifications.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </span>
          </div>

          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(notification.id)}
                onChange={() => toggleSelectNotification(notification.id)}
                className="w-4 h-4 mt-1"
              />
              <div className="flex items-start justify-between flex-1">
                <div className="flex gap-3 flex-1">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <p className="text-gray-700 mt-1">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Cài đặt thông báo</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-700">Gửi email thông báo</label>
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-700">Thông báo hoạt động mới</label>
                <input
                  type="checkbox"
                  checked={settings.new_activity_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, new_activity_enabled: e.target.checked })
                  }
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-700">Nhắc nhở trước hoạt động</label>
                <input
                  type="checkbox"
                  checked={settings.reminder_enabled}
                  onChange={(e) => setSettings({ ...settings, reminder_enabled: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              {settings.reminder_enabled && (
                <div>
                  <label className="text-gray-700 block mb-2">Nhắc trước (ngày)</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={settings.reminder_days}
                    onChange={(e) =>
                      setSettings({ ...settings, reminder_days: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSettings}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Lưu
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Xóa thông báo"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.size} thông báo đã chọn không?`}
        confirmText="Xóa thông báo"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async () => {
          await deleteSelected();
          setIsDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
}
