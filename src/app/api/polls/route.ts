import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/polls - Lấy danh sách polls (teacher: polls của mình, student: polls có thể vote)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    // Tạo bảng polls nếu chưa có
    await dbRun(`
      CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL,
        class_id INTEGER,
        status TEXT DEFAULT 'active',
        allow_multiple BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        closed_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (class_id) REFERENCES classes(id)
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS poll_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        option_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
        FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    let polls;
    if (userRole === 'teacher') {
      // Giảng viên: lấy polls mình tạo
      polls = await dbAll(
        `SELECT 
          p.*,
          c.name as class_name,
          COUNT(DISTINCT pr.user_id) as response_count
         FROM polls p
         LEFT JOIN classes c ON p.class_id = c.id
         LEFT JOIN poll_responses pr ON p.id = pr.poll_id
         WHERE p.created_by = ?
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [userId]
      );
    } else if (userRole === 'student') {
      // Học viên: lấy polls của lớp mình tham gia
      polls = await dbAll(
        `SELECT 
          p.*,
          c.name as class_name,
          COUNT(DISTINCT pr.user_id) as response_count,
          (SELECT COUNT(*) FROM poll_responses WHERE poll_id = p.id AND user_id = ?) as has_voted
         FROM polls p
         LEFT JOIN classes c ON p.class_id = c.id
         INNER JOIN class_members cm ON p.class_id = cm.class_id
         LEFT JOIN poll_responses pr ON p.id = pr.poll_id
         WHERE cm.user_id = ? AND p.status = 'active'
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [userId, userId]
      );
    } else {
      // Admin: lấy tất cả
      polls = await dbAll(
        `SELECT 
          p.*,
          c.name as class_name,
          u.name as creator_name,
          COUNT(DISTINCT pr.user_id) as response_count
         FROM polls p
         LEFT JOIN classes c ON p.class_id = c.id
         LEFT JOIN users u ON p.created_by = u.id
         LEFT JOIN poll_responses pr ON p.id = pr.poll_id
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      );
    }

    return successResponse({ polls });
  } catch (error) {
    console.error('Lỗi lấy danh sách khảo sát:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// POST /api/polls - Tạo poll mới
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return errorResponse(ApiError.forbidden('Chỉ giảng viên hoặc admin mới được tạo khảo sát'));
    }

    const body = await req.json();
    const { title, description, class_id, allow_multiple, options } = body;

    if (!title?.trim() || !Array.isArray(options) || options.length < 2) {
      return errorResponse(ApiError.validation('Cần tiêu đề và ít nhất 2 phương án'));
    }

    // Xác minh quyền sở hữu lớp (nếu teacher)
    if (userRole === 'teacher' && class_id) {
      const classCheck = await dbGet('SELECT id FROM classes WHERE id = ? AND teacher_id = ?', [
        class_id,
        userId,
      ]);
      if (!classCheck) {
        return errorResponse(ApiError.forbidden('Không có quyền (không phải lớp của bạn)'));
      }
    }

    const now = new Date().toISOString();

    // Tạo poll
    const pollResult = await dbRun(
      `INSERT INTO polls (title, description, created_by, class_id, allow_multiple, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description?.trim() || '',
        userId,
        class_id || null,
        allow_multiple ? 1 : 0,
        now,
      ]
    );

    const pollId = pollResult.lastID;

    // Tạo options
    for (let i = 0; i < options.length; i++) {
      if (options[i]?.trim()) {
        await dbRun(
          `INSERT INTO poll_options (poll_id, option_text, display_order)
           VALUES (?, ?, ?)`,
          [pollId, options[i].trim(), i]
        );
      }
    }

    return successResponse({ poll_id: pollId }, 'Tạo khảo sát thành công', 201);
  } catch (error) {
    console.error('Lỗi tạo khảo sát:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
