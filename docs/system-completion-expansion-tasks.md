# SYSTEM COMPLETION EXPANSION TASKS

Status: strategic expansion backlog derived from recent concrete issues

## Why this file exists
Recent concrete issues were not isolated bugs. They exposed broader system-level gaps in:
- workflow semantics,
- visibility semantics,
- attendance/scoring governance,
- actor usability,
- list/filter/pagination consistency,
- intervention tooling,
- archive/resolution handling,
- teacher scope modeling,
- release-grade operational clarity.

This file expands those issues into larger workstreams needed to finish the whole system coherently.

## Workstream A - Workflow and post-approval destination clarity
Derived from:
- approved activity visibility confusion,
- workflow/review filter ambiguity,
- pending vs published vs approved wording drift.

Needed outcomes:
- canonical map of where activities go after each action,
- actor-facing wording that matches DB/business truth,
- end-to-end regression for submit -> approve -> publish -> list/detail visibility.

## Workstream B - Attendance, scoring, and intervention governance
Derived from:
- admin needing full intervention rights,
- attendance management not being scientific enough,
- evaluation/scoring routes having inconsistent admin parity.

Needed outcomes:
- admin authority matrix across attendance/evaluation/scoring,
- explicit override flows with reason capture,
- repair/resync tooling,
- audit trail completeness.

## Workstream C - Overdue, not-held, and archive resolution model
Derived from:
- activities passing start time without attendance,
- uncertainty between completed vs not held vs cancelled,
- conflict handling and archive needs.

Needed outcomes:
- canonical outcome/reason semantics,
- archive/resolution hub,
- derived operational filters,
- cron/admin lifecycle alignment.

## Workstream D - Teacher scope and activity targeting model
Derived from:
- teacher seeing all classes,
- need for bulk all-selection,
- mixed class/student mandatory and voluntary targeting,
- laggy activity form complexity.

Needed outcomes:
- canonical mixed scope model,
- direct student targeting,
- bulk selection semantics,
- preview/source explainability,
- responsive create/edit UX.

## Workstream E - Filters, sorting, pagination, and management ergonomics
Derived from:
- inconsistent list usability across actors,
- admin attendance table gaps,
- need for scientific management surfaces.

Needed outcomes:
- actor-page audit matrix,
- standard list pattern library,
- use-case-based filter taxonomy,
- pagination consistency rules.

## Workstream F - Data repair, operational diagnostics, and trust tooling
Derived from:
- user doubts about whether logic or data is wrong,
- need to inspect real rows after actions,
- possibility of runtime/cache/data drift.

Needed outcomes:
- live data inspection checklists,
- route-to-DB verification playbooks,
- reconciliation scripts/tools,
- admin repair console candidates.

## Workstream G - Release completion and whole-system closeout
Derived from:
- repeated surface-level issues revealing hidden cross-module dependencies.

Needed outcomes:
- subsystem completion matrix,
- cross-role end-to-end validation scenarios,
- blocker triage by subsystem,
- final system completion roadmap.

## Recommended next orchestration order
1. Workflow + visibility semantics
2. Attendance/scoring governance
3. Overdue/archive model
4. Teacher targeting model
5. Actor-wide list usability standardization
6. Diagnostics/repair tooling
7. Final system closeout matrix
