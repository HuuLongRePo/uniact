import { NextResponse } from 'next/server';
import { dbGet, dbAll, dbReady } from '@/lib/database';

/**
 * GET /api/test-accounts
 * Returns test accounts for development login panel
 * - 1 admin
 * - 5 teachers
 * - 5 students
 */
export async function GET() {
  try {
    await dbReady();

    // Get 1 admin account
    const admin = (await dbGet(`
      SELECT 
        id,
        email,
        name,
        role
      FROM users 
      WHERE role = 'admin' 
        AND is_active = 1
      ORDER BY id ASC
      LIMIT 1
    `)) as { id: number; email: string; name: string; role: string } | undefined;

    // Get 5 teachers
    const teachers = (await dbAll(`
      SELECT 
        id,
        email,
        name,
        role
      FROM users 
      WHERE role = 'teacher' 
        AND is_active = 1
      ORDER BY id ASC
      LIMIT 5
    `)) as { id: number; email: string; name: string; role: string }[];

    // Get 5 students with class info
    const students = (await dbAll(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.role = 'student' 
        AND u.is_active = 1
      ORDER BY u.id ASC
      LIMIT 5
    `)) as { id: number; email: string; name: string; role: string; class_name: string | null }[];

    // Format accounts with their actual passwords
    // Password convention:
    // - admin@school.edu -> admin123 (default admin)
    // - admin@annd.edu.vn -> Admin@2025 (seeded admin)
    // - teachers -> teacher123
    // - students -> student123
    const getPasswordForAccount = (email: string, role: string): string => {
      if (role === 'admin') {
        return email === 'admin@annd.edu.vn' ? 'Admin@2025' : 'admin123';
      }
      return role === 'teacher' ? 'teacher123' : 'student123';
    };

    const accounts = [
      ...(admin
        ? [
            {
              email: admin.email,
              password: getPasswordForAccount(admin.email, admin.role),
              role: admin.role,
              name: admin.name,
            },
          ]
        : []),
      ...teachers.map((t) => ({
        email: t.email,
        password: getPasswordForAccount(t.email, t.role),
        role: t.role,
        name: t.name,
      })),
      ...students.map((s) => ({
        email: s.email,
        password: getPasswordForAccount(s.email, s.role),
        role: s.role,
        name: s.class_name ? `${s.name} - ${s.class_name}` : s.name,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error('Error fetching test accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test accounts' },
      { status: 500 }
    );
  }
}
