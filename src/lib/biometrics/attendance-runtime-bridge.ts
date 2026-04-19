import { ApiError } from '@/lib/api-response';
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
