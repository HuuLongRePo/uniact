import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet, dbRun } from '@/lib/database';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';

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
    const sampleImageDelta = Math.max(1, Number(body?.sample_image_count_delta ?? 1));
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;

    const student = await dbGet(`SELECT id FROM users WHERE id = ? AND role = 'student'`, [studentId]);
    if (!student) {
      throw ApiError.notFound('Không tìm thấy học viên');
    }

    await dbRun(
      `INSERT INTO student_biometric_profiles (
         student_id, enrollment_status, training_status, sample_image_count, notes, updated_at
       ) VALUES (?, 'captured', 'pending', ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id) DO UPDATE SET
         enrollment_status = CASE WHEN student_biometric_profiles.enrollment_status = 'ready' THEN 'ready' ELSE 'captured' END,
         training_status = CASE WHEN student_biometric_profiles.training_status = 'trained' THEN 'trained' ELSE 'pending' END,
         sample_image_count = COALESCE(student_biometric_profiles.sample_image_count, 0) + excluded.sample_image_count,
         notes = COALESCE(excluded.notes, student_biometric_profiles.notes),
         updated_at = CURRENT_TIMESTAMP`,
      [studentId, sampleImageDelta, notes]
    );

    const profile = await dbGet(
      `SELECT student_id, enrollment_status, training_status, sample_image_count, notes
       FROM student_biometric_profiles
       WHERE student_id = ?`,
      [studentId]
    );

    return successResponse({
      student_id: Number(profile.student_id),
      enrollment_status: profile.enrollment_status,
      training_status: profile.training_status,
      sample_image_count: Number(profile.sample_image_count || 0),
      notes: profile.notes || null,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Student biometric enrollment route error:', error);
    return errorResponse(ApiError.internalError('Không thể cập nhật enrollment biometric học viên'));
  }
}
