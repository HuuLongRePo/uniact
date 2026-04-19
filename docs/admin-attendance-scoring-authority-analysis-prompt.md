# ADMIN ATTENDANCE SCORING AUTHORITY ANALYSIS PROMPT

Continue analysis for UniAct admin operational authority.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Admin is expected to have stronger governance/intervention power than teacher.
- Recent direction: admin should be able to intervene in all attendance/scoring issues involving teachers and students.

## Research objective
Analyze whether admin currently has truly full authority over attendance, evaluation, scoring, and repair workflows, and define what still needs to be expanded.

## Required analysis

### 1. Current authority matrix
Audit all active routes and surfaces related to:
- attendance viewing,
- attendance editing,
- bulk attendance,
- evaluation,
- participation scoring,
- score recalculation,
- admin repair of teacher/student issues.

For each one, state whether admin can currently:
- view,
- mutate,
- override,
- audit,
- repair.

### 2. Gaps and inconsistencies
Identify routes where admin is still blocked by teacher-only assumptions or lacks parity with teacher functionality.

### 3. Operational governance model
Propose a canonical model where admin has full intervention rights while still preserving:
- auditability,
- reason capture,
- clear attribution,
- safe UI semantics.

### 4. Safest implementation path
Recommend the safest phased plan to reach full admin authority without destabilizing workflow/scoring core.

## Deliverables
Return in this order:
1. current authority matrix,
2. gap list,
3. recommended admin intervention model,
4. phased implementation plan,
5. safest next commit-sized batch,
6. risks and audit concerns.

## Constraints
- Preserve canonical route/error patterns.
- Do not remove teacher ownership semantics blindly; allow admin bypass explicitly where intended.
- Prefer explicit admin override behavior over hidden privilege drift.
