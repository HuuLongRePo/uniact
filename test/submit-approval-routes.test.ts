import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('submit approval routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('submit-for-approval returns canonical payload with activity_id and approval_status', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({
        id: 55,
        title: 'Activity A',
        description: 'Mo ta',
        date_time: '2099-04-21T08:00:00.000Z',
        location: 'Hall A',
        teacher_id: 7,
        status: 'draft',
        approval_status: 'draft',
      }),
      dbHelpers: {
        submitActivityForApproval: async () => ({ lastID: 91 }),
        notifyAdminsOfApprovalSubmission: async () => undefined,
      },
    }));

    vi.doMock('@/lib/activity-workflow', () => ({
      canSubmitForApproval: () => ({ valid: true }),
    }));

    const route = await import('../src/app/api/activities/[id]/submit-for-approval/route');
    const response = await route.POST({} as any, { params: Promise.resolve({ id: '55' }) } as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      activity_id: 55,
      approval_id: 91,
      approval_status: 'requested',
    });
  });

  it('submit route preserves validation error for incomplete activities', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: async () => ({
        id: 55,
        title: 'Activity A',
        description: null,
        date_time: '2099-04-21T08:00:00.000Z',
        location: 'Hall A',
        teacher_id: 7,
        status: 'draft',
        approval_status: 'draft',
      }),
      dbHelpers: {
        submitActivityForApproval: async () => ({ lastID: 91 }),
        notifyAdminsOfApprovalSubmission: async () => undefined,
      },
    }));

    vi.doMock('@/lib/activity-workflow', () => ({
      canSubmitForApproval: () => ({ valid: true }),
    }));

    const route = await import('../src/app/api/activities/[id]/submit/route');
    const response = await route.PATCH(
      { json: async () => ({ note: 'Please review' }) } as any,
      { params: Promise.resolve({ id: '55' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBe('Hoạt động thiếu thông tin bắt buộc');
  });
});
