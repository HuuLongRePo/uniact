/**
 * API: Create Award Manually
 * POST /api/admin/awards/create
 *
 * Admin tạo giải thưởng thủ công cho học viên
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbReady, dbRun } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

interface CreateAwardRequest {
  student_id: number;
  award_type?: string;
  award_type_id?: number;
  award_name: string;
  points: number;
  description?: string;
  issue_date?: string;
}

export async function POST(request: NextRequest) {
  try {
    await dbReady();
    const user = await getUserFromRequest(request);

    if (!user) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    const body: CreateAwardRequest = await request.json();
    const { student_id, award_type, award_type_id, award_name, points, description, issue_date } =
      body;

    // Validate
    if (!student_id || !award_name || !points) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc'));
    }

    if (points <= 0) {
      return errorResponse(ApiError.validation('Điểm phải lớn hơn 0'));
    }

    // Kiểm tra student tồn tại
    const student = (await dbGet('SELECT id, name FROM users WHERE id = ? AND role = ?', [
      student_id,
      'student',
    ])) as any;

    if (!student) {
      return errorResponse(ApiError.notFound('Không tìm thấy học viên'));
    }

    // Resolve award_type_id
    let resolvedAwardTypeId = typeof award_type_id === 'number' ? award_type_id : null;
    if (!resolvedAwardTypeId) {
      const lookupName = (award_name || award_type || '').trim();
      if (!lookupName) {
        return errorResponse(ApiError.validation('Thiếu loại khen thưởng'));
      }

      const awardType = (await dbGet('SELECT id FROM award_types WHERE lower(name) = lower(?)', [
        lookupName,
      ])) as any;

      if (!awardType?.id && award_type) {
        const fallback = (await dbGet('SELECT id FROM award_types WHERE lower(name) = lower(?)', [
          String(award_type).trim(),
        ])) as any;
        resolvedAwardTypeId = fallback?.id ?? null;
      } else {
        resolvedAwardTypeId = awardType?.id ?? null;
      }
    }

    if (!resolvedAwardTypeId) {
      return errorResponse(
        ApiError.validation(
          'Không tìm thấy loại khen thưởng. Vui lòng tạo trước trong Admin > Award Types.'
        )
      );
    }

    const reasonParts = [award_name?.trim()].filter(Boolean);
    if (description?.trim()) reasonParts.push(description.trim());
    const reason = reasonParts.join(' - ') || 'Khen thưởng thủ công';

    // Create student_award
    const awardedAt = issue_date?.trim() || null;
    const awardResult = await dbRun(
      `INSERT INTO student_awards (student_id, award_type_id, awarded_by, reason, awarded_at)
       VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))`,
      [student_id, resolvedAwardTypeId, user.id, reason, awardedAt]
    );

    // Add points via student_scores (schema uses student_scores.points + source)
    await dbRun(
      `INSERT INTO student_scores (student_id, points, source, calculated_at)
       VALUES (?, ?, ?, COALESCE(?, datetime('now')))`,
      [student_id, points, `award:${award_name}`, awardedAt]
    );

    // Notification
    await dbRun(
      `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
       VALUES (?, 'award', ?, ?, 'student_awards', ?, 0, datetime('now'))`,
      [
        student_id,
        'Giải thưởng mới',
        `Chúc mừng! Bạn nhận được giải thưởng "${award_name}" - ${points} điểm`,
        awardResult.lastID,
      ]
    );

    // Audit log (baseline schema)
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE_STUDENT_AWARD',
        'student_awards',
        awardResult.lastID,
        JSON.stringify({
          student_id,
          award_type_id: resolvedAwardTypeId,
          award_name,
          points,
          issue_date,
          description,
        }),
      ]
    );

    return successResponse(
      {
        award: {
          id: awardResult.lastID,
          student_id,
          award_name,
          points,
          issued_at: issue_date || new Date().toISOString().split('T')[0],
        },
      },
      `Tạo giải thưởng cho ${student.name} thành công!`
    );
  } catch (error: any) {
    console.error('Error creating award:', error);
    return errorResponse(ApiError.internalError(error.message || 'Không thể tạo khen thưởng'));
  }
}
