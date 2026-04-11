# UniAct - Delivery Roadmap

_Last updated: 2026-04-11 (Asia/Saigon)_

## 0. Current handover snapshot

### Verified now
- `npm run build` passes
- full actor UAT suites pass
- full Vitest suite passes (after excluding clearly corrupted/quarantined files)
- handover backbone scope is stable enough for delivery

### Main stable flows
- login / role guards
- teacher activity CRUD
- teacher submit approval -> admin approve
- student discovery / registration
- manual attendance
- QR session create / scan / close
- teacher evaluation
- student scores / statistics
- student notifications
- student awards
- teacher class management
- integration happy path
- permission / guard regression

## 1. Stable / handover-ready scope

### Build and deployment readiness
- production build passes
- type blockers around Next page props and route typing have been fixed
- `useEffectEvent` build blockers were replaced with compat hook usage

### UAT-ready actor coverage
- `test/uat/actor-admin`
- `test/uat/actor-teacher`
- `test/uat/actor-student`
- `test/uat/actor-integration`

### High-value test debt already reduced
- bonus cluster stabilized
- participation preview route tests aligned
- workflow route tests aligned to current API
- student activity page tests aligned to absolute client fetch URLs
- legacy/corrupted test artifacts excluded from active Vitest scope

## 2. Remaining issues (grouped)

### Cluster A - Legacy/corrupted test artifacts
**Status:** isolated, not blocking handover

These were excluded from active Vitest scope because they are not meaningful runtime regressions:
- `test/error-boundary.test.tsx`
- `test/unit/connection-manager.test.js`
- `test/unit/quota-parser.test.js`
- files under `quarantine/`
- `test-results/`
- `.next/`

**Next step:** either rewrite them cleanly or move them permanently under explicit archive/quarantine test buckets.

### Cluster B - Schema drift risk in legacy routes/tests
**Status:** reduced, still worth continued audit

Patterns already seen and partially fixed:
- `full_name` vs `name`
- `award_type` assumptions
- `multiplier` assumptions
- approval status enum mismatch (`requested` vs `pending_approval` in history)
- scoring persistence assumptions not matching real DB schema

**Next step:** continue route-by-route audit for legacy endpoints not yet covered by actor UAT.

### Cluster C - Policy/config hard-coding
**Status:** acceptable for handover, not ideal long-term

Still largely hard-coded or semi-hard-coded:
- QR fallback thresholds
- rule automation categories
- face-attendance pilot selection
- sensitive-action reason policy matrix

**Next step:** convert into explicit config/policy tables after delivery hardening.

### Cluster D - Feature depth gaps
**Status:** backbone done, advanced depth still unfinished

Examples:
- deeper face-attendance rollout beyond roadmap placeholder
- richer penalty/improvement workflows
- fully polished dashboard widgets across all roles
- more complete reporting/admin analytics depth

## 3. Unfinished / partially-finished feature map

### 3.1 Attendance stack
- **Done:** manual attendance backbone, QR backbone
- **Partial:** QR fallback numeric thresholds not finalized
- **Partial:** face attendance roadmap chosen, but rollout not completed

### 3.2 Participation model
- **Done:** mandatory/voluntary backbone reflected in routes/tests/UAT
- **Partial:** advanced exclusion/exemption edge policies still need deeper implementation refinement

### 3.3 Scoring / improvement / penalty
- **Done:** evaluation -> scoring backbone persisted and verified
- **Partial:** improvement/remedy ecosystem is still policy-first, not fully built out
- **Partial:** some analytics/reporting depth remains shallow

### 3.4 Notifications / escalation
- **Done:** notifications backbone and unread/escalation decisions documented
- **Partial:** richer escalation workflows and owner assignment UX can be extended

## 4. Bottlenecks / architectural constraints

### 4.1 Test DB initialization drift
A recurring theme was:
- tests assumed migrations/full schema
- runtime no longer auto-initializes the same way

**Mitigation used:** dedicated test schema helpers.

**Long-term fix:** build a shared deterministic test database bootstrap layer for unit/integration tests.

### 4.2 Cache invalidation sensitivity
Some student score/statistics checks were affected by stale cache behavior.

**Mitigation used:** invalidate score cache after evaluation persistence.

**Long-term fix:** formalize cache invalidation map by domain event.

### 4.3 Legacy route/test API drift
Multiple tests and some old routes assumed older shapes/status names.

**Long-term fix:** maintain a compatibility matrix or deprecate legacy assumptions more aggressively.

## 5. Completion roadmap

## Phase 1 - Handover hardening (now -> immediate)
**Goal:** lock delivery state and reduce obvious post-handover surprises.

### Tasks
1. Keep build green
2. Keep actor UAT green
3. Commit and preserve handover docs
4. Audit any final uncommitted legacy warnings
5. Do one more spot-check on startup / dev server / key APIs if needed

### Verification
- `cmd /c npm.cmd run build`
- full actor UAT
- full vitest

## Phase 2 - Finish unfinished features
**Goal:** complete the medium-depth business capabilities already designed but not fully delivered.

### Priority order
1. finalize QR fallback numeric thresholds
2. select concrete pilot activity set for face attendance
3. extend student/teacher/admin dashboard depth
4. deepen penalty/improvement workflows
5. expand report modules / operational analytics

### Expected outputs
- updated business docs
- UAT coverage for the newly completed flows
- config/policy surfaces where appropriate

## Phase 3 - Hardening / cleanup / platform quality
**Goal:** reduce long-tail fragility and make the system easier to evolve.

### Tasks
1. replace ad-hoc test schema setup with shared deterministic bootstrap
2. audit remaining legacy routes for schema mismatches
3. clean or permanently archive corrupted legacy tests
4. reduce config hard-coding into rule/policy tables
5. tune cache invalidation / performance / build diagnostics

## 6. Recommended execution order after handover

### If the next objective is safest progress:
1. finalize handover artifacts
2. lock one final green verification run
3. move to face-attendance pilot planning + QR fallback thresholds
4. then deepen dashboards/reporting

### If the next objective is feature velocity:
1. face attendance pilot slice
2. richer improvement / penalty workflows
3. reporting/admin analytics improvements
4. long-tail test/platform cleanup later

## 7. Files that should remain central references
- `HANDOVER_STATUS.md`
- `SYSTEM_AUDIT.md`
- `BUSINESS_DECISIONS.md`
- `BUSINESS_QUESTIONS.md`
- `DELIVERY_ROADMAP.md`
