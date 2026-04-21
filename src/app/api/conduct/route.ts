import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import createConductAndTrigger from '@/lib/conduct-api';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const payload = {
      studentId: Number(body.student_id),
      term: body.term,
      dailyScore: body.daily_score != null ? Number(body.daily_score) : undefined,
      weeklyScore: body.weekly_score != null ? Number(body.weekly_score) : undefined,
      finalConductScore: Number(body.final_conduct_score),
    };

    if (!payload.studentId || !payload.term || isNaN(payload.finalConductScore)) {
      return NextResponse.json({ error: 'Thiếu trường bắt buộc' }, { status: 400 });
    }

    const result = await createConductAndTrigger(payload, user.id);
    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/conduct error:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
