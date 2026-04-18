# Release Blocker Matrix, Web RC

This matrix consolidates the current web release-readiness assessment into an action-oriented final triage view.

## Legend
- **Blocker**: must fix before web RC sign-off
- **Watch**: verify in manual QA, fix only if reproduced
- **Defer**: safe to postpone beyond current web RC

---

## 1. Auth and session

| Area | Current status | Classification | Notes |
|---|---|---|---|
| Login/logout/me routes | Hardened and regression-covered | Watch | Re-verify with real seeded env and cookie-backed sessions |
| Middleware token verification | Hardened | Watch | Manual QA should check stale/invalid cookie behavior |
| Demo/test account exposure | Gated by env | Watch | Confirm env flags in actual deployment/demo env |
| Security questions fallback auth | Experimental / non-core | Defer | Do not let this branch block core web RC |

---

## 2. Admin core

| Area | Current status | Classification | Notes |
|---|---|---|---|
| Users list/detail/reset-password | Hardened | Watch | Manual verify deactivate/reset semantics |
| Classes list/detail | Hardened | Watch | Manual verify create/edit/delete semantics |
| Activities list/detail/approval/history | Hardened | Watch | Manual verify cancel vs delete wording/behavior |
| Dashboard consumer | Hardened | Watch | Check counts in seeded env |

---

## 3. Teacher core

| Area | Current status | Classification | Notes |
|---|---|---|---|
| Dashboard + dashboard-stats | Hardened and regression-covered | Watch | Verify real data in seeded env |
| Activities page | Hardened | Watch | Verify submit/resubmit/cancel/clone flows if exposed |
| Students page | Hardened | Watch | Verify class-backed filtering in real data |
| Attendance bulk | Hardened with persistence | Watch | Important because it feeds scoring |
| Evaluation routes | Hardened with scoring integration | Watch | Verify persisted points after evaluation |

---

## 4. Student core

| Area | Current status | Classification | Notes |
|---|---|---|---|
| Activities list/detail/register/cancel | Hardened | Watch | Manual verify happy path and toast copy |
| History route/page | Hardened | Watch | Verify export + filters with real data |
| Points breakdown route/page | Hardened | Watch | Verify summary matches persisted score data |
| Scores route/page | Hardened | Watch | Verify details/modal with real seeded data |
| Statistics route | Hardened | Watch | Check consistency with scores/history |

---

## 5. Scoring and reporting

| Area | Current status | Classification | Notes |
|---|---|---|---|
| Attendance -> score persistence | Hardened | Watch | Critical join point, verify manually |
| Evaluation -> score calculation | Hardened | Watch | Critical join point, verify manually |
| Admin scores report | Hardened | Watch | Regression-covered |
| Leaderboard | Hardened | Watch | Regression-covered |
| Rankings | Hardened | Watch | Regression-covered |
| Activity statistics | Hardened | Watch | Verify export in live seeded env |
| Custom reports | Hardened | Watch | Verify preview/export in live seeded env |
| Teacher participation/class-stats/export | Hardened | Watch | Verify export output and permissions |

---

## 6. Known non-core backlog

| Area | Current status | Classification | Notes |
|---|---|---|---|
| Analytics TODOs | Out of core RC path | Defer | Not currently blocking main web workflows |
| Jobs/export backlog outside active flows | Out of core RC path | Defer | Fix only if deployment requires it |
| Notification/poll tooling | Outside current release backbone | Defer | Can be a separate sweep |
| Mobile parity | Separate track | Defer | User explicitly prioritized web first |

---

## 7. What should become a true blocker if found in manual QA

These are **Blocker** only if reproduced in real QA:

| Trigger condition | Classification if reproduced | Why |
|---|---|---|
| Login/logout/session continuity broken | Blocker | Breaks all role flows |
| Wrong-role guard shows bad content or false success | Blocker | Security and workflow integrity issue |
| Activity create/submit/register/cancel/evaluate broken | Blocker | Core product flow failure |
| Attendance/evaluation does not persist scoring | Blocker | Breaks downstream reporting/visibility |
| Student scores/history/points mismatch persisted results | Blocker | Core trust issue in scoring system |
| Admin/teacher report exports fail on happy path | Blocker | Reporting backbone incomplete |

---

## 8. Current release verdict

### Present assessment
- **No currently proven code-level web RC blocker** from the hardened backbone and regression bundles.
- Current status is **QA-gated closeout**, not broad-refactor-required.

### Best next action
1. Run `docs/manual-qa-checklist-web-rc.md`
2. Convert only reproduced issues into blockers
3. Fix blockers only
4. Defer non-core backlog

### Practical interpretation
The project should now move from wide hardening to **targeted QA-driven bugfixing**.
