// Template API Admin
// Dùng để scaffold nhanh các tính năng admin

/**
 * TEMPLATE: GET /api/admin/[resource]
 * Liệt kê dữ liệu với phân trang, tìm kiếm và lọc
 */
export const LIST_TEMPLATE = `
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { dbAll } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Xây query kèm bộ lọc
    let query = 'SELECT * FROM [resource] WHERE 1=1'
    const params: any[] = []

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)'
      params.push(\`%\${search}%\`, \`%\${search}%\`)
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const items = await dbAll(query, params)
    const total = await dbAll('SELECT COUNT(*) as count FROM [resource]')

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit)
      }
    })
  } catch (error: any) {
    console.error('Lỗi:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: POST /api/admin/[resource]
 * Tạo mới
 */
export const CREATE_TEMPLATE = `
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate
    const schema = z.object({
      name: z.string().min(3),
      // Add more fields
    })
    
    const validated = schema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ 
        error: 'Dữ liệu không hợp lệ', 
        details: validated.error.errors 
      }, { status: 400 })
    }

    const result = await dbRun(
      'INSERT INTO [resource] (name, created_at) VALUES (?, datetime("now"))',
      [validated.data.name]
    )

    // Ghi audit log
    await dbRun(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [user.id, 'create_[resource]', '[resource]', result.lastID]
    )

    return NextResponse.json({
      success: true,
      data: { id: result.lastID }
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: PUT /api/admin/[resource]/[id]
 * Cập nhật
 */
export const UPDATE_TEMPLATE = `
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const id = parseInt(params.id)
    const body = await request.json()

    // Kiểm tra tồn tại
    const existing = await dbGet('SELECT * FROM [resource] WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })
    }

    // Cập nhật
    await dbRun(
      'UPDATE [resource] SET name = ?, updated_at = datetime("now") WHERE id = ?',
      [body.name, id]
    )

    // Ghi audit log
    await dbRun(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'update_[resource]', '[resource]', id, JSON.stringify(body)]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: DELETE /api/admin/[resource]/[id]
 * Delete resource
 */
export const DELETE_TEMPLATE = `
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id)

    // Check exists
    const existing = await dbGet('SELECT * FROM [resource] WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Soft delete (recommended)
    await dbRun(
      'UPDATE [resource] SET deleted_at = datetime("now") WHERE id = ?',
      [id]
    )

    // Audit log
    await dbRun(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [user.id, 'delete_[resource]', '[resource]', id]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

/**
 * TEMPLATE: GET /api/admin/reports/[type]
 * Generate reports
 */
export const REPORT_TEMPLATE = `
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const format = searchParams.get('format') || 'json' // json | csv

    // Query data
    const data = await dbAll(\`
      SELECT 
        u.name as student_name,
        COUNT(p.id) as total_activities,
        SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as attended,
        COALESCE(SUM(pc.total_points), 0) as total_points
      FROM users u
      LEFT JOIN participations p ON u.id = p.student_id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE u.role = 'student'
      AND p.created_at BETWEEN ? AND ?
      GROUP BY u.id
      ORDER BY total_points DESC
    \`, [startDate, endDate])

    // CSV export
    if (format === 'csv') {
      const csv = convertToCSV(data)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': \`attachment; filename="report-\${Date.now()}.csv"\`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        start_date: startDate,
        end_date: endDate,
        generated_at: new Date().toISOString()
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  )
  
  return [headers.join(','), ...rows].join('\\n')
}
`;

// Export all templates
export default {
  LIST_TEMPLATE,
  CREATE_TEMPLATE,
  UPDATE_TEMPLATE,
  DELETE_TEMPLATE,
  REPORT_TEMPLATE,
};
