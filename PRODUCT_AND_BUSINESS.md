# PRODUCT AND BUSINESS

Active product and business source-of-truth for UniAct.

---

## 1. Product summary
UniAct is a web system for extracurricular activity management across 3 core roles:
- **Admin**: governance, approval, configuration, reporting
- **Teacher**: create activities, manage class/student operations, attendance, evaluation
- **Student**: discover activities, register, participate, review points/history

This file consolidates the active product backbone, open business questions, and confirmed business decisions.

---

## 2. Core product backbone

### P0, vital flows
1. Authentication and role-correct entry
2. Teacher creates activity and submits approval
3. Admin approves or rejects activity
4. Student discovers and registers/cancels activity
5. Attendance and participation confirmation

### P1, important supporting flows
6. Scoring, scoreboards, rankings, reports
7. Notifications, dashboard, operational visibility

### Practical rescue rule
- make users complete the P0 flows first
- then stabilize scoring/reporting/dashboard
- only then do broader cleanup or deeper UX polish

---

## 3. Confirmed business decisions

### Teacher scope
Teacher can act across:
- classes they directly manage
- classes additionally assigned to them
- activity-related scopes beyond a single class when business rules allow

### Activity approval workflow
Current default flow:
- `draft -> requested -> approved -> published`
- all activities currently require admin approval before publish

### Registration conflict rule
Current rule:
- block on conflicting start time only
- do not block merely because activities happen on the same day

### Attendance override policy
- admin can always override
- teacher can override only when the activity allows it

### Scoring timing
- attendance confirms participation
- official scoring is finalized only after evaluation/final confirmation

### Teacher override scope
When `allow_teacher_override` is enabled, teacher override can affect:
- attendance
- registration
- evaluation adjustments

### Teacher-class-organization model
Teacher is not modeled as belonging to exactly one class forever.
They may operate across:
- primary class responsibility
- supporting classes
- faculty/youth union/department scopes

### Post-publish change management
- changes to already published activities should go through controlled approval/review behavior
- change history/version snapshots are important
- registered users should be notified of important changes

### Participation model
System should support both:
- mandatory participation
- voluntary participation

Mandatory takes precedence over voluntary when overlap exists.

### Target scope model
Activity participation assignment should support:
- classes
- individual students
- organizational groups

### Evaluation and scoring intent
The current product direction is to keep evaluation + scoring simple but extensible, with room for more policy sophistication later.

---

## 4. Open business questions still worth tracking
These are the kinds of questions that matter operationally and should be reviewed when product scope expands:
- finer-grained conflict policy beyond start-time only
- richer attendance mode policy (manual / QR / face)
- deeper change-management rules after publish
- more advanced participation preview and conflict explanation UX
- long-term scoring policy refinement if school regulations change

These questions should not block the current web backbone unless they affect active release-critical flows.

---

## 5. What is core vs non-core right now

### Core now
- auth/session by role
- activity lifecycle
- approval flow
- registration/cancel
- attendance
- evaluation
- scoring persistence
- student visibility
- admin/teacher reporting backbone

### Non-core for current web release focus
- experimental auth fallback branches
- advanced biometrics direction
- non-critical notification/poll tooling
- mobile parity work

---

## 6. Product testing interpretation
If a defect breaks any of the following, it should be treated as release-critical:
- login/logout/session continuity
- teacher create/submit activity
- admin approve/reject activity
- student register/cancel
- attendance/evaluation to scoring persistence
- student score/history visibility
- admin/teacher report happy paths
