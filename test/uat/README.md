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
2. Ensure seeded accounts exist and match the current project seed direction:
   - admin@annd.edu.vn / Admin@2025
   - gv.nguyenthilan@annd.edu.vn / teacher123
   - sv31a001@annd.edu.vn / student123
3. Prefer a seeded/demo DB state compatible with backbone flows and current `scripts/seed/seed-data.ts`

Current test runner status:
- Playwright config is working
- Backbone smoke tests are executable as a structured UAT subset
- The main practical risk is seed/account drift or missing running app server, not missing UAT scaffolding
