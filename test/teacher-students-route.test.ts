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
      dbAll: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT c.id, c.name, c.grade') && sql.includes('FROM classes c')) {
          return [{ id: 10, name: 'CTK42A', grade: 'K42' }];
        }
        if (sql.includes('FROM users u') && sql.includes('GROUP BY u.id')) {
          return [
            {
              id: 201,
              email: 'student@example.com',
              name: 'Nguyen Van A',
              avatar_url: null,
              class_id: 10,
              class_name: 'CTK42A',
              activities_count: 4,
            },
          ];
        }
        if (sql.includes('WITH participation_totals AS')) {
          return [
            {
              student_id: 201,
              participation_points: 20,
              award_points: 3,
              adjustment_points: 2,
              final_total: 25,
            },
          ];
        }
        return [];
      }),
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

  it('returns empty canonical payload when the system has no classes yet', async () => {
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

  it('allows teacher to filter across all classes in the system', async () => {
    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher', name: 'Teacher A' }),
    }));

    const dbAllMock = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT c.id, c.name, c.grade') && sql.includes('FROM classes c')) {
        return [
          { id: 10, name: 'CTK42A', grade: 'K42' },
          { id: 11, name: 'CTK42B', grade: 'K42' },
        ];
      }
      if (sql.includes('FROM users u') && sql.includes('u.class_id = ?')) {
        expect(params).toContain(11);
        return [
          {
            id: 301,
            email: 'student2@example.com',
            name: 'Tran Thi B',
            avatar_url: null,
            class_id: 11,
            class_name: 'CTK42B',
            activities_count: 1,
          },
        ];
      }
      if (sql.includes('WITH participation_totals AS')) {
        return [
          {
            student_id: 301,
            participation_points: 5,
            award_points: 0,
            adjustment_points: 0,
            final_total: 5,
          },
        ];
      }
      return [];
    });

    vi.doMock('@/lib/database', () => ({
      dbAll: dbAllMock,
    }));

    const route = await import('../src/app/api/teacher/students/route');
    const res: any = await route.GET({
      url: 'http://localhost/api/teacher/students?class_id=11',
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.classes).toHaveLength(2);
    expect(body.students[0]).toMatchObject({
      id: 301,
      class_id: 11,
      total_points: 5,
    });
  });
});
