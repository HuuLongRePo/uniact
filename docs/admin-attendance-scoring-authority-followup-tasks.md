# ADMIN ATTENDANCE SCORING AUTHORITY FOLLOW-UP TASKS

Status: active authority-expansion backlog after enabling admin intervention on teacher evaluation route

## Goal
Admin should have full intervention authority over attendance, evaluation, scoring, and operational teacher/student issues when necessary.

## Core expectation
Admin can:
- inspect all attendance-related data,
- edit attendance states,
- trigger or override evaluation/scoring outcomes,
- resolve teacher/student operational problems,
- repair inconsistent records,
- intervene regardless of original teacher ownership when governance requires it.

## P0 - Authority matrix audit
Build an explicit matrix of all relevant routes/surfaces and classify whether admin can:
- view,
- edit attendance,
- bulk attendance sync,
- evaluate achievement,
- trigger score recalculation,
- override score-related decisions,
- inspect audit trail,
- repair inconsistent teacher/student-linked records.

## P0 - Remaining route gaps to inspect
- attendance record update paths
- bulk attendance paths
- evaluation paths
- participation evaluation paths
- score recalculation or ledger repair paths
- admin-facing surfaces that still rely on teacher-only endpoints or assumptions

## P1 - Admin intervention UX
Admin surfaces should make intervention explicit and safe:
- show when an admin override happened,
- capture reason/notes for override,
- preserve auditability,
- clearly distinguish teacher action vs admin intervention.

## P1 - Suggested intervention semantics
For sensitive mutations, consider structured admin actions such as:
- override attendance,
- override evaluation,
- resync score ledger,
- reopen/repair participation,
- repair teacher/student assignment mismatch.

## P1 - Audit trail requirements
Every admin intervention should ideally capture:
- actor_id,
- target entity,
- old value,
- new value,
- reason/notes,
- timestamp.

## Recommended next execution order
1. Audit remaining admin authority gaps route-by-route.
2. Standardize admin override semantics for evaluation/scoring.
3. Add admin-facing intervention controls where missing.
4. Tighten audit logging and repair tooling.
