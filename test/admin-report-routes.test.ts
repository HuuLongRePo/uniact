import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetUserFromSession: vi.fn(),
  mockDbAll: vi.fn(),
}));

const adminUser = { id: 1, role: 'admin' };

vi.mock('@/lib/auth', () => ({
  getUserFromSession: mocks.mockGetUserFromSession,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
}));

import * as scoresRoute from '../src/app/api/admin/reports/scores/route';
import * as teachersRoute from '../src/app/api/admin/reports/teachers/route';
import * as activityStatisticsRoute from '../src/app/api/admin/reports/activity-statistics/route';
import * as studentPointsLegacyRoute from '../src/app/api/admin/reports/student-points/route';
import * as classParticipationLegacyRoute from '../src/app/api/admin/reports/class-participation/route';

function makeEmptyRequest() {
  return {} as unknown as Parameters<typeof scoresRoute.GET>[0];
}

function makeRequest(url: string) {
  return {
    nextUrl: new URL(url, 'http://localhost'),
  } as unknown as Parameters<typeof activityStatisticsRoute.GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockGetUserFromSession.mockResolvedValue(adminUser);
});

describe('Admin report routes', () => {
  it('scores route returns normalized statistics', async () => {
    mocks.mockDbAll.mockResolvedValue([
      { participation_points: '100', award_points: '10', adjustment_points: '-5' },
      { participation_points: 200, award_points: null, adjustment_points: '20' },
    ]);

    const response = await scoresRoute.GET(makeEmptyRequest());

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.stats).toMatchObject({
      average: '162.5',
      median: 220,
      max: 220,
      min: 105,
    });
    expect(body.data.stats.distribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ range: '100-200', count: 1 }),
        expect.objectContaining({ range: '200-300', count: 1 }),
      ])
    );
  });

  it('scores route rejects non-admin users', async () => {
    mocks.mockGetUserFromSession.mockResolvedValue({ id: 2, role: 'teacher' });

    const response = await scoresRoute.GET(makeEmptyRequest());

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.error).toBeTruthy();
  });

  it('teachers route returns numeric metrics', async () => {
    mocks.mockDbAll.mockResolvedValue([
      {
        id: '7',
        name: 'Teacher A',
        email: 'teacher@example.com',
        totalActivitiesCreated: '3',
        averageAttendance: '87.5',
        averagePointsAwarded: '9.3',
        totalStudentsParticipated: '40',
      },
    ]);

    const response = await teachersRoute.GET(makeEmptyRequest());

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.teachers).toEqual([
      {
        id: 7,
        name: 'Teacher A',
        email: 'teacher@example.com',
        totalActivitiesCreated: 3,
        averageAttendance: 87.5,
        averagePointsAwarded: 9.3,
        totalStudentsParticipated: 40,
      },
    ]);
  });

  it('activity statistics route returns filtered stats and normalized data', async () => {
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 11,
        title: 'Citizen Orientation',
        date_time: '2026-04-10T08:00:00.000Z',
        location: 'Hall A',
        organizer_name: 'Student Affairs',
        activity_type: 'Civic',
        organization_level: 'School',
        max_participants: '50',
        total_participants: '5',
        attended_count: '4',
        registered_only: '1',
        excellent_count: '2',
        good_count: '1',
        avg_points_per_student: '8.5',
      },
    ]);

    const response = await activityStatisticsRoute.GET(
      makeRequest(
        'http://localhost/api/admin/reports/activity-statistics?start_date=2026-04-01&end_date=2026-04-30'
      )
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    const [query, params] = mocks.mockDbAll.mock.calls[0] as [string, string[]];

    expect(query).toContain("date(a.date_time) >= date(?)");
    expect(query).toContain("date(a.date_time) <= date(?)");
    expect(params).toEqual(['2026-04-01', '2026-04-30']);
    expect(body.success).toBe(true);
    expect(body.data[0]).toMatchObject({
      id: 11,
      title: 'Citizen Orientation',
      max_participants: 50,
      total_participants: 5,
      attended_count: 4,
      avg_points_per_student: 8.5,
    });
    expect(body.statistics).toMatchObject({
      total_activities: 1,
      total_participants: 5,
      total_attended: 4,
      avg_participants_per_activity: 5,
      attendance_rate: 80,
    });
  });

  it('activity statistics route exports UTF-8 CSV with BOM', async () => {
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 11,
        title: 'Citizen Orientation',
        date_time: '2026-04-10T08:00:00.000Z',
        location: 'Hall A',
        organizer_name: 'Student Affairs',
        activity_type: 'Civic',
        organization_level: 'School',
        max_participants: 50,
        total_participants: 5,
        attended_count: 4,
        registered_only: 1,
        excellent_count: 2,
        good_count: 1,
        avg_points_per_student: 8.5,
      },
    ]);

    const response = await activityStatisticsRoute.GET(
      makeRequest('http://localhost/api/admin/reports/activity-statistics?format=csv')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');

    const bytes = new Uint8Array(await response.arrayBuffer());
    const csv = new TextDecoder('utf-8').decode(bytes);

    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191]);
    expect(csv).toContain('Citizen Orientation');
    expect(csv).toContain('School');
  });

  it('student points legacy route returns 410 with replacement guidance', async () => {
    const response = await studentPointsLegacyRoute.GET();

    expect(response.status).toBe(410);

    const body = await response.json();

    expect(body).toMatchObject({
      success: false,
      code: 'LEGACY_ADMIN_REPORT_ROUTE',
      legacy_route: '/api/admin/reports/student-points',
      replacement: '/api/admin/reports/scores',
      alternatives: ['/admin/reports/scores'],
    });
    expect(body.error).toContain('/api/admin/reports/student-points');
    expect(body.error).toContain('/api/admin/reports/scores');
  });

  it('class participation legacy route returns 410 with alternatives', async () => {
    const response = await classParticipationLegacyRoute.GET();

    expect(response.status).toBe(410);

    const body = await response.json();

    expect(body).toMatchObject({
      success: false,
      code: 'LEGACY_ADMIN_REPORT_ROUTE',
      legacy_route: '/api/admin/reports/class-participation',
      replacement: '/api/reports/participation',
      alternatives: ['/admin/reports/participation'],
    });
    expect(body.message).toContain('/api/admin/reports/class-participation');
    expect(body.message).toContain('/api/reports/participation');
  });
});
