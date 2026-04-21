import { NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { ApiError } from '@/lib/api-response';

type DemoAccountRow = {
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  class_name?: string | null;
};

const SEARCH_LIMIT_DEFAULT = 24;
const SEARCH_LIMIT_MAX = 60;

function normalizeSearchLimit(rawLimit: string | null): number {
  if (!rawLimit) {
    return SEARCH_LIMIT_DEFAULT;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return SEARCH_LIMIT_DEFAULT;
  }

  return Math.min(parsed, SEARCH_LIMIT_MAX);
}

function escapeLikeValue(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&');
}

function mapDemoAccount(row: DemoAccountRow) {
  const normalizedName =
    row.role === 'admin' && !row.name?.trim()
      ? 'Administrator'
      : row.role === 'student' && row.class_name
        ? `${row.name} - ${row.class_name}`
        : row.name;

  return {
    email: row.email,
    role: row.role,
    name: normalizedName,
  };
}

// GET /api/auth/demo-accounts
// Helper for login page: returns demo account metadata from local SQLite.
// This endpoint is always available in development and can be enabled in production with env vars.
export async function GET(request?: Request) {
  const demoAccountsEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_DEMO_ACCOUNTS === '1' ||
    process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === '1';

  if (!demoAccountsEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: 'Không tìm thấy',
        message: 'Not found',
        code: ApiError.notFound().code,
      },
      { status: 404 }
    );
  }

  try {
    await dbReady();

    const url = request ? new URL(request.url) : null;
    const searchQuery = url?.searchParams.get('q')?.trim() ?? '';
    const searchLimit = normalizeSearchLimit(url?.searchParams.get('limit') ?? null);

    if (searchQuery.length >= 2) {
      const likeQuery = `%${escapeLikeValue(searchQuery.toLowerCase())}%`;
      const searchedUsers = (await dbAll(
        `SELECT u.email, u.name, u.role, c.name as class_name
         FROM users u
         LEFT JOIN classes c ON c.id = u.class_id
         WHERE COALESCE(u.is_active, 1) = 1
           AND u.role IN ('admin', 'teacher', 'student')
           AND (
             LOWER(COALESCE(u.name, '')) LIKE ? ESCAPE '\\'
             OR LOWER(COALESCE(u.email, '')) LIKE ? ESCAPE '\\'
           )
         ORDER BY
           CASE u.role
             WHEN 'admin' THEN 0
             WHEN 'teacher' THEN 1
             ELSE 2
           END,
           u.id ASC
         LIMIT ?`,
        [likeQuery, likeQuery, searchLimit + 1]
      )) as DemoAccountRow[];

      const hasMore = searchedUsers.length > searchLimit;
      const data = searchedUsers.slice(0, searchLimit).map(mapDemoAccount);

      return NextResponse.json({
        success: true,
        data,
        count: data.length,
        search: {
          query: searchQuery,
          limit: searchLimit,
          hasMore,
        },
      });
    }

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
      ...(admin ? [mapDemoAccount({ ...admin, role: 'admin' })] : []),
      ...teachers.map((teacher) => mapDemoAccount({ ...teacher, role: 'teacher' })),
      ...students.map((student) => mapDemoAccount({ ...student, role: 'student' })),
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
