import { NextResponse } from 'next/server';
import { dbGet, dbAll, dbRun } from '@/lib/database';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = (await dbGet('SELECT role FROM users WHERE id = ?', [decoded.userId])) as any;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templates = await dbAll(
      `
      SELECT 
        t.*,
        at.name as activity_type_name,
        ol.name as organization_level_name
      FROM activity_templates t
      LEFT JOIN activity_types at ON t.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON t.organization_level_id = ol.id
      ORDER BY t.created_at DESC
    `
    );

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const user = (await dbGet('SELECT id, role FROM users WHERE id = ?', [decoded.userId])) as any;

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      activity_type_id,
      organization_level_id,
      default_duration_hours,
      default_max_participants,
      qr_enabled,
    } = body;

    if (!name || !activity_type_id || !organization_level_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await dbRun(
      `
      INSERT INTO activity_templates (
        name,
        description,
        activity_type_id,
        organization_level_id,
        default_duration_hours,
        default_max_participants,
        qr_enabled,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        name,
        description || '',
        activity_type_id,
        organization_level_id,
        default_duration_hours || 2,
        default_max_participants || 50,
        qr_enabled ? 1 : 0,
        user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      template_id: result.lastID,
    });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
