import { NextRequest, NextResponse } from 'next/server';
import { createSlots } from '@/lib/time-slots';
import { dbGet, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';

/**
 * POST /api/admin/time-slots/create
 * Tạo time slots tự động cho một hoạt động
 *
 * Body:
 * {
 *   activityId: number
 *   slotDate: string (YYYY-MM-DD)
 *   totalParticipants?: number (mặc định: lấy từ activity.max_participants)
 *   slotSize?: number (mặc định: 500)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
    if (user.role !== 'admin')
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });

    const body = await request.json();
    const { activityId, slotDate, totalParticipants, slotSize } = body;

    // Validate input
    if (!activityId || !slotDate) {
      return NextResponse.json({ error: 'activityId và slotDate là bắt buộc' }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
      return NextResponse.json({ error: 'slotDate phải có định dạng YYYY-MM-DD' }, { status: 400 });
    }

    // Kiểm tra activity tồn tại
    const activity = (await dbGet(
      'SELECT id, title, max_participants FROM activities WHERE id = ?',
      [activityId]
    )) as { id: number; title: string; max_participants: number } | undefined;

    if (!activity) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động' }, { status: 404 });
    }

    // Xác định số lượng participants
    const participantCount = totalParticipants || activity.max_participants || 500;

    // Tạo slots
    const slots = await createSlots(activityId, slotDate, participantCount, slotSize);

    return NextResponse.json({
      success: true,
      message: `Đã tạo ${slots.length} khung giờ cho hoạt động "${activity.title}"`,
      slots,
      details: {
        activityId,
        activityTitle: activity.title,
        slotDate,
        totalParticipants: participantCount,
        slotSize: slotSize || 500,
        slotsCreated: slots.length,
      },
    });
  } catch (error: any) {
    console.error('Create time slots error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo khung giờ' }, { status: 500 });
  }
}
