# ENGINEERING STATE

Active engineering execution source-of-truth for UniAct.

---

## 1. Current repo state
- Stack: Next.js 15, React 19, TypeScript, SQLite, Vitest, Playwright
- Architecture: App Router frontend + API routes + DB facade/infrastructure split
- Role-based web backbone: admin, teacher, student
- Current web direction: internal release-candidate style hardening, not public-production polish first

---

## 2. Architectural reality

### Frontend
- App router pages under `src/app`
- role-based sections for admin, teacher, student
- auth-aware UI via `AuthContext`, layouts, sidebar/navigation

### Backend
- API routes under `src/app/api`
- canonical response/error handling increasingly aligned around `successResponse/errorResponse`
- auth/permission guard backbone centered on API-role guards

### Data
- SQLite local DB
- system spans users, classes, activities, participations, attendance, approvals, scoring, awards, reports, logs

---

## 3. Engineering risks historically identified
- UI/API contract drift
- schema drift (`date_time` vs older naming assumptions)
- workflow semantic drift (`status`, `approval_status`, requested/pending)
- regression net drift when route contracts change faster than tests

These have been substantially reduced on the active web backbone, but still justify careful QA for edge cases.

---

## 4. Execution state, current interpretation
The repo is no longer in broad rescue mode for the core web backbone.
It is now in a **QA-gated closeout** state for web release-critical flows.

Meaning:
- wide contract hardening has already been done across core surfaces
- the most valuable remaining work is QA-driven bug fixing
- non-core backlog should not dominate the release path

---

## 5. Active engineering priorities

### Priority 1
Maintain correctness of:
- auth/session
- activity lifecycle
- approval flow
- attendance/evaluation/scoring persistence
- student visibility
- admin/teacher reporting

### Priority 2
Fix only reproduced QA blockers or proven RC issues.

### Priority 3
Defer non-core backlog unless it becomes operationally necessary.

---

## 6. Working implementation matrix summary

### Cluster: activity workflow
- teacher create/edit/submit
- admin approve/reject
- status transitions and semantic consistency remain central

### Cluster: student visibility/register
- student activities list/detail
- register/cancel semantics
- canonical API message handling matters for UI correctness

### Cluster: attendance/evaluation/scoring
- attendance confirms participation
- evaluation finalizes scoring outcome
- persistence must feed student/admin/teacher visibility correctly

### Cluster: dashboard/report consumers
- dashboards and reports should read canonical payloads
- export surfaces must preserve permission and error semantics

---

## 7. Queue interpretation
Use engineering work only for:
- confirmed RC blockers
- regression gaps on active backbone flows
- release-critical environment/config issues

Avoid letting execution drift back into:
- broad cleanup with no reproduced defect
- polishing non-core subsystems during release closeout

---

## 8. Practical next-step rule
When a new issue appears, classify it first:
- route contract drift
- page consumer drift
- auth/session bug
- permission/guard issue
- scoring persistence issue
- reporting/export issue
- seed/data issue
- non-core / defer

Then fix in the smallest batch that closes the real release risk.
