import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * GET /api/participations/:id
 * Get participation details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const participationId = parseInt(id);

    const participation = await dbGet(
      `SELECT 
        p.*,
        u.name as student_name,
        a.title as activity_title,
        pc.total_points
       FROM participations p
       JOIN users u ON p.student_id = u.id
       JOIN activities a ON p.activity_id = a.id
       LEFT JOIN point_calculations pc ON p.id = pc.participation_id
       WHERE p.id = ?`,
      [participationId]
    );

    if (!participation) {
      return errorResponse(ApiError.notFound('Participation not found'));
    }

    return successResponse({ participation });
  } catch (error: any) {
    console.error('Error fetching participation:', error);
    return errorResponse(ApiError.internalError(error.message));
  }
}

/**
 * PUT /api/participations/:id
 * Update participation (attendance status, etc.)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const participationId = parseInt(id);
    const body = await request.json();
    const { attendance_status } = body;

    if (!attendance_status) {
      return errorResponse(ApiError.validation('attendance_status is required'));
    }

    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(attendance_status)) {
      return errorResponse(ApiError.validation('Invalid attendance_status'));
    }

    await dbRun(
      `UPDATE participations 
       SET attendance_status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [attendance_status, participationId]
    );

    return successResponse({}, 'Attendance updated successfully');
  } catch (error: any) {
    console.error('Error updating participation:', error);
    return errorResponse(ApiError.internalError(error.message));
  }
}

/**
 * DELETE /api/participations/:id
 * Withdraw/Remove from activity (student unregister)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const participationId = parseInt(id);

    // Get participation details
    const participation = await dbGet(
      `SELECT p.id, p.student_id, p.activity_id, a.title, a.date_time
       FROM participations p
       JOIN activities a ON p.activity_id = a.id
       WHERE p.id = ?`,
      [participationId]
    );

    if (!participation) {
      return errorResponse(ApiError.notFound('Participation not found'));
    }

    // Authorization: student can unregister themselves, admin/teacher can remove anyone
    if (user.role === 'student' && user.id !== participation.student_id) {
      return errorResponse(ApiError.forbidden('You can only unregister yourself from activities'));
    }

    // Check if activity already started (cannot unregister from past activities)
    const activityDateTime = new Date(participation.date_time);
    const now = new Date();
    if (activityDateTime < now && user.role === 'student') {
      return errorResponse(
        new ApiError('CONFLICT', 'Cannot unregister from activities that have already started', 409)
      );
    }

    // Delete related point calculations first
    await dbRun('DELETE FROM point_calculations WHERE participation_id = ?', [participationId]);

    // Delete the participation record
    await dbRun('DELETE FROM participations WHERE id = ?', [participationId]);

    // Log audit
    console.warn(
      `[AUDIT] ${user.role} ${user.id} removed/unregistered participation ${participationId} from activity "${participation.title}"`
    );

    const msgText =
      user.role === 'student'
        ? `Unregistered from activity "${participation.title}"`
        : `Removed student from activity "${participation.title}"`;

    return successResponse(
      {
        participation_id: participationId,
        activity_id: participation.activity_id,
        activity_title: participation.title,
        student_id: participation.student_id,
        action: user.role === 'student' ? 'unregistered' : 'removed',
      },
      msgText
    );
  } catch (error: any) {
    console.error('Error deleting participation:', error);
    return errorResponse(ApiError.internalError(error.message));
  }
}
