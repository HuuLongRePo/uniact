# STUDENT ACTIVITY VISIBILITY ANALYSIS PROMPT

Continue analysis for UniAct student activity discovery and registration visibility.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Recent reports show a visibility issue similar to admin activity visibility drift.
- New user-reported case: a teacher-created activity that has been admin-approved and intended for broad registration still does not appear for arbitrary students to register.

## Research question
Why can an approved activity that is supposed to be broadly open for registration still fail to appear on student activity surfaces?

## Required analysis

### 1. Canonical student discovery path
Trace the full code path for student activity visibility:
- teacher create/edit payload,
- persisted targeting scope,
- admin approval/publish state,
- `GET /api/activities` filtering,
- student activities consumer,
- activity detail access path,
- register route expectations.

State clearly what conditions must currently be true for a student to see an activity in the list.

### 2. Broad-open registration semantics
Determine how the code currently represents “mở đăng ký rộng rãi”.
Explain whether the current model actually supports:
- all students,
- all classes,
- voluntary classes only,
- mandatory only,
- or teacher-scoped visibility only.

Important clue already observed:
- `src/lib/activity-validation.ts` currently normalizes only `class_ids`, `mandatory_class_ids`, and `voluntary_class_ids`.
- If there is no explicit global-open field or convention, broad-open behavior may not truly exist in the current data model.

### 3. Mismatch / bug matrix
Identify where the disappearance could happen:
- payload creation bug,
- persistence bug,
- route filter bug,
- student page filter bug,
- stale data bug,
- business-rule mismatch.

### 4. Recommended canonical model
If broad-open registration is not modeled explicitly today, propose the safest canonical data model to support it.

### 5. Safest next implementation batch
Recommend the smallest high-value batch to prove and fix the issue.

## Deliverables
Return in this order:
1. canonical visibility-rule summary,
2. broad-open semantics analysis,
3. mismatch matrix,
4. recommended canonical model,
5. safest next batch,
6. risks and migration concerns.

## Constraints
- Stay grounded in current code and payloads.
- Do not assume broad-open support already exists unless the data model proves it.
- Prefer a regression-backed fix path.
