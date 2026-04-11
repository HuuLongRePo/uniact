import { describe, expect, it } from 'vitest';
import {
  BULK_ATTENDANCE,
  GET_CLASS_STUDENTS,
  TEACHER_DASHBOARD,
  TEACHER_DASHBOARD_STATS,
} from '../src/templates/teacher-api-templates';

describe('teacher api templates', () => {
  it('class students template reflects class_teachers access', () => {
    expect(GET_CLASS_STUDENTS).toContain('class_teachers');
    expect(GET_CLASS_STUDENTS).toContain('ct.teacher_id IS NOT NULL');
    expect(GET_CLASS_STUDENTS).not.toContain('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
  });

  it('bulk attendance template reflects canonical route and activity access helper', () => {
    expect(BULK_ATTENDANCE).toContain('POST /api/teacher/attendance/bulk');
    expect(BULK_ATTENDANCE).toContain('teacherCanAccessActivity');
    expect(BULK_ATTENDANCE).toContain('activity_id');
    expect(BULK_ATTENDANCE).not.toContain('/api/teacher/activities/[id]/attendance/bulk');
  });

  it('dashboard template points to dashboard-stats and keeps the legacy alias', () => {
    expect(TEACHER_DASHBOARD_STATS).toContain('GET /api/teacher/dashboard-stats');
    expect(TEACHER_DASHBOARD_STATS).toContain('class_teachers');
    expect(TEACHER_DASHBOARD_STATS).toContain("approval_status = 'requested'");
    expect(TEACHER_DASHBOARD).toBe(TEACHER_DASHBOARD_STATS);
  });
});
