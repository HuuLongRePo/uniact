# Manual QA Checklist, Web RC

Use this checklist for the final manual QA pass after the recent hardening work.

## General setup
- Use a seeded environment with working admin, teacher, and student accounts.
- Verify demo/test account gates match intended environment config.
- Confirm auth cookies/session persist correctly across page reloads.
- Prefer current canonical ANND/demo seed direction over older legacy accounts.

---

## 1. Admin QA

### Auth and dashboard
- Log in as admin.
- Confirm redirect lands on dashboard without auth flicker or stale-session loop.
- Refresh the page and confirm session remains valid.
- Log out and confirm return to login screen.

### Users
- Open admin users list.
- Search/filter if applicable.
- Open user detail dialog.
- Edit a user and confirm success state.
- Deactivate a user and confirm wording/behavior matches soft deactivate, not hard delete.
- Try reset password and confirm success response is shown.

### Classes
- Open admin classes list.
- Create a class.
- Edit class detail.
- Delete/deactivate class according to actual product semantics.
- Confirm list refreshes with canonical payload-backed data.

### Activities
- Open admin activities list.
- Open activity detail.
- Review participants tab and verify attendance states render correctly.
- Review approval history.
- Cancel an activity and confirm UI says hủy, not xóa.
- Open activity edit page and save a change.

### Reports
- Open score report page.
- Confirm average / median / max / min render.
- Open leaderboard/rankings surfaces if exposed in UI.
- Confirm filters/pagination work.
- Open activity-statistics report and export CSV.
- Open custom report page, preview report, then export CSV.
- Confirm export errors surface clearly if permissions/config are wrong.

---

## 2. Teacher QA

### Dashboard
- Log in as teacher.
- Open teacher dashboard.
- Confirm dashboard and dashboard-stats widgets load without auth drift.

### Activities
- Open teacher activities page.
- Create or edit an activity if flow is available.
- Submit activity for approval.
- Cancel/resubmit/clone actions if available.
- Confirm toast/copy matches current semantics.

### Students
- Open teacher students page.
- Confirm student list and class filters load correctly.
- Open any per-student screens that are part of the active flow.

### Attendance and evaluation
- Perform bulk attendance for an activity.
- Evaluate at least one participation.
- Confirm scoring result appears persisted, not just computed transiently.

### Reports
- Open class stats report.
- Open participation report.
- Export participation PDF.
- Confirm failures show real API message instead of generic fallback.

---

## 3. Student QA

### Auth and dashboard entry
- Log in as student.
- Refresh and confirm session continuity.
- Log out and confirm cookie-backed logout works correctly.

### Activities
- Open student activities list.
- Filter by type if available.
- Open activity detail.
- Register for an activity.
- Cancel registration.
- Confirm success toasts reflect canonical API messages.

### History
- Open student history page.
- Verify attended vs registered filtering.
- Verify sorting by date and points.
- Export CSV.
- Confirm failed history fetch surfaces a visible error state.

### Points and scores
- Open student points breakdown page.
- Verify summary cards and per-activity breakdown render.
- Open student scores page.
- Verify summary and score detail modal render correctly.
- Confirm failed fetches show visible error handling.

---

## 4. Cross-role checks
- Invalid/stale session should redirect or show auth error cleanly.
- Forbidden access between roles should not silently degrade to wrong content.
- Exports should return downloadable files with expected naming/content type.
- Canonical error messages should be surfaced in UI where recently hardened.
- No page should rely on old `data.data.data` style payload assumptions in the tested backbone.

---

## 5. What to log as blockers
Treat these as RC blockers if found:
- Broken login/logout/session continuity
- Admin/teacher/student core pages fail to load
- Activity create/submit/cancel/register/evaluate flows fail
- Scores/reporting visibly mismatch persisted data
- Export/report routes fail on normal happy path
- Guard errors collapse into misleading success or wrong-role content

## 6. What is usually safe to defer
- Non-core analytics improvements
- Experimental auth fallback/security question branch
- Teacher notification/poll tooling outside active release path
- Mobile parity issues
- Pure copy polish not affecting workflow correctness
