import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('GET /api/teacher/activities/approvals', () => {
  it('maps requested approvals to pending and exposes rejected_at from approval history', async () => {
    const mockDbAll = vi.fn(async () => [
      {
        id: 1,
        title: 'Dang cho duyet',
        description: 'Mo ta 1',
        date_time: '2026-04-22T08:00:00.000Z',
        location: 'Phong 101',
        approval_status: 'requested',
        activity_status: 'draft',
        created_at: '2026-04-10T09:00:00.000Z',
        submitted_at: '2026-04-10T09:30:00.000Z',
        approved_at: null,
        rejected_at: null,
        rejected_reason: null,
        max_participants: 30,
        teacher_name: 'Teacher One',
        class_count: 2,
      },
      {
        id: 2,
        title: 'Da bi tu choi',
        description: 'Mo ta 2',
        date_time: '2026-04-23T08:00:00.000Z',
        location: 'Phong 102',
        approval_status: 'rejected',
        activity_status: 'draft',
        created_at: '2026-04-11T09:00:00.000Z',
        submitted_at: '2026-04-11T09:30:00.000Z',
        approved_at: null,
        rejected_at: '2026-04-11T10:00:00.000Z',
        rejected_reason: 'Can bo sung thong tin',
        max_participants: 25,
        teacher_name: 'Teacher One',
        class_count: 1,
      },
    ]);

    vi.doMock('@/lib/database', () => ({
      dbReady: vi.fn(async () => {}),
      dbAll: mockDbAll,
    }));

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    const route = await import('../src/app/api/teacher/activities/approvals/route');
    const response = await route.GET({
      url: 'http://localhost/api/teacher/activities/approvals?status=all',
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.activities).toHaveLength(2);
    expect(body.activities[0]).toMatchObject({
      id: 1,
      status: 'pending',
      approval_status: 'requested',
    });
    expect(body.activities[1]).toMatchObject({
      id: 2,
      status: 'rejected',
      rejected_at: '2026-04-11T10:00:00.000Z',
      rejection_reason: 'Can bo sung thong tin',
    });
    expect(mockDbAll).toHaveBeenCalledTimes(1);
  });
});
