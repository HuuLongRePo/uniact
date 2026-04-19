import { ApiError } from '@/lib/api-response';
import { dbGet } from '@/lib/database';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';
import { getFaceRuntimeCapability } from './runtime-capability';

export type FaceAttendanceVerificationInput = {
  confidenceScore: number;
  upstreamVerified: boolean;
  deviceId?: string | null;
  activityId: number;
  studentId: number;
};

export type FaceAttendanceVerificationResult = {
  verified: boolean;
  confidenceScore: number;
  verificationSource: 'upstream' | 'runtime_bridge';
  runtimeMode: string;
};

export async function verifyFaceAttendanceRuntime(
  input: FaceAttendanceVerificationInput
): Promise<FaceAttendanceVerificationResult> {
  const capability = getFaceRuntimeCapability();

  await ensureStudentBiometricSchema();

  if (!capability.attendance_api_accepting_runtime_verification) {
    throw new ApiError(
      'FACE_RUNTIME_UNAVAILABLE',
      'Runtime face attendance hiện chưa sẵn sàng để xác thực production',
      409,
      {
        runtime_mode: capability.mode,
        blockers: capability.blockers,
        recommended_fallback: 'manual',
      }
    );
  }

  const profile = await dbGet(
    `SELECT enrollment_status, training_status, sample_image_count
     FROM student_biometric_profiles
     WHERE student_id = ?`,
    [input.studentId]
  );

  const enrollmentStatus = String(profile?.enrollment_status || 'missing');
  const trainingStatus = String(profile?.training_status || 'not_started');
  const sampleImageCount = Number(profile?.sample_image_count || 0);

  if (enrollmentStatus !== 'ready' || trainingStatus !== 'trained' || sampleImageCount <= 0) {
    throw new ApiError(
      'FACE_BIOMETRIC_NOT_READY',
      'Học viên chưa sẵn sàng biometric cho face attendance',
      409,
      {
        enrollment_status: enrollmentStatus,
        training_status: trainingStatus,
        sample_image_count: sampleImageCount,
        recommended_fallback: 'manual',
      }
    );
  }

  if (!input.upstreamVerified) {
    throw new ApiError(
      'FACE_NOT_VERIFIED',
      'Face attendance chưa được upstream biometric layer xác thực',
      409,
      {
        runtime_mode: capability.mode,
        recommended_fallback: 'manual',
      }
    );
  }

  return {
    verified: true,
    confidenceScore: input.confidenceScore,
    verificationSource: 'upstream',
    runtimeMode: capability.mode,
  };
}
