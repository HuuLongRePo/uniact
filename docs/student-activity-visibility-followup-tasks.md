# STUDENT ACTIVITY VISIBILITY FOLLOW-UP TASKS

Status: active backlog after user report that approved broadly-open activities still do not appear for students

## Standing rule captured
From now on, new user-requested issues should be added proactively into follow-up tasks/todos without waiting for a separate reminder.

## Problem statement
A teacher creates an activity, admin approves it, and the activity is intended to open registration broadly, but an arbitrary eligible student still does not see it to register.

## New user-reported issue (2026-05-04)
When registration reaches capacity, student is blocked correctly.  
After admin increases `max_participants`, the student activities list (`/student/activities`) may still show stale full-state and keep blocking registration, while the detail page (`/student/activities/[id]`) already reflects new capacity and allows register.

This indicates a consistency gap between list data and detail data (likely cache/revalidation/query timing drift).

## Core investigation areas
### 1. Canonical student visibility path
Trace whether a student should see an activity only when all of these are true:
- workflow status is publish-ready,
- approval status is approved,
- registration window is still open,
- activity applies to the student by class/scope rules,
- activity is not full/cancelled/completed,
- visibility filters on the student page do not hide it.

### 2. Broad-open registration semantics
Clarify what “mở đăng ký rộng rãi” means in actual data terms:
- no class restrictions,
- voluntary class set includes all classes,
- explicit global flag,
- or some derived interpretation.

### 3. Likely failure clusters
- `GET /api/activities` filters too tightly for students,
- teacher create/edit payload does not persist broad-open scope correctly,
- class/voluntary targeting data does not represent global eligibility,
- registration deadline or status blocks visibility unexpectedly,
- student page consumer or filters hide otherwise valid activities,
- stale list data after approval/publish.

## P0 - Route and data audit
- audit `src/app/api/activities/route.ts`
- audit teacher create/edit payload persistence for targeting scope
- audit student activity page filters and consumer assumptions
- verify how applicability is computed for a student outside the teacher-owned scope
- audit capacity freshness path after admin updates `max_participants`:
  - list API vs detail API parity for `registered_count`/`max_participants`/`is_full`,
  - cache headers / fetch cache mode / revalidation behavior on student list page,
  - client state update strategy after register-block state was previously set.

## P0 - Regression to add
Add end-to-end regression proving:
- teacher creates broadly-open activity,
- admin approves it,
- unrelated but eligible student sees it in student activities list,
- student can open detail and register.

Add regression for capacity update consistency:
- activity becomes full and blocks register on list/detail,
- admin increases `max_participants`,
- student list refresh reflects new capacity immediately,
- register button on `/student/activities` becomes available without requiring manual deep-link to detail page.

## P1 - Global registration model decision
If broad-open visibility is a real product requirement, decide canonical representation such as:
- `applies_to_all_students`,
- `voluntary_scope = all_classes`,
- or another explicit data model.

### Current important finding
Current validation/modeling in `src/lib/activity-validation.ts` only normalizes class-scoped fields:
- `class_ids`
- `mandatory_class_ids`
- `voluntary_class_ids`

So “mở đăng ký rộng rãi cho student bất kỳ” is likely **not modeled explicitly yet**. This means the reported behavior may be a genuine product/data-model gap, not just a page bug.

## Recommended next execution order
1. Confirm current student visibility rule chain.
2. Identify exact missing broad-open semantic in route/data model.
3. Add regression for approved broad-open student visibility.
4. Implement canonical fix at route + payload level.
5. Revisit teacher create/edit UX so global-open choice is explicit and understandable.
