import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guards';
import { generateQuestions, getQuestionsForUser, verifyAnswers } from '@/lib/security-questions';
import { getJwtSecret } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // Generate if none exist yet
    const existing = await getQuestionsForUser(user.id);
    if (!existing || existing.length === 0) {
      await generateQuestions(user.id);
    }
    const questions = await getQuestionsForUser(user.id);
    return NextResponse.json({ questions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load questions' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const ok = await verifyAnswers(user.id, body.answers || []);
    if (!ok) return NextResponse.json({ error: 'Sai câu trả lời' }, { status: 401 });
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, method: 'security_questions' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );
    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to verify' }, { status: 400 });
  }
}
