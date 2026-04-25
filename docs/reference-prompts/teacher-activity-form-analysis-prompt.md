# TEACHER ACTIVITY FORM ANALYSIS PROMPT

Status: REFERENCE_ONLY (superseded by `docs/teacher-activity-scope-and-ux-analysis-prompt-v2.md`)

Use this prompt to continue deep analysis / implementation planning for the next subsystem batch.

---

You are continuing work on the UniAct repo after workflow-core closeout.

## Current context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Web activity workflow core has already been hardened and closeout-validated.
- Latest relevant closeout artifact: `docs/workflow-core-closeout-verdict.md`.
- New focus is teacher activity create/edit UX and selection power.

## Objectives
Analyze and propose an implementation plan for the following issues:

### 1. Title input lag
Investigate why typing into `Tên hoạt động` feels slow or laggy on teacher create/edit forms.
Do a code-level analysis of:
- render structure,
- state ownership,
- effects triggered on change,
- preview/conflict checks,
- class/student selection rendering,
- expensive derived computations.

Identify the most likely causes and propose the safest fix path with the least contract churn.

### 2. Time/deadline UX redesign
Design an improved UX for:
- start time,
- end time,
- registration deadline.

Required UX changes:
- add a small clear icon shared pattern for start/end time inputs,
- replace raw deadline editing with a hybrid control:
  - quick preset dropdown (5 phút, 10 phút, 15 phút, 30 phút, 1 giờ, 2 giờ, 1 ngày, 2 ngày, 3 ngày, 7 ngày),
  - plus custom numeric day/hour/minute input.

Important:
- preserve canonical API behavior by still producing a concrete `registration_deadline` datetime,
- avoid breaking existing create/edit flows.

### 3. Teacher visibility and selection scope expansion
Analyze current limitations in:
- `/api/classes`
- `/api/teacher/students`
- activity create/edit forms
- participation preview

Target behavior requested by product/user:
- teacher can see all classes,
- teacher can operate on all classes and students relevant to the activity,
- teacher can explicitly manage:
  - mandatory classes,
  - allowed-registration classes,
  - already registered students,
  - bulk select all,
  - mixed class + student mandatory assignment.

You must:
- map current route contracts,
- identify where assumptions are hard-coded to teacher-owned classes only,
- propose a canonical data model for mixed class/student scope selection,
- highlight business-rule questions that still need an explicit decision.

## Deliverables
Return:
1. a bottleneck analysis,
2. a route/UI impact matrix,
3. a recommended phased implementation plan,
4. the safest first batch to implement now,
5. explicit risks/tradeoffs.

## Constraints
- Prioritize current web active surfaces.
- Preserve canonical response patterns already established elsewhere.
- Avoid speculative rewrites when a smaller, incremental batch can de-risk first.
- Treat adjacent modules like awards/proposals as out of scope unless they are directly required by this batch.
