import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiRole: vi.fn(),
  mockGetAllClasses: vi.fn(),
  mockCreateActivity: vi.fn(),
  mockGetActivitiesByTeacher: vi.fn(),
  mockInvalidatePrefix: vi.fn(),
  mockFindClassScheduleConflicts: vi.fn(),
  mockResolveActivityTimeWindow: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: vi.fn(),
  requireApiRole: mocks.mockRequireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbHelpers: {
    getAllClasses: mocks.mockGetAllClasses,
    createActivity: mocks.mockCreateActivity,
    getActivitiesByTeacher: mocks.mockGetActivitiesByTeacher,
  },
}));

vi.mock('@/lib/cache', () => ({
  CACHE_TTL: { CLASSES: 300000 },
  cache: {
    invalidatePrefix: mocks.mockInvalidatePrefix,
  },
}));

vi.mock('@/lib/activity-schedule-conflicts', () => ({
  findClassScheduleConflicts: mocks.mockFindClassScheduleConflicts,
  resolveActivityTimeWindow: mocks.mockResolveActivityTimeWindow,
}));

import * as activitiesRoute from '../src/app/api/activities/route';

function makePostReq(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof activitiesRoute.POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockRequireApiRole.mockResolvedValue({ id: 7, role: 'teacher' });
  mocks.mockGetAllClasses.mockResolvedValue([{ id: 11 }, { id: 12 }]);
  mocks.mockCreateActivity.mockResolvedValue({ lastID: 501 });
  mocks.mockGetActivitiesByTeacher.mockResolvedValue([{ id: 501, title: 'Hoạt động mới' }]);
  mocks.mockInvalidatePrefix.mockImplementation(() => undefined);
  mocks.mockFindClassScheduleConflicts.mockResolvedValue({
    conflicts: [],
    window: {
      start_time: '2026-05-01T08:30:00.000Z',
      end_time: '2026-05-01T10:30:00.000Z',
      duration_minutes: 120,
    },
  });
  mocks.mockResolveActivityTimeWindow.mockReturnValue({
    start_time: '2026-05-01T08:30:00.000Z',
    end_time: '2026-05-01T10:30:00.000Z',
    duration_minutes: 120,
  });
});

describe('POST /api/activities', () => {
  it('persists explicit mandatory and voluntary student scopes on create', async () => {
    const response = await activitiesRoute.POST(
      makePostReq({
        title: 'Hoạt động có học viên chỉ định',
        description: 'Mô tả',
        date_time: '2026-05-01T08:30',
        location: 'Hội trường A',
        max_participants: 120,
        class_ids: [11],
        mandatory_class_ids: [11],
        voluntary_class_ids: [],
        mandatory_student_ids: [101, 102],
        voluntary_student_ids: [103],
        applies_to_all_students: false,
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.mockCreateActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        teacher_id: 7,
        class_ids: [11],
        mandatory_class_ids: [11],
        voluntary_class_ids: [],
        mandatory_student_ids: [101, 102],
        voluntary_student_ids: [103],
        applies_to_all_students: false,
      })
    );
  });

  it('blocks creation when selected classes overlap an existing published activity', async () => {
    mocks.mockFindClassScheduleConflicts.mockResolvedValueOnce({
      conflicts: [
        {
          activity_id: 88,
          title: 'Hoạt động đã có',
          teacher_name: 'Teacher B',
          date_time: '2026-05-01T08:45:00.000Z',
          end_time: '2026-05-01T10:00:00.000Z',
          location: 'Hội trường A',
          class_id: 11,
          class_name: 'CNTT K18A',
          overlap_minutes: 75,
        },
      ],
      window: {
        start_time: '2026-05-01T08:30:00.000Z',
        end_time: '2026-05-01T10:30:00.000Z',
        duration_minutes: 120,
      },
    });

    const response = await activitiesRoute.POST(
      makePostReq({
        title: 'Hoạt động bị trùng lịch lớp',
        description: 'Mô tả',
        date_time: '2026-05-01T08:30',
        location: 'Hội trường A',
        class_ids: [11],
        mandatory_class_ids: [11],
        voluntary_class_ids: [],
        mandatory_student_ids: [],
        voluntary_student_ids: [],
        applies_to_all_students: false,
      })
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('CLASS_SCHEDULE_CONFLICT');
    expect(mocks.mockCreateActivity).not.toHaveBeenCalled();
  });
});
