# TEACHER CROSS-CLASS ACTIVITY MANAGEMENT ANALYSIS PROMPT

Continue analysis for UniAct teacher activity authority and targeting.

## New requirement to preserve
Teacher can:
- select classes not directly managed by them,
- select students in those classes,
- and then manage those selected students within the scope of that activity,
  including attendance, evaluation, and related activity operations.

Important: this is **activity-scoped authority**, not automatic full class ownership.

## Objectives

### 1. Canonical authority model
Design a clean business/technical model that distinguishes:
- managed-class rights,
- activity-scoped rights over selected classes/students,
- unrelated data with no access.

### 2. Data model implications
Analyze what fields/entities are needed so the system can know that a teacher may act on a student because of activity scope, for example:
- selected via class scope,
- selected directly as student scope,
- mandatory vs voluntary vs global-open.

### 3. Route and guard impact matrix
Audit which routes currently block this model because they still assume teacher rights are limited to assigned classes only.
Focus especially on:
- activity create/edit,
- participant preview,
- attendance,
- evaluation,
- student-related activity operations,
- reporting surfaces.

### 4. UI/UX implications
Explain how teacher CRUD and activity management UIs should represent:
- selected classes outside managed scope,
- direct selected students,
- why a student is included,
- what authority the teacher has because of this activity.

### 5. Safest next implementation batch
Recommend the smallest high-value batch that moves the system toward this requirement without destabilizing existing workflow core.

## Deliverables
Return in this order:
1. canonical authority model,
2. data model proposal,
3. route/guard impact matrix,
4. UI/UX implications,
5. safest next implementation batch,
6. risks and audit concerns.

## Constraints
- Do not collapse activity-scoped authority into global class ownership.
- Preserve auditability and clear reason paths.
- Stay grounded in current UniAct code and existing business decisions.
