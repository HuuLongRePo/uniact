import { ApiError } from '@/lib/api-response';
import { dbGet } from '@/lib/database';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';
import { decryptEmbedding } from './encryption';
import { cosineDistance } from './face-runtime';
import { getFaceRuntimeCapability } from './runtime-capability';

export type FaceAttendanceVerificationInput = {
  confidenceScore: number;
  upstreamVerified: boolean;
  deviceId?: string | null;
  activityId: number;
  studentId: number;
  candidateEmbedding?: number[] | null;
};

export type FaceAttendanceVerificationResult = {
  verified: boolean;
  confidenceScore: number;
  verificationSource: 'upstream' | 'runtime_bridge';
  runtimeMode: string;
};

const FACE_EMBEDDING_DISTANCE_THRESHOLD = 0.18;

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
    `SELECT enrollment_status, training_status, sample_image_count,
            face_embedding_encrypted, face_embedding_iv, face_embedding_salt
     FROM student_biometric_profiles
     WHERE student_id = ?`,
    [input.studentId]
  );

  const enrollmentStatus = String(profile?.enrollment_status || 'missing');
  const trainingStatus = String(profile?.training_status || 'not_started');
  const sampleImageCount = Number(profile?.sample_image_count || 0);
  const hasFaceEmbedding = Boolean(
    profile?.face_embedding_encrypted && profile?.face_embedding_iv && profile?.face_embedding_salt
  );

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

  if (!hasFaceEmbedding) {
    throw new ApiError(
      'FACE_EMBEDDING_MISSING',
      'Học viên chưa có biometric template sẵn sàng cho face attendance',
      409,
      {
        enrollment_status: enrollmentStatus,
        training_status: trainingStatus,
        sample_image_count: sampleImageCount,
        recommended_fallback: 'manual',
      }
    );
  }

  if (Array.isArray(input.candidateEmbedding) && input.candidateEmbedding.length > 0) {
    const storedEmbedding = await decryptEmbedding(
      String(profile.face_embedding_encrypted),
      String(profile.face_embedding_iv),
      String(profile.face_embedding_salt),
      input.studentId
    );
    const distance = cosineDistance(Array.from(storedEmbedding), input.candidateEmbedding);

    if (!Number.isFinite(distance) || distance > FACE_EMBEDDING_DISTANCE_THRESHOLD) {
      throw new ApiError(
        'FACE_EMBEDDING_MISMATCH',
        'Biometric template không khớp để tự động xác nhận face attendance',
        409,
        {
          distance,
          distance_threshold: FACE_EMBEDDING_DISTANCE_THRESHOLD,
          recommended_fallback: 'manual',
        }
      );
    }

    return {
      verified: true,
      confidenceScore: input.confidenceScore,
      verificationSource: 'runtime_bridge',
      runtimeMode: capability.mode,
    };
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
