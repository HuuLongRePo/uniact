import { NextRequest } from 'next/server';
import { dbAll, ensureActivityClassParticipationMode } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type ClassRow = {
  id: number;
  name: string;
};

type StudentRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  class_id: number;
};

function normalizeIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);
    await ensureActivityClassParticipationMode();

    const body = await request.json().catch(() => ({}));
    const hasLegacy = Array.isArray(body?.class_ids);
    const hasMandatory = Array.isArray(body?.mandatory_class_ids);
    const hasVoluntary = Array.isArray(body?.voluntary_class_ids);

    if (!hasLegacy && !hasMandatory && !hasVoluntary) {
      return errorResponse(
        ApiError.validation(
          'Can gui it nhat mot trong cac truong class_ids, mandatory_class_ids, voluntary_class_ids'
        )
      );
    }

    const rawMandatoryClassIds = hasMandatory
      ? normalizeIds(body.mandatory_class_ids)
      : hasLegacy
        ? normalizeIds(body.class_ids)
        : [];
    const rawVoluntaryClassIds = normalizeIds(body.voluntary_class_ids);
    const overlappedClassIds = rawVoluntaryClassIds.filter((classId) =>
      rawMandatoryClassIds.includes(classId)
    );
    const mandatoryClassIds = Array.from(new Set(rawMandatoryClassIds));
    const mandatorySet = new Set(mandatoryClassIds);
    const voluntaryClassIds = rawVoluntaryClassIds.filter((classId) => !mandatorySet.has(classId));
    const classIds = Array.from(new Set([...mandatoryClassIds, ...voluntaryClassIds]));

    if (classIds.length === 0) {
      return successResponse({
        preview: {
          total_classes: 0,
          mandatory_participants: 0,
          voluntary_participants: 0,
          conflict_count: 0,
          groups: [],
        },
      });
    }

    const placeholders = classIds.map(() => '?').join(', ');
    const bindings =
      user.role === 'admin'
        ? classIds
        : [...classIds, Number(user.id), Number(user.id)];

    const accessibleClasses = (await dbAll(
      user.role === 'admin'
        ? `SELECT id, name
           FROM classes
           WHERE id IN (${placeholders})
           ORDER BY name`
        : `SELECT c.id, c.name
           FROM classes c
           LEFT JOIN class_teachers ct ON ct.class_id = c.id
           WHERE c.id IN (${placeholders})
             AND (c.teacher_id = ? OR ct.teacher_id = ?)
           GROUP BY c.id, c.name
           ORDER BY c.name`,
      bindings
    )) as ClassRow[];

    if (accessibleClasses.length !== classIds.length) {
      return errorResponse(
        ApiError.forbidden('Ban chi co the preview danh sach cho cac lop nam trong pham vi cua minh')
      );
    }

    const students = (await dbAll(
      `SELECT
         u.id,
         COALESCE(u.name, u.username, CAST(u.id AS TEXT)) as name,
         u.email,
         u.class_id
       FROM users u
       WHERE u.role = 'student'
         AND COALESCE(u.is_active, 1) = 1
         AND u.class_id IN (${placeholders})
       ORDER BY u.class_id, COALESCE(u.name, u.username, CAST(u.id AS TEXT)), u.id`,
      classIds
    )) as StudentRow[];

    const overlappedSet = new Set(overlappedClassIds);
    const mandatoryClassSet = new Set(mandatoryClassIds);

    const groups = accessibleClasses.map((classRow) => {
      const classStudents = students
        .filter((student) => Number(student.class_id) === Number(classRow.id))
        .map((student) => ({
          id: Number(student.id),
          name: student.name || `Student ${student.id}`,
          email: student.email || null,
          participation_mode: mandatoryClassSet.has(Number(classRow.id)) ? 'mandatory' : 'voluntary',
          resolved_mode: mandatoryClassSet.has(Number(classRow.id)) ? 'mandatory' : 'voluntary',
          was_conflicted: overlappedSet.has(Number(classRow.id)),
        }));

      const isMandatory = mandatoryClassSet.has(Number(classRow.id));
      const conflictCount = overlappedSet.has(Number(classRow.id)) ? classStudents.length : 0;

      return {
        class_id: Number(classRow.id),
        class_name: classRow.name,
        participation_mode: isMandatory ? 'mandatory' : 'voluntary',
        mandatory_count: isMandatory ? classStudents.length : 0,
        voluntary_count: isMandatory ? 0 : classStudents.length,
        conflict_count: conflictCount,
        students: classStudents,
      };
    });

    return successResponse({
      preview: {
        total_classes: groups.length,
        mandatory_participants: groups.reduce(
          (total, group) => total + Number(group.mandatory_count || 0),
          0
        ),
        voluntary_participants: groups.reduce(
          (total, group) => total + Number(group.voluntary_count || 0),
          0
        ),
        conflict_count: groups.reduce((total, group) => total + Number(group.conflict_count || 0), 0),
        groups,
      },
    });
  } catch (error: any) {
    console.error('Participation preview error:', error);
    return errorResponse(ApiError.internalError('Khong the tai preview tham gia', error?.message));
  }
}
