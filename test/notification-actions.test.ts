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

  it('returns teacher qr management action for attendance notifications', () => {
    const buttons = resolveNotificationActionButtons({
      type: 'attendance',
      related_table: 'activities',
      related_id: 91,
      recipient_role: 'teacher',
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].href).toBe('/teacher/qr?activity_id=91');
    expect(buttons[0].label).toBe('Mở điểm danh');
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
});
