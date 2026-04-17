import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll, dbRun } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { allowedRoles, ensureUserColumns, generateUserCode } from './_utils';

// GET /api/admin/users - List users with pagination and search
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    await ensureUserColumns();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const classId = searchParams.get('class_id') || '';

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        u.id, u.email, u.username, u.name as full_name, u.role, u.avatar_url,
        COALESCE(u.student_code, u.code, u.username) as student_code,
        u.phone,
        u.teacher_rank, u.academic_title, u.academic_degree,
        (SELECT c2.id FROM classes c2 WHERE c2.teacher_id = u.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_id,
        (SELECT c2.name FROM classes c2 WHERE c2.teacher_id = u.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_name,
        u.gender, u.date_of_birth, u.citizen_id,
        u.province, u.district, u.ward, u.address_detail,
        u.address,
        u.class_id, u.created_at, u.code, u.is_active,
        c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE 1=1
        AND (u.is_active IS NULL OR u.is_active = 1)
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR u.code LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (classId) {
      query += ` AND u.class_id = ?`;
      params.push(classId);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) t`;
    const countResult = (await dbAll(countQuery, [...params])) as any[];
    const total = countResult[0]?.total || 0;

    query += ` ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const users = await dbAll(query, [...params]);

    return successResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể tải danh sách người dùng', { details: error?.message });

    return errorResponse(apiError);
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
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
      student_code,
      teacher_rank,
      academic_title,
      academic_degree,
    } = body;

    if (!email || !password || !full_name || !role) {
      return errorResponse(
        ApiError.validation('Thiếu trường bắt buộc', {
          required: ['email', 'password', 'full_name', 'role'],
        })
      );
    }

    if (password.length < 6) {
      return errorResponse(ApiError.validation('Mật khẩu phải có ít nhất 6 ký tự'));
    }

    if (!allowedRoles.includes(role)) {
      return errorResponse(ApiError.validation('Vai trò không hợp lệ'));
    }

    const existingEmail = await dbAll('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return errorResponse(ApiError.conflict('Email đã tồn tại'));
    }

    const normalizedUsername =
      typeof username === 'string' && username.trim()
        ? username.trim()
        : String(email).split('@')[0];

    const existingUsername = await dbAll('SELECT id FROM users WHERE username = ?', [
      normalizedUsername,
    ]);
    if (existingUsername.length > 0) {
      return errorResponse(ApiError.conflict('Username đã tồn tại'));
    }

    const generatedCode = await generateUserCode(role);
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await dbRun(
      `INSERT INTO users (
        email, username, name, role, password_hash,
        class_id, phone,
        teacher_rank, academic_title, academic_degree,
        gender, date_of_birth, citizen_id,
        province, district, ward, address_detail,
        address,
        student_code, code, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [
        email,
        normalizedUsername,
        full_name,
        role,
        hashedPassword,
        class_id || null,
        phone || null,
        teacher_rank || null,
        academic_title || null,
        academic_degree || null,
        gender || null,
        date_of_birth || null,
        citizen_id || null,
        province || null,
        district || null,
        ward || null,
        address_detail || null,
        address || null,
        student_code || (role === 'student' ? generatedCode : null),
        generatedCode,
      ]
    );

    if (role === 'teacher' && teaching_class_id) {
      await dbRun('UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?', [result.lastID]);
      await dbRun('DELETE FROM class_teachers WHERE teacher_id = ?', [result.lastID]);

      await dbRun('UPDATE classes SET teacher_id = ? WHERE id = ?', [
        result.lastID,
        teaching_class_id,
      ]);
      await dbRun(
        "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
        [teaching_class_id, result.lastID]
      );
    }

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE_USER',
        'users',
        result.lastID,
        JSON.stringify({ email, role, code: generatedCode }),
      ]
    );

    console.warn(`✅ User created: ${email} | Temporary password: ${password}`);

    return successResponse(
      {
        user: {
          id: result.lastID,
          email,
          username: normalizedUsername,
          full_name,
          role,
          student_code: student_code || (role === 'student' ? generatedCode : null),
          code: generatedCode,
        },
        temporaryPassword: password,
      },
      'Tạo người dùng thành công. Hãy gửi mật khẩu tạm thời cho người dùng theo cách thủ công.',
      201
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể tạo người dùng', { details: error?.message });

    return errorResponse(apiError);
  }
}
