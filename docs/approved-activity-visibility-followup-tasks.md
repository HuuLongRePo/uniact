# APPROVED ACTIVITY VISIBILITY FOLLOW-UP TASKS

Status: active follow-up after audit of admin approval destination semantics

## Core finding
Current approval core is not supposed to make activities disappear.
Canonical approved path is:
- admin approves request
- `activity_approvals.status` -> `approved`
- `activities.approval_status` -> `approved`
- `activities.status` -> `published`

Therefore, an approved activity should remain visible in `admin/activities` and be discoverable by:
- workflow filter `published`
- review filter `approved`

## P0 - Approved destination visibility audit
- Verify production/local data really persists `status='published'` after approval.
- Verify no stale/failing consumer is reading only one of:
  - derived workflow status,
  - raw review status,
  - outdated cached payload.

## P0 - Review vs workflow wording clarity
- Reduce confusion between:
  - `Đã duyệt`
  - `Đã công bố`
- UI should make it obvious that current approved path effectively lands in published workflow state.
- Consider explicit helper copy such as:
  - workflow: `Đã công bố`
  - review: `Đã duyệt (đã công bố)`

## P1 - End-to-end regression for approve -> list visibility
- Add route or page regression that proves:
  - approval succeeds,
  - activity lands in `published + approved`,
  - admin list displays it,
  - workflow filter `published` finds it,
  - review filter `approved` finds it.

## P1 - Investigate real-world invisibility reports
If user still cannot see newly approved activity despite code semantics above, likely suspects are:
- stale browser/session cache,
- data row not actually updated in DB,
- approval request record mismatch,
- local seeded data drift,
- admin list fetch returning unexpected payload shape.

## Recommended next actions
1. Add explicit approve -> published list regression.
2. Inspect real data rows in `activities` and `activity_approvals` after a live approval.
3. If mismatch appears in real DB, audit persistence path rather than UI wording only.
