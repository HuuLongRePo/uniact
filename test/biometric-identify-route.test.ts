import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiRoleMock = vi.fn();
const teacherCanAccessActivityMock = vi.fn();
const dbGetMock = vi.fn();
const dbAllMock = vi.fn();
const createAuditLogMock = vi.fn();
const decryptEmbeddingMock = vi.fn();
const ensureStudentBiometricSchemaMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/activity-access', () => ({
  teacherCanAccessActivity: teacherCanAccessActivityMock,
}));

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
  dbAll: dbAllMock,
  dbHelpers: {
    createAuditLog: createAuditLogMock,
  },
}));

vi.mock('@/lib/biometrics/encryption', () => ({
  decryptEmbedding: decryptEmbeddingMock,
}));

vi.mock('@/infrastructure/db/student-biometric-schema', () => ({
  ensureStudentBiometricSchema: ensureStudentBiometricSchemaMock,
}));

describe('POST /api/biometric/identify', () => {
  beforeEach(() => {
    vi.resetModules();
    requireApiRoleMock.mockReset();
    teacherCanAccessActivityMock.mockReset();
    dbGetMock.mockReset();
    dbAllMock.mockReset();
    createAuditLogMock.mockReset();
    decryptEmbeddingMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
  });

  it('returns matched candidate for in-scope teacher when distance passes threshold', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 7, role: 'teacher' });
    teacherCanAccessActivityMock.mockResolvedValue(true);
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock.mockResolvedValue({ id: 42, title: 'Sinh hoat toan khoa' });
    dbAllMock.mockResolvedValue([
      {
        student_id: 101,
        student_name: 'Student A',
        enrollment_status: 'ready',
        training_status: 'trained',
        sample_image_count: 5,
        face_embedding_encrypted: 'enc-101',
        face_embedding_iv: 'iv-101',
        face_embedding_salt: 'salt-101',
      },
      {
        student_id: 102,
        student_name: 'Student B',
        enrollment_status: 'ready',
        training_status: 'trained',
        sample_image_count: 5,
        face_embedding_encrypted: 'enc-102',
        face_embedding_iv: 'iv-102',
        face_embedding_salt: 'salt-102',
      },
    ]);
    decryptEmbeddingMock.mockImplementation(async (encrypted: string) => {
      if (encrypted === 'enc-101') {
        return new Float32Array([0.1, 0.2, 0.31]);
      }
      return new Float32Array([0.9, 0.8, 0.7]);
    });
    createAuditLogMock.mockResolvedValue(undefined);

    const route = await import('../src/app/api/biometric/identify/route');
    const response = await route.POST(
      new Request('http://localhost/api/biometric/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: 42,
          candidate_embedding: [0.1, 0.2, 0.3],
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      matched: true,
      activity_id: 42,
    });
    expect(body.data.candidate.student_id).toBe(101);
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'biometric_identify_success',
      })
    );
  });

  it('blocks out-of-scope teacher requests and writes denied audit log', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 7, role: 'teacher' });
    teacherCanAccessActivityMock.mockResolvedValue(false);
    dbGetMock.mockResolvedValue({ id: 42, title: 'Hoat dong 42' });
    createAuditLogMock.mockResolvedValue(undefined);

    const route = await import('../src/app/api/biometric/identify/route');
    const response = await route.POST(
      new Request('http://localhost/api/biometric/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: 42,
          candidate_embedding: [0.1, 0.2, 0.3],
        }),
      }) as any
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(String(body.error || body.message)).toContain('khong co quyen');
    expect(dbAllMock).not.toHaveBeenCalled();
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'biometric_identify_denied_out_of_scope',
      })
    );
  });

  it('returns no-match response when there are no ready biometric profiles', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock.mockResolvedValue({ id: 55, title: 'Hoat dong 55' });
    dbAllMock.mockResolvedValue([
      {
        student_id: 201,
        student_name: 'Student C',
        enrollment_status: 'captured',
        training_status: 'pending',
        sample_image_count: 1,
        face_embedding_encrypted: null,
        face_embedding_iv: null,
        face_embedding_salt: null,
      },
    ]);
    createAuditLogMock.mockResolvedValue(undefined);

    const route = await import('../src/app/api/biometric/identify/route');
    const response = await route.POST(
      new Request('http://localhost/api/biometric/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: 55,
          candidate_embedding: [0.4, 0.5, 0.6],
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      matched: false,
      reason: 'no_ready_biometric_profiles',
      evaluated_count: 0,
    });
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'biometric_identify_no_match',
      })
    );
  });
});
