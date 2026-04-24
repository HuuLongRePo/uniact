# CODEX BATCH PROMPTS

Use these prompts when a batch is suitable for delegation to Codex/ACP, especially UI-heavy or multi-file implementation batches.

---

## CODEX BATCH 1 - Teacher direct-student selection UI and mixed preview
You are working in the UniAct repo at:
`C:\Users\nhuul\OneDrive\Máy tính\uniact`

## Current state already implemented
- Explicit global-open scope support has started.
- `activity_students` schema groundwork exists.
- Validation/types now support:
  - `mandatory_student_ids`
  - `voluntary_student_ids`
- Participation preview route now supports returning `direct_students`.
- Create/update persistence now writes direct student scope into `activity_students`.
- Teacher role boundary decision has been captured:
  - teacher gets **activity-scoped operational access only** for selected students outside managed classes.

## Goal
Implement the next batch for teacher activity CRUD:
- allow teacher to select students directly,
- support mixed class scope + student scope in create/edit UI,
- reflect that scope in participation preview,
- keep the UI understandable and not overly cluttered.

## Requirements
1. Add direct-student selection UX to:
   - `src/app/teacher/activities/new/page.tsx`
   - `src/app/teacher/activities/[id]/edit/page.tsx`
2. Support two arrays in UI state and outgoing payloads:
   - `mandatory_student_ids`
   - `voluntary_student_ids`
3. Keep compatibility with existing class-scope behavior:
   - `mandatory_class_ids`
   - `voluntary_class_ids`
   - `applies_to_all_students`
4. Participation preview should display both:
   - grouped class-based targets,
   - direct selected students.
5. Keep the UI compact and practical.
6. Do not implement full global student-management rights, only activity-scoped targeting.

## Constraints
- Preserve existing tests where possible.
- Add focused regressions for the new UI behavior.
- Prefer incremental implementation over a huge refactor.
- Avoid breaking current create/edit submission flow.

## Suggested files to inspect/edit
- `src/app/teacher/activities/new/page.tsx`
- `src/app/teacher/activities/[id]/edit/page.tsx`
- `src/app/api/activities/participation-preview/route.ts`
- `test/teacher-create-activity-page.test.tsx`
- `test/teacher-edit-activity-page.test.tsx`
- `test/teacher-create-activity-preview.test.tsx`
- `test/teacher-edit-activity-preview.test.tsx`

## Deliverable
Implement the batch, run focused tests, and summarize:
- what changed,
- what remains deferred,
- what follow-up batch should come next.

---

## CODEX BATCH 2 - Activity-scoped teacher guards for attendance/evaluation
You are working in the UniAct repo at:
`C:\Users\nhuul\OneDrive\Máy tính\uniact`

## Goal
Refactor teacher attendance/evaluation access checks so a teacher may operate on selected students for a specific activity even if those students are outside the teacher's normally managed classes.

## Business rule
Teacher gets **activity-scoped operational access only** for selected cross-class students.
This permits:
- attendance,
- evaluation,
- participation handling,
within that activity context only.

## Requirements
1. Audit routes that still assume class-only teacher authority.
2. Extend guards/checks to allow access when justified by:
   - activity ownership,
   - activity class scope,
   - activity student scope.
3. Preserve admin override behavior.
4. Do not accidentally grant global class-wide or global student-wide authority.
5. Add focused regressions for:
   - teacher attendance/evaluation on selected student outside their managed class,
   - unrelated student remains blocked.

## Good candidate files
- attendance routes
- evaluate routes
- participation routes
- `src/lib/activity-access.ts`
- related tests

## Deliverable
Implement the smallest safe batch, run focused tests, summarize behavioral changes and remaining gaps.

---

## CODEX BATCH 3 - Activity create/edit wizard with compact steps and low-request UX
You are working in the UniAct repo at:
`C:\Users\nhuul\OneDrive\Máy tính\uniact`

## Product direction
The long scrolling activity create/edit form should evolve into a client-side multi-step wizard.
Users should move forward/backward quickly without page reload and without losing progress.
The flow must stay fast and should not spam requests.

## Goals
- split create/edit into steps,
- reduce long scrolling,
- keep state client-side,
- preserve progress between steps,
- minimize preview requests,
- avoid SSR/F5 style refresh dependence,
- keep the web UI compact and responsive.

## Suggested wizard structure
1. Basic info
2. Scope selection
   - global-open
   - mandatory classes
   - voluntary classes
   - direct students
3. Preview and policy
4. Attachments and submit

## Requirements
1. Do not full reload the page when changing steps.
2. Keep static data fetched once.
3. Only run participation preview when needed, preferably on explicit preview step/action.
4. Keep the step UI compact and easy to navigate.
5. Preserve existing create/edit submit flow semantics.
6. Avoid excessive rerenders and repeated fetches.

## Suggested files
- `src/app/teacher/activities/new/page.tsx`
- `src/app/teacher/activities/[id]/edit/page.tsx`
- preview-related tests/pages

## Deliverable
Implement the smallest safe first wizard batch, run focused tests, and summarize:
- state architecture chosen,
- request minimization decisions,
- remaining migration steps.

---

## CODEX BATCH 4 - Class schedule conflict guard (teacher create/edit)
You are working in the UniAct repo at:
`C:\Users\nhuul\OneDrive\MÃ¡y tÃ­nh\uniact`

## Goal
When a teacher selects classes for an activity, if any selected class already has another activity overlapping the same time window, the system must:
- show a clear warning in UI,
- and hard-block submit on server-side create/update.

## Why this batch
- Existing conflict checks are split and not unified for class schedule blocking.
- We need one canonical business rule across preview/check/create/update.
- FE-only checks are not enough; BE must enforce to prevent race-condition bypass.

## Business decisions to make explicit in code comments/docs
1. Overlap formula:
   - define interval overlap rule clearly (recommended: `[start, end)`).
2. Time window source:
   - priority for end time calculation (end_time > duration > default 120 mins).
3. Blocking statuses:
   - at minimum `published` must block.
   - explicitly decide whether `requested/approved/registration/in_progress` block or warn.
   - explicitly ignore `cancelled/completed/draft`.
4. Edit behavior:
   - always exclude current activity id when editing.

## Requirements
1. Build a reusable conflict helper/service for class schedule checks.
2. Extend `POST /api/activities/check-conflicts` to return class schedule conflicts.
3. Enforce hard-block in:
   - `POST /api/activities`
   - `PUT /api/activities/[id]`
4. Return canonical error code on block:
   - `CLASS_SCHEDULE_CONFLICT`
   - include conflict details for FE rendering.
5. Update teacher create/edit pages:
   - trigger checks on class/time changes,
   - render conflict panel (class, activity, time, overlap),
   - disable submit when block conflicts exist.

## Suggested files
- `src/app/api/activities/check-conflicts/route.ts`
- `src/app/api/activities/route.ts`
- `src/app/api/activities/[id]/route.ts`
- `src/app/teacher/activities/new/page.tsx`
- `src/app/teacher/activities/[id]/edit/page.tsx`
- related helper in `src/lib/*` if needed
- route/page tests under `test/`

## Test expectations
- route tests for check/create/update conflict behavior
- UI tests for submit disabled + conflict messaging
- regression test for edit flow excluding self activity

## Deliverable
Implement the smallest safe end-to-end batch, run focused tests, and summarize:
- final business rule chosen,
- files changed,
- what remains deferred.
