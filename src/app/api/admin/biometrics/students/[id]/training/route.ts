import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet, dbRun } from '@/lib/database';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';

function computeReady(enrollmentStatus: string, trainingStatus: string) {
  return FACE_BIOMETRIC_RUNTIME_ENABLED && enrollmentStatus === 'ready' && trainingStatus === 'trained';
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(request, ['admin']);
    await ensureStudentBiometricSchema();

    const { id } = await context.params;
    const studentId = Number(id);
    if (!Number.isFinite(studentId)) {
      throw ApiError.validation('ID học viên không hợp lệ');
    }

    const body = await request.json().catch(() => ({}));
    const trainingStatus = String(body?.training_status || 'pending');
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;
    const trainingVersion = typeof body?.training_version === 'string' ? body.training_version.trim() : null;

    if (!['pending', 'trained', 'failed'].includes(trainingStatus)) {
      throw ApiError.validation('training_status không hợp lệ');
    }

    const student = await dbGet(`SELECT id FROM users WHERE id = ? AND role = 'student'`, [studentId]);
    if (!student) {
      throw ApiError.notFound('Không tìm thấy học viên');
    }

    const existingProfile = await dbGet(
      `SELECT enrollment_status, sample_image_count FROM student_biometric_profiles WHERE student_id = ?`,
      [studentId]
    );

    const sampleImageCount = Number(existingProfile?.sample_image_count || 0);
    const nextEnrollmentStatus = trainingStatus === 'trained'
      ? 'ready'
      : existingProfile?.enrollment_status || (sampleImageCount > 0 ? 'captured' : 'missing');

    await dbRun(
      `INSERT INTO student_biometric_profiles (
         student_id, enrollment_status, training_status, sample_image_count, notes, training_version, last_trained_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'trained' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id) DO UPDATE SET
         enrollment_status = excluded.enrollment_status,
         training_status = excluded.training_status,
         sample_image_count = COALESCE(student_biometric_profiles.sample_image_count, excluded.sample_image_count),
         notes = COALESCE(excluded.notes, student_biometric_profiles.notes),
         training_version = COALESCE(excluded.training_version, student_biometric_profiles.training_version),
         last_trained_at = CASE WHEN excluded.training_status = 'trained' THEN CURRENT_TIMESTAMP ELSE student_biometric_profiles.last_trained_at END,
         updated_at = CURRENT_TIMESTAMP`,
      [studentId, nextEnrollmentStatus, trainingStatus, sampleImageCount, notes, trainingVersion, trainingStatus]
    );

    return successResponse({
      student_id: studentId,
      enrollment_status: nextEnrollmentStatus,
      training_status: trainingStatus,
      sample_image_count: sampleImageCount,
      notes,
      training_version: trainingVersion,
      face_attendance_ready: computeReady(nextEnrollmentStatus, trainingStatus),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Student biometric training route error:', error);
    return errorResponse(ApiError.internalError('Không thể cập nhật training biometric học viên'));
  }
}
