# APPROVED ACTIVITY VISIBILITY ANALYSIS PROMPT

Continue analysis for UniAct admin approval and admin activities visibility.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Workflow core has already been hardened.
- Approval lifecycle helper is `src/lib/approval-lifecycle.ts`.
- DB approval persistence is in `src/infrastructure/db/db-queries.ts` via `dbHelpers.decideApproval(...)`.
- Admin list route is `src/app/api/admin/activities/route.ts`.
- Admin activities consumer is `src/app/admin/activities/page.tsx` with `ActivityFilters.tsx` and `ActivityTable.tsx`.

## Research question
When an activity is approved by admin, where should it go, and why might it appear missing in `admin/activities`, including when filtering by `Đã duyệt`?

## Required analysis

### 1. Canonical post-approval destination
Trace the code path from:
- submit-for-approval,
- pending approval record,
- admin approval route,
- shared approval lifecycle helper,
- DB persistence.

State clearly whether approved activities should become:
- `published + approved`,
- `draft + approved`,
- or something else.

### 2. Admin activities visibility audit
Analyze whether the invisibility problem is caused by:
- wrong business semantics,
- incorrect list query,
- derived display status drift,
- review/workflow filter mismatch,
- stale cache or client assumptions,
- actual DB persistence failure.

### 3. Filter semantics audit
Explain clearly the difference between:
- workflow filter,
- review filter,
- derived display status.

Show how an approved activity should be found in admin activities under each filter.

### 4. Real bug hypotheses
List the most plausible reasons a just-approved activity is not visible in practice, ordered by likelihood.

### 5. Recommended fix strategy
Return:
- the safest immediate UX fix,
- the safest regression to add,
- any DB/integration checks needed,
- whether current business analysis or code implementation is wrong.

## Deliverables
Return in this order:
1. canonical code-path summary,
2. mismatch or bug matrix,
3. filter semantics explanation,
4. ranked hypotheses,
5. recommended next implementation batch,
6. risks or migration concerns.

## Constraints
- Do not assume the business model is wrong unless code path proves ambiguity.
- Preserve the separation of workflow status and review status established earlier.
- Stay grounded in actual current code, not idealized future architecture.
