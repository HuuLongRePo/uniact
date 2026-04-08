# UAT Suite (Clean Backbone Skeleton)

This directory contains clean user-acceptance test skeletons for UniAct core flows.

## Purpose

- Preserve a trustworthy regression structure for backbone flows
- Replace corrupted / wrong-type legacy UAT specs that were quarantined
- Provide a clean base for rebuilding actor-based coverage incrementally

## Active clean areas

- `helpers/` → reusable login/admin/student/teacher helpers
- `actor-admin/` → admin backbone flows
- `actor-teacher/` → teacher backbone flows
- `actor-student/` → student backbone flows
- `actor-integration/` → end-to-end cross-actor flows

## Notes

These new specs start as executable skeletons / checkpoints.
Expand them only after validating the underlying routes and test data assumptions.

## Execution prerequisites

Before running `test:uat` or `test:uat:backbone`:

1. Start the app manually at `BASE_URL` (default: `http://localhost:3000`)
2. Ensure seeded accounts exist:
   - admin@school.edu / admin123
   - nguyen.van.tuan@school.edu / teacher123
   - sv001.12a1@school.edu / student123
3. Prefer a seeded/demo DB state compatible with backbone flows

Current test runner status:
- Playwright config is working
- Backbone smoke tests are executable
- Current failing condition is missing running app server, not broken test infrastructure
