# UniAct - Handover Status

_Last updated: 2026-04-11 (Asia/Saigon)_

## Handover scope locked for this milestone

The handover target for this milestone is **not** "repo perfectly clean".
It is:
- production build passes
- main business backbone flows are stable
- high-value actor UAT coverage is enabled and passing
- remaining issues are mostly long-tail test debt / non-blocking follow-ups

## Selected main flows

### A. Backbone system flows
- **A1. Build & boot app**
- **A2. Login / role guards**
- **A3. Teacher creates activity**
- **A4. Teacher submit approval -> Admin approve publish**
- **A5. Student discovers and registers activities**
- **A6. Teacher manual attendance**
- **A7. QR backbone**
  - teacher creates QR session
  - student scans/checks in
  - teacher observes scans and closes session
- **A8. Teacher evaluation**

### B. Student-facing post-attendance/evaluation flows
- **B1. Student scores / statistics**
- **B2. Student notifications**
- **B3. Student awards**

### C. Admin / operator flows
- **C1. Admin user management**
- **C2. Teacher class management**
- **C3. Permission / guard errors**

## Current verification state

### Production build
- `cmd /c npm.cmd run build`
- **Status:** PASS

### Actor UAT suites
Command:

```powershell
cmd /c npx playwright test test/uat/actor-admin test/uat/actor-teacher test/uat/actor-student test/uat/actor-integration --reporter=line
```

**Status when run with dev server available:**
- **14 passed**
- **0 failed**
- **0 skipped**

### Backbone coverage now enabled in UAT
- admin activity approval backbone
- teacher activity CRUD
- teacher submit/withdraw approval
- teacher manual attendance backbone
- teacher QR session backbone
- teacher evaluation backbone
- teacher class-management backbone
- student discovery/registration backbone
- student QR check-in backbone
- student scoring/statistics backbone
- student awards/notifications backbone
- integration happy path
- integration permission/guard errors

## Key fixes completed in this milestone

### Runtime / flow fixes
- stabilized `POST /api/attendance/manual`
- removed inline scoring from manual-attendance hot path
- stabilized QR scan/session/end flow
- fixed attendance and QR scan routes using stale schema assumptions like `full_name`
- fixed approval-history status mismatch (`requested` vs `pending_approval`)
- fixed evaluation scoring persistence to match actual DB schema
- invalidated score cache after evaluation save
- fixed build blockers around page props typing and route detail typing
- replaced unsupported `useEffectEvent` imports with local compat hook where needed

### Test / UAT stabilization
- isolated UAT login rate-limit buckets via per-request forwarded IPs
- made long-running UAT specs use realistic per-spec timeouts
- aligned UAT activity creation with voluntary/mandatory participation model
- made registration-related UAT specs robust against idempotent/already-registered cases
- expanded skeleton actor suites into real executable coverage across admin/teacher/student/integration

## Recent commits of interest
- `3dbf0ff` — Stabilize manual attendance UAT flow
- `d4edb16` — Stabilize QR backbone and attendance regressions
- `7e1fd97` — Expand backbone UAT coverage across actors
- `dca2941` — Fix build blockers and align vitest expectations

## Remaining work after handover
These do **not** block the current handover target, but should be prioritized after handover:

1. Continue reducing vitest / page-test debt
2. Finalize numeric thresholds for QR fallback
3. Decide concrete pilot activity set for face-attendance rollout
4. Continue schema-alignment cleanup in legacy routes/tests
5. Continue feature development after backbone handover

## Practical handover note
If someone needs to verify the handover quickly:
1. start dev server
2. run full actor UAT suites
3. run production build
4. review this file + SYSTEM_AUDIT.md + BUSINESS_DECISIONS.md
