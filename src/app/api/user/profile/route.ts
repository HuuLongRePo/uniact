import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

type UserProfileRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  created_at: string;
  gender?: string | null;
  date_of_birth?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  address_detail?: string | null;
};

type ActivityCountRow = {
  activity_count: number;
};

async function buildCurrentUserProfile() {
  const user = await getUserFromSession();
  if (!user) {
    throw ApiError.unauthorized('Chua dang nhap');
  }

  const profile = (await dbGet(
    `SELECT
       u.id,
       u.email,
       u.name,
       u.role,
       u.avatar_url,
       u.class_id,
       u.created_at,
       u.gender,
       u.date_of_birth,
       u.province,
       u.district,
       u.ward,
       u.address_detail,
       c.name as class_name
     FROM users u
     LEFT JOIN classes c ON u.class_id = c.id
     WHERE u.id = ?`,
    [user.id]
  )) as UserProfileRow | null;

  if (!profile) {
    throw ApiError.notFound('Khong tim thay thong tin nguoi dung');
  }

  const activityCountRow = (await dbGet(
    `SELECT COUNT(*) as activity_count
     FROM participations
     WHERE student_id = ?`,
    [user.id]
  )) as ActivityCountRow | null;

  const scoreLedger =
    profile.role === 'student'
      ? await getFinalScoreLedgerByStudentIds([Number(user.id)])
      : new Map<number, { final_total: number }>();

  return {
    user: {
      ...profile,
      activity_count: Number(activityCountRow?.activity_count || 0),
      total_points:
        profile.role === 'student' ? scoreLedger.get(Number(user.id))?.final_total || 0 : 0,
    },
  };
}

export async function GET() {
  try {
    return successResponse(await buildCurrentUserProfile());
  } catch (error: any) {
    console.error('Get profile error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(error?.message || 'Khong the tai thong tin ho so')
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chua dang nhap'));
    }

    const { name, email, currentPassword, newPassword } = await request.json();

    if (email !== user.email) {
      const existing = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [
        email,
        user.id,
      ]);
      if (existing) {
        return errorResponse(ApiError.validation('Email da duoc su dung'));
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return errorResponse(ApiError.validation('Can nhap mat khau hien tai'));
      }

      const userWithPassword = (await dbGet('SELECT password_hash FROM users WHERE id = ?', [
        user.id,
      ])) as { password_hash?: string | null } | null;
      const validPassword = userWithPassword?.password_hash
        ? await bcrypt.compare(currentPassword, userWithPassword.password_hash)
        : false;

      if (!validPassword) {
        return errorResponse(ApiError.validation('Mat khau hien tai khong dung'));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await dbRun('UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?', [
        name,
        email,
        hashedPassword,
        user.id,
      ]);
    } else {
      await dbRun('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, user.id]);
    }

    return successResponse({});
  } catch (error: any) {
    console.error('Update profile error:', error);
    return errorResponse(ApiError.internalError(error.message || 'Loi may chu noi bo'));
  }
}
