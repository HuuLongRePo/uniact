import { NextRequest } from 'next/server';
import { dbHelpers } from '@/lib/database';
import { requireApiAuth, requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiAuth(request);

    let classes: any[] = [];
    if (user.role === 'admin') {
      // Admin xem tất cả lớp
      classes = (await dbHelpers.getAllClassesWithTeachers()) as any[];
    } else if (user.role === 'teacher') {
      // Teacher xem lớp mình dạy
      classes = (await dbHelpers.getAllClassesWithTeachers()) as any[]; // Sẽ filter sau
      classes = classes.filter((cls: any) => cls.teacher_id === user.id);
    } else {
      // Student chỉ xem lớp của mình
      if (user.class_id) {
        classes = [(await dbHelpers.getClassById(user.class_id)) as any];
      } else {
        classes = [];
      }
    }

    return successResponse({ classes: classes || [] });
  } catch (error: any) {
    console.error('Get classes error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi server')
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin', 'teacher']);

    const { name, grade, description, teacher_id } = await request.json();

    if (!name || !grade) {
      return errorResponse(ApiError.validation('Tên lớp và khối là bắt buộc'));
    }

    // Nếu là teacher, tự động gán teacher_id là chính họ
    const finalTeacherId = user.role === 'teacher' ? user.id : teacher_id;

    const result = await dbHelpers.createClass({
      name,
      grade,
      teacher_id: finalTeacherId,
      description,
    });

    if (!result.lastID) {
      throw new Error('Không thể tạo lớp học');
    }

    const newClass = await dbHelpers.getClassById(result.lastID);

    return successResponse({ class: newClass }, 'Tạo lớp học thành công', 201);
  } catch (error: any) {
    console.error('Create class error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi server')
    );
  }
}
