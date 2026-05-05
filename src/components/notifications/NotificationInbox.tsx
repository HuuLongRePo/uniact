'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Megaphone,
  MessageSquareMore,
  Trash2,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import {
  executeNotificationAction,
  NotificationRecipientRole,
  resolveNotificationActionButtons,
} from '@/lib/notification-actions';
import { RealtimeNotificationActionButton } from '@/lib/realtime-notification-model';
import { formatDate as formatDateVN } from '@/lib/formatters';
import { parseVietnamDate } from '@/lib/timezone';

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
  leadingContent?: ReactNode;
}

const PER_PAGE = 20;

function resolveRecipientRoleFromPathname(pathname: string): NotificationRecipientRole {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  return 'student';
}

function resolveNotificationTypeLabel(type: string) {
  switch (type) {
    case 'registration':
      return 'Đăng ký';
    case 'activity_update':
      return 'Cập nhật hoạt động';
    case 'attendance':
    case 'success':
      return 'Điểm danh';
    case 'award':
      return 'Khen thưởng';
    case 'broadcast':
      return 'Thông báo chung';
    case 'system':
      return 'Hệ thống';
    default:
      return 'Thông báo';
  }
}

function NotificationTypeIcon({ type }: { type: string }) {
  if (type === 'registration') return <ClipboardCheck className="h-5 w-5 text-blue-600" />;
  if (type === 'activity_update') return <Megaphone className="h-5 w-5 text-indigo-600" />;
  if (type === 'attendance' || type === 'success') {
    return <CalendarCheck2 className="h-5 w-5 text-emerald-600" />;
  }
  if (type === 'award') return <CheckCircle2 className="h-5 w-5 text-amber-600" />;
  if (type === 'broadcast') return <MessageSquareMore className="h-5 w-5 text-sky-600" />;
  if (type === 'system') return <BellRing className="h-5 w-5 text-violet-600" />;
  return <Bell className="h-5 w-5 text-slate-600" />;
}

function EmptyState({ filter }: { filter: 'all' | 'unread' }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-slate-600 dark:bg-slate-800/60">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
      </h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Khi có bản tin mới, danh sách này sẽ cập nhật ngay trên màn hình học viên.
      </p>
    </div>
  );
}

