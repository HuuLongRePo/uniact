# UniAct Smoke Execution Plan (2026-04-12)

Status: production-runtime subset verified

## Why this plan exists

UniAct now has a strong internal RC-prep backbone, but the final confidence step should come from smoke execution against a realistic running environment.

During preparation, one important issue became clear:
- the repo contains a usable Playwright UAT structure under `test/uat`
- documented UAT test accounts had drifted from the current seeded data direction used by the active project state
- that specific account/documentation drift has now been aligned at the helper/README level, but realistic smoke still depends on having a running app and compatible seeded DB state

That means smoke should be executed in two levels rather than treated as one binary step.

## Level 1: Immediate executable gate

These checks are already meaningful and currently feasible:

- production build passes
- widened RC regression baseline passes
- release-prep docs are present and up to date

Current verified state:
- build: green
- RC regression baseline: green
- production runtime (`next start`) can boot successfully after providing required local env config

## Level 2: Stronger smoke gate before tagging

Before creating a stronger internal RC tag, run a realistic smoke with a compatible environment:

### Option A: Align seeded UAT accounts with current helpers

Make the running database match the accounts expected in `test/uat/helpers/test-accounts.ts` and the assumptions described in `test/uat/README.md`.

Then run a small high-value subset first, for example:
- admin approval access
- student discovery and registration
- one teacher activity flow

### Option B: Update UAT helpers to match the real seeded dataset

If the active seeded dataset should remain as-is, then update:
- `test/uat/helpers/test-accounts.ts`
- any helper assumptions about seeded activity/config data
- UAT README notes

This is the better path if current data reality is already the intended project baseline.

Current status:
- `test/uat/helpers/test-accounts.ts` has been aligned with the current seed direction, including switching class-management smoke to a teacher account that actually has class assignment
- `test/uat/README.md` has been updated to the same account assumptions
- runtime issues found during smoke were separated into real app/config issues vs. dev-server artifact drift
- a production-like local env requirement was identified: `JWT_SECRET` is mandatory for `next start`
- remaining smoke risk is now mostly broader coverage and long-tail operational drift, not stale account docs

## Recommended initial UAT subset

After account/data alignment, start with these flows:

1. `test/uat/actor-admin/02-activity-approval.spec.ts`
2. `test/uat/actor-student/01-discovery-registration.spec.ts`
3. `test/uat/actor-teacher/06-class-management.spec.ts`

Current verified result for that targeted subset:
- the three-actor subset passes on a production runtime (`npm run build` + `next start`) with local env configured

## Recommended rule for milestone promotion

Do **not** treat current UAT seed/account drift as proof of application failure.
Treat it as an environment/setup blocker.

Promote to a stronger internal RC tag only when:
- build is green
- widened regression baseline is green
- smoke environment is aligned
- targeted smoke subset is green or any failures are understood and accepted

Latest practical result:
- the targeted admin/student/teacher smoke subset is now green on production runtime
- dev/Turbopack remained a less reliable smoke host under chained runs, so production runtime is the more trustworthy RC gate for this subset
