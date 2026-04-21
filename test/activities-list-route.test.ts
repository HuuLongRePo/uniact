import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiAuth: vi.fn(),
  mockGetActivitiesByTeacher: vi.fn(),
  mockGetOperationalActivitiesByTeacher: vi.fn(),
  mockGetAllActivitiesWithTeachers: vi.fn(),
  mockGetActivitiesForStudent: vi.fn(),
  mockCacheGet: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: mocks.mockRequireApiAuth,
  requireApiRole: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  ensureParticipationColumns: vi.fn(async () => undefined),
  dbHelpers: {
    getActivitiesByTeacher: mocks.mockGetActivitiesByTeacher,
    getOperationalActivitiesByTeacher: mocks.mockGetOperationalActivitiesByTeacher,
    getAllActivitiesWithTeachers: mocks.mockGetAllActivitiesWithTeachers,
    getActivitiesForStudent: mocks.mockGetActivitiesForStudent,
  },
}));

vi.mock('@/lib/cache', () => ({
  CACHE_TTL: { CLASSES: 300000 },
  cache: {
    get: mocks.mockCacheGet,
  },
}));

import * as activitiesRoute from '../src/app/api/activities/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockCacheGet.mockImplementation(
    async (_key: string, _ttl: number, factory: () => Promise<unknown>) => factory()
  );
});

function makeRequest(url: string) {
  return { url } as unknown as Parameters<typeof activitiesRoute.GET>[0];
}

describe('GET /api/activities', () => {
  it('keeps teacher default list owner-scoped', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 5, role: 'teacher', class_id: 1 });
    mocks.mockGetActivitiesByTeacher.mockResolvedValue([
      {
        id: 11,
        title: 'Owned Activity',
        status: 'draft',
        approval_status: 'draft',
      },
    ]);

    const response = await activitiesRoute.GET(makeRequest('http://localhost/api/activities'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activities).toHaveLength(1);
    expect(body.activities[0]).toMatchObject({ id: 11, status: 'draft' });
    expect(mocks.mockGetActivitiesByTeacher).toHaveBeenCalledWith(5);
    expect(mocks.mockGetOperationalActivitiesByTeacher).not.toHaveBeenCalled();
  });

  it('uses operational scope and maps ongoing filter to published for teachers', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 9, role: 'teacher', class_id: 2 });
    mocks.mockGetOperationalActivitiesByTeacher.mockResolvedValue([
      {
        id: 21,
        title: 'Published Activity',
        status: 'published',
        approval_status: 'approved',
      },
      {
        id: 22,
        title: 'Completed Activity',
        status: 'completed',
        approval_status: 'approved',
      },
      {
        id: 23,
        title: 'Draft Activity',
        status: 'draft',
        approval_status: 'draft',
      },
    ]);

    const response = await activitiesRoute.GET(
      makeRequest('http://localhost/api/activities?scope=operational&status=ongoing,completed')
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mocks.mockGetOperationalActivitiesByTeacher).toHaveBeenCalledWith(9);
    expect(body.activities).toHaveLength(2);
    expect(body.activities.map((activity: any) => activity.id)).toEqual([21, 22]);
    expect(body.activities.map((activity: any) => activity.status)).toEqual([
      'published',
      'completed',
    ]);
  });

  it('returns student activity visibility signals for applicable and non-applicable activities', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 12, role: 'student', class_id: 7 });
    mocks.mockGetActivitiesForStudent.mockResolvedValue([
      {
        id: 31,
        title: 'Open Activity',
        description: '',
        date_time: '2026-04-20T08:00:00.000Z',
        location: 'Hall A',
        max_participants: 50,
        registration_deadline: null,
        status: 'published',
        approval_status: 'approved',
        teacher_name: 'Teacher A',
        participant_count: 10,
        available_slots: 40,
        is_registered: 0,
        registration_status: null,
        participation_source: null,
        is_mandatory: 0,
        applies_to_student: 1,
        applicability_scope: 'open_scope',
        activity_type: 'Volunteer',
        organization_level: 'School',
      },
      {
        id: 32,
        title: 'Other Class Activity',
        description: '',
        date_time: '2026-04-21T08:00:00.000Z',
        location: 'Hall B',
        max_participants: 40,
        registration_deadline: null,
        status: 'published',
        approval_status: 'approved',
        teacher_name: 'Teacher B',
        participant_count: 5,
        available_slots: 35,
        is_registered: 0,
        registration_status: null,
        participation_source: null,
        is_mandatory: 0,
        applies_to_student: 0,
        applicability_scope: 'class_scope_mismatch',
        activity_type: 'Academic',
        organization_level: 'Department',
      },
    ]);

    const response = await activitiesRoute.GET(makeRequest('http://localhost/api/activities'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mocks.mockGetActivitiesForStudent).toHaveBeenCalledWith(12, 7);
    expect(body.activities).toHaveLength(2);
    expect(body.activities[0]).toMatchObject({
      id: 31,
      applies_to_student: true,
      applicability_scope: 'open_scope',
    });
    expect(body.activities[1]).toMatchObject({
      id: 32,
      applies_to_student: false,
      applicability_scope: 'class_scope_mismatch',
    });
    expect(body.activities[1].applicability_reason).toContain('Không thuộc phạm vi');
  });

  it('returns mandatory participation signals for assigned students', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 12, role: 'student', class_id: 7 });
    mocks.mockGetActivitiesForStudent.mockResolvedValue([
      {
        id: 41,
        title: 'Mandatory Activity',
        description: '',
        date_time: '2026-04-20T08:00:00.000Z',
        location: 'Hall A',
        max_participants: 50,
        registration_deadline: null,
        status: 'published',
        approval_status: 'approved',
        teacher_name: 'Teacher A',
        participant_count: 10,
        available_slots: 40,
        is_registered: 1,
        registration_status: 'registered',
        participation_source: 'assigned',
        is_mandatory: 1,
        applies_to_student: 1,
        applicability_scope: 'class_scope_match',
        activity_type: 'Volunteer',
        organization_level: 'School',
      },
    ]);

    const response = await activitiesRoute.GET(makeRequest('http://localhost/api/activities'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activities[0]).toMatchObject({
      id: 41,
      is_registered: true,
      participation_source: 'assigned',
      is_mandatory: true,
      can_cancel: false,
    });
  });
});
