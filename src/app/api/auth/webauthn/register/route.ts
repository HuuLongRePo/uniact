import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guards';
import { getRegistrationOptions, verifyRegistration } from '@/lib/webauthn';

// In-memory challenge store (LAN-only). For production replace with persistent cache.
const challengeMap = new Map<number, string>();

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const options = await getRegistrationOptions(user.id, user.name || user.email);
    challengeMap.set(user.id, options.challenge);
    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration init failed' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const challenge = challengeMap.get(user.id);
    if (!challenge) return NextResponse.json({ error: 'Thiếu challenge' }, { status: 400 });
    const ok = await verifyRegistration(user.id, body.response, challenge);
    challengeMap.delete(user.id);
    if (!ok) return NextResponse.json({ error: 'Xác thực thất bại' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Registration verify failed' },
      { status: 400 }
    );
  }
}
