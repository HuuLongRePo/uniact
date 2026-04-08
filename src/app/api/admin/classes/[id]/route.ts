import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbGet, dbRun, dbAll } from '@/lib/database';

// GET /api/admin/classes/[id] - Get class by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classData = await dbGet(
      `SELECT 
        c.id, c.name, c.grade, c.teacher_id, t.name as teacher_name,
        c.description, c.created_at,
        COUNT(DISTINCT u.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.id = u.class_id AND u.role = 'student' AND (u.is_active IS NULL OR u.is_active = 1)
      LEFT JOIN users t ON c.teacher_id = t.id
      WHERE c.id = ?
      GROUP BY c.id`,
      [id]
    );

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get assigned teachers
    const teachers = await dbAll(
      `SELECT u.id, u.name, u.email
       FROM class_teachers ct
       JOIN users u ON ct.teacher_id = u.id
       WHERE ct.class_id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: { ...classData, teachers },
    });
  } catch (error: any) {
    console.error('Error fetching class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/classes/[id] - Update class
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, grade, description, teacher_id } = body;

    // Check if class exists
    const existing = await dbGet('SELECT id FROM classes WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (grade !== undefined) {
      updates.push('grade = ?');
      values.push(grade);
    }
    if (teacher_id !== undefined) {
      updates.push('teacher_id = ?');
      values.push(teacher_id || null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length > 0) {
      values.push(id);
      await dbRun(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    // Keep class_teachers in sync for primary teacher assignment
    if (teacher_id !== undefined) {
      await dbRun('DELETE FROM class_teachers WHERE class_id = ?', [id]);
      if (teacher_id) {
        // Verify teacher exists and is teacher
        const teacher = await dbGet('SELECT id FROM users WHERE id = ? AND role = ?', [
          teacher_id,
          'teacher',
        ]);
        if (!teacher) {
          return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        await dbRun(
          "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
          [id, teacher_id]
        );
      }
    }

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE_CLASS', 'classes', id, JSON.stringify(body)]
    );

    return NextResponse.json({ success: true, message: 'Class updated successfully' });
  } catch (error: any) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/classes/[id] - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if class exists
    const existing = await dbGet('SELECT id, name FROM classes WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check if class has students
    const students = await dbAll('SELECT id FROM users WHERE class_id = ?', [id]);
    if (students.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete class with students. Please reassign students first.',
        },
        { status: 400 }
      );
    }

    // Delete class_teachers assignments
    await dbRun('DELETE FROM class_teachers WHERE class_id = ?', [id]);

    // Delete class
    await dbRun('DELETE FROM classes WHERE id = ?', [id]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE_CLASS', 'classes', id, JSON.stringify({ name: existing.name })]
    );

    return NextResponse.json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
