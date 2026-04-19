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
        attendance_mutation: 'updated',
        attendance_record_mutation: 'created',
      },
    ]);
  });

  it('keeps partial failures isolated per student and reports failure stage', async () => {
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
      dbGet: vi.fn(async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT id, teacher_id, title FROM activities')) {
          return { id: 44, teacher_id: 7, title: 'Attendance Activity' };
        }
        if (sql.includes('SELECT id, attendance_status FROM participations')) {
          return { id: Number(params?.[1]) === 201 ? 91 : 92, attendance_status: 'registered' };
        }
        if (sql.includes('SELECT id FROM attendance_records')) {
          return null;
        }
        return null;
      }),
      dbRun: vi.fn(async () => ({ changes: 1, lastID: 501 })),
    }));

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        autoCalculateAfterEvaluation: vi.fn(async (participationId: number) => {
          if (participationId === 92) {
            throw new Error('Scoring sync failed');
          }
          return { totalPoints: 10 };
        }),
      },
    }));

    const route = await import('../src/app/api/teacher/attendance/bulk/route');
    const response = await route.POST({
      json: async () => ({ activity_id: 44, student_ids: [201, 202], notes: 'Có mặt' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.success).toHaveLength(1);
    expect(body.data.failed).toEqual([
      {
        student_id: 202,
        error: 'Scoring sync failed',
        stage: 'attendance_or_scoring_sync',
      },
    ]);
  });
});
