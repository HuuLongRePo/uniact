import { dbGet } from '@/lib/database';

type ActivityAccessRow = {
  id: number;
};

export async function teacherCanAccessActivity(
  teacherId: number,
  activityId: number
): Promise<boolean> {
  const normalizedTeacherId = Number(teacherId);
  const normalizedActivityId = Number(activityId);

  if (!Number.isFinite(normalizedTeacherId) || !Number.isFinite(normalizedActivityId)) {
    return false;
  }

  const row = (await dbGet(
    `
    SELECT a.id
    FROM activities a
    WHERE a.id = ?
      AND (
        a.teacher_id = ?
        OR EXISTS (
          SELECT 1
          FROM activity_classes ac
          JOIN classes c ON c.id = ac.class_id
          LEFT JOIN class_teachers ct ON ct.class_id = c.id
          WHERE ac.activity_id = a.id
            AND (c.teacher_id = ? OR ct.teacher_id = ?)
        )
      )
    LIMIT 1
    `,
    [normalizedActivityId, normalizedTeacherId, normalizedTeacherId, normalizedTeacherId]
  )) as ActivityAccessRow | undefined;

  return Boolean(row);
}
