import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbRun, dbGet } from '@/lib/database';

/**
 * POST /api/admin/classes/[id]/assign-teacher
 * Gán giảng viên chủ nhiệm cho lớp
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: classId } = await params;
    const user = await getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Verify class exists
    const classData = await dbGet('SELECT id, name FROM classes WHERE id = ?', [classId]);
    if (!classData) {
      return NextResponse.json({ error: 'Lớp học không tồn tại' }, { status: 404 });
    }

    const { teacher_id } = await request.json();

    if (!teacher_id) {
      return NextResponse.json(
        {
          error: 'Vui lòng cung cấp teacher_id',
        },
        { status: 400 }
      );
    }

    // Verify teacher exists và role = teacher
    const teacher = await dbGet('SELECT id, name, role FROM users WHERE id = ? AND role = ?', [
      teacher_id,
      'teacher',
    ]);

    if (!teacher) {
      return NextResponse.json(
        {
          error: 'Giảng viên không tồn tại hoặc không có role teacher',
        },
        { status: 404 }
      );
    }

    // Ensure one primary teacher per class.
    await dbRun('UPDATE classes SET teacher_id = ? WHERE id = ?', [teacher_id, classId]);
    await dbRun('DELETE FROM class_teachers WHERE class_id = ?', [classId]);
    await dbRun(
      "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
      [classId, teacher_id]
    );

    return NextResponse.json({
      success: true,
      message: `Đã gán giảng viên ${teacher.name} làm chủ nhiệm lớp ${classData.name}`,
      data: {
        class_id: classId,
        teacher_id: teacher_id,
        teacher_name: teacher.name,
      },
    });
  } catch (error: any) {
    console.error('Error assigning teacher to class:', error);
    return NextResponse.json(
      {
        error: error.message || 'Lỗi khi gán giảng viên cho lớp',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/classes/[id]/assign-teacher
 * Xóa giảng viên chủ nhiệm khỏi lớp
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    const user = await getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json(
        {
          error: 'Vui lòng cung cấp teacher_id trong query params',
        },
        { status: 400 }
      );
    }

    // Clear primary teacher assignment if matches
    const cls = (await dbGet('SELECT teacher_id FROM classes WHERE id = ?', [classId])) as any;
    if (cls?.teacher_id && String(cls.teacher_id) === String(teacherId)) {
      await dbRun('UPDATE classes SET teacher_id = NULL WHERE id = ?', [classId]);
    }
    await dbRun('DELETE FROM class_teachers WHERE class_id = ? AND teacher_id = ?', [
      classId,
      teacherId,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa giảng viên khỏi lớp',
    });
  } catch (error: any) {
    console.error('Error removing teacher from class:', error);
    return NextResponse.json(
      {
        error: error.message || 'Lỗi khi xóa giảng viên khỏi lớp',
      },
      { status: 500 }
    );
  }
}