export default function NotificationInbox({
  title = 'Thông báo',
  showSettings = false,
  leadingContent = null,
}: NotificationInboxProps) {
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

  const recipientRole = useMemo<NotificationRecipientRole>(() => {
    if (typeof window === 'undefined') return 'student';
    return resolveRecipientRoleFromPathname(window.location.pathname);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * PER_PAGE, total);

  const fetchNotifications = useEffectEventCompat(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('unread', '1');
      if (page > 1) params.set('page', String(page));
      if (PER_PAGE !== 20) params.set('per_page', String(PER_PAGE));

      const query = params.toString();
      const response = await fetch(query ? `/api/notifications?${query}` : '/api/notifications');
      const payload = await response.json();
      const normalized = payload?.data || payload;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải thông báo');
      }

      setNotifications(normalized?.notifications || []);
      setUnreadCount(Number(normalized?.meta?.total_unread || 0));
      setTotal(Number(normalized?.meta?.total || 0));
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

  async function markAsRead(id: number) {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error('Không thể đánh dấu đã đọc');
      }

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark notification read error:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  }

  async function handleNotificationAction(
    notification: NotificationItem,
    button: RealtimeNotificationActionButton
  ) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    executeNotificationAction(button);
  }

  async function markSelectedAsRead() {
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
      const newlyRead = notifications.filter(
        (item) => selected.has(item.id) && !item.is_read
      ).length;

      setNotifications((prev) =>
        prev.map((item) => (selected.has(item.id) ? { ...item, is_read: 1 } : item))
      );
      setSelectedIds(new Set());
      setUnreadCount((prev) => Math.max(0, prev - newlyRead));
      toast.success('Đã đánh dấu đã đọc cho các mục đã chọn');
    } catch (error) {
      console.error('Mark selected notifications read error:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  }

  async function markCurrentPageAsRead() {
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
      toast.success('Đã đánh dấu đã đọc cho trang hiện tại');
    } catch (error) {
      console.error('Mark current page notifications read error:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  }

  async function deleteSelected() {
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
      const deletedUnread = notifications.filter(
        (item) => selected.has(item.id) && !item.is_read
      ).length;

      setNotifications((prev) => prev.filter((item) => !selected.has(item.id)));
      setSelectedIds(new Set());
      setUnreadCount((prev) => Math.max(0, prev - deletedUnread));
      setTotal((prev) => Math.max(0, prev - selected.size));
      setIsDeleteConfirmOpen(false);
      toast.success('Đã xóa các thông báo đã chọn');
    } catch (error) {
      console.error('Delete selected notifications error:', error);
      toast.error('Không thể xóa thông báo');
    }
  }

  async function saveSettings() {
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
  }

  function formatRelativeDate(dateString: string) {
    const date = parseVietnamDate(dateString);
    if (!date) return '-';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${Math.max(0, diffMins)} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDateVN(dateString, 'date');
  }

  const hasAnyUnreadOnPage = useMemo(
    () => notifications.some((item) => !item.is_read),
    [notifications]
  );

  return (
    <div className="page-shell">
      {leadingContent ? <div className="mx-auto mb-4 max-w-6xl">{leadingContent}</div> : null}
      <section className="page-surface overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-7">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1
              data-testid="notifications-heading"
              className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl"
            >
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : 'Bạn đã đọc hết thông báo hiện có.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[20rem] lg:justify-end">
            <button
              type="button"
              onClick={markCurrentPageAsRead}
              disabled={!hasAnyUnreadOnPage}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đánh dấu đã đọc trang này
            </button>
            {showSettings ? (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Cài đặt
              </button>
            ) : null}
          </div>
        </header>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
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
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {selectedIds.size > 0 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10 sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Đã chọn {selectedIds.size} thông báo
              </span>
              <button
                type="button"
                onClick={markSelectedAsRead}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
              >
                Đánh dấu đã đọc
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
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
            Chọn tất cả trong trang
          </label>

          <div className="text-sm text-slate-600 dark:text-slate-300">
            Trang {Math.min(page, totalPages)}/{totalPages}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <LoadingSpinner />
          ) : notifications.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const actionButtons = resolveNotificationActionButtons({
                  ...notification,
                  recipient_role: recipientRole,
                });

                return (
                  <article
                    key={notification.id}
                    data-notification-id={notification.id}
                    className={`rounded-[1.5rem] border p-4 shadow-sm transition ${
                      notification.is_read
                        ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70'
                        : 'border-blue-200 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0"
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

                      <div className="mt-0.5 rounded-full border border-white bg-white p-2 shadow-sm">
                        <NotificationTypeIcon type={notification.type} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                                {resolveNotificationTypeLabel(notification.type)}
                              </span>
                              {!notification.is_read ? (
                                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                                  Mới
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
                              {notification.title}
                            </h3>
                            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{notification.message}</p>
                          </div>

                          <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatRelativeDate(notification.created_at)}
                            </span>
                            {!notification.is_read ? (
                              <button
                                type="button"
                                onClick={() => void markAsRead(notification.id)}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
                              >
                                Đánh dấu đã đọc
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {actionButtons.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {actionButtons.map((button) => (
                              <button
                                key={`${notification.id}-${button.id}`}
                                type="button"
                                onClick={() => void handleNotificationAction(notification, button)}
                                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                  button.variant === 'primary'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : button.variant === 'danger'
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {button.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Trang trước
          </button>

          <span className="text-sm text-slate-600 dark:text-slate-300">
            Hiển thị {rangeStart} - {rangeEnd} / {total}
          </span>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Trang sau
          </button>
        </div>
      </section>

      {showSettingsModal ? (
        <div className="app-modal-backdrop px-4 py-6" onClick={() => setShowSettingsModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-settings-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-lg p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="notification-settings-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Cài đặt thông báo
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Điều chỉnh cách hệ thống gửi nhắc nhở và cập nhật tới tài khoản học viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gửi email thông báo</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Nhận email khi có bản tin quan trọng.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.email_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, email_enabled: event.target.checked }))
                  }
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Thông báo hoạt động mới
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Báo khi có hoạt động mới phù hợp với lớp học.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.new_activity_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, new_activity_enabled: event.target.checked }))
                  }
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nhắc trước hoạt động</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Gửi nhắc trước ngày diễn ra hoạt động.
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={settings.reminder_enabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, reminder_enabled: event.target.checked }))
                  }
                />
              </label>

              {settings.reminder_enabled ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Nhắc trước bao nhiêu ngày
                  </span>
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
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  />
                </label>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void saveSettings()}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
