import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('POST /api/teacher/attendance/bulk', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('persists scoring results through scoring service after marking attendance', async () => {
    const mockDbGet = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT id, teacher_id, title FROM activities')) {
        return { id: 44, teacher_id: 7, title: 'Attendance Activity' };
      }

      if (sql.includes('SELECT id, attendance_status FROM participations')) {
        return { id: 91, attendance_status: 'registered' };
      }

      if (sql.includes('SELECT id FROM attendance_records')) {
        return null;
      }

      return null;
    });

    const mockDbRun = vi.fn(async () => ({ changes: 1, lastID: 501 }));
    const mockAutoCalculate = vi.fn(async () => ({ totalPoints: 10, formula: '10 x 1.0 = 10' }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher' }),
    }));

    vi.doMock('@/lib/rateLimit', () => ({
      rateLimit: () => ({ allowed: true }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
    }));

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        autoCalculateAfterEvaluation: mockAutoCalculate,
      },
    }));

    const route = await import('../src/app/api/teacher/attendance/bulk/route');
    const response = await route.POST({
      json: async () => ({ activity_id: 44, student_ids: [201], notes: 'Có mặt' }),
    } as any);

    expect(response.status).toBe(200);
    expect(mockAutoCalculate).toHaveBeenCalledWith(91);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.success).toEqual([
      {
        student_id: 201,
        participation_id: 91,
        points: 10,
      },
    ]);
  });
});
