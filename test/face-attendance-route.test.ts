import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbGet = vi.fn();
const mockDbAll = vi.fn();
const mockDbRun = vi.fn();
const mockRequireApiAuth = vi.fn();

vi.mock('@/lib/database', () => ({
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: (...args: any[]) => mockRequireApiAuth(...args),
}));

describe('POST /api/attendance/face', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDbGet.mockReset();
    mockDbAll.mockReset();
    mockDbRun.mockReset();
    mockRequireApiAuth.mockReset();
    mockRequireApiAuth.mockResolvedValue({ id: 12, role: 'teacher' });
    mockDbRun.mockResolvedValue({ changes: 1, lastID: 1 });
  });

  it('records face attendance when pilot is eligible and biometric check passes', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 91,
          title: 'Face Pilot Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 120,
          date_time: '2027-01-10T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count FROM participations')) {
        return { count: 60 };
      }
      if (sql.includes('FROM participations')) {
        return { id: 501, attendance_status: 'registered' };
      }
      if (sql.includes('FROM attendance_records')) {
        return null;
      }
      return null;
    });

    mockDbAll.mockResolvedValue([
      { participation_mode: 'mandatory' },
      { participation_mode: 'mandatory' },
    ]);

    const route = await import('../src/app/api/attendance/face/route');
    const response = await route.POST({
      json: async () => ({
        activity_id: 91,
        student_id: 3001,
        confidence_score: 0.91,
        upstream_verified: true,
        device_id: 'cam-a1',
      }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      recorded: true,
      method: 'face',
      activity_id: 91,
      student_id: 3001,
      confidence_score: 0.91,
    });
    expect(mockDbRun).toHaveBeenCalled();
  });

  it('returns low-confidence fallback guidance instead of auto-recording', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 92,
          title: 'Low Confidence Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 120,
          date_time: '2027-01-11T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count FROM participations')) {
        return { count: 55 };
      }
      return null;
    });

    mockDbAll.mockResolvedValue([{ participation_mode: 'mandatory' }]);

    const route = await import('../src/app/api/attendance/face/route');
    const response = await route.POST({
      json: async () => ({
        activity_id: 92,
        student_id: 3002,
        confidence_score: 0.6,
        upstream_verified: true,
      }),
    } as any);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('FACE_LOW_CONFIDENCE');
    expect(body.details).toMatchObject({
      recommended_fallback: 'manual',
      teacher_manual_override: true,
    });
    const attendanceWriteCalls = mockDbRun.mock.calls.filter((call) =>
      String(call?.[0] || '').includes('attendance_records')
    );
    expect(attendanceWriteCalls).toHaveLength(0);
  });

  it('returns already_recorded when attendance record already exists', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 93,
          title: 'Duplicate Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 120,
          date_time: '2027-01-12T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count FROM participations')) {
        return { count: 70 };
      }
      if (sql.includes('FROM participations')) {
        return { id: 777, attendance_status: 'registered' };
      }
      if (sql.includes('FROM attendance_records')) {
        return { id: 999, recorded_at: '2027-01-12T08:05:00.000Z' };
      }
      return null;
    });

    mockDbAll.mockResolvedValue([{ participation_mode: 'mandatory' }]);

    const route = await import('../src/app/api/attendance/face/route');
    const response = await route.POST({
      json: async () => ({
        activity_id: 93,
        student_id: 3003,
        confidence_score: 0.93,
        upstream_verified: true,
      }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      recorded: false,
      already_recorded: true,
      method: 'face',
      activity_id: 93,
      student_id: 3003,
    });
  });
});
