# TEACHER CROSS-CLASS ACTIVITY MANAGEMENT IMPLEMENTATION NOTES

Status: groundwork notes after auditing current code

## Confirmed current reality
- Current scope modeling is still mostly class-based.
- `teacherCanAccessActivity(...)` already grants teacher access if:
  - they own the activity,
  - or the activity is linked to a class they manage/support.
- There is no confirmed direct student-target table in active code yet.

## Groundwork started
A dedicated schema helper has been introduced for future direct student targeting:
- `src/infrastructure/db/activity-student-scope-schema.ts`

This creates/ensures:
- `activity_students`
  - `activity_id`
  - `student_id`
  - `participation_mode` (`mandatory` | `voluntary`)

## Why this matters
This is the missing structural piece needed to support:
- selecting students directly across classes,
- preserving activity-scoped authority,
- later proving why a teacher may manage a student in attendance/evaluation flows even if the class is not normally managed by them.

## Still not finished in this batch
- teacher CRUD UI for direct student selection
- route persistence for `student_ids` / direct targets
- preview integration across class + student scope
- guard refactor to include activity-student-scope access
- attendance/evaluation route parity using the new evidence path
