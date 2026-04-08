import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun, dbGet } from '@/lib/database';
import bcrypt from 'bcryptjs';

// PUT /api/profile/update - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, email, current_password, new_password } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }

    if (email !== undefined) {
      // Check if email already exists
      const existing = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [
        email,
        user.id,
      ]);
      if (existing) {
        return NextResponse.json(
          {
            error: 'Email already in use',
          },
          { status: 409 }
        );
      }
      updates.push('email = ?');
      values.push(email);
    }

    // Password change requires current password verification
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          {
            error: 'Current password is required to set new password',
          },
          { status: 400 }
        );
      }

      // Verify current password
      const userWithPassword = (await dbGet('SELECT password FROM users WHERE id = ?', [
        user.id,
      ])) as any;

      const isValid = await bcrypt.compare(current_password, userWithPassword.password);
      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Current password is incorrect',
          },
          { status: 401 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          error: 'No fields to update',
        },
        { status: 400 }
      );
    }

    values.push(user.id);

    // Update user
    await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'UPDATE_PROFILE',
        'users',
        user.id,
        JSON.stringify({
          fields: Object.keys(body).filter((k) => k !== 'current_password' && k !== 'new_password'),
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
