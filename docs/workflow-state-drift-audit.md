# WORKFLOW STATE DRIFT AUDIT

Status: active engineering audit artifact

Purpose: map semantic drift between stored `status`, stored `approval_status`, derived display status, route transition rules, and UI filtering semantics across UniAct activity workflow.

---

## 1. Executive verdict
The activity workflow is much healthier than before, but it still carries a structural ambiguity:

- `status` is the persisted lifecycle field for publication/completion/cancellation
- `approval_status` is the persisted review field
- many UI and list surfaces use a **derived display status** where `approval_status='requested'` becomes `pending`

This design is workable, but only if every route and UI surface consistently treats:
- `pending` as a **display-only derived state**, not a stored value
- `draft + requested` as the actual stored “waiting for approval” state

Right now the codebase is close to that model, but there are still enough mixed semantics that future drift is likely unless the rule is written down and locked.

---

## 2. Current canonical model in code

### Stored workflow truth
From `src/lib/activity-workflow.ts`:
- persisted `status` values:
  - `draft`
  - `published`
  - `completed`
  - `cancelled`
- persisted `approval_status` values:
  - `draft`
  - `requested`
  - `approved`
  - `rejected`

### Derived display truth
Also from `src/lib/activity-workflow.ts`:
- if `approval_status === 'requested'` -> display status = `pending`
- if `approval_status === 'rejected'` -> display status = `rejected`
- otherwise display status follows `status`

### Practical meaning
The intended current model is:
- teacher creates draft -> `status='draft', approval_status='draft'`
- teacher submits -> `status='draft', approval_status='requested'`
- UI displays this as `pending`
- admin approves -> `status='published', approval_status='approved'`
- admin rejects -> `status='draft', approval_status='rejected'`

This is coherent, but only if every route and UI surface honors it the same way.

---

## 3. Main drift patterns found

## 3.1 Derived `pending` is not a stored state, but many surfaces act like it might be
Examples:
- `src/app/admin/activities/page.tsx` filters by `activity.status` and also separately by `approval_status`
- `src/app/teacher/activities/page.tsx` treats `pending` as a filter option because `/api/activities` normalizes status for teacher/admin list consumers
- `src/app/api/admin/activities/[id]/route.ts` explicitly returns derived `status: 'pending'` while preserving stored `approval_status: 'requested'`

### Risk
This is mostly okay today, but it creates a fragile situation where:
- some code expects `pending` only in API responses
- some code may later mistakenly try to persist or transition `status='pending'`

### Recommendation
Document explicitly:
> `pending` is a display/list status only. It must never be written back to the database as `activities.status`.

---

## 3.2 `status` route still contains a hidden workflow shortcut
In `src/app/api/activities/[id]/status/route.ts`:
- route validates transitions using persisted `status`
- after writing `status='published'`, it auto-updates `approval_status` from `requested` to `approved`

### Why this is risky
Publishing is supposed to require prior approval.
But this route still contains a legacy compatibility shortcut where publishing can implicitly repair approval state.

That means the system still has a path where:
- `status` mutation can silently rewrite review state
- status transition and approval decision are not fully separated concerns

### Recommendation
Long-term preferred rule:
- approval decision route owns `approval_status` changes
- status route should not auto-promote `approval_status` to `approved`
- if legacy publish compatibility is still needed, it should be explicitly labeled as compatibility behavior, not normal workflow truth

This is one of the biggest remaining workflow smells.

---

## 3.3 Admin and teacher list filters depend on normalized API status, not stored status
In `src/app/api/activities/route.ts`:
- teacher/admin list surfaces normalize activities with `getActivityDisplayStatus(...)`
- filtering is then applied to normalized status values

### This is good
It lets UI ask for `pending` without polluting the database.

### But it also means
Consumers that bypass this route and read raw `activities.status` directly can drift from list behavior.

### Recommendation
For list/search/filter UI, the canonical rule should be:
- use the normalized route output, not raw stored status

---

