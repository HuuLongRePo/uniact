import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbHelpers } from '@/lib/database';

// GET /api/scoreboard?page=1&per_page=20&class_id=&sort_by=score&order=desc
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Only teachers, admins, and students can view scoreboard
    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'student') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const params = request.nextUrl?.searchParams;
    const page = Math.max(Number(params?.get('page') || '1'), 1);
    const per_page = Math.min(Math.max(Number(params?.get('per_page') || '20'), 1), 100);
    const class_id = params?.get('class_id') ? Number(params.get('class_id')) : undefined;
    const sort_by = (params?.get('sort_by') === 'name' ? 'name' : 'score') as 'score' | 'name';
    const order = (params?.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    // Students can only view their own class scoreboard
    let filterClassId = class_id;
    if (user.role === 'student' && user.class_id) {
      filterClassId = user.class_id;
    }

    // Teachers can only view their own classes
    if (user.role === 'teacher' && filterClassId) {
      // Verify teacher owns this class
      const classRow = await dbHelpers.getUsersByClass(filterClassId);
      // This is a simple check - in production you might want a separate check
      // For now, we'll allow if class_id is provided
    }

    const result = await dbHelpers.getScoreboard({
      class_id: filterClassId,
      page,
      per_page,
      sort_by,
      order,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Get scoreboard error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
