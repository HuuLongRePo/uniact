import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet, dbHelpers, dbRun } from '@/lib/database';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';
import { encryptEmbedding } from '@/lib/biometrics/encryption';
import { getTeacherStudentHomeroomScope } from '@/lib/teacher-student-scope';

function computeReady(enrollmentStatus: string, trainingStatus: string) {
  return FACE_BIOMETRIC_RUNTIME_ENABLED && enrollmentStatus === 'ready' && trainingStatus === 'trained';
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['admin', 'teacher']);
    await ensureStudentBiometricSchema();

    const { id } = await context.params;
    const studentId = Number(id);
    if (!Number.isFinite(studentId)) {
      throw ApiError.validation('ID hoc vien khong hop le');
    }

    const body = await request.json().catch(() => ({}));
    const trainingStatus = String(body?.training_status || 'pending');
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;
    const trainingVersion = typeof body?.training_version === 'string' ? body.training_version.trim() : null;
    const embeddingInput = Array.isArray(body?.face_embedding)
      ? body.face_embedding
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isFinite(value))
      : null;

    if (!['pending', 'trained', 'failed'].includes(trainingStatus)) {
      throw ApiError.validation('training_status khong hop le');
    }

    let classScope = 'all_school';

    if (user.role === 'teacher') {
      const teacherScope = await getTeacherStudentHomeroomScope(Number(user.id), studentId);
      if (!teacherScope) {
        throw ApiError.notFound('Khong tim thay hoc vien');
      }

      classScope = teacherScope.classId ? `homeroom:${teacherScope.classId}` : 'homeroom:unassigned';

      if (!teacherScope.inScope) {
        try {
          await dbHelpers.createAuditLog({
            actor_id: Number(user.id),
            action: 'biometric_training_denied_out_of_scope',
            target_table: 'student_biometric_profiles',
            target_id: studentId,
            details: {
              actor_role: user.role,
              student_id: studentId,
              class_scope: classScope,
              training_status: trainingStatus,
              result: 'forbidden_out_of_scope',
            },
          });
        } catch (auditError) {
          console.warn('Failed to write biometric training denied audit log:', auditError);
        }

        throw ApiError.forbidden(
          'Giang vien chi duoc thao tac khuon mat voi hoc vien thuoc lop chu nhiem'
        );
      }
    } else {
      const student = await dbGet(`SELECT id FROM users WHERE id = ? AND role = 'student'`, [studentId]);
      if (!student) {
        throw ApiError.notFound('Khong tim thay hoc vien');
      }
    }

    const existingProfile = await dbGet(
      `SELECT enrollment_status, sample_image_count FROM student_biometric_profiles WHERE student_id = ?`,
      [studentId]
    );

    const sampleImageCount = Number(existingProfile?.sample_image_count || 0);
    const encryptedEmbedding =
      embeddingInput && embeddingInput.length > 0
        ? await encryptEmbedding(embeddingInput, studentId)
        : null;
    const nextEnrollmentStatus =
      trainingStatus === 'trained'
        ? 'ready'
        : existingProfile?.enrollment_status || (sampleImageCount > 0 ? 'captured' : 'missing');

    await dbRun(
      `INSERT INTO student_biometric_profiles (
         student_id, enrollment_status, training_status, sample_image_count, notes, training_version,
         face_embedding_encrypted, face_embedding_iv, face_embedding_salt,
         last_trained_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'trained' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
       ON CONFLICT(student_id) DO UPDATE SET
         enrollment_status = excluded.enrollment_status,
         training_status = excluded.training_status,
         sample_image_count = COALESCE(student_biometric_profiles.sample_image_count, excluded.sample_image_count),
         notes = COALESCE(excluded.notes, student_biometric_profiles.notes),
         training_version = COALESCE(excluded.training_version, student_biometric_profiles.training_version),
         face_embedding_encrypted = COALESCE(excluded.face_embedding_encrypted, student_biometric_profiles.face_embedding_encrypted),
         face_embedding_iv = COALESCE(excluded.face_embedding_iv, student_biometric_profiles.face_embedding_iv),
         face_embedding_salt = COALESCE(excluded.face_embedding_salt, student_biometric_profiles.face_embedding_salt),
         last_trained_at = CASE WHEN excluded.training_status = 'trained' THEN CURRENT_TIMESTAMP ELSE student_biometric_profiles.last_trained_at END,
         updated_at = CURRENT_TIMESTAMP`,
      [
        studentId,
        nextEnrollmentStatus,
        trainingStatus,
        sampleImageCount,
        notes,
        trainingVersion,
        encryptedEmbedding?.encryptedData || null,
        encryptedEmbedding?.iv || null,
        encryptedEmbedding?.salt || null,
        trainingStatus,
      ]
    );

    try {
      await dbHelpers.createAuditLog({
        actor_id: Number(user.id),
        action: 'biometric_training_update',
        target_table: 'student_biometric_profiles',
        target_id: studentId,
        details: {
          actor_role: user.role,
          student_id: studentId,
          class_scope: classScope,
          training_status: trainingStatus,
          training_version: trainingVersion || null,
          has_face_embedding: Boolean(encryptedEmbedding),
          result: 'success',
        },
      });
    } catch (auditError) {
      console.warn('Failed to write biometric training audit log:', auditError);
    }

    return successResponse({
      student_id: studentId,
      enrollment_status: nextEnrollmentStatus,
      training_status: trainingStatus,
      sample_image_count: sampleImageCount,
      notes,
      training_version: trainingVersion,
      has_face_embedding: Boolean(encryptedEmbedding),
      face_attendance_ready: computeReady(nextEnrollmentStatus, trainingStatus),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Student biometric training route error:', error);
    return errorResponse(ApiError.internalError('Khong the cap nhat training biometric hoc vien'));
  }
}
