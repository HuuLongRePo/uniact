# TEACHER ACTIVITY FORM FOLLOW-UP TASKS

Status: active follow-up task matrix after workflow-core closeout

## P0 - Form responsiveness and primary input UX
- Investigate why typing `Tên hoạt động` feels slow/laggy on teacher create/edit surfaces.
- Likely suspects:
  - over-broad state updates on every keystroke,
  - expensive preview/conflict recomputation tied to unrelated fields,
  - large class/preview trees re-rendering on title edits.
- Desired outcome:
  - title typing remains responsive even when class preview and conflict logic are present.

## P0 - Time/deadline control redesign
- Add small clear-icon controls for:
  - start date/time,
  - end date/time.
- Replace rigid registration deadline input UX with a hybrid control:
  - preset dropdown: 5 phút, 10 phút, 15 phút, 30 phút, 1 giờ, 2 giờ, 1 ngày, 2 ngày, 3 ngày, 7 ngày,
  - plus custom numeric entry for ngày / giờ / phút.
- Keep API payload canonical by still submitting a concrete `registration_deadline` datetime.

## P0 - Teacher scope visibility and selection power
- Reassess current assumption that teacher only sees their managed classes/students.
- User-requested target behavior:
  - teacher can see all classes,
  - teacher can fully manage classes/students already involved in:
    - mandatory assignment,
    - voluntary registration eligibility,
    - actual registrations.
- Add explicit bulk-selection capability:
  - select all visible/eligible students,
  - select classes and mandatory students together,
  - avoid restricting the teacher to only their currently managed students.
- This likely requires both route contract changes and create/edit form redesign.

## P1 - Participation preview and selection model cleanup
- Evolve from class-only selection to a mixed scope model:
  - mandatory classes,
  - voluntary classes,
  - explicitly selected mandatory students,
  - explicitly selected allowed students,
  - “select all” helpers.
- Preserve clear semantics so downstream registration/visibility logic can still explain why a student can or cannot participate.

## P1 - Regression expansion
- Add focused tests for:
  - title input responsiveness-sensitive behavior if practical,
  - deadline preset + custom offset conversion,
  - clear-icon interactions,
  - expanded teacher class visibility,
  - mixed class/student selection payload generation.

## Recommended execution order
1. Audit current form render bottlenecks and debounce boundaries.
2. Redesign time/deadline controls with minimal contract churn.
3. Decide canonical scope/permission model for teacher seeing all classes/students.
4. Implement route + form changes together.
5. Add focused regression coverage.
