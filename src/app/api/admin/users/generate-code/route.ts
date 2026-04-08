import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import { allowedRoles, ensureUserColumns, roleToCodePrefix } from '../_utils';

/**
 * GET /api/admin/users/generate-code
 * Auto-generate user code based on role
 * Format:
 * - Student: SV + YYYY + sequential 4 digits (SV2024000001)
 * - Teacher: GV + YYYY + sequential 3 digits (GV2024001)
 * - Admin: AD + YYYY + sequential 3 digits (AD2024001)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'student';

    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await ensureUserColumns();

    // Get current year
    const currentYear = new Date().getFullYear();

    const { prefix, digitLength } = roleToCodePrefix(role);
    const pattern = `${prefix}${currentYear}%`;

    // Get last user code with this pattern
    const lastUser = (await dbGet(
      `SELECT code FROM users 
       WHERE code LIKE ? 
       ORDER BY code DESC LIMIT 1`,
      [pattern]
    )) as any;

    let newCode = '';
    if (lastUser?.code) {
      const sequencePart = lastUser.code.substring(prefix.length + 4);
      const nextSequence = parseInt(sequencePart || '0') + 1;
      newCode = `${prefix}${currentYear}${String(nextSequence).padStart(digitLength, '0')}`;
    } else {
      newCode = `${prefix}${currentYear}${'0'.repeat(digitLength - 1)}1`;
    }

    return NextResponse.json({
      success: true,
      code: newCode,
      role,
      year: currentYear,
    });
  } catch (error: any) {
    console.error('Error generating user code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
