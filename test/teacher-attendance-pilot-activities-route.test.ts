import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbAll = vi.fn();
const mockDbGet = vi.fn();
const mockDbRun = vi.fn();

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: async () => ({ id: 12, role: 'teacher' }),
}));

describe('teacher attendance pilot activities route', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDbAll.mockReset();
    mockDbGet.mockReset();
    mockDbRun.mockReset();
    mockDbRun.mockResolvedValue({ changes: 0 });
  });

  it('returns teacher activities with policy summary', async () => {
    mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return [
          {
            id: 50,
            title: 'Pilot Candidate',
            status: 'published',
            approval_status: 'approved',
            max_participants: 100,
            date_time: '2027-01-10T08:00:00.000Z',
            teacher_id: 12,
          },
        ];
      }
      if (sql.includes('FROM activity_classes')) {
        return [{ participation_mode: 'mandatory' }, { participation_mode: 'mandatory' }];
      }
      return [];
    });

    mockDbGet.mockResolvedValue({ count: 55 });

    const route = await import('../src/app/api/teacher/attendance/pilot-activities/route');
    const response = await route.GET({ nextUrl: { searchParams: new URLSearchParams() } } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.activities).toHaveLength(1);
    expect(body.data.activities[0]).toMatchObject({
      id: 50,
      title: 'Pilot Candidate',
      participation_count: 55,
      mandatory_class_count: 2,
    });
    expect(body.data.activities[0].policy_summary).toMatchObject({
      eligible: true,
      preferred_primary_method: 'face',
      recommended_mode: 'mixed',
    });
  });

  it('includes a requested activity even when it falls outside the default top-50 list', async () => {
    mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return [
          {
            id: 50,
            title: 'Newest Candidate',
            status: 'published',
            approval_status: 'approved',
            max_participants: 100,
            date_time: '2027-01-10T08:00:00.000Z',
            teacher_id: 12,
          },
        ];
      }
      if (sql.includes('FROM activity_classes')) {
        return [{ participation_mode: 'mandatory' }];
      }
      return [];
    });

    mockDbGet.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM activities')) {
        return {
          id: Number(params?.[0]),
          title: 'Requested Older Candidate',
          status: 'published',
          approval_status: 'approved',
          max_participants: 90,
          date_time: '2026-12-01T08:00:00.000Z',
          teacher_id: 12,
        };
      }
      return { count: 60 };
    });

    const route = await import('../src/app/api/teacher/attendance/pilot-activities/route');
    const response = await route.GET({
      nextUrl: { searchParams: new URLSearchParams([['activity_id', '777']]) },
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.activities[0]).toMatchObject({
      id: 777,
      title: 'Requested Older Candidate',
    });
  });
});
