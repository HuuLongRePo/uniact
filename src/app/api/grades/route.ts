import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import createGradeAndTrigger from '@/lib/grades-api';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'teacher' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const payload = {
      studentId: Number(body.student_id),
      subjectId: Number(body.subject_id),
      term: body.term,
      componentsJson: body.components_json || null,
      finalScore: Number(body.final_score),
      credits: body.credits ? Number(body.credits) : undefined,
    };

    if (!payload.studentId || !payload.subjectId || !payload.term || isNaN(payload.finalScore)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await createGradeAndTrigger(payload, user.id);
    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/grades error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
