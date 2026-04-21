import { NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = (await dbGet('SELECT role FROM users WHERE id = ?', [decoded.userId])) as any;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    await dbRun('DELETE FROM activity_templates WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'Xóa mẫu thành công',
    });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
