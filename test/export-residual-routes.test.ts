import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbReady: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  getUserFromRequest: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  dbReady: mocks.dbReady,
  dbGet: mocks.dbGet,
  dbAll: mocks.dbAll,
}));

vi.mock('@/lib/guards', () => ({
  getUserFromRequest: mocks.getUserFromRequest,
}));

vi.mock('@/lib/scoring', () => ({
  PointCalculationService: class PointCalculationService {},
}));

describe('residual export routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.dbReady.mockResolvedValue(undefined);
    mocks.getUserFromRequest.mockResolvedValue({ id: 1, role: 'admin' });
  });

  it('exports activity participation csv with utf-8 content-disposition', async () => {
    mocks.dbGet.mockResolvedValue({ id: 42, teacher_id: 10, title: 'Hoat dong A' });
    mocks.dbAll.mockResolvedValue([
      {
        student_id: 1001,
        student_name: 'Nguyen Van A',
        email: 'a@example.com',
        class_name: 'CTK42',
        attendance_status: 'attended',
        achievement_level: 'good',
        feedback: '',
        registered_at: '2026-04-25T01:00:00.000Z',
        evaluated_at: '2026-04-25T02:00:00.000Z',
        points: 5,
        evaluated_by_name: 'Teacher A',
      },
    ]);

    const route = await import('../src/app/api/export/activity-participation/route');
    const response = await route.GET({
      nextUrl: {
        searchParams: new URLSearchParams([['activity_id', '42']]),
      },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="activity-42-participants-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''activity-42-participants-\d{4}-\d{2}-\d{2}\.csv$/
    );
  });

  it('exports class summary csv with utf-8 content-disposition', async () => {
    mocks.dbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM classes WHERE id = ?')) {
        return { id: 7, name: 'CTK42' };
      }
      if (sql.includes('SELECT COALESCE(SUM(points), 0) as total FROM student_scores')) {
        return { total: 80 };
      }
      if (sql.includes('FROM participations')) {
        return { attended: 3, excellent: 1, good: 1 };
      }
      return null;
    });

    mocks.dbAll.mockResolvedValue([
      {
        id: 1001,
        name: 'Nguyen Van A',
        email: 'a@example.com',
      },
    ]);

    const route = await import('../src/app/api/export/class-summary/route');
    const response = await route.GET({
      nextUrl: {
        searchParams: new URLSearchParams([['class_id', '7']]),
      },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="class-7-summary-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''class-7-summary-\d{4}-\d{2}-\d{2}\.csv$/
    );
  });
});

