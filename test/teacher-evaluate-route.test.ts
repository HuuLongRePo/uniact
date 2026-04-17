import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('POST /api/teacher/evaluate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('auto-calculates score after successful evaluation', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('FROM participations p')) {
        return {
          id: 55,
          attendance_status: 'attended',
          teacher_id: 7,
          student_id: 20,
          student_name: 'Student One',
          class_id: 3,
          activity_id: 9,
          activity_title: 'Hoạt động A',
        };
      }

      if (sql.includes('FROM class_teachers')) {
        return { teacher_id: 7, class_id: 3 };
      }

      return null;
    });

    const mockDbRun = vi.fn(async () => ({ changes: 1, lastID: 1 }));
    const mockCreateAuditLog = vi.fn(async () => undefined);
    const mockAutoCalculate = vi.fn(async () => ({ totalPoints: 15, formula: '10 x 1.5 = 15' }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
      dbReady: vi.fn(async () => undefined),
      dbHelpers: {
        createAuditLog: mockCreateAuditLog,
      },
    }));

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, name: 'Teacher A', role: 'teacher' }),
    }));

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        autoCalculateAfterEvaluation: mockAutoCalculate,
      },
    }));

    const route = await import('../src/app/api/teacher/evaluate/route');
    const response = await route.POST({
      json: async () => ({
        participation_id: 55,
        achievement_level: 'excellent',
        feedback: 'Rất tốt',
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mockAutoCalculate).toHaveBeenCalledWith(55);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      participation_id: 55,
      achievement_level: 'excellent',
      points: 15,
      formula: '10 x 1.5 = 15',
    });
  });
});
