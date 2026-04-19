import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbAll } from '@/lib/database';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';

export async function GET(request: Request) {
  try {
    await requireApiRole(request, ['admin']);

    const students = await dbAll(
      `SELECT u.id, u.name, u.email, COALESCE(u.student_code, u.code, u.username) as student_code, c.name as class_name
       FROM users u
       LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.role = 'student'
       ORDER BY u.name ASC
       LIMIT 200`
    );

    const rows = students.map((student: any) => ({
      id: Number(student.id),
      name: student.name,
      email: student.email,
      student_code: student.student_code || '',
      class_name: student.class_name || '',
      biometric_readiness: {
        runtime_enabled: FACE_BIOMETRIC_RUNTIME_ENABLED,
        enrollment_status: 'missing',
        training_status: 'not_started',
        face_attendance_ready: false,
        blocker: FACE_BIOMETRIC_RUNTIME_ENABLED
          ? 'Chưa có enrollment và training data cho học viên'
          : 'Face biometric runtime đang bị tắt',
      },
    }));

    return successResponse({
      students: rows,
      summary: {
        total: rows.length,
        ready_count: rows.filter((student) => student.biometric_readiness.face_attendance_ready)
          .length,
        missing_count: rows.filter((student) => !student.biometric_readiness.face_attendance_ready)
          .length,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Biometric students route error:', error);
    return errorResponse(ApiError.internalError('Không thể tải biometric readiness theo học viên'));
  }
}
