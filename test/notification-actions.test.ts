import { describe, expect, it } from 'vitest';
import { resolveNotificationActionButtons } from '../src/lib/notification-actions';

describe('resolveNotificationActionButtons', () => {
  it('returns student check-in action for attendance notifications', () => {
    const buttons = resolveNotificationActionButtons({
      type: 'attendance',
      related_table: 'activities',
      related_id: 88,
      recipient_role: 'student',
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].href).toBe('/student/check-in?activityId=88');
    expect(buttons[0].label).toBe('Điểm danh');
  });

  it('returns teacher attendance + projector actions for attendance notifications', () => {
    const buttons = resolveNotificationActionButtons({
      type: 'attendance',
      related_table: 'activities',
      related_id: 91,
      recipient_role: 'teacher',
    });

    expect(buttons).toHaveLength(2);
    expect(buttons[0].href).toBe('/teacher/qr?activity_id=91');
    expect(buttons[0].label).toBe('Mở điểm danh');
    expect(buttons[1].href).toBe('/teacher/qr?activity_id=91&projector=1');
    expect(buttons[1].label).toBe('Chiếu QR toàn màn hình');
  });

  it('returns admin activity action for attendance notifications', () => {
    const buttons = resolveNotificationActionButtons({
      type: 'attendance',
      related_table: 'activities',
      related_id: 45,
      recipient_role: 'admin',
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].href).toBe('/admin/activities/45');
  });

  it('keeps direct actions but prepends canonical student check-in for attendance alerts', () => {
    const buttons = resolveNotificationActionButtons({
      type: 'attendance_qr_started',
      related_table: 'activities',
      related_id: 77,
      recipient_role: 'student',
      action_buttons: [
        {
          id: 'view_activity',
          label: 'Xem chi tiết',
          action: 'open_link',
          href: '/student/activities/77',
        },
      ],
    });

    expect(buttons.map((button) => button.href)).toEqual([
      '/student/check-in?activityId=77',
      '/student/activities/77',
    ]);
  });

  it('does not offer a check-in action for post-attendance success notifications', () => {
    const buttons = resolveNotificationActionButtons({
      type: 'success',
      related_table: 'activities',
      related_id: 88,
      recipient_role: 'student',
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].href).toBe('/student/activities/88');
  });
});
