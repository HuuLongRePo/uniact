# TEACHER ROLE BOUNDARY DECISIONS

## Decision captured during implementation
For students selected from classes not directly managed by the teacher, the teacher should get:
- **activity-scoped operational access only**

This means the teacher may:
- view the minimum information needed to operate the activity,
- manage attendance,
- manage evaluation,
- manage participation state related to that activity.

This does **not** automatically mean:
- full global student-management authority,
- full non-activity academic/administrative visibility,
- class-wide authority outside the selected activity context.

## Rationale
This preserves:
- the new cross-class activity management requirement,
- least-privilege behavior,
- auditability,
- clean separation between managed-class authority and activity-scoped authority.
