import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun, dbGet } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const { name, email, currentPassword, newPassword } = await request.json();

    // Validate email uniqueness
    if (email !== user.email) {
      const existing = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [
        email,
        user.id,
      ]);
      if (existing) {
        return errorResponse(ApiError.validation('Email already in use'));
      }
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse(ApiError.validation('Current password required'));
      }

      const userWithPassword = await dbGet('SELECT password FROM users WHERE id = ?', [user.id]);
      const validPassword = userWithPassword?.password
        ? await bcrypt.compare(currentPassword, userWithPassword.password)
        : false;

      if (!validPassword) {
        return errorResponse(ApiError.validation('Invalid current password'));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await dbRun('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?', [
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
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
