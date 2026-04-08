import { NextRequest } from 'next/server';
import { dbGet, dbAll, dbRun } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// GET /api/users - Lấy danh sách người dùng (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // filter by role
    const search = searchParams.get('search'); // search by name/email
    const classId = searchParams.get('class_id'); // filter by class

    let query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.avatar_url,
        u.class_id,
        u.created_at,
        c.name as class_name,
        (SELECT COUNT(*) FROM participations WHERE student_id = u.id) as activity_count,
        (SELECT SUM(points) FROM student_scores WHERE student_id = u.id) as total_points
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (classId) {
      query += ' AND u.class_id = ?';
      params.push(parseInt(classId));
    }

    query += ' ORDER BY u.created_at DESC';

    const users = await dbAll(query, params);

    return successResponse({
      users,
      total: users.length,
    });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách người dùng:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// POST /api/users - Tạo người dùng mới (admin only)
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 20, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Tạo người dùng quá nhanh. Vui lòng thử lại sau ít phút.', 429)
      );
    }

    const user = await requireApiRole(request, ['admin']);

    const {
      email,
      name,
      password,
      role,
      class_id,
      gender,
      date_of_birth,
      citizen_id,
      province,
      district,
      ward,
      address_detail,
    } = await request.json();

    if (!email || !name || !password || !role) {
      return errorResponse(ApiError.validation('Email, tên, mật khẩu và vai trò là bắt buộc'));
    }

    if (!EMAIL_REGEX.test(String(email))) {
      return errorResponse(ApiError.validation('Email không đúng định dạng'));
    }

    if (!STRONG_PASSWORD_REGEX.test(String(password))) {
      return errorResponse(
        ApiError.validation('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số')
      );
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student'];
    if (!validRoles.includes(role)) {
      return errorResponse(ApiError.validation('Vai trò không hợp lệ'));
    }

    if (role === 'student' && (!class_id || Number(class_id) <= 0)) {
      return errorResponse(ApiError.validation('Sinh viên bắt buộc phải thuộc một lớp hợp lệ'));
    }

    // Check email exists
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return errorResponse(ApiError.validation('Email đã tồn tại'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await dbRun(
      `INSERT INTO users (
        email, name, password_hash, role, class_id, gender, date_of_birth, citizen_id, province, district, ward, address_detail, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        email,
        name,
        hashedPassword,
        role,
        class_id || null,
        gender || null,
        date_of_birth || null,
        citizen_id || null,
        province || null,
        district || null,
        ward || null,
        address_detail || null,
      ]
    );

    // Log action
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, 'CREATE', 'users', ?, ?, datetime('now'))`,
      [user.id, result.lastID, `Tạo người dùng: ${name} (${email})`]
    );

    return successResponse({ user_id: result.lastID }, 'Tạo người dùng thành công', 201);
  } catch (error: any) {
    console.error('Lỗi tạo người dùng:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
