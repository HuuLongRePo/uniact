import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbGet = vi.fn();
const mockDbAll = vi.fn();
const mockDbRun = vi.fn();
const mockRequireApiAuth = vi.fn();
const mockVerifyFaceAttendanceRuntime = vi.fn();
const mockSendDatabaseNotification = vi.fn();

vi.mock('@/lib/database', () => ({
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbRun: (...args: any[]) => mockDbRun(...args),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: (...args: any[]) => mockRequireApiAuth(...args),
}));

vi.mock('@/lib/biometrics/attendance-runtime-bridge', () => ({
  verifyFaceAttendanceRuntime: (...args: any[]) => mockVerifyFaceAttendanceRuntime(...args),
}));

vi.mock('@/lib/notifications', () => ({
  sendDatabaseNotification: (...args: any[]) => mockSendDatabaseNotification(...args),
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
    mockVerifyFaceAttendanceRuntime.mockReset();
    mockSendDatabaseNotification.mockReset();
    mockSendDatabaseNotification.mockResolvedValue({ notificationId: 1, eventId: 1 });
  });

  it('fails closed when runtime capability is still unavailable', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    mockVerifyFaceAttendanceRuntime.mockRejectedValueOnce(
      new ApiError(
        'FACE_RUNTIME_UNAVAILABLE',
        'Runtime face attendance hiện chưa sẵn sàng để xác thực production',
        409,
        { runtime_mode: 'stubbed', recommended_fallback: 'manual' }
      )
    );
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

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('FACE_RUNTIME_UNAVAILABLE');
    expect(body.details).toMatchObject({
      runtime_mode: 'stubbed',
      recommended_fallback: 'manual',
    });
    const attendanceWriteCalls = mockDbRun.mock.calls.filter((call) =>
      String(call?.[0] || '').includes('attendance_records')
    );
    expect(attendanceWriteCalls).toHaveLength(0);
  });

  it('records face attendance when pilot is eligible and biometric check passes', async () => {
    mockVerifyFaceAttendanceRuntime.mockResolvedValue({
      verified: true,
      confidenceScore: 0.91,
      verificationSource: 'upstream',
      verificationMethod: 'upstream_verified',
      runtimeMode: 'runtime_ready',
    });
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
      verification_source: 'upstream',
      verification_method: 'upstream_verified',
      runtime_mode: 'runtime_ready',
    });
    expect(mockDbRun).toHaveBeenCalled();
    expect(mockSendDatabaseNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3001,
        type: 'success',
        title: expect.stringMatching(/Face attendance/i),
        relatedTable: 'activities',
        relatedId: 91,
      })
    );
  });

  it('blocks when student biometric profile is not ready', async () => {
    const { ApiError } = await import('../src/lib/api-response');
    mockVerifyFaceAttendanceRuntime.mockRejectedValueOnce(
      new ApiError(
        'FACE_BIOMETRIC_NOT_READY',
        'Học viên chưa sẵn sàng biometric cho face attendance',
        409,
        {
          enrollment_status: 'captured',
          training_status: 'pending',
          sample_image_count: 2,
          recommended_fallback: 'manual',
        }
      )
    );
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 92,
          title: 'Readiness Gap Activity',
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
        confidence_score: 0.91,
        upstream_verified: true,
      }),
    } as any);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('FACE_BIOMETRIC_NOT_READY');
    expect(body.details).toMatchObject({
      enrollment_status: 'captured',
      training_status: 'pending',
      recommended_fallback: 'manual',
    });
  });

  it('rejects invalid candidate embedding payloads before verification', async () => {
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 95,
          title: 'Invalid Embedding Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 120,
          date_time: '2027-01-14T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count FROM participations')) {
        return { count: 60 };
      }
      return null;
    });

    mockDbAll.mockResolvedValue([{ participation_mode: 'mandatory' }]);

    const route = await import('../src/app/api/attendance/face/route');
    const response = await route.POST({
      json: async () => ({
        activity_id: 95,
        student_id: 3005,
        confidence_score: 0.95,
        candidate_embedding: [0.1, 'bad-value', 0.3],
      }),
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('INVALID_CANDIDATE_EMBEDDING');
    expect(mockVerifyFaceAttendanceRuntime).not.toHaveBeenCalled();
  });

  it('returns low-confidence fallback guidance instead of auto-recording', async () => {
    mockVerifyFaceAttendanceRuntime.mockResolvedValue({
      verified: true,
      confidenceScore: 0.6,
      verificationSource: 'upstream',
      verificationMethod: 'upstream_verified',
      runtimeMode: 'runtime_ready',
    });
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
    mockVerifyFaceAttendanceRuntime.mockResolvedValue({
      verified: true,
      confidenceScore: 0.93,
      verificationSource: 'upstream',
      verificationMethod: 'upstream_verified',
      runtimeMode: 'runtime_ready',
    });
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
      verification_source: 'upstream',
      verification_method: 'upstream_verified',
      runtime_mode: 'runtime_ready',
    });
    expect(mockSendDatabaseNotification).not.toHaveBeenCalled();
  });

  it('returns runtime-bridge verification metadata when candidate embedding branch succeeds', async () => {
    mockVerifyFaceAttendanceRuntime.mockResolvedValue({
      verified: true,
      confidenceScore: 0.95,
      verificationSource: 'runtime_bridge',
      verificationMethod: 'candidate_embedding',
      runtimeMode: 'runtime_ready',
    });
    mockDbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM activities')) {
        return {
          id: 94,
          title: 'Candidate Embedding Activity',
          status: 'published',
          approval_status: 'approved',
          max_participants: 120,
          date_time: '2027-01-13T08:00:00.000Z',
        };
      }
      if (sql.includes('COUNT(*) as count FROM participations')) {
        return { count: 80 };
      }
      if (sql.includes('FROM participations')) {
        return { id: 901, attendance_status: 'registered' };
      }
      if (sql.includes('FROM attendance_records')) {
        return null;
      }
      return null;
    });

    mockDbAll.mockResolvedValue([{ participation_mode: 'mandatory' }]);

    const route = await import('../src/app/api/attendance/face/route');
    const response = await route.POST({
      json: async () => ({
        activity_id: 94,
        student_id: 3004,
        confidence_score: 0.95,
        upstream_verified: false,
        candidate_embedding: [0.1, 0.2, 0.3],
      }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      verification_source: 'runtime_bridge',
      verification_method: 'candidate_embedding',
      runtime_mode: 'runtime_ready',
    });
    expect(mockVerifyFaceAttendanceRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateEmbedding: [0.1, 0.2, 0.3],
        upstreamVerified: false,
      })
    );
  });
});
