'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getToastDurationMs,
  normalizeActionButtons,
  RealtimeNotificationActionButton,
  RealtimeNotificationEvent,
} from '@/lib/realtime-notification-model';

type ApiNotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  related_table: string | null;
  related_id: number | null;
  is_read: number;
  created_at: string;
};

const POLLING_INTERVAL_MS = 15000;

function toSafeInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function adaptApiNotificationToRealtime(notification: ApiNotificationItem): RealtimeNotificationEvent {
  return {
    event_id: -Math.abs(Number(notification.id || 0)),
    event_type: 'notification.polling',
    actor_id: null,
    target_user_ids: [],
    priority: 'normal',
    ttl_seconds: 7,
    action_buttons: [],
    notification: {
      id: notification.id,
      type: notification.type || 'system',
      title: notification.title || 'Thông báo mới',
      message: notification.message || '',
      related_table: notification.related_table || null,
      related_id: notification.related_id || null,
      created_at: notification.created_at || new Date().toISOString(),
    },
    created_at: notification.created_at || new Date().toISOString(),
  };
}

function resolveFallbackActionButtons(
  event: RealtimeNotificationEvent
): RealtimeNotificationActionButton[] {
  const fallbackButtons: RealtimeNotificationActionButton[] = [];

  if (event.notification.related_table === 'activities' && event.notification.related_id) {
    fallbackButtons.push({
      id: 'view_detail',
      label: 'Xem chi tiết',
      action: 'open_detail',
      href: `/activities/${event.notification.related_id}`,
      variant: 'primary',
    });
  }

  fallbackButtons.push({
    id: 'dismiss',
    label: 'Bỏ qua',
    action: 'dismiss',
    variant: 'secondary',
  });

  return fallbackButtons.slice(0, 3);
}

export function RealtimeNotificationBridge() {
  const { user } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const activeRef = useRef(false);
  const knownNotificationIdsRef = useRef<Set<number>>(new Set());
  const lastEventIdRef = useRef(0);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const stopPolling = () => {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const showRealtimeToast = (event: RealtimeNotificationEvent) => {
    const normalizedButtons = normalizeActionButtons(event.action_buttons);
    const buttons =
      normalizedButtons.length > 0 ? normalizedButtons : resolveFallbackActionButtons(event);
    const duration = getToastDurationMs(event.priority, event.ttl_seconds);

    toast.custom(
      (toastItem) => (
        <div
          data-testid="realtime-notification-toast"
          className="w-[340px] rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        >
          <p className="text-sm font-semibold text-gray-900">{event.notification.title}</p>
          <p className="mt-1 text-sm text-gray-700">{event.notification.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                className={`rounded px-2 py-1 text-xs font-medium ${
                  button.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : button.variant === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => {
                  if (button.href) {
                    window.location.href = button.href;
                  } else if (button.action !== 'dismiss') {
                    window.dispatchEvent(
                      new CustomEvent('realtime-notification-action', {
                        detail: {
                          event,
                          button,
                        },
                      })
                    );
                  }

                  toast.dismiss(toastItem.id);
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      ),
      {
        id: `realtime-notification-${event.event_id}`,
        duration,
      }
    );
  };

  const fetchNotificationsForPolling = async (seedOnly = false) => {
    const response = await fetch('/api/notifications?per_page=20', {
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`polling_failed_${response.status}`);
    }

    const body = await response.json();
    const notifications: ApiNotificationItem[] = body?.data?.notifications || body?.notifications || [];

    for (const item of notifications) {
      const id = toSafeInteger(item.id, 0);
      if (!id) continue;

      const alreadyKnown = knownNotificationIdsRef.current.has(id);
      knownNotificationIdsRef.current.add(id);

      if (seedOnly || alreadyKnown || item.is_read) {
        continue;
      }

      showRealtimeToast(adaptApiNotificationToRealtime(item));
    }
  };

  const startPolling = () => {
    if (pollingTimerRef.current !== null) return;
    pollingTimerRef.current = window.setInterval(() => {
      void fetchNotificationsForPolling(false).catch(() => undefined);
    }, POLLING_INTERVAL_MS);
  };

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const scheduleReconnect = () => {
    if (!activeRef.current || reconnectTimerRef.current !== null) {
      return;
    }

    reconnectAttemptsRef.current += 1;
    const retryDelayMs = Math.min(15000, 1000 * 2 ** Math.min(reconnectAttemptsRef.current, 4));

    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!activeRef.current) {
        return;
      }
      connectEventStream();
    }, retryDelayMs);
  };

  const connectEventStream = () => {
    if (!activeRef.current) return;

    closeEventSource();
    stopPolling();

    const cursorQuery =
      lastEventIdRef.current > 0 ? `?last_event_id=${lastEventIdRef.current}` : '';
    const source = new EventSource(`/api/notifications/stream${cursorQuery}`);
    eventSourceRef.current = source;

    source.addEventListener('ready', () => {
      reconnectAttemptsRef.current = 0;
      stopPolling();
    });

    source.addEventListener('notification', (message) => {
      try {
        const payload = JSON.parse((message as MessageEvent).data || '{}') as RealtimeNotificationEvent;
        if (!payload || typeof payload !== 'object') {
          return;
        }

        const eventId = toSafeInteger((payload as RealtimeNotificationEvent).event_id, 0);
        if (eventId > 0) {
          lastEventIdRef.current = Math.max(lastEventIdRef.current, eventId);
        }

        const notificationId = toSafeInteger(payload.notification?.id, 0);
        if (notificationId > 0) {
          knownNotificationIdsRef.current.add(notificationId);
        }

        showRealtimeToast(payload);
      } catch (error) {
        console.error('Realtime notification parse error:', error);
      }
    });

    source.onerror = () => {
      closeEventSource();
      startPolling();
      scheduleReconnect();
    };
  };

  useEffect(() => {
    if (!user) {
      activeRef.current = false;
      closeEventSource();
      clearReconnectTimer();
      stopPolling();
      return;
    }

    activeRef.current = true;
    reconnectAttemptsRef.current = 0;
    clearReconnectTimer();
    stopPolling();
    knownNotificationIdsRef.current = new Set();
    lastEventIdRef.current = 0;

    void fetchNotificationsForPolling(true).catch(() => undefined);
    connectEventStream();

    return () => {
      activeRef.current = false;
      closeEventSource();
      clearReconnectTimer();
      stopPolling();
    };
  }, [user?.id]);

  return null;
}
