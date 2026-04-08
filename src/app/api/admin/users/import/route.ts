import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { allowedRoles, ensureUserColumns, generateUserCode } from '../_utils';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await ensureUserColumns();

    const body = await req.json();
    const { users, dry_run = false } = body;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Users array is required' }, { status: 400 });
    }

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
      created_users: [] as any[],
    };

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 1;

      try {
        // Validate required fields - all must be non-empty
        if (!user.email || !user.name || !user.role || !user.password) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            email: user.email || '',
            error:
              'Missing required fields: email, name, role, password (all fields must be filled)',
          });
          continue;
        }

        // Validate all required fields are not just whitespace
        if (!user.email.trim() || !user.name.trim() || !user.role.trim() || !user.password.trim()) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            email: user.email,
            error: 'All required fields must contain non-empty values',
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            email: user.email,
            error: 'Invalid email format',
          });
          continue;
        }

        // Validate role
        if (!allowedRoles.includes(user.role)) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            email: user.email,
            error: `Invalid role. Allowed: ${allowedRoles.join(', ')}`,
          });
          continue;
        }

        // Validate optional class_id if provided
        const classId =
          user.class_id !== undefined && user.class_id !== null && user.class_id !== ''
            ? parseInt(String(user.class_id), 10)
            : null;
        if (classId !== null && !Number.isFinite(classId)) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            email: user.email,
            error: 'Invalid class_id',
          });
          continue;
        }

        if (classId !== null) {
          const classExists = await dbGet('SELECT id FROM classes WHERE id = ?', [classId]);
          if (!classExists) {
            results.failed++;
            results.errors.push({
              row: rowNum,
              email: user.email,
              error: `Class not found: ${classId}`,
            });
            continue;
          }
        }

        // Check if user already exists
        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [user.email]);

        if (existing) {
          results.skipped++;
          results.errors.push({
            row: rowNum,
            email: user.email,
            error: 'User already exists',
            severity: 'warning',
          });
          continue;
        }

        if (dry_run) {
          // Dry run - just validate, don't insert
          results.success++;
          results.created_users.push({
            email: user.email,
            name: user.name,
            role: user.role,
            status: 'would_create',
          });
          continue;
        }

        const hashedPassword = await bcrypt.hash(user.password, 10);
        const generatedCode = await generateUserCode(user.role);

        const username = (user.username ?? null) as string | null;
        const studentCode = (user.student_code ?? null) as string | null;
        const phone = (user.phone ?? null) as string | null;
        const gender = (user.gender ?? null) as string | null;
        const dateOfBirth = (user.date_of_birth ?? null) as string | null;

        const insertResult = await dbRun(
          `INSERT INTO users (
            email,
            password_hash,
            name,
            role,
            code,
            username,
            student_code,
            class_id,
            phone,
            gender,
            date_of_birth,
            is_active,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
          [
            user.email,
            hashedPassword,
            user.name,
            user.role,
            generatedCode,
            username,
            studentCode,
            classId,
            phone,
            gender,
            dateOfBirth,
          ]
        );

        results.success++;
        results.created_users.push({
          id: insertResult.lastID,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        // Log audit trail
        await dbRun(
          `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [
            currentUser.id,
            'USER_IMPORT',
            'users',
            insertResult.lastID,
            `Imported user: ${user.email} (${user.role})`,
          ]
        );
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          email: user.email || '',
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      ...results,
      dry_run,
      message: dry_run
        ? `Validation complete: ${results.success} valid, ${results.failed} errors, ${results.skipped} duplicates`
        : `Import complete: ${results.success} created, ${results.failed} failed, ${results.skipped} skipped`,
    });
  } catch (error) {
    console.error('User import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
