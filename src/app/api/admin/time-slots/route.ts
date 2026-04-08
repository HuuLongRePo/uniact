import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';

// GET /api/admin/time-slots?activity_id=123
export async function GET(request: NextRequest) {
  try {
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    const activityIdRaw = searchParams.get('activity_id') ?? searchParams.get('activityId');
    const limitRaw = searchParams.get('limit');

    const limit = Math.min(Math.max(Number(limitRaw ?? 200) || 200, 1), 1000);

    const bindings: any[] = [];
    let where = '';

    if (activityIdRaw != null && activityIdRaw !== '') {
      const activityId = Number(activityIdRaw);
      if (Number.isNaN(activityId) || activityId <= 0) {
        return NextResponse.json({ error: 'Invalid activity_id' }, { status: 400 });
      }
      where = 'WHERE s.activity_id = ?';
      bindings.push(activityId);
    }

    bindings.push(limit);

    const slots = await dbAll(
      `
      SELECT
        s.*, 
        a.title as activity_title
      FROM activity_time_slots s
      LEFT JOIN activities a ON a.id = s.activity_id
      ${where}
      ORDER BY s.slot_date DESC, s.slot_start ASC
      LIMIT ?
      `,
      bindings
    );

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    console.error('List admin time slots error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list time slots' },
      { status: 500 }
    );
  }
}
