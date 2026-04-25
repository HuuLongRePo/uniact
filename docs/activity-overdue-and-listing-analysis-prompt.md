# ACTIVITY OVERDUE AND LISTING ANALYSIS PROMPT

Continue deep analysis for UniAct after workflow-core and teacher-visibility groundwork.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Workflow core has already been closeout-hardened.
- Teacher activities page already sorts by newest/oldest/title and now has an initial dedicated `Sắp diễn ra` section.
- Current follow-up docs:
  - `docs/activity-overdue-and-listing-followup-tasks.md`
  - `docs/teacher-activity-scope-and-ux-followup-tasks.md`
  - `docs/workflow-core-closeout-verdict.md`

## New product questions to analyze

### 1. What happens when an activity passes its start time and nobody is checked in?
Analyze current behavior in:
- activity status model,
- admin complete route,
- cron complete route,
- attendance routes,
- teacher/admin list consumers.

You must answer:
- What does the system do today?
- Where does it incorrectly collapse “did not happen” into “completed” or another ambiguous state?
- What canonical model should be used for activities that effectively did not happen?

Consider cases such as:
- no registrations,
- registrations exist but zero attendance,
- conflict discovered too late,
- teacher manually marks resolution,
- admin needs auditability.

### 2. How should conflicts and non-held activities be surfaced?
Design a clean, scientific, compact UX for:
- archive bucket / resolution hub,
- reason labels,
- grouped display,
- conflict visibility,
- teacher/admin triage.

Return options for whether to use:
- existing `cancelled` + structured reason,
- metadata-based archive outcome,
- new status/outcome model.

### 3. What filters should exist on activity lists?
Analyze teacher/admin activity lists and propose a canonical filter model including:
- newest first by default,
- upcoming section pinned on top,
- upcoming soon,
- overdue unattended,
- completed,
- cancelled,
- not held,
- conflict-related,
- no attendance yet,
- needs resolution.

You must separate:
- persisted workflow status,
- review status,
- derived operational state,
- archive/outcome state.

### 4. What is the safest next implementation batch?
Recommend the smallest high-value batch that can ship now without destabilizing workflow core.

## Deliverables
Return in this order:
1. current-state analysis,
2. mismatch matrix,
3. canonical status/outcome proposal,
4. filter and UI grouping proposal,
5. phased implementation plan,
6. safest next commit-sized batch,
7. risks and migration notes.

## Constraints
- Do not casually add a new DB status without justifying migration cost.
- Preserve workflow-core decisions already made for `status` and `approval_status`.
- Prefer derived states or structured reasons if they solve the problem cleanly.
- Stay focused on active web surfaces first.
