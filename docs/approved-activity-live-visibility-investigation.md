# APPROVED ACTIVITY LIVE VISIBILITY INVESTIGATION

Status: live investigation notes after repeated user report that newly approved activity is not visible in admin activity management

## Confirmed code truth
Current canonical approval path says approved activity should become:
- `activities.status = 'published'`
- `activities.approval_status = 'approved'`

Therefore it should be visible in `admin/activities` and discoverable by:
- workflow filter: `published`
- review filter: `approved`

## Most plausible live issue candidates
1. **Stale admin activities page data**
   - `admin/activities/page.tsx` originally fetched only on mount.
   - If approval occurs elsewhere, the list can remain stale until full reload.
   - A refresh control and periodic refresh reduce this risk.

2. **Real DB persistence mismatch**
   - Need to inspect `activities` and `activity_approvals` rows after a live approval.
   - If status remains `draft` while approval is `approved`, then persistence path is wrong in real runtime.

3. **Different filter expectation from user mental model**
   - User may look for `Đã duyệt` as a standalone destination instead of `Đã công bố` workflow + `Đã duyệt` review.

4. **Payload freshness or cache drift**
   - list API may be returning stale data under some runtime condition.

## Immediate mitigation already applied
- admin activities page now has:
  - manual refresh button,
  - periodic refresh guidance.

## Recommended next live-debug steps
1. Approve one real activity.
2. Inspect row in `activities` immediately after approval.
3. Inspect latest row in `activity_approvals`.
4. Hit `/api/admin/activities` directly and compare returned values.
5. Compare with what the UI page shows before and after manual refresh.
