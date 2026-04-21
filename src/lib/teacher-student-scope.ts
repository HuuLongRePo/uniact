import { ApiError } from '@/lib/api-response';
import { dbGet } from '@/lib/database';

export interface TeacherStudentHomeroomScope {
  studentId: number;
  classId: number | null;
  className: string | null;
  inScope: boolean;
}

export async function getTeacherStudentHomeroomScope(
  teacherId: number,
  studentId: number
): Promise<TeacherStudentHomeroomScope | null> {
  const normalizedTeacherId = Number(teacherId);
  const normalizedStudentId = Number(studentId);

  if (!Number.isFinite(normalizedTeacherId) || !Number.isFinite(normalizedStudentId)) {
    return null;
  }

  const row = (await dbGet(
    `
    SELECT
      u.id as student_id,
      u.class_id as class_id,
      c.name as class_name,
      CASE
        WHEN c.teacher_id = ? THEN 1
        WHEN EXISTS (
          SELECT 1
          FROM class_teachers ct
          WHERE ct.class_id = c.id
            AND ct.teacher_id = ?
            AND ct.role = 'primary'
        ) THEN 1
        ELSE 0
      END as in_scope
    FROM users u
    LEFT JOIN classes c ON c.id = u.class_id
    WHERE u.id = ?
      AND u.role = 'student'
    LIMIT 1
    `,
    [normalizedTeacherId, normalizedTeacherId, normalizedStudentId]
  )) as
    | {
        student_id: number;
        class_id: number | null;
        class_name: string | null;
        in_scope: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    studentId: Number(row.student_id),
    classId: row.class_id == null ? null : Number(row.class_id),
    className: row.class_name ? String(row.class_name) : null,
    inScope: Boolean(Number(row.in_scope || 0)),
  };
}

export async function ensureTeacherStudentHomeroomScope(
  teacherId: number,
  studentId: number
): Promise<TeacherStudentHomeroomScope> {
  const scope = await getTeacherStudentHomeroomScope(teacherId, studentId);
  if (!scope) {
    throw ApiError.notFound('Khong tim thay hoc vien');
  }

  if (!scope.inScope) {
    throw ApiError.forbidden(
      'Giang vien chi duoc thao tac khuon mat voi hoc vien thuoc lop chu nhiem'
    );
  }

  return scope;
}
