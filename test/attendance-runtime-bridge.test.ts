import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbGetMock = vi.fn();
const ensureStudentBiometricSchemaMock = vi.fn();
const getFaceRuntimeCapabilityMock = vi.fn();

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
}));

vi.mock('@/infrastructure/db/student-biometric-schema', () => ({
  ensureStudentBiometricSchema: ensureStudentBiometricSchemaMock,
}));

vi.mock('@/lib/biometrics/runtime-capability', () => ({
  getFaceRuntimeCapability: getFaceRuntimeCapabilityMock,
}));

describe('attendance runtime bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    dbGetMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
    getFaceRuntimeCapabilityMock.mockReset();
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
});
