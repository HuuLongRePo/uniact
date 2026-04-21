export type ActivityScopedStudent = {
  id: number;
  name: string;
  email: string | null;
  class_id: number | null;
  class_name?: string | null;
};

export type ActivityStudentScopeState = {
  mandatory_student_ids: number[];
  voluntary_student_ids: number[];
};

export function normalizeActivityStudentScope(
  state: Partial<ActivityStudentScopeState> | null | undefined
): ActivityStudentScopeState {
  const mandatory = Array.isArray(state?.mandatory_student_ids)
    ? Array.from(
        new Set(
          state!.mandatory_student_ids
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0)
        )
      )
    : [];

  const mandatorySet = new Set(mandatory);
  const voluntary = Array.isArray(state?.voluntary_student_ids)
    ? Array.from(
        new Set(
          state!.voluntary_student_ids
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0 && !mandatorySet.has(value))
        )
      )
    : [];

  return {
    mandatory_student_ids: mandatory,
    voluntary_student_ids: voluntary,
  };
}

export function buildActivityStudentScopePayload(
  state: Partial<ActivityStudentScopeState> | null | undefined
): ActivityStudentScopeState {
  return normalizeActivityStudentScope(state);
}

export function indexActivityScopedStudents(
  students: ActivityScopedStudent[]
): Map<number, ActivityScopedStudent> {
  return new Map(students.map((student) => [Number(student.id), student]));
}
