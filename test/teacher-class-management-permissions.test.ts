import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('teacher class management permissions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('allows assistant teacher to view students but not mutate class roster', async () => {
    const requireRole = vi.fn(async () => ({ id: 7, role: 'teacher' }));
    const dbReady = vi.fn(async () => undefined);
    const dbGet = vi
      .fn()
      .mockResolvedValueOnce({
        class_id: 12,
        is_homeroom_primary: 0,
        has_any_assignment: 1,
      })
      .mockResolvedValueOnce({
        class_id: 12,
        is_homeroom_primary: 0,
        has_any_assignment: 1,
      });
    const dbAll = vi.fn(async () => [
      {
        id: 301,
        name: 'Student A',
        email: 'a@example.com',
        total_points: 11,
        attended_count: 3,
      },
    ]);
    const dbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/guards', () => ({
      requireRole,
    }));
    vi.doMock('@/lib/database', () => ({
      dbReady,
      dbGet,
      dbAll,
      dbRun,
    }));

    const studentsRoute = await import('../src/app/api/teacher/classes/[id]/students/route');

    const viewRes: any = await studentsRoute.GET(
      {} as any,
      { params: Promise.resolve({ id: '12' }) } as any
    );
    expect(viewRes.status).toBe(200);
    const viewBody = await viewRes.json();
    expect(viewBody.students).toEqual([
      {
        id: 301,
        name: 'Student A',
        email: 'a@example.com',
        totalPoints: 11,
        attendedActivities: 3,
      },
    ]);

    const addRes: any = await studentsRoute.POST(
      {
        json: async () => ({ email: 'new@student.com' }),
      } as any,
      { params: Promise.resolve({ id: '12' }) } as any
    );
    expect(addRes.status).toBe(403);
    const addBody = await addRes.json();
    expect(addBody.code).toBe('FORBIDDEN');
    expect(dbRun).not.toHaveBeenCalled();
  });

  it('blocks assistant teacher from bulk add route', async () => {
    const requireRole = vi.fn(async () => ({ id: 7, role: 'teacher' }));
    const dbReady = vi.fn(async () => undefined);
    const dbGet = vi.fn(async () => ({
      class_id: 12,
      is_homeroom_primary: 0,
    }));
    const dbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/guards', () => ({
      requireRole,
    }));
    vi.doMock('@/lib/database', () => ({
      dbReady,
      dbGet,
      dbRun,
    }));

    const bulkRoute = await import('../src/app/api/teacher/classes/[id]/students/bulk/route');
    const res: any = await bulkRoute.POST(
      {
        json: async () => ({ emails: ['new@student.com'] }),
      } as any,
      { params: Promise.resolve({ id: '12' }) } as any
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
    expect(dbRun).not.toHaveBeenCalled();
  });

  it('blocks assistant teacher from remove route', async () => {
    const requireRole = vi.fn(async () => ({ id: 7, role: 'teacher' }));
    const dbReady = vi.fn(async () => undefined);
    const dbGet = vi.fn(async () => ({
      class_id: 12,
      is_homeroom_primary: 0,
    }));
    const dbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/guards', () => ({
      requireRole,
    }));
    vi.doMock('@/lib/database', () => ({
      dbReady,
      dbGet,
      dbRun,
    }));

    const removeRoute = await import('../src/app/api/teacher/classes/[id]/students/[studentId]/route');
    const res: any = await removeRoute.DELETE(
      {} as any,
      { params: Promise.resolve({ id: '12', studentId: '301' }) } as any
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
    expect(dbRun).not.toHaveBeenCalled();
  });

  it('returns canEdit=false for assistant classes in class list route', async () => {
    const requireRole = vi.fn(async () => ({ id: 7, role: 'teacher' }));
    const dbReady = vi.fn(async () => undefined);
    const dbAll = vi.fn(async () => [
      {
        id: 1,
        name: 'CTK42A',
        grade: 'K42',
        student_count: 30,
        is_homeroom_class: 1,
        teacher_class_role: 'primary',
      },
      {
        id: 2,
        name: 'CTK42B',
        grade: 'K42',
        student_count: 25,
        is_homeroom_class: 0,
        teacher_class_role: 'assistant',
      },
    ]);

    vi.doMock('@/lib/guards', () => ({
      requireRole,
    }));
    vi.doMock('@/lib/database', () => ({
      dbReady,
      dbAll,
    }));

    const classesRoute = await import('../src/app/api/teacher/classes/route');
    const res: any = await classesRoute.GET({} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.classes).toEqual([
      expect.objectContaining({
        id: 1,
        isHomeroomClass: true,
        teacherClassRole: 'primary',
        canEdit: true,
      }),
      expect.objectContaining({
        id: 2,
        isHomeroomClass: false,
        teacherClassRole: 'assistant',
        canEdit: false,
      }),
    ]);
  });
});
