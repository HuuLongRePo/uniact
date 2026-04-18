# UniAct Internal Release Note (2026-04-12)

Status: internal release candidate preparation
Branch: `main`
Latest milestone commit at note time: `446e4ec`

## 1. Milestone summary

UniAct has reached a materially stronger internal RC-prep state.
This is not a claim of full production readiness.
It is a claim that the most important backbone flows across admin, teacher, and student surfaces are significantly more consistent, better regression-covered, and now build successfully as a production artifact.

## 2. What became stronger in this milestone

### Admin
- Activities list/detail/participants contracts were canonicalized.
- Pending approval, approval action, and approval history flows were hardened.
- Admin configuration routes for `activity-types` and `organization-levels` were canonicalized.
- Admin attendance routes were canonicalized.
- Admin activity completion route was canonicalized while preserving score calculation and audit behavior.

### Teacher
- Approvals route and resubmit route were hardened.
- Dashboard routes now preserve canonical guard errors.
- Teacher students route and consuming page are better aligned.
- Teacher evaluation routes and activity-level participants/evaluate routes are more consistent with the current canonical contract direction.

### Student
- Activity list/detail behavior was stabilized.
- Register/cancel flows were hardened for conflict, noop, mandatory, and attended semantics.
- Registration counting moved closer to business truth.

## 3. Verification completed for this milestone

### Regression baseline
A widened RC regression baseline is green.

Current verified result:
- `26/26` test files passed
- `60/60` tests passed

### Build verification
Production build is green.

Verified command:
```bash
npm run build
```

Result:
- compile passed
- type validation passed
- static generation passed

## 4. What this milestone does NOT claim

This milestone does not mean:
- the whole repo is fully canonicalized
- all long-tail legacy routes are cleaned up
- all manual smoke flows were executed already
- the project is ready to be advertised as a final public production release

## 5. Recommended release wording right now

> UniAct is currently in an internal release candidate preparation phase.
> The core admin, teacher, and student backbone flows have been significantly hardened,
> regression-verified, and build-verified.
> Targeted manual smoke and one final release gate should be completed before promoting this milestone further.

## 6. Required next gate

Before promoting beyond internal RC prep, do the following:

1. Run the targeted smoke checklist in `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md`.
2. Log any blocker found during smoke.
3. If smoke is clean, tag or announce a stronger internal RC milestone.

## 7. Key commits in this milestone arc

- `7187b69` — Canonicalize admin activities list contracts
- `7a42e56` — Canonicalize teacher dashboard auth contracts
- `d35f90b` — Canonicalize teacher students contracts
- `d9c3eea` — Prepare internal release candidate baseline
- `5c1b6a4` — Expand teacher activity contracts and RC baseline
- `228610a` — Canonicalize admin config backbone routes
- `ea94657` — Canonicalize admin attendance and completion routes
- `446e4ec` — Add build verification and targeted RC smoke docs
