import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet, dbRun } from '@/lib/database';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';

function computeReady(enrollmentStatus: string, trainingStatus: string) {
  return FACE_BIOMETRIC_RUNTIME_ENABLED && enrollmentStatus === 'ready' && trainingStatus === 'trained';
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(request, ['admin']);
    await ensureStudentBiometricSchema();

    const { id } = await context.params;
    const studentId = Number(id);
    if (!Number.isFinite(studentId)) {
      throw ApiError.validation('ID học viên không hợp lệ');
    }

    const body = await request.json().catch(() => ({}));
    const enrollmentStatus = String(body?.enrollment_status || 'missing');
    const trainingStatus = String(body?.training_status || 'not_started');
    const sampleImageCount = Number(body?.sample_image_count ?? 0);
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;
    const trainingVersion = typeof body?.training_version === 'string' ? body.training_version.trim() : null;

    const validEnrollment = ['missing', 'captured', 'ready', 'failed'];
    const validTraining = ['not_started', 'pending', 'trained', 'failed'];

    if (!validEnrollment.includes(enrollmentStatus)) {
      throw ApiError.validation('enrollment_status không hợp lệ');
    }
    if (!validTraining.includes(trainingStatus)) {
      throw ApiError.validation('training_status không hợp lệ');
    }

    const student = await dbGet(`SELECT id FROM users WHERE id = ? AND role = 'student'`, [studentId]);
    if (!student) {
      throw ApiError.notFound('Không tìm thấy học viên');
    }

    await dbRun(
      `INSERT INTO student_biometric_profiles (
         student_id, enrollment_status, training_status, sample_image_count, notes, training_version, last_trained_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'trained' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id) DO UPDATE SET
         enrollment_status = excluded.enrollment_status,
         training_status = excluded.training_status,
         sample_image_count = excluded.sample_image_count,
         notes = excluded.notes,
         training_version = excluded.training_version,
         last_trained_at = CASE WHEN excluded.training_status = 'trained' THEN CURRENT_TIMESTAMP ELSE student_biometric_profiles.last_trained_at END,
         updated_at = CURRENT_TIMESTAMP`,
      [studentId, enrollmentStatus, trainingStatus, sampleImageCount, notes, trainingVersion, trainingStatus]
    );

    return successResponse({
      student_id: studentId,
      enrollment_status: enrollmentStatus,
      training_status: trainingStatus,
      sample_image_count: sampleImageCount,
      notes,
      training_version: trainingVersion,
      face_attendance_ready: computeReady(enrollmentStatus, trainingStatus),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Student biometric mutation route error:', error);
    return errorResponse(ApiError.internalError('Không thể cập nhật biometric readiness học viên'));
  }
}
