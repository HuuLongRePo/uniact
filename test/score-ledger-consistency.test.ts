import { describe, expect, it, vi, beforeEach } from 'vitest';

const requireApiRoleMock = vi.fn();
const dbAllMock = vi.fn();
const dbGetMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/database', () => ({
  dbAll: dbAllMock,
  dbGet: dbGetMock,
  dbReady: vi.fn(),
}));

describe('score ledger consistency surfaces', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireApiRoleMock.mockResolvedValue({ id: 11, role: 'admin', name: 'Admin' });
  });

  it('student statistics uses final total including awards and adjustments', async () => {
    requireApiRoleMock.mockResolvedValueOnce({ id: 11, role: 'student', name: 'Student 11' });

    dbGetMock.mockImplementation(async (query: string) => {
      if (query.includes("COUNT(*) as count") && query.includes("attendance_status IN ('registered', 'attended')")) {
        return { count: 2 };
      }
      if (query.includes("attendance_status = 'attended'")) {
        return { count: 1 };
      }
      if (query.includes('FROM notifications')) {
        return { count: 0 };
      }
      if (query.includes("attendance_status = 'registered'")) {
        return { count: 1 };
      }
      if (query.includes('SELECT points') && query.includes('FROM student_scores')) {
        return { points: 5 };
      }
      return null;
    });

    dbAllMock.mockImplementation(async (query: string, params?: any[]) => {
      if (query.includes('SELECT id FROM users WHERE role = \'student\'')) {
        return [{ id: 11 }, { id: 12 }];
      }
      if (query.includes('WITH participation_totals AS')) {
        return [
          { student_id: 11, participation_points: 10, award_points: 3, adjustment_points: -1, final_total: 12 },
          { student_id: 12, participation_points: 8, award_points: 0, adjustment_points: 0, final_total: 8 },
        ];
      }
      return [];
    });

    const route = await import('../src/app/api/student/statistics/route');
    const response = await route.GET(new Request('http://localhost/api/student/statistics') as any);
    const body = await response.json();

    expect(body.data.statistics.totalScore).toBe(12);
    expect(body.data.statistics.rank).toBe(1);
  });

  it('admin leaderboard ranks by final total including awards and adjustments', async () => {
    dbAllMock.mockImplementation(async (query: string) => {
      if (query.includes('SELECT') && query.includes('u.id as user_id') && query.includes('GROUP BY u.id')) {
        return [
          { user_id: 11, name: 'Student A', email: 'a@example.com', class_name: '12A1', activities_count: 1 },
          { user_id: 12, name: 'Student B', email: 'b@example.com', class_name: '12A1', activities_count: 1 },
        ];
      }
      if (query.includes('WITH participation_totals AS')) {
        return [
          { student_id: 11, participation_points: 10, award_points: 0, adjustment_points: 0, final_total: 10 },
          { student_id: 12, participation_points: 8, award_points: 5, adjustment_points: 0, final_total: 13 },
        ];
      }
      return [];
    });

    const route = await import('../src/app/api/admin/leaderboard/route');
    const response = await route.GET(new Request('http://localhost/api/admin/leaderboard?limit=10') as any);
    const body = await response.json();

    expect(body.data.leaderboard[0]).toMatchObject({ user_id: 12, total_points: 13, rank: 1 });
    expect(body.data.leaderboard[1]).toMatchObject({ user_id: 11, total_points: 10, rank: 2 });
  });

  it('teacher students uses final total including adjustments', async () => {
    requireApiRoleMock.mockResolvedValueOnce({ id: 21, role: 'teacher', name: 'Teacher' });

    dbAllMock.mockImplementation(async (query: string) => {
      if (query.includes('SELECT DISTINCT c.id as class_id')) {
        return [{ class_id: 1 }];
      }
      if (query.includes('FROM users u') && query.includes('GROUP BY u.id')) {
        return [
          { id: 11, email: 'a@example.com', name: 'Student A', class_id: 1, class_name: '12A1', activities_count: 1 },
          { id: 12, email: 'b@example.com', name: 'Student B', class_id: 1, class_name: '12A1', activities_count: 1 },
        ];
      }
      if (query.includes('WITH participation_totals AS')) {
        return [
          { student_id: 11, participation_points: 10, award_points: 0, adjustment_points: -2, final_total: 8 },
          { student_id: 12, participation_points: 7, award_points: 0, adjustment_points: 3, final_total: 10 },
        ];
      }
      if (query.includes('SELECT c.id, c.name, c.grade')) {
        return [{ id: 1, name: '12A1', grade: '12' }];
      }
      return [];
    });

    const route = await import('../src/app/api/teacher/students/route');
    const response = await route.GET(new Request('http://localhost/api/teacher/students') as any);
    const body = await response.json();

    expect(body.data.students[0]).toMatchObject({ id: 12, total_points: 10, total_score: 10 });
    expect(body.data.students[1]).toMatchObject({ id: 11, total_points: 8, total_score: 8 });
  });
});
