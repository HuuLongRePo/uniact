import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet } from '@/lib/database';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';

export async function GET(request: Request) {
  try {
    await requireApiRole(request, ['admin']);

    const totalStudentsRow = await dbGet(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`);

    const readiness = {
      runtime_enabled: FACE_BIOMETRIC_RUNTIME_ENABLED,
      enrollment_flow_ready: false,
      embedding_storage_ready: false,
      training_route_ready: false,
      face_attendance_route_ready: true,
      total_students: Number(totalStudentsRow?.count ?? 0),
      students_ready_for_face_attendance: 0,
      blockers: [
        'Chưa có luồng enrollment ảnh học viên hoàn chỉnh',
        'Chưa có nơi lưu embedding hoặc training status vận hành',
        'Face biometric runtime đang bị tắt',
      ],
      recommended_next_batch: 'student_image_enrollment_and_training_groundwork',
    };

    return successResponse({ readiness });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error('Biometric readiness route error:', error);
    return errorResponse(ApiError.internalError('Không thể tải trạng thái biometric readiness'));
  }
}
