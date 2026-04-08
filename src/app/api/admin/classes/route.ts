import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbAll, dbRun } from '@/lib/database';

// GET /api/admin/classes - List classes with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    const teacherId = searchParams.get('teacher_id') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = `
      SELECT 
        c.id, c.name, c.grade, c.description, c.created_at,
        c.teacher_id,
        t.name as teacher_name,
        COUNT(DISTINCT u.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.id = u.class_id AND u.role = 'student' AND (u.is_active IS NULL OR u.is_active = 1)
      LEFT JOIN users t ON c.teacher_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.grade LIKE ? OR COALESCE(t.name, '') LIKE ?)`;
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    if (grade) {
      query += ` AND c.grade = ?`;
      params.push(grade);
    }

    if (teacherId) {
      query += ` AND c.teacher_id = ?`;
      params.push(Number(teacherId));
    }

    query += ` GROUP BY c.id`;

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM classes c LEFT JOIN users t ON c.teacher_id = t.id WHERE 1=1`;
    const countParams: any[] = [];

    if (search) {
      countQuery += ` AND (c.name LIKE ? OR c.grade LIKE ? OR COALESCE(t.name, '') LIKE ?)`;
      const p = `%${search}%`;
      countParams.push(p, p, p);
    }
    if (grade) {
      countQuery += ` AND c.grade = ?`;
      countParams.push(grade);
    }
    if (teacherId) {
      countQuery += ` AND c.teacher_id = ?`;
      countParams.push(Number(teacherId));
    }

    const countResult = (await dbAll(countQuery, countParams)) as any[];
    const total = countResult[0]?.total || 0;

    // Get paginated results
    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const classes = await dbAll(query, params);

    return NextResponse.json({
      success: true,
      data: classes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/classes - Create new class
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, grade, description, teacher_id } = body;

    // Validation
    if (!name || !grade) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, grade',
        },
        { status: 400 }
      );
    }

    // Check duplicates
    const existing = await dbAll('SELECT id FROM classes WHERE name = ?', [name]);
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Class name already exists',
        },
        { status: 409 }
      );
    }

    // Insert class
    const result = await dbRun(
      `INSERT INTO classes (name, grade, teacher_id, description, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [name, grade, teacher_id || null, description || null]
    );

    const classId = result.lastID;

    // Keep class_teachers in sync for primary teacher assignment
    if (teacher_id) {
      await dbRun(
        "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
        [classId, teacher_id]
      );
    }

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE_CLASS',
        'classes',
        classId,
        JSON.stringify({ name, grade, description, teacher_id }),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: { id: classId, name, grade, description, teacher_id: teacher_id || null },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
