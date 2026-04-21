export const REALTIME_NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export type RealtimeNotificationPriority = (typeof REALTIME_NOTIFICATION_PRIORITIES)[number];

export type RealtimeNotificationActionVariant = 'primary' | 'secondary' | 'danger';

export interface RealtimeNotificationActionButton {
  id: string;
  label: string;
  action: string;
  href?: string;
  variant?: RealtimeNotificationActionVariant;
}

export interface RealtimeNotificationMessage {
  id: number | null;
  type: string;
  title: string;
  message: string;
  related_table: string | null;
  related_id: number | null;
  created_at: string;
}

export interface RealtimeNotificationEvent {
  event_id: number;
  event_type: string;
  actor_id: number | null;
  target_user_ids: number[];
  priority: RealtimeNotificationPriority;
  ttl_seconds: number;
  action_buttons: RealtimeNotificationActionButton[];
  notification: RealtimeNotificationMessage;
  created_at: string;
}

const PRIORITY_DEFAULT_TTL_SECONDS: Record<RealtimeNotificationPriority, number> = {
  low: 5,
  normal: 7,
  high: 10,
  critical: 10,
};

export function isRealtimePriority(value: unknown): value is RealtimeNotificationPriority {
  return (
    typeof value === 'string' &&
    REALTIME_NOTIFICATION_PRIORITIES.includes(value as RealtimeNotificationPriority)
  );
}

export function clampToastTtlSeconds(
  priority: RealtimeNotificationPriority,
  ttlSeconds?: number | null
): number {
  const fallback = PRIORITY_DEFAULT_TTL_SECONDS[priority] ?? PRIORITY_DEFAULT_TTL_SECONDS.normal;
  const candidate = Number(ttlSeconds);

  if (!Number.isFinite(candidate)) {
    return fallback;
  }

  return Math.min(10, Math.max(5, Math.round(candidate)));
}

export function getToastDurationMs(
  priority: RealtimeNotificationPriority,
  ttlSeconds?: number | null
) {
  return clampToastTtlSeconds(priority, ttlSeconds) * 1000;
}

export function normalizeActionButtons(actionButtons: unknown): RealtimeNotificationActionButton[] {
  if (!Array.isArray(actionButtons)) {
    return [];
  }

  const normalized = actionButtons
    .map((button, index) => {
      if (!button || typeof button !== 'object') return null;
      const source = button as Record<string, unknown>;
      const label = String(source.label || '').trim();
      const action = String(source.action || '').trim();
      const href = String(source.href || '').trim();
      const id = String(source.id || `action_${index + 1}`).trim();
      const variant = String(source.variant || '').trim();

      if (!label) return null;
      if (!action && !href) return null;

      const nextVariant: RealtimeNotificationActionVariant =
        variant === 'primary' || variant === 'danger' ? variant : 'secondary';

      const normalizedButton: RealtimeNotificationActionButton = {
        id: id || `action_${index + 1}`,
        label,
        action: action || 'open_link',
        ...(href ? { href } : {}),
        variant: nextVariant,
      };

      return normalizedButton;
    })
    .filter((button): button is RealtimeNotificationActionButton => Boolean(button));

  return normalized.slice(0, 3);
}
