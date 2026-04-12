# UniAct Targeted Manual Smoke Checklist

Status: internal RC prep
Date: 2026-04-12

## Goal

Run a fast but meaningful manual smoke after build + regression baseline stay green.
This checklist focuses on the highest-value admin, teacher, and student flows rather than broad exploratory QA.

## Admin smoke

- [ ] Login as admin succeeds and lands on the correct dashboard.
- [ ] Open admin activities list and confirm list loads without contract/runtime errors.
- [ ] Open one activity detail page and verify participants/history panels load.
- [ ] Approve or reject one pending activity and confirm the result is reflected in queue/detail/history.
- [ ] Open activity types config and organization levels config, verify list/create/edit/delete still work.
- [ ] Open admin attendance list and update one attendance status successfully.
- [ ] Complete one activity and verify the system shows completion success without breaking follow-up views.

## Teacher smoke

- [ ] Login as teacher succeeds and dashboard loads.
- [ ] Open teacher approvals page and confirm owned activities/approval state render correctly.
- [ ] Open teacher activity participants view and confirm participant list loads.
- [ ] Perform one teacher evaluation flow successfully.
- [ ] Resubmit one rejected/draft-eligible activity and confirm pending state behavior is correct.
- [ ] Open teacher students page and verify list/filter/sort still behave correctly.

## Student smoke

- [ ] Login as student succeeds and activities list loads.
- [ ] Open one activity detail page and verify mandatory/registration information renders correctly.
- [ ] Register for one eligible activity successfully.
- [ ] Cancel one allowed registration successfully.
- [ ] Verify mandatory or attended registrations cannot be cancelled when rules say they should be blocked.
- [ ] Open my activities/my registrations and confirm counts/statuses look correct.

## Exit criteria

- [ ] Build succeeds.
- [ ] RC regression baseline is green.
- [ ] No blocker found in admin/teacher/student smoke above.
- [ ] If any smoke issue appears, log it before calling the milestone stronger than internal RC prep.
