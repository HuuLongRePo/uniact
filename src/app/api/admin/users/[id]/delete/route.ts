import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbRun, dbGet } from '@/lib/database';
import { ensureUserColumns } from '../../_utils';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserColumns();

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Cannot delete yourself
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản của chính mình' },
        { status: 400 }
      );
    }

    const target = await dbGet('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [currentUser.id, 'DEACTIVATE_USER', 'users', userId, JSON.stringify({ email: target.email })]
    );

    return NextResponse.json({
      message: 'Đã vô hiệu hóa người dùng',
      is_active: 0,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
