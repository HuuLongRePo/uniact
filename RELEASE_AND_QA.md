# RELEASE AND QA

Active release-readiness, manual QA, smoke, blocker, and issue-intake source-of-truth for UniAct web RC.

---

## 1. Current release verdict
UniAct web release surface is **near release-candidate ready** for the core admin, teacher, student, auth, activity, scoring, and reporting backbone.

A final cross-surface regression bundle passed across the hardened backbone, giving strong evidence that the release-critical web core is now stable enough for manual QA-driven closeout.

### Practical interpretation
The project should now move by:
- manual verification,
- QA-found bug fixing,
- deployment/config validation,
rather than wide refactor churn.

---

## 2. What is materially hardened

### Auth/session
- login/logout/me contract handling
- cookie-backed logout behavior
- middleware token verification and invalid-token cleanup
- demo account exposure gated by explicit env flags

### Admin core
- users list/detail/reset-password
- classes list/detail
- activities list/detail/participants/approval/history
- dashboard consumer alignment

### Teacher core
- dashboard + dashboard-stats
- activities page flows
- students page alignment
- attendance and evaluation routes
- class stats / participation / participation export reporting

### Student core
- activities list/detail/register/cancel
- history route/page
- points breakdown route/page
- scores route/page
- statistics route

### Scoring/reporting
- attendance -> scoring persistence
- evaluation -> score calculation
- student/admin/teacher visibility
- admin scores / leaderboard / rankings / activity statistics / custom reports

---

## 3. Manual QA checklist, condensed active version

### General setup
- use seeded admin, teacher, student accounts
- confirm demo/test gates match env intent
- confirm auth cookies/session persist across reloads

### Admin
- login, refresh, logout
- users: open/edit/reset/deactivate
- classes: create/edit/delete/deactivate per product semantics
- activities: open detail, participants, approval history, cancel/edit
- reports: scores, leaderboard/rankings, activity-statistics export, custom report preview/export

### Teacher
- login and dashboard load
- create/edit activity
- submit approval
- cancel/resubmit/clone where available
- students page and filters
- bulk attendance
- evaluate participation
- class stats / participation report / export PDF

### Student
- login, refresh, logout
- activities list/filter/detail
- register and cancel registration
- history page filter/sort/export
- points breakdown tabs
- scores page and detail surfaces

### Cross-role checks
- wrong-role access should redirect or show proper forbidden behavior
- stale/invalid session should fail cleanly
- canonical error messages should surface in hardened UI paths
- exports should download with proper content type and permission behavior

---

## 4. Smoke / targeted runtime interpretation
Manual or runtime smoke should focus on the smallest set that proves the backbone still works:
- auth/session
- teacher create/submit activity
- admin approve/reject
- student discover/register/cancel
- attendance/evaluation/scoring chain
- student visibility surfaces
- admin/teacher reporting happy paths

---

## 5. Release blocker matrix

### Current classification
Most current active surfaces are **Watch**, not proven blockers.

### Treat as Blocker if reproduced in real QA
- login/logout/session continuity breaks
- wrong-role guard leaks bad content or false success
- activity create/submit/register/cancel/evaluate breaks
- attendance/evaluation does not persist scoring correctly
- student history/points/scores mismatch persisted state
- admin/teacher report export happy path fails

### Usually safe to defer
- analytics TODOs
- jobs/export backlog outside active backbone
- notification/poll tooling outside current release path
- mobile parity
- experimental auth fallback branch

---

## 6. Deep system flow testing focus
The highest-risk consistency chain remains:
- create activity
- submit approval
- approve/reject
- student visibility
- register/cancel
- attendance
- evaluation
- score persistence
- student score/history visibility
- admin/teacher reports

When testing score consistency, always check:
1. source action happened
2. persistence actually changed
3. student-facing visibility changed accordingly
4. admin/teacher-facing reporting changed accordingly

---

## 7. Homepage / dashboard QA interpretation
The current web app behaves more like an internal operational tool than a public marketing landing experience.

### What to verify
- login/home entry gets users quickly into the right role workflow
- dashboards prioritize actions before vanity metrics
- admin sees pending approvals and governance shortcuts first
- teacher sees activity/attendance/evaluation backlog first
- student sees upcoming participation/history/score shortcuts first

### UX risks to watch
- too many metrics without action clarity
- weak hierarchy between “what to do now” and “what to observe”
- role dashboards not making the next action obvious enough

---

## 8. QA issue intake template
When a QA issue is found, capture at least:
- title
- role
- area
- severity
- environment
- reproduction steps
- expected behavior
- actual behavior
- evidence
- contract classification
- RC blocker? yes/no
- suggested batch

Useful issue classes:
- UI consumer drift
- route/response contract drift
- auth/session bug
- guard/permission bug
- scoring persistence bug
- reporting/export bug
- seed/data issue
- copy only

---

## 9. Practical closeout rule
Do not resume broad cleanup by default.

Do this instead:
1. run manual QA against the active backbone
2. intake issues using the QA issue template
3. mark only reproduced RC blockers as blockers
4. fix blockers in the smallest safe batch
5. defer non-core backlog
