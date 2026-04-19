# SYSTEM COMPLETION EXPANSION PROMPTS

Use these prompts to expand from recent concrete bugs into the larger work needed to complete UniAct end-to-end.

---

## PROMPT 1 - Workflow visibility and destination semantics
Analyze UniAct activity workflow after submit/approve/reject/publish/cancel/complete.

Return:
1. canonical state-transition map,
2. actor-facing destination map,
3. list/detail/filter mismatch matrix,
4. recommended wording model,
5. highest-risk workflow visibility gaps,
6. next implementation batch.

Focus especially on confusion between:
- approved,
- published,
- pending,
- rejected,
- completed,
- cancelled.

---

## PROMPT 2 - Admin authority over attendance and scoring
Analyze whether admin truly has full operational authority over attendance, evaluation, scoring, override, repair, and teacher/student problem resolution.

Return:
1. authority matrix,
2. blocked routes/surfaces,
3. missing override semantics,
4. audit trail gaps,
5. recommended implementation order,
6. safest next batch.

---

## PROMPT 3 - Overdue unattended and not-held activity model
Analyze what should happen when an activity passes start time but nobody is checked in.

Return:
1. current behavior,
2. mismatch with business expectations,
3. completed vs cancelled vs not-held proposal,
4. archive/reason model,
5. UI/filter implications,
6. safest next batch.

---

## PROMPT 4 - Teacher targeting and scope expansion
Analyze how to evolve from class-only targeting into mixed class/student targeting with full teacher visibility.

Return:
1. current route assumptions,
2. mixed-scope payload proposal,
3. bulk select model,
4. preview explainability model,
5. form UX risks,
6. safest next batch.

---

## PROMPT 5 - Activity form performance and control redesign
Analyze why the teacher activity create/edit form becomes laggy and how to redesign time/deadline controls safely.

Return:
1. bottleneck analysis,
2. render/effect hotspot map,
3. deadline control decision matrix,
4. control-component architecture proposal,
5. safest next batch.

---

## PROMPT 6 - Actor-wide filters, sorting, and pagination audit
Audit all active admin/teacher/student management pages for:
- search,
- filters,
- sorting,
- pagination,
- default ordering,
- empty state quality.

Return:
1. actor-page audit matrix,
2. gaps by severity,
3. standard pattern proposal,
4. prioritized rollout plan,
5. safest next batch.

---

## PROMPT 7 - Data trust, repair, and diagnostics tooling
Analyze how to verify whether a problem is caused by business logic, UI drift, cache drift, or DB persistence drift.

Return:
1. route-to-DB verification framework,
2. common failure pattern catalog,
3. repair-tool opportunities,
4. admin diagnostic console ideas,
5. prioritized implementation plan.

---

## PROMPT 8 - Whole-system completion roadmap
Using all recent issues as evidence, derive the remaining workstreams needed to complete UniAct as a coherent production-ready system.

Return:
1. subsystem completion matrix,
2. unresolved cross-module dependencies,
3. blocker/non-blocker grouping,
4. recommended execution order,
5. completion criteria per subsystem,
6. final closeout roadmap.
