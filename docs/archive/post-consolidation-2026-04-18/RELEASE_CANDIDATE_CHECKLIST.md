# UniAct Internal Release Candidate Checklist

## Current candidate baseline

- Candidate date: 2026-04-12
- Branch target: `main`
- Intended level: internal release candidate (admin/teacher/student backbone hardened, not final public release)

## Backbone status

### Admin surface
- [x] activities list canonicalized
- [x] activity detail canonicalized
- [x] activity participants canonicalized
- [x] pending approvals canonicalized
- [x] approval action/history canonicalized
- [x] activity-types config routes canonicalized
- [x] organization-levels config routes canonicalized
- [x] attendance routes canonicalized
- [x] activity completion route canonicalized

### Teacher surface
- [x] approvals route canonicalized
- [x] resubmit route canonicalized
- [x] dashboard auth/error contracts canonicalized
- [x] teacher students contract canonicalized
- [x] evaluate route canonicalized
- [x] activity participants route canonicalized
- [x] activity evaluate-batch route canonicalized

### Student surface
- [x] activities list/detail backbone stabilized
- [x] register conflict semantics hardened
- [x] cancel/noop/mandatory semantics hardened
- [x] my registrations participant counting corrected

## Regression baseline

Recommended pre-release regression bundle:

```bash
npm test -- --reporter dot \
  test/admin-config-route-contracts.test.ts \
  test/admin-config-item-route-contracts.test.ts \
  test/admin-attendance-routes.test.ts \
  test/admin-activity-complete-route.test.ts \
  test/admin-activities-route.test.ts \
  test/admin-activity-detail-route.test.ts \
  test/admin-activity-participants-route.test.ts \
  test/admin-approval-action-route.test.ts \
  test/admin-approval-history-route.test.ts \
  test/admin-pending-activities-route.test.ts \
  test/teacher-dashboard-routes.test.ts \
  test/teacher-dashboard-legacy-auth-route.test.ts \
  test/teacher-students-route.test.ts \
  test/teacher-evaluate-route.test.ts \
  test/teacher-activity-participants-route.test.ts \
  test/activity-access-routes.test.ts \
  test/teacher-approvals-route.test.ts \
  test/teacher-resubmit-route.test.ts \
  test/teacher-edit-activity-page.test.tsx \
  test/teacher-create-activity-page.test.tsx \
  test/student-activity-detail-page.test.tsx \
  test/register-route-conflict.test.ts \
  test/register-route-mandatory.test.ts \
  test/register-route-cancel-route.test.ts \
  test/student-activities-page.test.tsx \
  test/activities-list-route.test.ts \
  test/my-registrations-route.test.ts \
  test/activity-check-conflicts-route.test.ts
```

## Remaining pre-release concerns

- Some long-tail admin/teacher routes still use legacy auth/session or raw `NextResponse` patterns.
- Release candidate status currently reflects backbone stability, not full repo-wide contract cleanup.
- Dependency/security cleanup is now in a strong release state, with `npm audit` reporting 0 vulnerabilities after the final remediation batch.
- Production-like runtime smoke now exists for three backbone actors, but broader operational gates and wider smoke coverage are still pending.
- Face-biometric enrollment/auth is temporarily disabled in the release build to avoid shipping the obsolete `face-api.js` dependency chain while a safer replacement path is designed.

## Recommended next gates

1. Run the regression baseline above and keep it green.
2. Sweep one more high-value legacy route cluster.
3. Keep the production build + targeted production-runtime smoke for admin/teacher/student key flows green.
4. Design and validate a safer long-term biometric replacement or reintroduction path.
5. Tag an internal RC milestone only after docs, regression baseline, runtime smoke, and the current product tradeoffs are all explicitly accepted.

## Latest verification caveats

- Avoid overlapping `next build` or release-check jobs that share the same `.next` directory during final verification.
- If a late-stage build fails with missing `.next` manifest/trace artifacts (`_ssgManifest`, `.nft.json`, similar ENOENTs), rerun from a clean `.next` state before treating it as an application blocker.
- If a large Vitest bundle fails via worker startup timeout, rerun the affected files in narrower scope before classifying the result as a regression.
- The current release baseline assumes face-biometric auth/enrollment is intentionally unavailable in production until the dependency chain is replaced safely.
