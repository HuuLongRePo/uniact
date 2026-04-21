import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun, dbGet } from '@/lib/database';

/**
 * POST /api/admin/classes/[id]/assign-students
 * Gán nhiều học viên vào lớp
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: classId } = await params;
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Verify class exists
    const classData = await dbGet('SELECT id, name FROM classes WHERE id = ?', [classId]);
    if (!classData) {
      return NextResponse.json({ error: 'Lớp học không tồn tại' }, { status: 404 });
    }

    const { student_ids } = await request.json();

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        {
          error: 'Vui lòng cung cấp danh sách học viên (student_ids array)',
        },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Gán từng học viên vào lớp
    for (const studentId of student_ids) {
      try {
        // Verify student exists và role = student
        const student = await dbGet('SELECT id, name, role FROM users WHERE id = ? AND role = ?', [
          studentId,
          'student',
        ]);

        if (!student) {
          errors.push(`Học viên ID ${studentId} không tồn tại hoặc không phải là học viên`);
          errorCount++;
          continue;
        }

        // Update student's class_id
        await dbRun('UPDATE users SET class_id = ? WHERE id = ?', [classId, studentId]);

        successCount++;
      } catch (err: any) {
        console.error(`Error assigning student ${studentId}:`, err);
        errors.push(`Lỗi gán học viên ID ${studentId}: ${err.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gán ${successCount} học viên vào lớp ${classData.name}`,
      details: {
        total: student_ids.length,
        success: successCount,
        errors: errorCount,
        error_details: errors,
      },
    });
  } catch (error: any) {
    console.error('Error assigning students to class:', error);
    return NextResponse.json(
      {
        error: error.message || 'Lỗi khi gán học viên vào lớp',
      },
      { status: 500 }
    );
  }
}
