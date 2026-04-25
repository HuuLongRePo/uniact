# TEACHER ACTIVITY SCOPE AND UX ANALYSIS PROMPT V2

Continue implementation planning for UniAct teacher activity create/edit improvements.

## Repo and context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Workflow core has already been closeout-hardened.
- Teacher visibility groundwork has been expanded so teachers can now load all classes and the teacher student route can view/filter across all classes.
- Create/edit pages already have small clear buttons for start/end time fields.
- Follow-up docs:
  - `docs/teacher-activity-scope-and-ux-followup-tasks.md`
  - `docs/workflow-core-closeout-verdict.md`

## Analyze these requested problems

### 1. Typing activity title feels laggy
Investigate why entering `Tên hoạt động` on teacher create/edit pages feels slow.

You must analyze:
- render tree size,
- state ownership,
- preview panel coupling,
- list rendering for classes and participation preview,
- effects triggered by class-scope arrays,
- whether array identity / derived state churn causes extra work,
- whether title input is blocked by sibling heavy rendering.

Return:
- most likely root causes,
- concrete profiling targets,
- lowest-risk fix order.

### 2. Registration deadline control redesign
Design a production-safe registration deadline UX with:
- preset dropdown: 5 phút, 10 phút, 15 phút, 30 phút, 1 giờ, 2 giờ, 1 ngày, 2 ngày, 3 ngày, 7 ngày,
- custom numeric inputs for ngày / giờ / phút,
- concrete output datetime in `registration_deadline`.

Important business constraint:
- current backend validation requires deadline to be at least 24 hours before activity start.

You must:
- identify all files enforcing this rule,
- explain mismatch with requested 5-10-minute presets,
- propose 2-3 canonical decision options,
- recommend the safest product/engineering choice.

### 3. Teacher can see all classes and manage all relevant students
Analyze how to evolve from teacher-owned scope to activity-relevant global scope.

Target behavior:
- teacher sees all classes,
- teacher can manage classes and students involved in:
  - mandatory assignment,
  - allowed registration,
  - actual registrations,
- teacher can bulk-select all,
- teacher can choose both classes and direct students, not only students they directly manage.

You must:
- map current assumptions in `/api/classes`, `/api/teacher/students`, create/edit pages, and preview flows,
- propose a canonical mixed-scope data model,
- propose how already-registered students should remain editable/visible,
- list business decisions still unresolved.

## Deliverables
Return in this order:
1. bottleneck analysis for title lag,
2. deadline decision matrix,
3. route/UI impact matrix for mixed teacher scope,
4. phased implementation plan,
5. safest next commit-sized batch,
6. explicit risks and migration concerns.

## Constraints
- Preserve canonical API response patterns.
- Prefer incremental batches over speculative rewrites.
- Stay focused on current active web surfaces.
- Do not ignore existing validation rules; surface conflicts explicitly.
