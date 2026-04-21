import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/user/devices - Danh sách thiết bị của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const devices = await dbAll(
      `SELECT 
        id, device_name, mac_address, approved, last_seen, created_at
      FROM devices
      WHERE user_id = ?
      ORDER BY last_seen DESC`,
      [user.id]
    );

    return successResponse({ devices });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return errorResponse(ApiError.internalError(error.message));
  }
}

// DELETE /api/user/devices?deviceId=123 - Xóa thiết bị
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return errorResponse(ApiError.validation('Thiếu deviceId'));
    }

    // Verify ownership
    const device = await dbAll('SELECT id FROM devices WHERE id = ? AND user_id = ?', [
      deviceId,
      user.id,
    ]);

    if (!device || device.length === 0) {
      return errorResponse(ApiError.notFound('Không tìm thấy thiết bị hoặc bạn không sở hữu thiết bị này'));
    }

    await dbRun('DELETE FROM devices WHERE id = ?', [deviceId]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, 'DELETE_DEVICE', 'devices', deviceId, JSON.stringify({ device_id: deviceId })]
    );

    return successResponse({}, 'Đã xóa thiết bị');
  } catch (error: any) {
    console.error('Error deleting device:', error);
    return errorResponse(ApiError.internalError(error.message));
  }
}
