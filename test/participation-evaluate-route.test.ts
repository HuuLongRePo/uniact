import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('POST /api/participations/[id]/evaluate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns canonical success payload after evaluation and score save', async () => {
    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM participations')) {
        return {
          id: 41,
          student_id: 22,
          activity_id: 9,
          attendance_status: 'attended',
        };
      }
      return null;
    });

    const mockDbRun = vi.fn(async () => ({ changes: 1, lastID: 1 }));
    const mockWithTransaction = vi.fn(async (callback: any) => callback());
    const mockCalculate = vi.fn(async () => ({ totalPoints: 14, formula: 'base+bonus' }));
    const mockSave = vi.fn(async () => undefined);

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => ({ id: 7, role: 'teacher' }),
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
      withTransaction: mockWithTransaction,
    }));

    const mockSendDatabaseNotification = vi.fn(async () => undefined);

    vi.doMock('@/lib/scoring', () => ({
      PointCalculationService: {
        calculatePoints: mockCalculate,
        saveCalculation: mockSave,
      },
    }));

    vi.doMock('@/lib/notifications', () => ({
      sendDatabaseNotification: mockSendDatabaseNotification,
    }));

    const route = await import('../src/app/api/participations/[id]/evaluate/route');
    const response = await route.POST(
      {
        json: async () => ({ achievement_level: 'good', feedback: 'Ổn', bonus_points: 2 }),
      } as any,
      { params: Promise.resolve({ id: '41' }) } as any
    );

    expect(response.status).toBe(200);
    expect(mockCalculate).toHaveBeenCalledWith({
      participationId: 41,
      bonusPoints: 2,
      penaltyPoints: 0,
    });
    expect(mockSave).toHaveBeenCalled();
    expect(mockSendDatabaseNotification).toHaveBeenCalledWith({
      userId: 22,
      type: 'achievement',
      title: 'Đánh giá thành tích',
      message: 'Bạn đã được đánh giá "good" và nhận 14.00 điểm',
      relatedTable: 'participations',
      relatedId: 41,
    });

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.participation).toMatchObject({
      id: 41,
      achievementLevel: 'good',
      achievement_level: 'good',
    });
    expect(body.data.points).toEqual({ totalPoints: 14, formula: 'base+bonus' });
  });

  it('preserves unauthorized errors from api guard', async () => {
    const { ApiError } = await import('../src/lib/api-response');

    vi.doMock('@/lib/guards', () => ({
      requireApiRole: async () => {
        throw ApiError.unauthorized('Chưa đăng nhập');
      },
    }));

    vi.doMock('@/lib/notifications', () => ({
      sendDatabaseNotification: vi.fn(async () => undefined),
    }));

    const route = await import('../src/app/api/participations/[id]/evaluate/route');
    const response = await route.POST(
      { json: async () => ({ achievement_level: 'good' }) } as any,
      { params: Promise.resolve({ id: '41' }) } as any
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Chưa đăng nhập');
  });
});
