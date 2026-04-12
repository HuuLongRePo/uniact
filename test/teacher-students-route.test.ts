import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/teacher/students', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical success shape with compatibility aliases for teacher students UI', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: vi
        .fn()
        .mockResolvedValueOnce([{ class_id: 10 }])
        .mockResolvedValueOnce([
          {
            id: 201,
            email: 'student@example.com',
            name: 'Nguyen Van A',
            avatar_url: null,
            class_id: 10,
            class_name: 'CTK42A',
            total_points: 25,
            activities_count: 4,
          },
        ])
        .mockResolvedValueOnce([{ id: 10, name: 'CTK42A', grade: 'K42' }]),
    }));

    const route = await import('../src/app/api/teacher/students/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/teacher/students',
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.students).toHaveLength(1);
    expect(body.students[0]).toMatchObject({
      name: 'Nguyen Van A',
      full_name: 'Nguyen Van A',
      total_points: 25,
      total_score: 25,
      activities_count: 4,
      activity_count: 4,
      attended_count: 0,
    });
    expect(body.total).toBe(1);
  });

  it('preserves forbidden errors from guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.forbidden('Không có quyền truy cập');
      },
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: async () => [],
    }));

    const route = await import('../src/app/api/teacher/students/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/teacher/students',
    } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns empty canonical payload when teacher has no assigned classes', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbAll: vi.fn().mockResolvedValueOnce([]),
    }));

    const route = await import('../src/app/api/teacher/students/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/teacher/students',
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.students).toEqual([]);
    expect(body.classes).toEqual([]);
    expect(body.total).toBe(0);
  });
});
