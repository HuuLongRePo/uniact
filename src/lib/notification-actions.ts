import {
  normalizeActionButtons,
  RealtimeNotificationActionButton,
} from '@/lib/realtime-notification-model';

export type NotificationRecipientRole = 'admin' | 'teacher' | 'student';

export type NotificationActionSource = {
  type?: string | null;
  related_table?: string | null;
  related_id?: number | null;
  action_buttons?: unknown;
  recipient_role?: NotificationRecipientRole | null;
};

function normalizeRecipientRole(rawRole: unknown): NotificationRecipientRole {
  if (rawRole === 'admin' || rawRole === 'teacher' || rawRole === 'student') {
    return rawRole;
  }
  return 'student';
}

function isAttendanceNotification(type: string) {
  return ['attendance', 'success', 'attendance_qr_started', 'face_attendance_recorded'].includes(
    type
  );
}

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
  const recipientRole = normalizeRecipientRole(notification.recipient_role);

  if (relatedTable === 'activities' && relatedId > 0) {
    if (isAttendanceNotification(notificationType)) {
      if (recipientRole === 'teacher') {
        return [
          {
            id: 'open_teacher_qr',
            label: 'Mở điểm danh',
            action: 'open_link',
            href: `/teacher/qr?activity_id=${relatedId}&projector=1`,
            variant: 'primary',
          },
        ];
      }

      if (recipientRole === 'admin') {
        return [
          {
            id: 'open_admin_activity',
            label: 'Mở hoạt động',
            action: 'open_link',
            href: `/admin/activities/${relatedId}`,
            variant: 'primary',
          },
        ];
      }

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

    if (recipientRole === 'teacher') {
      return [
        {
          id: 'view_teacher_activity',
          label: 'Xem chi tiết',
          action: 'open_link',
          href: `/teacher/activities/${relatedId}`,
          variant: 'primary',
        },
      ];
    }

    if (recipientRole === 'admin') {
      return [
        {
          id: 'view_admin_activity',
          label: 'Xem chi tiết',
          action: 'open_link',
          href: `/admin/activities/${relatedId}`,
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
    if (recipientRole === 'teacher') {
      return [
        {
          id: 'view_teacher_participation_report',
          label: 'Xem báo cáo',
          action: 'open_link',
          href: '/teacher/reports/participation',
          variant: 'primary',
        },
      ];
    }

    if (recipientRole === 'admin') {
      return [
        {
          id: 'view_admin_participation_report',
          label: 'Xem báo cáo',
          action: 'open_link',
          href: '/admin/reports/participation',
          variant: 'primary',
        },
      ];
    }

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
