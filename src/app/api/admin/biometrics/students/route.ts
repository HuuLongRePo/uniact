import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbAll } from '@/lib/database';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';

function computeReady(enrollmentStatus: string, trainingStatus: string) {
  return FACE_BIOMETRIC_RUNTIME_ENABLED && enrollmentStatus === 'ready' && trainingStatus === 'trained';
}

export async function GET(request: Request) {
  try {
    const user = await requireApiRole(request, ['admin', 'teacher']);
    await ensureStudentBiometricSchema();

    const teacherScopeSql =
      user.role === 'teacher'
        ? `
        AND (
          c.teacher_id = ?
          OR EXISTS (
            SELECT 1
            FROM class_teachers ct
            WHERE ct.class_id = c.id
              AND ct.teacher_id = ?
              AND ct.role = 'primary'
          )
        )
      `
        : '';

    const teacherScopeParams = user.role === 'teacher' ? [Number(user.id), Number(user.id)] : [];

    const students = await dbAll(
      `SELECT
         u.id,
         u.name,
         u.email,
         COALESCE(u.student_code, u.code, u.username) as student_code,
         c.name as class_name,
         sbp.enrollment_status,
         sbp.training_status,
         sbp.sample_image_count,
         sbp.notes,
         sbp.training_version,
         sbp.last_trained_at
       FROM users u
       LEFT JOIN classes c ON c.id = u.class_id
       LEFT JOIN student_biometric_profiles sbp ON sbp.student_id = u.id
       WHERE u.role = 'student'
       ${teacherScopeSql}
       ORDER BY u.name ASC
       LIMIT 200`,
      teacherScopeParams
    );

    const rows = students.map((student: any) => {
      const enrollmentStatus = student.enrollment_status || 'missing';
      const trainingStatus = student.training_status || 'not_started';
      const ready = computeReady(enrollmentStatus, trainingStatus);
      return {
        id: Number(student.id),
        name: student.name,
        email: student.email,
        student_code: student.student_code || '',
        class_name: student.class_name || '',
        biometric_readiness: {
          runtime_enabled: FACE_BIOMETRIC_RUNTIME_ENABLED,
          enrollment_status: enrollmentStatus,
          training_status: trainingStatus,
          sample_image_count: Number(student.sample_image_count || 0),
          notes: student.notes || null,
          training_version: student.training_version || null,
          last_trained_at: student.last_trained_at || null,
          face_attendance_ready: ready,
          blocker: ready
            ? null
            : FACE_BIOMETRIC_RUNTIME_ENABLED
              ? 'Chua du enrollment hoac training data cho hoc vien'
              : 'Face biometric runtime dang bi tat',
        },
      };
    });

    return successResponse({
      students: rows,
      summary: {
        total: rows.length,
        ready_count: rows.filter((student) => student.biometric_readiness.face_attendance_ready)
          .length,
        missing_count: rows.filter((student) => !student.biometric_readiness.face_attendance_ready)
          .length,
      },
      scope: user.role === 'teacher' ? 'teacher_homeroom' : 'admin_all_students',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Biometric students route error:', error);
    return errorResponse(ApiError.internalError('Khong the tai biometric readiness theo hoc vien'));
  }
}
