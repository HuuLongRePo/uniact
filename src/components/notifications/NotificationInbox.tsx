'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { executeNotificationAction, resolveNotificationActionButtons } from '@/lib/notification-actions';
import { normalizeActionButtons, RealtimeNotificationActionButton } from '@/lib/realtime-notification-model';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  related_table: string | null;
  related_id: number | null;
  is_read: number;
  created_at: string;
  action_buttons?: unknown;
}

interface NotificationSettings {
  email_enabled: boolean;
  new_activity_enabled: boolean;
  reminder_enabled: boolean;
  reminder_days: number;
}

interface NotificationInboxProps {
  title?: string;
  showSettings?: boolean;
}

const PER_PAGE = 20;

export default function NotificationInbox({ title = 'Thông báo', showSettings = false }: NotificationInboxProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    new_activity_enabled: true,
    reminder_enabled: true,
    reminder_days: 1,
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const fetchNotifications = useEffectEventCompat(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.set('unread', '1');
      }
      if (page > 1) {
        params.set('page', String(page));
      }
      if (PER_PAGE !== 20) {
        params.set('per_page', String(PER_PAGE));
      }

      const query = params.toString();
      const response = await fetch(query ? `/api/notifications?${query}` : '/api/notifications');
      const payload = await response.json();
      const normalized = payload?.data || payload;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải thông báo');
      }

      setNotifications(normalized?.notifications || []);
      setUnreadCount(normalized?.meta?.total_unread || 0);
      setTotal(normalized?.meta?.total || 0);
    } catch (error: unknown) {
      console.error('Fetch notifications error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  });

  const fetchSettings = useEffectEventCompat(async () => {
    if (!showSettings) return;

    try {
      const response = await fetch('/api/notifications/settings');
      const payload = await response.json();
      const normalized = payload?.data || payload;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải cài đặt thông báo');
      }

      const nextSettings = normalized?.settings;
      if (!nextSettings) return;

      setSettings({
        email_enabled: !!nextSettings.email_enabled,
        new_activity_enabled: !!nextSettings.new_activity_enabled,
        reminder_enabled: !!nextSettings.reminder_enabled,
        reminder_days: Number(nextSettings.reminder_days || 1),
      });
    } catch (error: unknown) {
      console.error('Fetch settings error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải cài đặt thông báo');
    }
  });

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications, filter, page]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [notifications]);

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error('Không thể đánh dấu đã đọc');
      }

      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark notification read error:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleNotificationAction = async (
    notification: NotificationItem,
    button: RealtimeNotificationActionButton
  ) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    executeNotificationAction(button);
  };

  const markSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!response.ok) {
        throw new Error('Không thể đánh dấu đã đọc');
      }

      const selected = new Set(selectedIds);
      const newlyRead = notifications.filter((item) => selected.has(item.id) && !item.is_read).length;
      setNotifications((prev) => prev.map((item) => (selected.has(item.id) ? { ...item, is_read: 1 } : item)));
      setSelectedIds(new Set());
      setUnreadCount((prev) => Math.max(0, prev - newlyRead));
      toast.success('Đã đánh dấu đã đọc cho thông báo đã chọn');
    } catch (error) {
      console.error('Mark selected notifications read error:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const markCurrentPageAsRead = async () => {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (unreadIds.length === 0) return;

    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
      if (!response.ok) {
        throw new Error('Không thể đánh dấu đã đọc');
      }

      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
      setUnreadCount((prev) => Math.max(0, prev - unreadIds.length));
      setSelectedIds(new Set());
      toast.success('Đã đánh dấu đã đọc trang hiện tại');
    } catch (error) {
      console.error('Mark page notifications read error:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!response.ok) {
        throw new Error('Không thể xóa thông báo');
      }

      const selected = new Set(selectedIds);
      const deletedUnread = notifications.filter((item) => selected.has(item.id) && !item.is_read).length;
      setNotifications((prev) => prev.filter((item) => !selected.has(item.id)));
      setSelectedIds(new Set());
      setUnreadCount((prev) => Math.max(0, prev - deletedUnread));
      setTotal((prev) => Math.max(0, prev - selected.size));
      setIsDeleteConfirmOpen(false);
      toast.success('Đã xóa thông báo đã chọn');
    } catch (error) {
      console.error('Delete selected notifications error:', error);
      toast.error('Không thể xóa thông báo');
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể lưu cài đặt thông báo');
      }
      toast.success(payload?.message || 'Đã lưu cài đặt thông báo');
      setShowSettingsModal(false);
    } catch (error: unknown) {
      console.error('Save notification settings error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể lưu cài đặt thông báo');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return '📝';
      case 'activity_update':
        return '📢';
      case 'attendance':
      case 'success':
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

    if (diffMins < 60) return `${Math.max(0, diffMins)} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const hasAnyUnreadOnPage = useMemo(() => notifications.some((item) => !item.is_read), [notifications]);

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 data-testid="notifications-heading" className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {title}
            </h1>
            {unreadCount > 0 ? (
              <p className="mt-1 text-sm text-gray-600">{unreadCount} thông báo chưa đọc</p>
            ) : (
              <p className="mt-1 text-sm text-gray-600">Bạn đã đọc hết thông báo</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markCurrentPageAsRead}
              disabled={!hasAnyUnreadOnPage}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đánh dấu đã đọc trang này
            </button>
            {showSettings && (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Cài đặt
              </button>
            )}
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('unread');
                setPage(1);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedIds.size} mục đã chọn</span>
              <button
                type="button"
                onClick={markSelectedAsRead}
                className="rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
              >
                Đánh dấu đã đọc
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
              >
                Xóa
              </button>
            </div>
          )}
        </div>

        <div className="content-card mb-4 flex items-center justify-between rounded-2xl bg-gray-100 px-3 py-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selectedIds.size > 0 && selectedIds.size === notifications.length}
              onChange={(event) => {
                if (event.target.checked) {
                  setSelectedIds(new Set(notifications.map((item) => item.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
            />
            <span className="text-sm text-gray-700">Chọn tất cả trong trang</span>
          </label>
          <div className="text-sm text-gray-600">
            Trang {Math.min(page, totalPages)}/{totalPages}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : notifications.length === 0 ? (
          <div className="content-card rounded-2xl py-12 text-center">
            <p className="text-lg text-gray-600">
              {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const normalizedActionButtons = normalizeActionButtons(notification.action_buttons);
              const actionButtons =
                normalizedActionButtons.length > 0
                  ? normalizedActionButtons
                  : resolveNotificationActionButtons(notification);

              return (
                <article
                  key={notification.id}
                  data-notification-id={notification.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    notification.is_read
                      ? 'border-gray-200 bg-white text-gray-900 shadow-sm'
                      : 'border-blue-300 bg-blue-50 text-gray-900 shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={selectedIds.has(notification.id)}
                    onChange={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(notification.id)) {
                          next.delete(notification.id);
                        } else {
                          next.add(notification.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <div className="flex flex-1 items-start justify-between gap-3">
                    <div className="flex flex-1 gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        <p className="mt-1 text-gray-700">{notification.message}</p>
                        <p className="mt-2 text-sm text-gray-500">{formatDate(notification.created_at)}</p>
                        {actionButtons.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {actionButtons.map((button) => (
                              <button
                                key={`${notification.id}-${button.id}`}
                                type="button"
                                onClick={() => void handleNotificationAction(notification, button)}
                                className={`rounded px-3 py-1.5 text-xs font-medium ${
                                  button.variant === 'primary'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : button.variant === 'danger'
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {button.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="content-card mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trang trước
          </button>
          <span className="text-sm text-gray-700">
            Hiển thị {(page - 1) * PER_PAGE + 1} - {Math.min(page * PER_PAGE, total)} / {total}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      </section>

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Cài đặt thông báo</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between text-gray-700">
                <span>Gửi email thông báo</span>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.email_enabled}
                  onChange={(event) => setSettings((prev) => ({ ...prev, email_enabled: event.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between text-gray-700">
                <span>Thông báo hoạt động mới</span>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.new_activity_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, new_activity_enabled: event.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between text-gray-700">
                <span>Nhắc trước hoạt động</span>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.reminder_enabled}
                  onChange={(event) => setSettings((prev) => ({ ...prev, reminder_enabled: event.target.checked }))}
                />
              </label>
              {settings.reminder_enabled && (
                <div>
                  <label className="mb-2 block text-gray-700">Nhắc trước (ngày)</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={settings.reminder_days}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        reminder_days: Math.max(1, Math.min(7, Number(event.target.value || 1))),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={saveSettings}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 rounded-xl bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
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
        onConfirm={deleteSelected}
      />
    </div>
  );
}
