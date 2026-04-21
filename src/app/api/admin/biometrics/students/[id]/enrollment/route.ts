import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet, dbHelpers, dbRun } from '@/lib/database';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';
import { getTeacherStudentHomeroomScope } from '@/lib/teacher-student-scope';

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
    const sampleImageDelta = Math.max(1, Number(body?.sample_image_count_delta ?? 1));
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;

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
            action: 'biometric_enrollment_denied_out_of_scope',
            target_table: 'student_biometric_profiles',
            target_id: studentId,
            details: {
              actor_role: user.role,
              student_id: studentId,
              class_scope: classScope,
              result: 'forbidden_out_of_scope',
            },
          });
        } catch (auditError) {
          console.warn('Failed to write biometric enrollment denied audit log:', auditError);
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

    try {
      await dbHelpers.createAuditLog({
        actor_id: Number(user.id),
        action: 'biometric_enrollment_update',
        target_table: 'student_biometric_profiles',
        target_id: studentId,
        details: {
          actor_role: user.role,
          student_id: studentId,
          class_scope: classScope,
          sample_image_count_delta: sampleImageDelta,
          result: 'success',
        },
      });
    } catch (auditError) {
      console.warn('Failed to write biometric enrollment audit log:', auditError);
    }

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
    return errorResponse(ApiError.internalError('Khong the cap nhat enrollment biometric hoc vien'));
  }
}