## 3.4 Admin activities page still splits workflow understanding across two filters
In `src/app/admin/activities/page.tsx`:
- `statusFilter` compares against `activity.status`
- `approvalFilter` compares against `activity.approval_status`

### Problem
This is functionally useful, but conceptually awkward.
A user can combine filters in ways that reflect storage mechanics more than product semantics.

Example awkwardness:
- a “pending” activity in API output may still expose `approval_status='requested'`
- the page conceptually mixes display-layer workflow with storage-layer review state

### Recommendation
Eventually move admin filtering toward one clearer model:
- workflow filter (draft / pending / rejected / published / completed / cancelled)
- optional advanced review filter only if admins really need raw review-state slicing

This is more UX drift than route bug, but it matters for operator clarity.

---

## 3.5 Teacher page uses `pending` as a real top-level activity status concept
In `src/app/teacher/activities/page.tsx`:
- filter options include `pending`
- this is correct from user perspective

### Interpretation
Teacher UX is already closer to business language than storage language.
That is good.

### Remaining risk
If another route later returns raw status instead of normalized status, this page’s assumptions break.

### Recommendation
Preserve the rule that teacher-facing activity listing must always use normalized display status.

---

## 4. Route and test signals already pointing to the same conclusion
Existing workflow tests already lock several useful truths:
- submit routes block when `approval_status='requested'`
- approve/reject routes accept `status='draft', approval_status='requested'`
- admin approval endpoint centralizes review actions
- requested approval records must be explicitly present now, no more hidden recreation

### What this means
The repo is already converging on a sounder model:
- stored waiting state = `draft + requested`
- displayed waiting state = `pending`
- approval routes own review decisions

The main unresolved area is that `status` route still partially crosses that boundary.

---

## 5. Highest-priority workflow-state risks

### Risk A - implicit approval repair in status route
Severity: high

Reason:
- it blurs approval vs publication responsibilities
- it can produce confusing audit/history semantics

### Risk B - future persistence of `pending` by mistake
Severity: medium

Reason:
- `pending` is used widely in UI/display semantics
- easy for future contributors to assume it is a real stored status

### Risk C - mixed admin filtering semantics
Severity: medium

Reason:
- raw `approval_status` plus normalized `status` in the same page can confuse operators and future maintainers

### Risk D - raw-route consumers bypassing normalized status semantics
Severity: medium

Reason:
- if any consumer stops using normalized route output, `pending` UX can drift quickly

---

## 6. Recommended canonical rules

### Rule 1
`activities.status` is only for persisted lifecycle transitions:
- `draft`
- `published`
- `completed`
- `cancelled`

### Rule 2
`activities.approval_status` is only for review state:
- `draft`
- `requested`
- `approved`
- `rejected`

### Rule 3
`pending` is a display-only derived state meaning:
- `status='draft'` and `approval_status='requested'`

### Rule 4
Approval routes, not status-transition routes, should own review-state changes.

### Rule 5
Teacher/admin list UIs should consume normalized activity status from canonical routes, not raw persisted status.

---

## 7. Best next fix batch
If continuing from this audit, the highest-value implementation batch is:

### `Remove workflow-state compatibility shortcut from status route`
Scope:
- stop auto-updating `approval_status` inside `src/app/api/activities/[id]/status/route.ts`
- keep approval transitions owned by submit/approve/reject flow only
- add regression that publishing without approved review state remains blocked and does not mutate approval fields

Potential secondary batch:

### `Simplify admin activity filtering semantics`
Scope:
- prefer one workflow filter built on normalized status
- keep raw approval filter only if truly operationally necessary

---

## 8. Bottom line
The workflow-state model is close to coherent now.
The biggest remaining semantic smell is not list rendering, but the fact that one route still partially lets lifecycle transition logic rewrite review state.

If UniAct wants a clean release-ready workflow backbone, the next step is to finish that separation and fully declare:
- review state is review state
- lifecycle state is lifecycle state
- `pending` is only how the UI talks about `draft + requested`
