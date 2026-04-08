import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiAuth: vi.fn(),
  mockRequireApiRole: vi.fn(),
  mockGetActivityById: vi.fn(),
  mockUpdateActivity: vi.fn(),
  mockCreateAuditLog: vi.fn(),
  mockGetAllClasses: vi.fn(),
  mockDbGet: vi.fn(),
  mockDbAll: vi.fn(),
  mockDbRun: vi.fn(),
  mockInvalidatePrefix: vi.fn(),
}));

const teacherUser = { id: 1, role: 'teacher', class_id: 1 };

const existingActivity = {
  id: 1,
  title: 'Test Activity',
  description: 'Mô tả hoạt động',
  date_time: '2026-04-10T08:00:00.000Z',
  end_time: '2026-04-10T10:00:00.000Z',
  location: 'Hội trường A',
  teacher_id: 1,
  max_participants: 30,
  status: 'draft',
  approval_status: 'draft',
  registration_deadline: '2026-04-09T08:00:00.000Z',
  activity_type_id: 1,
  organization_level_id: 1,
  base_points: 10,
  qr_enabled: 0,
};

const activityDetail = {
  ...existingActivity,
  status: 'published',
  approval_status: 'approved',
  teacher_name: 'Giáo viên A',
  activity_type: 'Tình nguyện',
  organization_level: 'Cấp trường',
  activity_type_base_points: 10,
  participant_count: 5,
  available_slots: 25,
  is_registered: 0,
  registration_status: null,
};

vi.mock('@/lib/guards', () => ({
  requireApiAuth: mocks.mockRequireApiAuth,
  requireApiRole: mocks.mockRequireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbHelpers: {
    getActivityById: mocks.mockGetActivityById,
    updateActivity: mocks.mockUpdateActivity,
    createAuditLog: mocks.mockCreateAuditLog,
    getAllClasses: mocks.mockGetAllClasses,
  },
  dbGet: mocks.mockDbGet,
  dbAll: mocks.mockDbAll,
  dbRun: mocks.mockDbRun,
}));

vi.mock('@/lib/cache', () => ({
  cache: {
    invalidatePrefix: mocks.mockInvalidatePrefix,
  },
}));

import * as activitiesRoute from '../src/app/api/activities/[id]/route';

function makePutReq(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof activitiesRoute.PUT>[0];
}

function makeGetReq() {
  return {} as unknown as Parameters<typeof activitiesRoute.GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.mockRequireApiAuth.mockResolvedValue(teacherUser);
  mocks.mockRequireApiRole.mockResolvedValue(teacherUser);
  mocks.mockGetAllClasses.mockResolvedValue([]);
  mocks.mockUpdateActivity.mockResolvedValue({ changes: 1 });
  mocks.mockCreateAuditLog.mockResolvedValue(undefined);
  mocks.mockDbRun.mockResolvedValue({ changes: 1 });
  mocks.mockInvalidatePrefix.mockImplementation(() => undefined);

  mocks.mockGetActivityById.mockImplementation(async (id: number) => {
    if (id === 1) return existingActivity;
    return null;
  });

  mocks.mockDbGet.mockImplementation(async (_sql: string, params: unknown[]) => {
    const activityId = Number(params?.[1] ?? params?.[0]);
    if (activityId === 1) {
      return activityDetail;
    }
    return undefined;
  });

  mocks.mockDbAll.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM activity_classes')) {
      return [];
    }

    if (sql.includes('FROM participations')) {
      return [{ count: 0 }];
    }

    return [];
  });
});

describe('Activities API (unit)', () => {
  it('PUT cập nhật hoạt động thành công', async () => {
    const res = await activitiesRoute.PUT(makePutReq({ title: 'Updated Title' }), {
      params: Promise.resolve({ id: '1' }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('activity');
    expect(body).toHaveProperty('message');
    expect(mocks.mockRequireApiRole).toHaveBeenCalled();
    expect(mocks.mockUpdateActivity).toHaveBeenCalledWith(1, { title: 'Updated Title' });
  });

  it('PUT trả về 404 nếu hoạt động không tồn tại', async () => {
    const res = await activitiesRoute.PUT(makePutReq({ title: 'Updated Title' }), {
      params: Promise.resolve({ id: '999' }),
    });

    expect(res.status).toBe(404);
  });

  it('GET trả về chi tiết hoạt động thành công', async () => {
    const res = await activitiesRoute.GET(makeGetReq(), {
      params: Promise.resolve({ id: '1' }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('activity');
    expect(body.activity).toMatchObject({
      id: 1,
      title: 'Test Activity',
      teacher_name: 'Giáo viên A',
      activity_type: 'Tình nguyện',
      organization_level: 'Cấp trường',
    });
    expect(mocks.mockRequireApiAuth).toHaveBeenCalled();
  });

  it('GET trả về 404 nếu hoạt động không tồn tại', async () => {
    const res = await activitiesRoute.GET(makeGetReq(), {
      params: Promise.resolve({ id: '999' }),
    });

    expect(res.status).toBe(404);
  });
});
