import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('qr access routes', () => {
  it('allows a support teacher to list qr sessions for a related activity', async () => {
    const mockDbGet = vi.fn(async () => ({ id: 81, teacher_id: 99 }));
    const mockDbAll = vi.fn(async () => [
      {
        id: 901,
        session_token: 'token-901',
        created_at: '2026-04-12T08:00:00.000Z',
        expires_at: '2026-04-12T08:05:00.000Z',
        is_active: 1,
        attendance_count: 2,
      },
    ]);

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
    }));

    const route = await import('../src/app/api/activities/[id]/qr-sessions/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '81' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.sessions[0]).toMatchObject({
      id: 901,
      session_code: 'token-901',
      attendance_count: 2,
    });
  });

  it('queries global qr history by accessible activity scope for teachers', async () => {
    const mockDbAll = vi.fn(async () => []);

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: mockDbAll,
      dbGet: vi.fn(),
      dbHelpers: {},
    }));

    const route = await import('../src/app/api/qr-sessions/route');
    const response = await route.GET({} as any);

    expect(response.status).toBe(200);
    const [query, params] = mockDbAll.mock.calls[0] as [string, number[]];
    expect(query).toContain('activity_classes ac');
    expect(query).toContain('class_teachers ct');
    expect(query).toContain('a.teacher_id = ?');
    expect(params).toEqual([12, 12, 12]);
  });

  it('allows a support teacher to create a qr session for a related activity', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 42,
          teacher_id: 99,
          status: 'published',
          approval_status: 'approved',
        };
      }

      if (sql.includes('FROM qr_sessions')) {
        return undefined;
      }

      return undefined;
    });

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/rateLimit', () => ({
      rateLimit: () => ({ allowed: true }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: vi.fn(async () => []),
      dbHelpers: {
        createQRSession: vi.fn(async () => ({ lastID: 123 })),
      },
    }));

    const route = await import('../src/app/api/qr-sessions/route');
    const response = await route.POST(
      {
        json: async () => ({ activity_id: 42, expires_minutes: 10 }),
      } as any
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.session_id).toBe(123);
    expect(body.data.session_token).toBeTruthy();
  });

  it('allows a support teacher to load qr scans for a related activity session', async () => {
    const mockDbGet = vi.fn(async () => ({
      id: 77,
      activity_id: 42,
      creator_id: 99,
      created_at: '2026-04-12T08:00:00.000Z',
      expires_at: '2026-04-12T08:05:00.000Z',
      is_active: 1,
    }));

    const mockDbAll = vi.fn(async () => [
      {
        attendance_id: 2,
        student_id: 300,
        student_name: 'Student A',
        student_code: 'SV300',
        class_name: '12A1',
        scanned_at: '2026-04-12T08:03:00.000Z',
      },
      {
        attendance_id: 1,
        student_id: 300,
        student_name: 'Student A',
        student_code: 'SV300',
        class_name: '12A1',
        scanned_at: '2026-04-12T08:01:00.000Z',
      },
    ]);

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
    }));

    const route = await import('../src/app/api/qr-sessions/[id]/scans/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '77' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.scans).toHaveLength(1);
    expect(body.data.scans[0]).toMatchObject({
      student_id: 300,
      student_name: 'Student A',
    });
  });

  it('allows a support teacher to end a qr session they did not create', async () => {
    const mockDbGet = vi.fn(async () => ({
      id: 88,
      activity_id: 42,
      creator_id: 99,
      is_active: 1,
    }));
    const mockDbRun = vi.fn(async () => ({ changes: 1 }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
      dbHelpers: {
        createAuditLog: vi.fn(async () => {}),
      },
    }));

    const route = await import('../src/app/api/qr-sessions/[id]/end/route');
    const response = await route.POST({} as any, {
      params: Promise.resolve({ id: '88' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.ended).toBe(true);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
  });
});
