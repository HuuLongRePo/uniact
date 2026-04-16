# UniAct Internal RC Summary (2026-04-12)

## Snapshot

As of 2026-04-12, UniAct has reached an **internal release candidate prep** state rather than a final public production release.

The most important progress is not just individual bug fixes, but the growing consistency of backbone contracts across admin, teacher, and student surfaces.

## What is now significantly stronger

### Admin backbone
- activities list/detail/participants routes have been canonicalized
- approval queue and approval history/action routes have been hardened
- admin config routes (`activity-types`, `organization-levels`) are now aligned better with the same contract family
- attendance and activity completion routes are now covered by the RC baseline too
- error shapes and permission handling are more consistent

### Teacher backbone
- approvals and resubmit flows have been hardened
- dashboard routes now preserve canonical guard errors
- students route no longer drifts as badly from the consuming UI
- evaluate routes are now aligned better with canonical guard/error behavior
- activity-level participants/evaluate teacher routes are closer to the same contract family

### Student backbone
- activities list/detail behavior is more stable
- register/cancel conflict, noop, mandatory, and attended semantics are better locked down
- registration counting and display logic are closer to business truth

## Why this matters

UniAct was previously at risk of behaving like multiple generations of API contracts coexisting in one repo.
The recent hardening work reduces that drift in the parts of the system closest to real user flows.

That makes the project more testable, easier to reason about, and much safer to move toward a genuine release milestone.

## Current release interpretation

Recommended wording for the current repo state:

> UniAct is in an **internal release candidate preparation** phase.
> Core admin/teacher/student backbone flows have been significantly hardened and regression-verified,
> while some long-tail legacy routes and operational surfaces still need cleanup before claiming full release readiness.

## Immediate next steps

1. Keep the targeted admin/teacher/student production-runtime smoke subset green.
2. Record any additional blockers that appear outside this verified subset.
3. Continue targeted dependency/security remediation from the improved baseline.
4. Promote this into a stronger internal RC milestone note/tag once the current runtime-smoke and regression baseline stay stable together.

## Verification note from latest release-prep pass

A later release-prep verification pass surfaced an important operational lesson:
- running multiple build-oriented verification jobs in parallel can destabilize `.next` artifacts and produce false-negative `ENOENT` failures during late build stages such as SSG manifest or NFT trace collection
- a clean rebuild after removing `.next` completed successfully, which is a stronger signal that the issue was build artifact/race drift rather than an application compile/type failure
- a backbone Vitest bundle also hit worker startup timeouts under load, but the affected test files passed when rerun in a narrower scope, suggesting pool saturation rather than route/page regression

Recommended interpretation:
- prefer serialized release verification for Next.js build gates that share `.next`
- treat worker-timeout failures in large bundles carefully until they are reproduced as assertion failures or single-file failures

## New runtime confidence gained

Since the original RC-prep summary, UniAct has also gained a stronger practical runtime signal:
- a targeted three-actor smoke subset now passes on a production runtime (`npm run build` + `next start`)
- the validated subset covers:
  - admin approval access
  - student discovery and registration
  - teacher class-management backbone
- production runtime verification also exposed and helped close a real configuration gap: local production smoke requires `JWT_SECRET`, and `.env.example` now documents that requirement
