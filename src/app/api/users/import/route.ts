import { NextRequest } from 'next/server';
import { dbHelpers, dbGet, dbRun } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

// POST /api/users/import - Import học viên từ CSV
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dryRun = formData.get('dryRun') === 'true'; // Preview mode

    if (!file) {
      return errorResponse(ApiError.badRequest('Cần chọn file CSV'));
    }

    // Read CSV content
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return errorResponse(ApiError.badRequest('File CSV trống hoặc thiếu dữ liệu'));
    }

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredColumns = ['student_id', 'name', 'email', 'class_id'];
    const missingColumns = requiredColumns.filter((col) => !header.includes(col));

    if (missingColumns.length > 0) {
      return errorResponse(
        ApiError.badRequest(`Thiếu cột bắt buộc: ${missingColumns.join(', ')}`, {
          hint: 'Cần các cột: student_id, name, email, class_id',
        })
      );
    }

    // Parse data rows
    const results = {
      total: 0,
      success: 0,
      errors: [] as any[],
      created: [] as any[],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      results.total++;
      const values = line.split(',').map((v) => v.trim());
      const row: any = {};
      header.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });

      // Validation
      const errors: string[] = [];

      if (!row.student_id) {
        errors.push('Thiếu mã học viên');
      }
      if (!row.name) {
        errors.push('Thiếu tên');
      }
      if (!row.email) {
        errors.push('Thiếu email');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push('Email không hợp lệ');
      }
      if (!row.class_id) {
        errors.push('Thiếu mã lớp');
      }

      if (errors.length > 0) {
        results.errors.push({
          line: i + 1,
          data: row,
          errors,
        });
        continue;
      }

      // Check if email exists
      const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [row.email]);

      if (existingUser) {
        results.errors.push({
          line: i + 1,
          data: row,
          errors: ['Email đã tồn tại'],
        });
        continue;
      }

      // Check if class exists
      const classExists = await dbGet('SELECT id FROM classes WHERE id = ?', [
        parseInt(row.class_id),
      ]);

      if (!classExists) {
        results.errors.push({
          line: i + 1,
          data: row,
          errors: [`Không tìm thấy lớp ID: ${row.class_id}`],
        });
        continue;
      }

      // If dry run, just preview
      if (dryRun) {
        results.created.push({
          student_id: row.student_id,
          name: row.name,
          email: row.email,
          class_id: parseInt(row.class_id),
        });
        results.success++;
        continue;
      }

      // Create user
      try {
        const defaultPassword = row.student_id || 'student123'; // Use student_id as default password
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const result = await dbRun(
          `INSERT INTO users (student_id, name, email, password_hash, role, class_id, created_at)
           VALUES (?, ?, ?, ?, 'student', ?, datetime('now'))`,
          [row.student_id, row.name, row.email, hashedPassword, parseInt(row.class_id)]
        );

        // Create audit log
        await dbHelpers.createAuditLog(
          user.id,
          'CREATE',
          'users',
          result.lastID,
          `Import học viên: ${row.name} (${row.email})`
        );

        results.created.push({
          id: result.lastID,
          student_id: row.student_id,
          name: row.name,
          email: row.email,
          class_id: parseInt(row.class_id),
        });
        results.success++;
      } catch (error: any) {
        results.errors.push({
          line: i + 1,
          data: row,
          errors: [error.message || 'Lỗi khi tạo người dùng'],
        });
      }
    }

    if (dryRun) {
      return successResponse(
        {
          preview: true,
          ...results,
        },
        'Preview thành công'
      );
    }

    if (results.success === 0) {
      return errorResponse(
        ApiError.validation('Không import được bản ghi nào', {
          total: results.total,
          success: results.success,
          errors: results.errors,
        })
      );
    }

    return successResponse(
      {
        preview: false,
        ...results,
      },
      `Import hoàn tất: ${results.success}/${results.total} thành công`,
      201
    );
  } catch (error: any) {
    console.error('Import users error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
