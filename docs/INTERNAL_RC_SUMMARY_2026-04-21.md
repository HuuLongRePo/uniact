# UniAct Internal RC Summary (2026-04-21)

Status: internal release candidate milestone

## Snapshot

As of 2026-04-21, UniAct has reached a stronger internal release candidate state for the backbone release path:

- Gate A `Auth/session` is green
- Gate B `Activity workflow` is green
- Gate C `Student registration` is green
- Gate D `Attendance` is green
- Gate E `Scoring/bonus/report` is green
- `npm.cmd run production:build` passes
- `npm.cmd run release:check` passes in internal RC mode
- `npm.cmd run test:backbone` passes

Recommended internal tag for this milestone:

- `internal-rc-2026-04-21`

Current tagged commit target when drafting:

- `90f1c21`

## What is materially stronger now

### Backbone flow stability

- auth/session, approval workflow, registration, attendance, scoring, and notification-adjacent paths have been hardened in small verified batches
- canonical `successResponse` handling is aligned better across student/admin consumers
- registration and approval semantics are locked with targeted regressions
- attendance QR reuse and scoring closeout/report paths now have explicit regression evidence

### Release blockers closed in this cycle

- production build blocker fixed, including missing `ensureActivityStudentScope` export and participant status typing drift
- local schema drift for `point_calculations(activity_id, coefficient)` is self-healed in scoring and seed paths
- admin leaderboard/rankings preserve meaningful totals even when score ledger has not produced a richer record yet

## Verification evidence

- Internal RC release check: type check + production build + backbone regression pass
- Gate A regression: `8 files / 33 tests` pass
- Gate B regression: `12 files / 53 tests` pass
- Gate C regression: `9 files / 17 tests` pass
- Gate D regression: `5 files / 19 tests` pass
- Gate E regression: `10 files / 38 tests` pass
- Backbone regression: `11 files / 47 tests` pass
- Production build: pass on Next.js production build pipeline

## Current release interpretation

Recommended wording for the current repo state:

> UniAct has reached an internal release candidate milestone for the core backbone path.
> Admin, teacher, and student hot-path workflows are regression-verified and production-build clean.
> This is still an internal milestone, not a claim that every long-tail legacy surface is fully production-ready.

## Remaining non-blocking defer

- choose long-term notification transport direction (`SSE-only` vs `Socket hybrid`)
- decide QR default TTL and session reuse policy
- select production face matching/liveness stack
- define biometric embedding retention policy

## Immediate next step after RC tag

1. Keep runtime/manual smoke documented against the tagged milestone.
2. Record any blocker found outside the current backbone subset before broadening release claims.
3. Only move beyond internal RC wording after smoke stays clean and deferred architectural decisions are intentionally accepted.
