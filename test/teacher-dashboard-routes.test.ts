import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetUserFromSession: vi.fn(),
  mockGetTeacherDashboardSnapshot: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromSession: mocks.mockGetUserFromSession,
}));

vi.mock('@/lib/teacher-dashboard-data', () => ({
  getTeacherDashboardSnapshot: mocks.mockGetTeacherDashboardSnapshot,
}));

import * as dashboardStatsRoute from '../src/app/api/teacher/dashboard-stats/route';
import * as dashboardRoute from '../src/app/api/teacher/dashboard/route';

function createSnapshot() {
  return {
    summary: {
      total_activities: 6,
      pending_requested: 2,
      published_activities: 3,
      approved_activities: 4,
      this_week_activities: 2,
      total_participants: 12,
      total_attended: 9,
    },
    classes: [
      {
        id: 1,
        name: 'CTK42A',
        student_count: 20,
        active_students: 12,
        participation_rate: 60,
      },
      {
        id: 2,
        name: 'CTK42B',
        student_count: 15,
        active_students: 6,
        participation_rate: 40,
      },
    ],
    activities: [
      {
        id: 101,
        title: 'A1',
        date_time: '2026-04-20T08:00:00.000Z',
        status: 'published',
        location: 'Hall 1',
        max_participants: 50,
        registered_count: 10,
        attended_count: 8,
      },
      {
        id: 102,
        title: 'A2',
        date_time: '2026-04-19T08:00:00.000Z',
        status: 'completed',
        location: 'Hall 2',
        max_participants: 40,
        registered_count: 8,
        attended_count: 7,
      },
      {
        id: 103,
        title: 'A3',
        date_time: '2026-04-18T08:00:00.000Z',
        status: 'draft',
        location: 'Hall 3',
        max_participants: 30,
        registered_count: 0,
        attended_count: 0,
      },
      {
        id: 104,
        title: 'A4',
        date_time: '2026-04-17T08:00:00.000Z',
        status: 'published',
        location: 'Hall 4',
        max_participants: 35,
        registered_count: 5,
        attended_count: 4,
      },
      {
        id: 105,
        title: 'A5',
        date_time: '2026-04-16T08:00:00.000Z',
        status: 'published',
        location: 'Hall 5',
        max_participants: 25,
        registered_count: 6,
        attended_count: 5,
      },
      {
        id: 106,
        title: 'A6',
        date_time: '2026-04-15T08:00:00.000Z',
        status: 'completed',
        location: 'Hall 6',
        max_participants: 20,
        registered_count: 4,
        attended_count: 3,
      },
    ],
    activitiesByMonth: [{ month: '2026-04', count: 6, participants: 12 }],
    activitiesByType: [
      { type_name: 'Ky nang', type_color: '#22C55E', count: 3, avg_participants: 7.5 },
    ],
    topStudents: [
      {
        student_id: 200,
        student_name: 'Student One',
        class_name: 'CTK42A',
        total_points: 15,
        activities_count: 3,
      },
    ],
    recentAttendance: [
      {
        activity_title: 'A1',
        student_name: 'Student One',
        attended_at: '2026-04-20T08:30:00.000Z',
      },
    ],
    unreadNotifications: 4,
  };
}

describe('Teacher dashboard routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetUserFromSession.mockResolvedValue({ id: 7, role: 'teacher' });
    mocks.mockGetTeacherDashboardSnapshot.mockResolvedValue(createSnapshot());
  });

  it('maps the shared snapshot to the canonical dashboard stats shape', async () => {
    const response = await dashboardStatsRoute.GET({} as any);

    expect(response.status).toBe(200);
    expect(mocks.mockGetTeacherDashboardSnapshot).toHaveBeenCalledWith(7);

    const body = await response.json();

    expect(body.summary).toMatchObject({
      total_activities: 6,
      pending_activities: 2,
      published_activities: 3,
      total_participants: 12,
      total_attended: 9,
    });
    expect(body.participationByClass).toEqual([
      {
        class_name: 'CTK42A',
        total_students: 20,
        active_students: 12,
        participation_rate: 60,
      },
      {
        class_name: 'CTK42B',
        total_students: 15,
        active_students: 6,
        participation_rate: 40,
      },
    ]);
    expect(body.recentActivities).toHaveLength(5);
    expect(body.recentActivities[0]).toMatchObject({
      id: 101,
      participant_count: 10,
      attended_count: 8,
    });
    expect(body.recentActivities.some((item: any) => item.id === 106)).toBe(false);
  });

  it('maps the shared snapshot to the legacy compatibility shape', async () => {
    const response = await dashboardRoute.GET();

    expect(response.status).toBe(200);
    expect(mocks.mockGetTeacherDashboardSnapshot).toHaveBeenCalledWith(7);

    const body = await response.json();

    expect(body).toMatchObject({
      total_classes: 2,
      total_students: 35,
      total_activities: 6,
      pending_approval: 2,
      approved_activities: 4,
      pending_notifications: 4,
      this_week_activities: 2,
      total_participations: 12,
      total_attended: 9,
      attendance_rate: 75,
    });
    expect(body.stats).toMatchObject({
      pending_approval: 2,
      pending_notifications: 4,
    });
    expect(body.classes).toEqual([
      { id: 1, name: 'CTK42A', student_count: 20 },
      { id: 2, name: 'CTK42B', student_count: 15 },
    ]);
    expect(body.activities[0]).toMatchObject({
      id: 101,
      end_time: null,
      status: 'published',
      registered_count: 10,
      attended_count: 8,
    });
    expect(body.recentAttendance).toEqual([
      {
        activity_title: 'A1',
        student_name: 'Student One',
        attended_at: '2026-04-20T08:30:00.000Z',
      },
    ]);
  });

  it('rejects non-teacher access', async () => {
    mocks.mockGetUserFromSession.mockResolvedValue({ id: 9, role: 'student' });

    const response = await dashboardStatsRoute.GET({} as any);

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });
});
