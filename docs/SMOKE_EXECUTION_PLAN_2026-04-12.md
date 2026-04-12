# UniAct Smoke Execution Plan (2026-04-12)

Status: prepared

## Why this plan exists

UniAct now has a strong internal RC-prep backbone, but the final confidence step should come from smoke execution against a realistic running environment.

During preparation, one important issue became clear:
- the repo contains a usable Playwright UAT structure under `test/uat`
- but the documented UAT test accounts and helper assumptions appear to drift from the currently seeded data path used by the active project state

That means smoke should be executed in two levels rather than treated as one binary step.

## Level 1: Immediate executable gate

These checks are already meaningful and currently feasible:

- production build passes
- widened RC regression baseline passes
- release-prep docs are present and up to date

Current verified state:
- build: green
- RC regression baseline: green

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

## Recommended initial UAT subset

After account/data alignment, start with these flows:

1. `test/uat/actor-admin/02-activity-approval.spec.ts`
2. `test/uat/actor-student/01-discovery-registration.spec.ts`
3. one teacher path such as `test/uat/actor-teacher/05-evaluation.spec.ts` or `test/uat/actor-teacher/01-activity-crud.spec.ts`

## Recommended rule for milestone promotion

Do **not** treat current UAT seed/account drift as proof of application failure.
Treat it as an environment/setup blocker.

Promote to a stronger internal RC tag only when:
- build is green
- widened regression baseline is green
- smoke environment is aligned
- targeted smoke subset is green or any failures are understood and accepted
