import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guards';
import { getAuthenticationOptions, verifyAuthentication } from '@/lib/webauthn';
import { getJwtSecret } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const challengeMap = new Map<number, string>();

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const options = await getAuthenticationOptions(user.id);
    challengeMap.set(user.id, options.challenge);
    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Auth init failed' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const challenge = challengeMap.get(user.id);
    if (!challenge) return NextResponse.json({ error: 'Thiếu challenge' }, { status: 400 });
    const ok = await verifyAuthentication(user.id, body.response, challenge);
    challengeMap.delete(user.id);
    if (!ok) return NextResponse.json({ error: 'Xác thực thất bại' }, { status: 401 });
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, method: 'webauthn' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );
    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Auth verify failed' }, { status: 400 });
  }
}
