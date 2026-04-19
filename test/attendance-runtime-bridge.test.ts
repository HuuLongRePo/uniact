import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbGetMock = vi.fn();
const ensureStudentBiometricSchemaMock = vi.fn();
const getFaceRuntimeCapabilityMock = vi.fn();
const decryptEmbeddingMock = vi.fn();
const cosineDistanceMock = vi.fn();

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
}));

vi.mock('@/infrastructure/db/student-biometric-schema', () => ({
  ensureStudentBiometricSchema: ensureStudentBiometricSchemaMock,
}));

vi.mock('@/lib/biometrics/runtime-capability', () => ({
  getFaceRuntimeCapability: getFaceRuntimeCapabilityMock,
}));

vi.mock('@/lib/biometrics/encryption', () => ({
  decryptEmbedding: decryptEmbeddingMock,
}));

vi.mock('@/lib/biometrics/face-runtime', () => ({
  cosineDistance: cosineDistanceMock,
}));

describe('attendance runtime bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    dbGetMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
    getFaceRuntimeCapabilityMock.mockReset();
    decryptEmbeddingMock.mockReset();
    cosineDistanceMock.mockReset();
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
  });

  it('blocks when student biometric profile is not ready', async () => {
    getFaceRuntimeCapabilityMock.mockReturnValue({
      attendance_api_accepting_runtime_verification: true,
      mode: 'runtime_ready',
      blockers: [],
    });
    dbGetMock.mockResolvedValue({
      enrollment_status: 'captured',
      training_status: 'pending',
      sample_image_count: 2,
      face_embedding_encrypted: null,
      face_embedding_iv: null,
      face_embedding_salt: null,
    });

    const { verifyFaceAttendanceRuntime } = await import('../src/lib/biometrics/attendance-runtime-bridge');

    await expect(
      verifyFaceAttendanceRuntime({
        activityId: 1,
        studentId: 12,
        confidenceScore: 0.9,
        upstreamVerified: true,
        deviceId: 'cam-1',
      })
    ).rejects.toMatchObject({ code: 'FACE_BIOMETRIC_NOT_READY' });
  });

  it('passes when runtime is available and student biometric profile is ready', async () => {
    getFaceRuntimeCapabilityMock.mockReturnValue({
      attendance_api_accepting_runtime_verification: true,
      mode: 'runtime_ready',
      blockers: [],
    });
    dbGetMock.mockResolvedValue({
      enrollment_status: 'ready',
      training_status: 'trained',
      sample_image_count: 5,
      face_embedding_encrypted: 'cipher',
      face_embedding_iv: 'iv',
      face_embedding_salt: 'salt',
    });

    const { verifyFaceAttendanceRuntime } = await import('../src/lib/biometrics/attendance-runtime-bridge');

    await expect(
      verifyFaceAttendanceRuntime({
        activityId: 1,
        studentId: 12,
        confidenceScore: 0.93,
        upstreamVerified: true,
        deviceId: 'cam-1',
      })
    ).resolves.toMatchObject({
      verified: true,
      runtimeMode: 'runtime_ready',
      verificationSource: 'upstream',
    });
  });

  it('blocks when lifecycle is ready but embedding template is still missing', async () => {
    getFaceRuntimeCapabilityMock.mockReturnValue({
      attendance_api_accepting_runtime_verification: true,
      mode: 'runtime_ready',
      blockers: [],
    });
    dbGetMock.mockResolvedValue({
      enrollment_status: 'ready',
      training_status: 'trained',
      sample_image_count: 5,
      face_embedding_encrypted: null,
      face_embedding_iv: null,
      face_embedding_salt: null,
    });

    const { verifyFaceAttendanceRuntime } = await import('../src/lib/biometrics/attendance-runtime-bridge');

    await expect(
      verifyFaceAttendanceRuntime({
        activityId: 1,
        studentId: 12,
        confidenceScore: 0.92,
        upstreamVerified: true,
        deviceId: 'cam-1',
      })
    ).rejects.toMatchObject({ code: 'FACE_EMBEDDING_MISSING' });
  });

  it('blocks when candidate embedding does not match stored template', async () => {
    getFaceRuntimeCapabilityMock.mockReturnValue({
      attendance_api_accepting_runtime_verification: true,
      mode: 'runtime_ready',
      blockers: [],
    });
    dbGetMock.mockResolvedValue({
      enrollment_status: 'ready',
      training_status: 'trained',
      sample_image_count: 5,
      face_embedding_encrypted: 'cipher',
      face_embedding_iv: 'iv',
      face_embedding_salt: 'salt',
    });
    decryptEmbeddingMock.mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));
    cosineDistanceMock.mockReturnValue(0.42);

    const { verifyFaceAttendanceRuntime } = await import('../src/lib/biometrics/attendance-runtime-bridge');

    await expect(
      verifyFaceAttendanceRuntime({
        activityId: 1,
        studentId: 12,
        confidenceScore: 0.92,
        upstreamVerified: true,
        deviceId: 'cam-1',
        candidateEmbedding: [0.8, 0.9, 1.0],
      })
    ).rejects.toMatchObject({ code: 'FACE_EMBEDDING_MISMATCH' });
  });

  it('passes when candidate embedding matches stored template', async () => {
    getFaceRuntimeCapabilityMock.mockReturnValue({
      attendance_api_accepting_runtime_verification: true,
      mode: 'runtime_ready',
      blockers: [],
    });
    dbGetMock.mockResolvedValue({
      enrollment_status: 'ready',
      training_status: 'trained',
      sample_image_count: 5,
      face_embedding_encrypted: 'cipher',
      face_embedding_iv: 'iv',
      face_embedding_salt: 'salt',
    });
    decryptEmbeddingMock.mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));
    cosineDistanceMock.mockReturnValue(0.04);

    const { verifyFaceAttendanceRuntime } = await import('../src/lib/biometrics/attendance-runtime-bridge');

    await expect(
      verifyFaceAttendanceRuntime({
        activityId: 1,
        studentId: 12,
        confidenceScore: 0.96,
        upstreamVerified: false,
        deviceId: 'cam-1',
        candidateEmbedding: [0.1, 0.2, 0.31],
      })
    ).resolves.toMatchObject({
      verified: true,
      verificationSource: 'runtime_bridge',
      runtimeMode: 'runtime_ready',
    });
  });
});
