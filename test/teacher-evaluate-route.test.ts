import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('POST /api/teacher/evaluate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('preserves forbidden errors from canonical guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => null,
      dbRun: async () => ({ changes: 1 }),
      dbHelpers: { createAuditLog: async () => undefined },
    }));

    const route = await import('../src/app/api/teacher/evaluate/route');
    const res: any = await route.POST({
      json: async () => ({ participation_id: 1, achievement_level: 'good' }),
    } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('validates achievement level before writing changes', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    const dbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet: async () => null,
      dbRun,
      dbHelpers: { createAuditLog: async () => undefined },
    }));

    const route = await import('../src/app/api/teacher/evaluate/route');
    const res: any = await route.POST({
      json: async () => ({ participation_id: 1, achievement_level: 'bad-level' }),
    } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(dbRun).not.toHaveBeenCalled();
  });

  it('returns success when the teacher evaluates an attended participation they own', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    const dbGet = vi
      .fn()
      .mockResolvedValueOnce({
        id: 33,
        activity_id: 55,
        activity_title: 'Activity A',
        teacher_id: 7,
        student_id: 99,
        student_name: 'Student A',
        class_id: 10,
        attendance_status: 'attended',
      })
      .mockResolvedValueOnce(null);

    const dbRun = vi.fn(async () => ({ changes: 1 }));
    const createAuditLog = vi.fn(async () => undefined);

    vi.doMock('@/lib/database', () => ({
      dbReady: async () => undefined,
      dbGet,
      dbRun,
      dbHelpers: { createAuditLog },
    }));

    const route = await import('../src/app/api/teacher/evaluate/route');
    const res: any = await route.POST({
      json: async () => ({
        participation_id: 33,
        achievement_level: 'good',
        feedback: 'Tốt',
      }),
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.achievement_level).toBe('good');
    expect(body.activity_title).toBe('Activity A');
    expect(createAuditLog).toHaveBeenCalled();
    expect(dbRun).toHaveBeenCalled();
  });
});
