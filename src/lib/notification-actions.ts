import {
  normalizeActionButtons,
  RealtimeNotificationActionButton,
} from '@/lib/realtime-notification-model';

export type NotificationActionSource = {
  type?: string | null;
  related_table?: string | null;
  related_id?: number | null;
  action_buttons?: unknown;
};

export function resolveNotificationActionButtons(
  notification: NotificationActionSource
): RealtimeNotificationActionButton[] {
  const directButtons = normalizeActionButtons(notification.action_buttons);
  if (directButtons.length > 0) {
    return directButtons;
  }

  const relatedTable = String(notification.related_table || '').trim();
  const relatedId = Number(notification.related_id || 0);
  const notificationType = String(notification.type || '').trim();

  if (relatedTable === 'activities' && relatedId > 0) {
    if (notificationType === 'attendance' || notificationType === 'success') {
      return [
        {
          id: 'open_checkin',
          label: 'Điểm danh',
          action: 'open_link',
          href: `/student/check-in?activityId=${relatedId}`,
          variant: 'primary',
        },
      ];
    }

    return [
      {
        id: 'view_activity',
        label: 'Xem chi tiết',
        action: 'open_link',
        href: `/student/activities/${relatedId}`,
        variant: 'primary',
      },
    ];
  }

  if (relatedTable === 'participations' && relatedId > 0) {
    return [
      {
        id: 'view_registered_activities',
        label: 'Xem hoạt động',
        action: 'open_link',
        href: '/student/my-activities',
        variant: 'primary',
      },
    ];
  }

  return [];
}

export function executeNotificationAction(button: RealtimeNotificationActionButton) {
  if (button.href) {
    window.location.assign(button.href);
    return;
  }

  window.dispatchEvent(
    new CustomEvent('realtime-notification-action', {
      detail: { button },
    })
  );
}
