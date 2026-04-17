import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbRun, dbAll } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { allowedRoles, ensureUserColumns } from '../_utils';

// GET /api/admin/users/[id] - Get user by ID with lightweight stats
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (Number.isNaN(userId)) {
      return errorResponse(ApiError.validation('ID người dùng không hợp lệ'));
    }

    await requireApiRole(request, ['admin']);
    await ensureUserColumns();

    const targetUser = await dbGet(
      `SELECT 
        u.id, u.email, u.username, u.name as full_name, u.role, u.avatar_url,
        COALESCE(u.student_code, u.code, u.username) as student_code,
        u.phone,
        u.teacher_rank, u.academic_title, u.academic_degree,
        (SELECT c2.id FROM classes c2 WHERE c2.teacher_id = u.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_id,
        (SELECT c2.name FROM classes c2 WHERE c2.teacher_id = u.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_name,
        u.class_id, u.created_at, u.gender, u.date_of_birth, u.citizen_id,
        u.province, u.district, u.ward, u.address_detail,
        u.address, u.code, u.is_active,
        c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = ?`,
      [userId]
    );

    if (!targetUser) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    const stats = (await dbGet(
      `SELECT 
        COUNT(*) as total_participations,
        SUM(CASE WHEN attendance_status = 'attended' THEN 1 ELSE 0 END) as attended
      FROM participations
      WHERE student_id = ?`,
      [userId]
    )) as any;

    const recentActivities = await dbAll(
      `SELECT 
        a.id, a.title, a.date_time, a.status,
        p.attendance_status
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      WHERE p.student_id = ?
      ORDER BY a.date_time DESC
      LIMIT 5`,
      [userId]
    );

    const awards = await dbAll(
      `SELECT id, award_type_id, awarded_at, reason FROM student_awards
       WHERE student_id = ?
       ORDER BY awarded_at DESC
       LIMIT 5`,
      [userId]
    );

    return successResponse({
      user: {
        ...targetUser,
        stats: {
          total_participations: stats?.total_participations || 0,
          attended: stats?.attended || 0,
        },
        recentActivities: recentActivities || [],
        awards: awards || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể tải thông tin người dùng', { details: error?.message });

    return errorResponse(apiError);
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (Number.isNaN(userId)) {
      return errorResponse(ApiError.validation('ID người dùng không hợp lệ'));
    }

    const user = await requireApiRole(request, ['admin']);
    await ensureUserColumns();

    const body = await request.json();
    const {
      email,
      username,
      password,
      full_name,
      role,
      class_id,
      teaching_class_id,
      phone,
      gender,
      date_of_birth,
      citizen_id,
      province,
      district,
      ward,
      address_detail,
      address,
      code,
      is_active,
      student_code,
      teacher_rank,
      academic_title,
      academic_degree,
    } = body;

    const existing = (await dbGet('SELECT id, role FROM users WHERE id = ?', [userId])) as any;
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    const finalRole = (role ?? existing.role) as string;

    if (email) {
      const dup = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (dup) {
        return errorResponse(ApiError.conflict('Email đã tồn tại'));
      }
    }

    if (username) {
      const dup = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [
        username,
        userId,
      ]);
      if (dup) {
        return errorResponse(ApiError.conflict('Username đã tồn tại'));
      }
    }

    if (role && !allowedRoles.includes(role)) {
      return errorResponse(ApiError.validation('Vai trò không hợp lệ'));
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username || null);
    }
    if (full_name !== undefined) {
      updates.push('name = ?');
      values.push(full_name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(hashedPassword);
    }
    if (class_id !== undefined) {
      updates.push('class_id = ?');
      values.push(class_id || null);
    }
    if (teacher_rank !== undefined) {
      updates.push('teacher_rank = ?');
      values.push(teacher_rank || null);
    }
    if (academic_title !== undefined) {
      updates.push('academic_title = ?');
      values.push(academic_title || null);
    }
    if (academic_degree !== undefined) {
      updates.push('academic_degree = ?');
      values.push(academic_degree || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender || null);
    }
    if (date_of_birth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(date_of_birth || null);
    }
    if (citizen_id !== undefined) {
      updates.push('citizen_id = ?');
      values.push(citizen_id || null);
    }
    if (province !== undefined) {
      updates.push('province = ?');
      values.push(province || null);
    }
    if (district !== undefined) {
      updates.push('district = ?');
      values.push(district || null);
    }
    if (ward !== undefined) {
      updates.push('ward = ?');
      values.push(ward || null);
    }
    if (address_detail !== undefined) {
      updates.push('address_detail = ?');
      values.push(address_detail || null);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address || null);
    }
    if (student_code !== undefined) {
      updates.push('student_code = ?');
      values.push(student_code || null);
    }
    if (code !== undefined) {
      updates.push('code = ?');
      values.push(code || null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    const wantsTeacherAssignmentUpdate =
      (finalRole === 'teacher' && teaching_class_id !== undefined) ||
      (finalRole !== 'teacher' && existing.role === 'teacher');

    if (updates.length === 0 && !wantsTeacherAssignmentUpdate) {
      return errorResponse(ApiError.validation('Không có trường nào để cập nhật'));
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(userId);
      await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    } else if (wantsTeacherAssignmentUpdate) {
      await dbRun("UPDATE users SET updated_at = datetime('now') WHERE id = ?", [userId]);
    }

    if (finalRole !== 'teacher' && existing.role === 'teacher') {
      await dbRun('UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?', [userId]);
      await dbRun('DELETE FROM class_teachers WHERE teacher_id = ?', [userId]);
    }

    if (finalRole === 'teacher' && teaching_class_id !== undefined) {
      await dbRun('UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?', [userId]);
      await dbRun('DELETE FROM class_teachers WHERE teacher_id = ?', [userId]);

      if (teaching_class_id) {
        await dbRun('UPDATE classes SET teacher_id = ? WHERE id = ?', [userId, teaching_class_id]);
        await dbRun(
          "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
          [teaching_class_id, userId]
        );
      }
    }

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE_USER', 'users', userId, JSON.stringify(body)]
    );

    const updated = await dbGet(
      `SELECT id, email, username, name as full_name, role,
        COALESCE(student_code, code, username) as student_code,
        phone,
        teacher_rank, academic_title, academic_degree,
        (SELECT c2.id FROM classes c2 WHERE c2.teacher_id = users.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_id,
        (SELECT c2.name FROM classes c2 WHERE c2.teacher_id = users.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_name,
        class_id, gender, date_of_birth, citizen_id,
        province, district, ward, address_detail,
        address, code, is_active
       FROM users WHERE id = ?`,
      [userId]
    );

    return successResponse({ user: updated });
  } catch (error: any) {
    console.error('Error updating user:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể cập nhật người dùng', { details: error?.message });

    return errorResponse(apiError);
  }
}

// DELETE /api/admin/users/[id] - Soft deactivate using is_active
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (Number.isNaN(userId)) {
      return errorResponse(ApiError.validation('ID người dùng không hợp lệ'));
    }

    const user = await requireApiRole(request, ['admin']);
    await ensureUserColumns();

    if (user.id === userId) {
      return errorResponse(ApiError.validation('Không thể tự vô hiệu hóa tài khoản của chính bạn'));
    }

    const existing = await dbGet('SELECT id, email, name FROM users WHERE id = ?', [userId]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    await dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DEACTIVATE_USER', 'users', userId, JSON.stringify({ email: existing.email })]
    );

    return successResponse({}, 'Đã vô hiệu hóa người dùng');
  } catch (error: any) {
    console.error('Error deleting user:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể vô hiệu hóa người dùng', { details: error?.message });

    return errorResponse(apiError);
  }
}
