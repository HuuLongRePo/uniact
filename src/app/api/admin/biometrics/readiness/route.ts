import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { successResponse, ApiError, errorResponse } from '@/lib/api-response';
import { dbGet } from '@/lib/database';
import { getFaceRuntimeCapability } from '@/lib/biometrics/runtime-capability';

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const totalStudentsRow = await dbGet(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`);

    const runtimeCapability = getFaceRuntimeCapability();

    const readiness = {
      runtime_enabled: runtimeCapability.runtime_enabled,
      runtime_mode: runtimeCapability.mode,
      model_loading_ready: runtimeCapability.model_loading_ready,
      model_loading_status: runtimeCapability.model_loading_status,
      embedding_detection_ready: runtimeCapability.embedding_detection_ready,
      liveness_check_ready: runtimeCapability.liveness_check_ready,
      liveness_status: runtimeCapability.liveness_status,
      attendance_api_accepting_runtime_verification:
        runtimeCapability.attendance_api_accepting_runtime_verification,
      enrollment_flow_ready: true,
      embedding_storage_ready: true,
      training_route_ready: true,
      face_attendance_route_ready: true,
      total_students: Number(totalStudentsRow?.count ?? 0),
      students_ready_for_face_attendance: 0,
      blockers: runtimeCapability.blockers,
      recommended_next_batch: runtimeCapability.attendance_api_accepting_runtime_verification
        ? 'face_attendance_operational_closeout'
        : 'face_runtime_enablement',
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
