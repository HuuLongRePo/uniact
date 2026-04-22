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

function normalizeToken(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

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

function getAttendancePrimaryPath(role: NotificationRecipientRole, activityId: number) {
  if (role === 'teacher') {
    return `/teacher/qr?activity_id=${activityId}`;
  }
  if (role === 'admin') {
    return `/admin/activities/${activityId}`;
  }
  return `/student/check-in?activityId=${activityId}`;
}

function buildAttendanceActionButtons(role: NotificationRecipientRole, activityId: number) {
  if (role === 'teacher') {
    return [
      {
        id: 'open_teacher_qr',
        label: 'Mở điểm danh',
        action: 'open_link',
        href: getAttendancePrimaryPath(role, activityId),
        variant: 'primary' as const,
      },
      {
        id: 'open_teacher_qr_projector',
        label: 'Chiếu QR',
        action: 'open_link',
        href: `/teacher/qr?activity_id=${activityId}&projector=1`,
        variant: 'secondary' as const,
      },
    ];
  }

  if (role === 'admin') {
    return [
      {
        id: 'open_admin_activity',
        label: 'Mở hoạt động',
        action: 'open_link',
        href: getAttendancePrimaryPath(role, activityId),
        variant: 'primary' as const,
      },
    ];
  }

  return [
    {
      id: 'open_checkin',
      label: 'Điểm danh',
      action: 'open_link',
      href: getAttendancePrimaryPath(role, activityId),
      variant: 'primary' as const,
    },
  ];
}

function hasAttendanceShortcut(
  buttons: RealtimeNotificationActionButton[],
  recipientRole: NotificationRecipientRole
) {
  return buttons.some((button) => {
    const href = normalizeToken(button.href);
    if (!href) {
      return false;
    }

    if (recipientRole === 'teacher') {
      return href.includes('/teacher/qr');
    }
    if (recipientRole === 'admin') {
      return href.includes('/admin/activities/');
    }

    return href.includes('/student/check-in');
  });
}

function dedupeActionButtons(buttons: RealtimeNotificationActionButton[]) {
  const seen = new Set<string>();
  return buttons.filter((button) => {
    const key = [
      normalizeToken(button.id),
      normalizeToken(button.label),
      normalizeToken(button.action),
      normalizeToken(button.href),
    ].join('|');

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function withAttendanceShortcutIfMissing(
  buttons: RealtimeNotificationActionButton[],
  notificationType: string,
  recipientRole: NotificationRecipientRole,
  relatedTable: string,
  relatedId: number
) {
  if (
    !isAttendanceNotification(notificationType) ||
    relatedTable !== 'activities' ||
    relatedId <= 0 ||
    hasAttendanceShortcut(buttons, recipientRole)
  ) {
    return buttons;
  }

  const canonicalButtons = buildAttendanceActionButtons(recipientRole, relatedId);
  return dedupeActionButtons([...canonicalButtons, ...buttons]).slice(0, 3);
}

export function resolveNotificationActionButtons(
  notification: NotificationActionSource
): RealtimeNotificationActionButton[] {
  const directButtons = normalizeActionButtons(notification.action_buttons);
  const relatedTable = String(notification.related_table || '').trim();
  const relatedId = Number(notification.related_id || 0);
  const notificationType = String(notification.type || '').trim();
  const recipientRole = normalizeRecipientRole(notification.recipient_role);

  if (directButtons.length > 0) {
    return withAttendanceShortcutIfMissing(
      directButtons,
      notificationType,
      recipientRole,
      relatedTable,
      relatedId
    );
  }

  if (relatedTable === 'activities' && relatedId > 0) {
    if (isAttendanceNotification(notificationType)) {
      return buildAttendanceActionButtons(recipientRole, relatedId);
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
