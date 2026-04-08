import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/polls/[id] - Lấy chi tiết poll và kết quả
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const pollId = id;

    // Lấy thông tin poll
    const poll = await dbGet(
      `SELECT 
        p.*,
        c.name as class_name,
        u.name as creator_name
       FROM polls p
       LEFT JOIN classes c ON p.class_id = c.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [pollId]
    );

    if (!poll) {
      return errorResponse(ApiError.notFound('Không tìm thấy khảo sát'));
    }

    // Lấy danh sách options với số lượng vote
    const options = await dbAll(
      `SELECT 
        po.id,
        po.option_text,
        po.display_order,
        COUNT(pr.id) as vote_count
       FROM poll_options po
       LEFT JOIN poll_responses pr ON po.id = pr.option_id
       WHERE po.poll_id = ?
       GROUP BY po.id
       ORDER BY po.display_order`,
      [pollId]
    );

    // Kiểm tra user đã vote chưa
    const userVotes = await dbAll(
      'SELECT option_id FROM poll_responses WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );

    const totalVotes = options.reduce((sum: number, opt: any) => sum + opt.vote_count, 0);

    return successResponse({
      poll,
      options: options.map((opt: any) => ({
        ...opt,
        percentage: totalVotes > 0 ? ((opt.vote_count / totalVotes) * 100).toFixed(1) : 0,
      })),
      total_votes: totalVotes,
      user_votes: userVotes.map((v: any) => v.option_id),
      has_voted: userVotes.length > 0,
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết khảo sát:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// POST /api/polls/[id] - Vote cho poll
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const pollId = id;
    const body = await req.json();
    const { option_ids } = body;

    if (!Array.isArray(option_ids) || option_ids.length === 0) {
      return errorResponse(ApiError.validation('Chưa chọn phương án'));
    }

    // Lấy thông tin poll
    const poll = await dbGet('SELECT * FROM polls WHERE id = ?', [pollId]);

    if (!poll) {
      return errorResponse(ApiError.notFound('Không tìm thấy khảo sát'));
    }

    if (poll.status !== 'active') {
      return errorResponse(ApiError.validation('Khảo sát đã đóng'));
    }

    // Kiểm tra allow_multiple
    if (!poll.allow_multiple && option_ids.length > 1) {
      return errorResponse(ApiError.validation('Chỉ được chọn một phương án'));
    }

    // Kiểm tra quyền vote (chỉ students trong lớp)
    if (userRole === 'student' && poll.class_id) {
      const membership = await dbGet(
        'SELECT id FROM class_members WHERE user_id = ? AND class_id = ?',
        [userId, poll.class_id]
      );
      if (!membership) {
        return errorResponse(ApiError.forbidden('Bạn không thuộc lớp này'));
      }
    }

    // Kiểm tra đã vote chưa
    const existingVotes = await dbAll(
      'SELECT id FROM poll_responses WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );

    if (existingVotes.length > 0) {
      return errorResponse(ApiError.validation('Bạn đã bình chọn rồi'));
    }

    // Xác minh option_ids hợp lệ
    const validOptions = await dbAll(
      `SELECT id FROM poll_options WHERE poll_id = ? AND id IN (${option_ids.map(() => '?').join(',')})`,
      [pollId, ...option_ids]
    );

    if (validOptions.length !== option_ids.length) {
      return errorResponse(ApiError.validation('ID phương án không hợp lệ'));
    }

    // Lưu votes
    const now = new Date().toISOString();
    for (const optionId of option_ids) {
      await dbRun(
        'INSERT INTO poll_responses (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?)',
        [pollId, optionId, userId, now]
      );
    }

    return successResponse({}, 'Ghi nhận bình chọn thành công');
  } catch (error) {
    console.error('Lỗi bình chọn khảo sát:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// DELETE /api/polls/[id] - Xóa hoặc đóng poll
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const pollId = id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'close' or 'delete'

    const poll = await dbGet('SELECT * FROM polls WHERE id = ?', [pollId]);

    if (!poll) {
      return errorResponse(ApiError.notFound('Không tìm thấy khảo sát'));
    }

    // Kiểm tra quyền
    if (userRole !== 'admin' && poll.created_by !== parseInt(userId)) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    if (action === 'close') {
      // Đóng poll
      await dbRun('UPDATE polls SET status = ?, closed_at = ? WHERE id = ?', [
        'closed',
        new Date().toISOString(),
        pollId,
      ]);
      return successResponse({}, 'Đã đóng khảo sát');
    } else {
      // Xóa poll (cascade sẽ xóa options và responses)
      await dbRun('DELETE FROM polls WHERE id = ?', [pollId]);
      return successResponse({}, 'Đã xoá khảo sát');
    }
  } catch (error) {
    console.error('Lỗi đóng/xoá khảo sát:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
