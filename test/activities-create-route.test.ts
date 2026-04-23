import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiRole: vi.fn(),
  mockGetAllClasses: vi.fn(),
  mockCreateActivity: vi.fn(),
  mockGetActivitiesByTeacher: vi.fn(),
  mockInvalidatePrefix: vi.fn(),
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
});

