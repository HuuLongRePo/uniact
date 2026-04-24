# ACTIVITY BUSINESS RE-ANALYSIS AND ACTOR CRUD IMPACT MATRIX

Status: active business re-analysis driven by recent user questions and observed implementation drift

## Why this re-analysis is needed
Recent issues are not isolated bugs. They reveal that the activity subsystem still has unresolved business semantics across:
- workflow destination after approval,
- broad-open student visibility,
- overdue/not-held handling,
- attendance/scoring intervention authority,
- actor-specific list/filter expectations,
- and CRUD UI wording/scope mismatches.

This document combines the user's recent questions with the current implementation reality to define the next implementation direction.

## Recent user-question clusters to incorporate
1. Activity approved by admin, but admin cannot see it in activity management.
2. Teacher-created activity approved by admin and intended for broad registration, but arbitrary students still cannot see it.
3. Admin attendance/scoring management should be more scientific and fully intervention-capable.
4. Overdue activities without attendance need a cleaner operational/archive model.
5. Filters/pagination should be rich but compact, scientific, and suitable for each use case.
6. Realtime-worthy features should update quickly without making the system slow.

## Current implementation truth already confirmed
### A. Approval destination
Canonical approve path currently intends:
- `activities.status = 'published'`
- `activities.approval_status = 'approved'`
Therefore approved activities should remain visible on admin management surfaces.

### B. Student visibility
Current activity scope modeling is still class-based:
- `class_ids`
- `mandatory_class_ids`
- `voluntary_class_ids`
There is no confirmed explicit global-open/all-students model yet.

### C. Workflow vs review state
The system already distinguishes:
- workflow/lifecycle status,
- review/approval status,
but multiple surfaces still blur them in wording and user expectations.

### D. Attendance/scoring governance
Admin has partial intervention capability, but full parity/override semantics are still incomplete and need a clearer governance model.

## Business re-analysis

### 1. What is an activity, operationally?
An activity is not just a teacher-created record. It is a governed operational object that moves through:
1. creation/editing,
2. submission,
3. review/approval,
4. publication/visibility,
5. registration eligibility,
6. attendance execution,
7. evaluation/scoring,
8. completion or resolution/archive.

Any actor CRUD surface that only shows one slice without the full operational context will drift.

### 2. What should “approved” really mean?
Business-wise, there are 2 possible models:
- **Model A:** approved implies published/visible immediately.
- **Model B:** approved only means review passed; publish is a separate act.

Current code appears closer to **Model A**.
If that is the chosen business line, then all actor UIs must consistently reflect:
- approved activity appears in management lists,
- approved activity becomes discoverable to the intended student scope,
- approved activity is no longer treated like a draft-like object.

### 3. What should “open for registration broadly” mean?
Current implementation truth suggests there is no explicit all-students semantic yet.
So business needs to choose one of these:
- **Scope model 1:** only class-based targeting exists; broad-open means “all classes selected”.
- **Scope model 2:** explicit global-open flag exists and overrides class targeting.
- **Scope model 3:** hybrid model exists, with class targeting + direct students + global-open.

For long-term system completion, **Scope model 3** is the strongest and most future-proof:
- mandatory classes,
- voluntary classes,
- mandatory students,
- voluntary students,
- global-open/all eligible students.

### 4. What should admin authority mean?
Admin is not just another user role. Admin is the governance/repair actor.
Therefore admin should be able to:
- inspect all activity states,
- intervene in attendance,
- intervene in scoring/evaluation,
- repair data inconsistencies,
- resolve teacher/student operational issues,
- see audit/reason trails.

### 5. What should actor CRUD mean?
CRUD must differ by actor purpose:
- **Teacher CRUD:** authoring, class/student targeting, submission, monitoring, resubmission.
- **Admin CRUD:** governance, approval, visibility control, repair, oversight, intervention.
- **Student CRUD:** discovery, eligibility understanding, registration, cancellation, participation history.

The current problem is not simply missing buttons. It is that each actor needs a different semantic model layered over the same activity entity.

## Actor CRUD impact matrix

### Teacher
#### Current pain
- create/edit UI is class-scoped only,
- “open broadly” semantics are unclear,
- form complexity is growing and laggy,
- preview does not yet explain full future scope models.

#### Needed impact
- redesign create/edit scope model,
- explicit open-scope choice,
- better preview of who can see/register,
- ensure submit/approve path preserves chosen scope semantics.

### Admin
#### Current pain
- confusion over approved destination,
- attendance management not yet scientific enough,
- filters need to be more powerful but compact,
- intervention model across scoring/attendance is incomplete.

#### Needed impact
- management lists must surface workflow + review + operational state clearly,
- attendance/evaluation/scoring intervention tools,
- reason/audit-aware override actions,
- refreshed list visibility and better filter semantics.

### Student
#### Current pain
- visibility depends on hidden applicability rules,
- broad-open expectation may not match current model,
- list/detail/register semantics can feel opaque,
- stale/freshness/filter interactions can hide activities.

#### Needed impact
- explicit eligibility explanation,
- correct discovery rules,
- broad-open support if product wants it,
- detail/register paths aligned with list visibility.

## First-priority business decisions
1. Is **approved = published** still the chosen business truth?
2. Does the system need explicit **global-open/all-students** support?
3. Is student targeting allowed directly, or only via classes?
4. Should admin have explicit override reasons/audit on all attendance/scoring interventions?
5. Should overdue/no-attendance activities become a separate resolution category instead of collapsing into completed/cancelled?

## Recommended first implementation batch
### Batch 1 recommendation
Implement the smallest batch that resolves the most harmful semantic gap:

**Add explicit global-open activity scope support and wire it through teacher create/edit -> persistence -> student discovery.**

Why this first:
- it addresses a real user-facing failure,
- it exposes whether the current CRUD model is fundamentally incomplete,
- it gives a concrete anchor for later actor CRUD cleanup,
- it reduces ambiguity around “open registration broadly”.

## Proposed Batch 1 scope
- introduce explicit activity-scope semantic for all-students/global-open,
- update validation/payload handling,
- update teacher create/edit UI to expose the choice clearly,
- update student visibility route logic,
- update detail/register semantics,
- add focused regression proving approved global-open activities are visible to unrelated eligible students.

## Follow-up batches after Batch 1
### Batch 2
- admin/teacher/student CRUD wording and filter cleanup around workflow/review/visibility.

### Batch 3
- admin intervention model for attendance/scoring with reason + audit semantics.

### Batch 4
- overdue/not-held/archive operational model.

### Batch 5
- actor-wide filter/pagination/realtime/performance standardization.
