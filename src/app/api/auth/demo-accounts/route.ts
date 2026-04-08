import { NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';

type DemoAccountRow = {
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  class_name?: string | null;
};

function getPasswordForAccount(email: string, role: DemoAccountRow['role']): string {
  if (role === 'admin') {
    return email === 'admin@annd.edu.vn' ? 'Admin@2025' : 'admin123';
  }

  return role === 'teacher' ? 'teacher123' : 'student123';
}

// GET /api/auth/demo-accounts
// Dev-only helper for login page: returns demo emails from local SQLite.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await dbReady();

    const [admin] = (await dbAll(
      `SELECT email, name, role
       FROM users
       WHERE role = 'admin' AND COALESCE(is_active, 1) = 1
       ORDER BY id
       LIMIT 1`
    )) as DemoAccountRow[];

    const teachers = (await dbAll(
      `SELECT email, name, role
       FROM users
       WHERE role = 'teacher' AND COALESCE(is_active, 1) = 1
       ORDER BY id
       LIMIT 5`
    )) as DemoAccountRow[];

    const students = (await dbAll(
      `SELECT u.email, u.name, u.role, c.name as class_name
       FROM users u
       LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.role = 'student' AND COALESCE(u.is_active, 1) = 1
       ORDER BY u.id
       LIMIT 5`
    )) as DemoAccountRow[];

    const data = [
      ...(admin
        ? [
            {
              email: admin.email,
              password: getPasswordForAccount(admin.email, 'admin'),
              role: 'admin',
              name: admin.name || 'Administrator',
            },
          ]
        : []),
      ...teachers.map((teacher) => ({
        email: teacher.email,
        password: getPasswordForAccount(teacher.email, 'teacher'),
        role: 'teacher',
        name: teacher.name,
      })),
      ...students.map((student) => ({
        email: student.email,
        password: getPasswordForAccount(student.email, 'student'),
        role: 'student',
        name: student.class_name ? `${student.name} - ${student.class_name}` : student.name,
      })),
    ];

    return NextResponse.json({
      success: true,
      accounts: {
        admin: admin?.email ?? null,
        teachers: teachers.map((t) => t.email),
        students: students.map((s) => s.email),
      },
      data,
      count: data.length,
    });
  } catch (error: any) {
    console.error('demo-accounts error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load demo accounts' },
      { status: 500 }
    );
  }
}
