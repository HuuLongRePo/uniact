# TEACHER ACTIVITY SCOPE AND UX NEXT BATCHES

Status: follow-up after visibility + time-clear groundwork batch

## Batch A - Deadline control redesign with business-rule decision
### Goal
Replace raw registration deadline editing with a guided control.

### Requested UX
- preset dropdown: 5 phút, 10 phút, 15 phút, 30 phút, 1 giờ, 2 giờ, 1 ngày, 2 ngày, 3 ngày, 7 ngày
- custom numeric inputs: ngày / giờ / phút
- keep submit payload as concrete `registration_deadline`

### Current blocker / decision needed
Current backend validation requires registration deadline to be at least **24 hours before** activity start.
That means presets like 5 or 10 minutes conflict with existing business rules.

### Decision options
1. Keep 24h minimum, and only allow presets >= 1 ngày.
2. Lower the rule for some activity types / draft flows.
3. Support 5-10-15-30 phút only for same-day internal/teacher-managed activities.

### Recommended next step
- Decide canonical deadline rule first.
- Then implement one shared deadline-offset helper across create/edit/dialog surfaces.

## Batch B - Title input lag investigation and render isolation
### Symptoms to investigate
- typing in `Tên hoạt động` feels slow or laggy on teacher create/edit surfaces.

### Likely suspects
- broad component rerenders from large form state trees,
- preview panel and class selection lists living in same render scope,
- unstable derived dependencies causing effects to retrigger,
- expensive DOM updates when preview is open.

### Recommended implementation path
1. Profile create/edit forms with preview closed vs open.
2. Extract time/location/basic-info inputs into memoized subcomponents.
3. Isolate preview tree from title input state.
4. Debounce preview fetch triggers and memoize derived arrays.

## Batch C - Mixed scope selection model
### Target behavior
Teacher can:
- see all classes,
- choose mandatory classes,
- choose voluntary classes,
- choose mandatory students directly,
- choose allowed-registration students directly,
- bulk select all visible/eligible students,
- keep access to already-registered students even outside original teacher-owned scope.

### Needed work
- canonical payload model for mixed class + student selection,
- participation preview update to explain scope source,
- create/edit parity,
- route updates for students/classes lookup and persistence.

### Recommended payload direction
- `mandatory_class_ids`
- `voluntary_class_ids`
- `mandatory_student_ids`
- `voluntary_student_ids`
- `apply_to_all_eligible_students`

## Batch D - Bulk checkbox and preview semantics
### Goal
Add explicit bulk checkbox behaviors such as:
- chọn toàn bộ học viên đủ điều kiện,
- chọn toàn bộ học viên của các lớp tự nguyện đã chọn,
- chọn toàn bộ học viên bắt buộc của các lớp bắt buộc đã chọn.

### Notes
Needs careful UI wording so users understand why a student is:
- bắt buộc,
- được phép đăng ký,
- đã đăng ký sẵn,
- được chọn trực tiếp.
