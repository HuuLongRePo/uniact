# 🚀 DEVELOPMENT ROADMAP v3.0 - UniACT
**Ngày tạo:** 18/03/2026  
**Mục tiêu:** Phát triển tính năng + Đảm bảo ổn định cho các luồng chính hệ thống  
**Phạm vi:** Toàn bộ quy trình từ tạo dữ liệu → Điểm danh → Tính điểm

---

## 📊 Tổng quan các luồng chính của hệ thống

### **Luồng 1: Tạo & Phê Duyệt Hoạt động (CREATE-APPROVAL FLOW)**
```
Teacher tạo → Admin duyệt → Published → Sinh viên đăng ký → Hoàn thành

Entities: activities, activity_approvals, activity_classes
API Endpoints: POST/GET/PUT /api/activities, POST /api/activities/[id]/approve
```

### **Luồng 2: Đăng Ký Hoạt động (REGISTRATION FLOW)**
```
Sinh viên xem → Kiểm tra điều kiện → Đăng ký → Ghi nhận participation

Entities: participations, activity_classes (filter)
API Endpoints: GET /api/activities, POST /api/activities/[id]/register
```

### **Luồng 3: Điểm Danh QR (ATTENDANCE FLOW)**
```
Teacher tạo QR → Sinh viên scan → Ghi nhận attendance → Tính điểm

Entities: qr_sessions, attendance_records
API Endpoints: POST /api/qr-sessions, POST /api/attendance/validate, GET /api/attendance
```

### **Luồng 4: Tính Điểm & Phát Thưởng (SCORING FLOW)**
```
Teacher đánh giá → Tính điểm từ hoạt động → Gợi ý bonus → Duyệt bonus → Cập nhật profile

Entities: participation_scores, bonus_points, activity_approvals, student_scores
API Endpoints: POST /api/scores, GET /api/bonus, POST /api/bonus/[id]/approve
```

---

## 🎯 PHÂN TÍCH CHI TIẾT CÁC LUỒNG & EDGE CASES

## ═══════════════════════════════════════════════════════════════

### **LUỒNG 1: TẠO & PHÊ DUYỆT HOẠT ĐỘNG**

#### **1.1 Happy Path (Trường hợp bình thường)**

```mermaid
Teacher: "Tạo hoạt động"
  |
  v
[POST /api/activities]
  ├─ Validate: title, date_time, location, max_participants
  ├─ Check conflicts: location overlap
  ├─ Create in DB: status='draft', approval_status='draft'
  ├─ Assign classes: INSERT activity_classes
  └─ Response: 201 Created

         ↓ (Teacher click "Gửi duyệt")

[POST /api/activities/{id}/submit-approval]
  ├─ Validate: activity is draft or rejected
  ├─ Update: approval_status='requested' (status stays 'draft')
  ├─ Create audit log
  └─ Send notification to Admin

         ↓ (Admin review)

[POST /api/activities/{id}/approve]
  ├─ Validate admin permission
  ├─ Check: approval_status='requested'
  ├─ Update: status='published', approval_status='approved'
  ├─ Create audit log
  ├─ Invalidate cache
  └─ Send notification to Teacher & Students (nếu có class filter)
```

#### **1.2 Edge Cases & Handling**

| # | Scenario | Trigger | Expected Behavior | Status |
|---|----------|---------|-------------------|--------|
| **1.2.1** | Location conflict | Create/Update with overlapping time+location | Return 400 with conflict list; warning UI | ⚠️ VERIFY |
| **1.2.2** | Teacher schedule warning | Activity within ±2hrs of another | Return warning in response; UI shows tooltip | ⚠️ VERIFY |
| **1.2.3** | Max participants < Current | Teacher edits max down | Return 400: "Cannot reduce below current registrations" | ⚠️ VERIFY |
| **1.2.4** | Delete draft with no one | Activity status='draft' & no participations | Allow delete; no audit needed | ⚠️ VERIFY |
| **1.2.5** | Delete draft with people | Activity status='draft' & has participations | Deny 400: "Cannot delete, has participants" | ⚠️ VERIFY |
| **1.2.6** | Reject then re-submit | Teacher rejects activity & modifies | Allow new submission; create new approval record | ⚠️ NEED IMPL |
| **1.2.7** | Deadline too short | registration_deadline < 24h before activity | Return 400: "Deadline must be ≥24h before event" | ⚠️ NEED IMPL |
| **1.2.8** | Multi-class assignment | Assign activity to 3 classes | Check: classes exist, not duplicate entries | ⚠️ VERIFY |
| **1.2.9** | Updated activity past deadline | Published activity, deadline passed, teacher edits | Deny unless admin override | ⚠️ NEED IMPL |
| **1.2.10** | Timezone ambiguity | date_time stored in different format | Standardize to ISO 8601 UTC | ⚠️ VERIFY |

#### **1.3 Implementation Checklist - LUỒNG 1**

- [ ] **1.3.1 - API Contract Standardization**
  - Endpoint: `POST /api/activities`
  - Request schema validation (Zod/joi)
  - Response format: `{ success, data: { id, status, approval_status }, message }`
  
- [ ] **1.3.2 - Conflict Detection Enhancement**
  - Implement real-time check on location+date_time
  - Return conflict list with overlap minutes
  - Unit test: 5+ overlap scenarios
  
- [ ] **1.3.3 - Approval Workflow**
  - Implement state machine: draft -> requested -> published/rejected
  - Log every transition in audit_logs
  - Send notification after approval_status change
  
- [ ] **1.3.4 - Deadline Validation**
  - Add constraint: registration_deadline ≥ activity start - 24h
  - Return 400 with clear message if violated
  
- [ ] **1.3.5 - Database Integrity Checks**
  - Ensure foreign keys on activity_classes (activity_id, class_id)
  - Add index on (status, approval_status) for filtering
  - Verify: no orphan activity_classes after delete
  
- [ ] **1.3.6 - Error Messages Localization**
  - All error responses in Vietnamese
  - Test: 10+ error scenarios with clear messages

---

### **LUỒNG 2: ĐĂNG KÝ HOẠT ĐỘNG (REGISTRATION)**

#### **2.1 Happy Path**

```mermaid
Student: "Xem danh sách hoạt động"
  |
  v
[GET /api/activities?role=student&class_id=K66CNTT1]
  ├─ Filter: status='published' AND date_time > NOW()
  ├─ Filter: (NO class_assignment OR class IN student_classes)
  ├─ Exclude: activities student already registered
  ├─ Return: [activity, activity, ...]
  └─ Calculate: available_slots, is_registered, deadline status

         ↓ (Student click "Đăng ký")

[POST /api/activities/{id}/register]
  ├─ Validate: student exists, activity published
  ├─ Check: NOW() < registration_deadline
  ├─ Check: existing registrations < max_participants
  ├─ Check: student not already registered
  ├─ INSERT participation: status='registered'
  ├─ Update activity.participant_count
  ├─ Create audit log
  └─ Return: 201 Created

         ↓ (Student can unregister before deadline)

[DELETE /api/activities/{id}/register]
  ├─ Check: activity not started
  ├─ DELETE participation
  ├─ Update participant_count
  └─ Return: 200 OK
```

#### **2.2 Edge Cases & Handling**

| # | Scenario | Trigger | Expected Behavior | Status |
|---|----------|---------|-------------------|--------|
| **2.2.1** | Class mismatch | Student not in assigned class | Return 403: "You are not eligible for this activity" | ⚠️ VERIFY |
| **2.2.2** | Deadline passed | Student tries to register after deadline | Return 400: "Registration deadline passed" | ⚠️ VERIFY |
| **2.2.3** | Slot full | All max_participants filled | Return 400: "Activity is full" | ⚠️ VERIFY |
| **2.2.4** | Duplicate registration | Student already registered | Return 400: "Already registered for this activity" | ⚠️ VERIFY |
| **2.2.5** | Activity cancelled | Teacher cancels published activity | Delete participations & notify students | ⚠️ NEED IMPL |
| **2.2.6** | Activity moved past start | Teacher edits date_time to past | Deny 400: "Cannot register for past activities" | ⚠️ NEED IMPL |
| **2.2.7** | Concurrent registrations | 2 students register simultaneously when only 1 slot left | Last request gets 400: "Slot full" (race guard via transaction) | ⚠️ VERIFY |
| **2.2.8** | No class assignment filter | Activity has no class assigned | All students see it | ⚠️ VERIFY |
| **2.2.9** | Unregister after started | Activity already in progress | Deny 400: "Cannot unregister after activity started" | ⚠️ VERIFY |
| **2.2.10** | Student disabled/transferred | Student's status changes after registration | Prevent attendance/scoring; allow unregister | ⚠️ NEED IMPL |

#### **2.3 Implementation Checklist - LUỒNG 2**

- [ ] **2.3.1 - Activity List API (Students)**
  - Endpoint: `GET /api/activities?role=student`
  - Filter logic: class assignment validation
  - Return: [activities with is_registered, available_slots, deadline_status]
  - Test: 8+ filter combinations
  
- [ ] **2.3.2 - Registration Endpoint**
  - Endpoint: `POST /api/activities/{id}/register`
  - Transactional: check availability, then insert
  - Race condition test: concurrent registration at capacity limit
  
- [ ] **2.3.3 - Unregistration Endpoint**
  - Endpoint: `DELETE /api/activities/{id}/register`
  - Check: activity not started (date_time > NOW)
  - Revert: participation_count decrement
  
- [ ] **2.3.4 - Eligibility Validation**
  - Class filter implementation
  - Status validation (student is_active, not transferred)
  - Test: enabled student, disabled student, transferred student
  
- [ ] **2.3.5 - Deadline Enforcement**
  - Store registration_deadline with activity
  - Validate on register/unregister
  - UI shows remaining time to deadline
  
- [ ] **2.3.6 - Conflict with Attendance**
  - Prevent unregister after attendance recorded
  - Test: unregister before attend (OK), after attend (403)

---

### **LUỒNG 3: ĐIỂM DANH QR (ATTENDANCE)**

#### **3.1 Happy Path**

```mermaid
Teacher: "Bắt đầu hoạt động"
  |
  v
[POST /api/qr-sessions]
  ├─ Create QR session: session_token, expires_at
  ├─ Metadata: single_use, max_scans
  ├─ Generate QR code for display
  └─ Return: { session_token, qr_data_url }

         ↓ (Students scan QR during activity)

[POST /api/attendance/validate]
  ├─ Get session by token
  ├─ Check: session.expires_at > NOW()
  ├─ Check: max_scans not exceeded (if limited)
  ├─ Check: student has participation record
  ├─ Check: single_use → ensure one record per student
  ├─ INSERT attendance_record: status='present'
  ├─ Calculate points: based on attendance formula
  └─ Return: 200 OK with points

         ↓ (Teacher finalize)

[PUT /api/activities/{id}/finalize]
  ├─ Update: status='completed'
  ├─ Calculate total bonus points
  ├─ Create suggested_bonus_points records
  └─ Return: summary
```

#### **3.2 Edge Cases & Handling**

| # | Scenario | Trigger | Expected Behavior | Status |
|---|----------|---------|-------------------|--------|
| **3.2.1** | QR expired | Student scans after session.expires_at | Return 400: "QR code has expired" | ✅ PASS |
| **3.2.2** | Malformed metadata JSON | Seeded with `{invalid-json` | Parse failure caught; use default `{single_use: false, max_scans: null}` | ✅ PASS |
| **3.2.3** | Max scans exceeded | Metadata has max_scans: 5, scanned 6x | Return 400: "Max scans limit exceeded" | ⚠️ VERIFY |
| **3.2.4** | Duplicate attendance | Single-use QR, student scans twice | First scan: 200 OK; Second: 400 "Already recorded" + deactivate | ⚠️ VERIFY |
| **3.2.5** | Student not registered | Scan QR but no participation record | Return 403: "Not registered for this activity" | ⚠️ VERIFY |
| **3.2.6** | No participation record | Activity exists but no participations | QR works; store orphan attendance (for late registration?) | ⚠️ CLARIFY |
| **3.2.7** | Concurrent QR scans | 2 students scan single-use QR simultaneously | First succeeds, second gets deactivated error | ⚠️ NEED RACE TEST |
| **3.2.8** | QR after activity ended | Activity completed, session still valid | Allow attendance but flag as "late" or "makeup" | ⚠️ NEED IMPL |
| **3.2.9** | Lost QR session | Teacher didn't create QR, students try scan | Return 400: "Invalid QR token" | ⚠️ VERIFY |
| **3.2.10** | Metadata parsing failure + race | Malformed JSON + concurrent scans | Catch exception, use fallback, handle race | ✅ PASS |

#### **3.3 Implementation Checklist - LUỒNG 3**

- [ ] **3.3.1 - QR Session Creation**
  - Endpoint: `POST /api/qr-sessions`
  - Generate unique session_token (non-guessable)
  - Store metadata as JSON with safe parsing
  - Return: QR code (format: data URL or quick.response lib)
  
- [ ] **3.3.2 - QR Validation Endpoint**
  - Endpoint: `POST /api/attendance/validate`
  - Validate token existence, expiry, max_scans
  - Ensure single_use enforcement via transaction
  - Race condition test: concurrent validates on single-use QR
  
- [ ] **3.3.3 - Attendance Record Creation**
  - Create attendance_records table: qr_session_id, student_id, status, time
  - Calculate points based on status (present/late/absent)
  - Test: 5 attendance statuses
  
- [ ] **3.3.4 - Metadata Parsing Safety**
  - Wrap JSON.parse in try/catch
  - Default fallback: `{ single_use: false, max_scans: null }`
  - Log parse failures for debugging
  
- [ ] **3.3.5 - Deactivation Logic**
  - Single-use QR auto-deactivates after first scan (is_active = 0)
  - Test: second scan returns error + confirms deactivation
  
- [ ] **3.3.6 - Integration with Participation**
  - Require: student has participation record
  - Handle: orphan attendance (student not registered but scanned)
  - Option: Allow with warning, or return 403

---

### **LUỒNG 4: TÍNH ĐIỂM & PHÁ THƯỞNG (SCORING)**

#### **4.1 Happy Path**

```mermaid
Teacher: "Hoàn thành hoạt động"
  |
  v
[PUT /api/activities/{id}/finalize]
  ├─ Validate: activity status='published'
  ├─ Get all attendance records for activity
  ├─ Calculate points per student:
  │  ├─ Base points from activity.points
  │  ├─ Attendance status multiplier (present: 1x, late: 0.8x, absent: 0x)
  │  └─ Teacher bonus adjustment
  ├─ INSERT into participation_scores
  ├─ Create suggested_bonus_points (if rules match)
  ├─ Update: activity.status='completed'
  └─ Return: { total_points, affected_students }

         ↓ (Students check updated scores)

[GET /api/student/scores]
  ├─ GROUP BY activity_id
  ├─ SUM: points, bonus_points
  ├─ Return: [{ activity, points, bonus, total_score }, ...]
  └─ Dashboard shows updated total

         ↓ (Admin review bonus suggestions)

[GET /api/admin/bonus/pending]
  ├─ Filter: status='pending'
  ├─ Show: student_id, suggested_by, source_provenance, amount
  └─ Return: list for batch approval

         ↓ (Admin approve/reject)

[POST /api/bonus/{id}/approve]
  ├─ Check: status='pending' (race guard: WHERE status='pending')
  ├─ Update: status='approved', approver_id, approved_at
  ├─ Add to student_scores.bonus_points
  ├─ Create audit log
  └─ Return: 200 OK
        OR
  
[POST /api/bonus/{id}/reject]
  ├─ Update: status='rejected', reason
  ├─ Create audit log
  └─ Return: 200 OK
```

#### **4.2 Edge Cases & Handling**

| # | Scenario | Trigger | Expected Behavior | Status |
|---|----------|---------|-------------------|--------|
| **4.2.1** | Activity finalized twice | Teacher clicks "Hoàn thành" twice | Check idempotency: return existing scores, don't duplicate | ⚠️ VERIFY |
| **4.2.2** | No attendance records | Activity published but no one scanned QR | Create 0-point records for all participants | ⚠️ VERIFY |
| **4.2.3** | Partial attendance | Some students present, some absent | Calculate separate point values per student | ⚠️ VERIFY |
| **4.2.4** | Teacher retroactive points | After finalize, teacher adds manual bonus | Allow edit via separate endpoint; audit log change | ⚠️ NEED IMPL |
| **4.2.5** | Bonus double-approval | Two approval requests for same bonus_id | First: 200 (status='pending'→'approved'); Second: 400 (status≠'pending') | ✅ PASS |
| **4.2.6** | Bonus reject then re-request | Bonus rejected, teacher proposes again | Create new entry or reopen old one? (needs clarification) | ⚠️ CLARIFY |
| **4.2.7** | Bonus amount manipulation | Admin edits bonus amount after pending | Deny 400: "Can only approve/reject, not edit amount" OR allow with reason | ⚠️ CLARIFY |
| **4.2.8** | Rules engine duplicate | Concurrent finalize + rules trigger = duplicate suggestions | Prevent via unique constraint (activity_id, student_id, source_rule_id) | ⚠️ NEED TEST |
| **4.2.9** | Negative points | Teacher sets points as negative | Validate: points ≥ 0 | ⚠️ NEED IMPL |
| **4.2.10** | Score overflow | Student accumulates > 999,999 points | No limit, or cap at some value? | ⚠️ CLARIFY |

#### **4.3 Implementation Checklist - LUỒNG 4**

- [ ] **4.3.1 - Activity Finalization Endpoint**
  - Endpoint: `PUT /api/activities/{id}/finalize`
  - Idempotency check: return existing scores if already finalized
  - Calculate points per participant based on attendance status
  
- [ ] **4.3.2 - Point Calculation Service**
  - Formula: `base_points * attendance_multiplier + teacher_bonus`
  - Multipliers: present=1.0, late=0.8, absent=0, excused=0.5
  - Test: 10+ calculation scenarios
  
- [ ] **4.3.3 - Suggested Bonus Points Generation**
  - Evaluate rules engine after finalize
  - Create suggested_bonus_points records (source='rule')
  - Prevent duplicates via unique index on (activity_id, student_id, rule_id)
  
- [ ] **4.3.4 - Bonus Approval Endpoint**
  - Endpoint: `POST /api/bonus/{id}/approve`
  - Race guard: `WHERE status='pending'` condition
  - Update student_scores.bonus_points only on success
  - Test: double-approve scenario (first 200, second 400)
  
- [ ] **4.3.5 - Bonus Rejection Endpoint**
  - Endpoint: `POST /api/bonus/{id}/reject`
  - Store rejection_reason
  - Prevent re-reviewing
  
- [ ] **4.3.6 - Student Score API**
  - Endpoint: `GET /api/student/scores`
  - Return: total_points, activity breakdown, bonus history
  - Include: source of each bonus (teacher, rule, manual)
  
- [ ] **4.3.7 - Participation Score Integration**
  - Create participation_scores table: activity_id, student_id, points, formula
  - Store formula for audit trail
  - Test: multiple activities, point accumulation

---

## 📋 CROSS-CUTTING CONCERNS (Áp dụng cho tất cả luồng)

### **A. Database Integrity & Migration**

- [ ] **A.1** All tables have proper indexes on foreign keys
- [ ] **A.2** Migrations for any schema changes are prepared
- [ ] **A.3** Unique constraints prevent data duplication:
  - `(activity_id, student_id)` in participations
  - `(activity_id, student_id, rule_id)` in suggested_bonus_points
  - `(user_id, activity_id)` in attendance_records (single per QR session)
- [ ] **A.4** Cascade deletes properly defined
- [ ] **A.5** Transaction handling for concurrent operations (registration, attendance, approval)

### **B. Error Handling & Validation**

- [ ] **B.1** All endpoints return standard error format:
  ```json
  { "success": false, "error": "...", "code": "ERROR_CODE", "details": {...} }
  ```
- [ ] **B.2** Input validation using Zod/joi schema
- [ ] **B.3** Authorization checks (role-based) on all protected endpoints
- [ ] **B.4** Business logic validation (deadline, capacity, status transitions)
- [ ] **B.5** Informative error messages in Vietnamese

### **C. Audit Logging & Traceability**

- [ ] **C.1** Every state change logged (CREATE, APPROVE, FINALIZE, SCORE, BONUS)
- [ ] **C.2** Audit logs include: user_id, action, old_value, new_value, timestamp, reason
- [ ] **C.3** Immutable audit trail (no deletes, only appends)
- [ ] **C.4** Query audit logs for debugging race conditions

### **D. Notification System**

- [ ] **D.1** Notification types: activity_approved, bonus_pending, activity_canceled
- [ ] **D.2** Notification store (in-app) + Email/SMS (optional)
- [ ] **D.3** Recipient determination:
  - Activity approved → Teacher + affected students (class filter)
  - Bonus approved → Student
  - Activity canceled → All participants

### **E. Testing Strategy**

- [ ] **E.1** Unit tests for all business logic functions
- [ ] **E.2** Integration tests for API endpoints
- [ ] **E.3** Race condition tests (concurrent registration, approval, attendance)
- [ ] **E.4** Edge case tests per scenario (all 50+ cases above)
- [ ] **E.5** Database cleanup between tests (transactions rolled back)

### **F. Performance & Caching**

- [ ] **F.1** Cache invalidation on state changes (Redis or in-memory)
- [ ] **F.2** Pagination for list endpoints (page, pageSize, total)
- [ ] **F.3** Query optimization: indexes on filter columns
- [ ] **F.4** N+1 query prevention (use joins, not multiple queries)

### **G. Documentation**

- [ ] **G.1** API documentation (OpenAPI/Swagger)
- [ ] **G.2** Database schema diagram (ERD)
- [ ] **G.3** Business logic decision tree per scenario
- [ ] **G.4** Error code reference

---

## 🗂️ TASK BREAKDOWN (Chia công việc)

### **PHASE 1: Core Luồng 1 + 2 (Tạo & Đăng ký)**
**Duration:** 2-3 sprints | **Priority:** ⭐⭐⭐ CRITICAL

#### **Sprint 1.1: Activity Creation & Approval**
```
Task 1.1.1: API Contract & Validation
  Subtasks:
    - [ ] Define Zod schema for POST /api/activities
    - [ ] Implement input validation
    - [ ] Standardize response format
    - [ ] Write 5+ validation unit tests
  Assigned: Backend Developer
  Est: 2-3 days
  
Task 1.1.2: Conflict Detection System
  Subtasks:
    - [ ] Implement location overlap algorithm
    - [ ] Create POST /api/activities/check-conflicts endpoint
    - [ ] Unit test: 5 overlap scenarios
    - [ ] Integrate with ActivityDialog UI (debounced)
  Assigned: Backend + Frontend Developer
  Est: 3-4 days
  
Task 1.1.3: Approval Workflow
  Subtasks:
    - [ ] Implement state machine (draft -> requested -> published/rejected)
    - [ ] Create activity_approvals table records
    - [ ] Audit logging for transitions
    - [ ] Email/notification on approval status change
  Assigned: Backend Developer
  Est: 3 days
  
Task 1.1.4: Class Assignment
  Subtasks:
    - [ ] Implement activity_classes insertion
    - [ ] Handle multi-class assignment
    - [ ] Validate class existence
    - [ ] Test: 3+ class combinations
  Assigned: Backend Developer
  Est: 2 days
  
Task 1.1.5: Error Messages & Localization
  Subtasks:
    - [ ] Translate all error messages to Vietnamese
    - [ ] Create error code reference (e.g., CONFLICT_LOCATION, INVALID_DEADLINE)
    - [ ] Test: 10+ error scenarios
  Assigned: QA + Backend
  Est: 1-2 days
```

#### **Sprint 1.2: Registration Flow**
```
Task 1.2.1: Student Activity Listing
  Subtasks:
    - [ ] Implement GET /api/activities?role=student filter
    - [ ] Class-based filtering logic
    - [ ] Exclude already-registered activities
    - [ ] Calculate is_registered, available_slots
    - [ ] Test: 8+ filter combinations
  Assigned: Backend Developer
  Est: 3 days
  
Task 1.2.2: Registration Endpoint
  Subtasks:
    - [ ] Implement POST /api/activities/{id}/register
    - [ ] Transactional: check + insert
    - [ ] Race condition test (concurrent at capacity limit)
    - [ ] Atomic participant_count update
  Assigned: Backend Developer
  Est: 3 days
  
Task 1.2.3: Unregistration Endpoint
  Subtasks:
    - [ ] Implement DELETE /api/activities/{id}/register
    - [ ] Check: activity not started
    - [ ] Decrement participant_count
    - [ ] Prevent unregister after attendance
  Assigned: Backend Developer
  Est: 2 days
  
Task 1.2.4: Deadline Enforcement
  Subtasks:
    - [ ] Add registration_deadline to activities
    - [ ] Validate on register/unregister
    - [ ] UI shows countdown timer
    - [ ] Test: deadline passed scenario
  Assigned: Backend + Frontend
  Est: 2-3 days
  
Task 1.2.5: Eligibility Validation
  Subtasks:
    - [ ] Class filter implementation
    - [ ] Check: student is_active
    - [ ] Handle: transferred students
    - [ ] Test: 3 student statuses
  Assigned: Backend Developer
  Est: 2 days
```

---

### **PHASE 2: Core Luồng 3 + 4 (Điểm danh & Tính điểm)**
**Duration:** 3-4 sprints | **Priority:** ⭐⭐⭐ CRITICAL

#### **Sprint 2.1: QR attendance System**
```
Task 2.1.1: QR Session Creation & Management
  Subtasks:
    - [ ] Implement POST /api/qr-sessions
    - [ ] Generate unique non-guessable tokens
    - [ ] Store metadata (single_use, max_scans) as JSON
    - [ ] Generate QR code (format: data URL)
    - [ ] Test: token uniqueness, QR validity
  Assigned: Backend Developer
  Est: 3-4 days
  
Task 2.1.2: QR Validation & Attendance Recording
  Subtasks:
    - [ ] Implement POST /api/attendance/validate
    - [ ] Check: token exists, not expired, max_scans not exceeded
    - [ ] Single-use enforcement via transaction
    - [ ] Auto-deactivate after single scan
    - [ ] Create attendance_records
    - [ ] Race condition test: concurrent validates on single-use QR
  Assigned: Backend Developer
  Est: 4 days
  
Task 2.1.3: Metadata Parsing Safety
  Subtasks:
    - [ ] Wrap JSON.parse in try/catch
    - [ ] Default fallback: {single_use: false, max_scans: null}
    - [ ] Log parse failures
    - [ ] Test: malformed JSON + race condition
  Assigned: Backend Developer
  Est: 1 day
  
Task 2.1.4: Attendance Records Table & Queries
  Subtasks:
    - [ ] Create attendance_records table schema
    - [ ] Index on (qr_session_id, student_id) for uniqueness
    - [ ] Query: get attendance by activity, by student
    - [ ] Test: query performance with 10k+ records
  Assigned: Backend Developer
  Est: 2 days
  
Task 2.1.5: Teacher QR Dashboard UI
  Subtasks:
    - [ ] Display QR code during activity
    - [ ] Show real-time attendance count
    - [ ] Mark manual attendance (if QR fails)
    - [ ] Export attendance list
  Assigned: Frontend Developer
  Est: 3 days
```

#### **Sprint 2.2: Scoring & Point Calculation**
```
Task 2.2.1: Activity Finalization
  Subtasks:
    - [ ] Implement PUT /api/activities/{id}/finalize
    - [ ] Idempotency check: return existing if already finalized
    - [ ] Fetch all attendance records
    - [ ] Calculate points per student
    - [ ] Insert into participation_scores
    - [ ] Test: 5+ finalization scenarios
  Assigned: Backend Developer
  Est: 3 days
  
Task 2.2.2: Point Calculation Service
  Subtasks:
    - [ ] Formula: base_points * attendance_multiplier + teacher_bonus
    - [ ] Multipliers: present=1.0, late=0.8, absent=0, excused=0.5
    - [ ] Unit tests: 10+ scenarios
    - [ ] Edge cases: negative points, overflow
  Assigned: Backend Developer
  Est: 2-3 days
  
Task 2.2.3: Participation Scores Table
  Subtasks:
    - [ ] Schema: activity_id, student_id, points, formula, calculated_at
    - [ ] Index on (student_id, activity_id) for querying
    - [ ] Immutable records (no updates, only inserts)
    - [ ] Audit trail: store formula for transparency
  Assigned: Backend Developer
  Est: 2 days
  
Task 2.2.4: Student Score API
  Subtasks:
    - [ ] Implement GET /api/student/scores
    - [ ] Return: total_points, activity breakdown
    - [ ] Include: source of bonus (teacher, rule, manual)
    - [ ] Pagination for many activities
    - [ ] Test: 5+ access patterns
  Assigned: Backend Developer
  Est: 2-3 days
  
Task 2.2.5: Score Display UI
  Subtasks:
    - [ ] Show activity points breakdown
    - [ ] Display point source with tooltip
    - [ ] Real-time update after finalization
    - [ ] Charts: points over time
  Assigned: Frontend Developer
  Est: 3 days
```

#### **Sprint 2.3: Bonus System**
```
Task 2.3.1: Suggested Bonus Points Generation
  Subtasks:
    - [ ] Evaluate rules engine after finalize
    - [ ] Create suggested_bonus_points records
    - [ ] source_provenance = 'rule' vs manual
    - [ ] Prevent duplicates: unique (activity_id, student_id, rule_id)
    - [ ] Test: rules triggering on finalize
  Assigned: Backend Developer
  Est: 3 days
  
Task 2.3.2: Bonus Approval Workflow
  Subtasks:
    - [ ] Implement POST /api/bonus/{id}/approve
    - [ ] Race guard: WHERE status='pending' condition
    - [ ] Update: status='approved', approver_id, approved_at
    - [ ] Transactional: prevent double-approval
    - [ ] Dog-leg test: double-approve gets 400
  Assigned: Backend Developer
  Est: 3 days
  
Task 2.3.3: Bonus Rejection Endpoint
  Subtasks:
    - [ ] Implement POST /api/bonus/{id}/reject
    - [ ] Store rejection_reason
    - [ ] Immutable once rejected
    - [ ] Can teacher request new bonus after rejection? (clarify)
  Assigned: Backend Developer
  Est: 1-2 days
  
Task 2.3.4: Admin Bonus Dashboard
  Subtasks:
    - [ ] GET /api/admin/bonus/pending - list pending bonuses
    - [ ] Batch approval/rejection UI
    - [ ] Show: student, source, amount, proposed_by, reason
    - [ ] Audit log display
  Assigned: Frontend Developer
  Est: 3 days
  
Task 2.3.5: Bonus Integration with Student Scores
  Subtasks:
    - [ ] On approval, add to student_scores.bonus_points
    - [ ] Update total score = activity_points + bonus_points
    - [ ] Test: total score composition
  Assigned: Backend Developer
  Est: 1-2 days
```

---

### **PHASE 3: Cross-Cutting & Infrastructure**
**Duration:** 2-3 sprints | **Priority:** ⭐⭐ HIGH

#### **Sprint 3.1: Database & Transactions**
```
Task 3.1.1: Schema Review & Migration Preparation
  Subtasks:
    - [ ] Review all table indexes (foreign keys, filters)
    - [ ] Prepare migrations for any new columns
    - [ ] Ensure unique constraints on critical fields
    - [ ] Test: migration rollback/rollforward
  Assigned: Backend Developer + DBA
  Est: 2-3 days
  
Task 3.1.2: Transaction Handling for Concurrency
  Subtasks:
    - [ ] Implement transaction wrapping for registration
    - [ ] Implement transaction wrapping for approval
    - [ ] Implement transaction wrapping for attendance
    - [ ] Test: deadlock scenarios, rollback handling
  Assigned: Backend Developer
  Est: 3 days
  
Task 3.1.3: Race Condition Tests
  Subtasks:
    - [ ] Test: concurrent registration when only 1 slot left
    - [ ] Test: concurrent approval of same bonus
    - [ ] Test: concurrent QR scans on single-use session
    - [ ] Load test with 100 concurrent users
  Assigned: QA Engineer
  Est: 3-4 days
```

#### **Sprint 3.2: Error Handling & Validation**
```
Task 3.2.1: Standard Error Response Format
  Subtasks:
    - [ ] Define format: {success, error, code, details}
    - [ ] Implement across all endpoints
    - [ ] Create error code enum (150+ codes)
    - [ ] Test: error response consistency
  Assigned: Backend Developer
  Est: 2-3 days
  
Task 3.2.2: Input Validation with Zod
  Subtasks:
    - [ ] Create schemas for all request payloads
    - [ ] Implement request validation middleware
    - [ ] Test: 20+ validation scenarios
  Assigned: Backend Developer
  Est: 2-3 days
  
Task 3.2.3: Business Logic Validation
  Subtasks:
    - [ ] Deadline >= 24h before activity
    - [ ] Max participants > current registrations
    - [ ] Status transition rules (draft -> requested -> published)
    - [ ] Authorization checks (role-based)
  Assigned: Backend Developer
  Est: 2-3 days
  
Task 3.2.4: Vietnamese Error Messages
  Subtasks:
    - [ ] Translate all 150+ error codes
    - [ ] Context-specific messages
    - [ ] Test: 10+ error scenarios
  Assigned: Backend + Vietnamese Translator
  Est: 2 days
```

#### **Sprint 3.3: Audit Logging & Notifications**
```
Task 3.3.1: Audit Log System
  Subtasks:
    - [ ] Create audit_logs table: user_id, action, entity_type, entity_id, old_value, new_value, timestamp
    - [ ] Log every state change (APPROVE, FINALIZE, SCORE, etc.)
    - [ ] Immutable storage (no deletes)
    - [ ] Query endpoints for debugging
  Assigned: Backend Developer
  Est: 3 days
  
Task 3.3.2: Notification System
  Subtasks:
    - [ ] Define notification types (activity_approved, bonus_pending, etc.)
    - [ ] Store in-app notifications (with read/unread status)
    - [ ] Email notifications (optional)
    - [ ] Recipient determination logic
  Assigned: Backend Developer
  Est: 3-4 days
  
Task 3.3.3: Notification UI
  Subtasks:
    - [ ] Notification center (bell icon)
    - [ ] Mark as read/unread
    - [ ] Filter by type
    - [ ] Delete notifications
  Assigned: Frontend Developer
  Est: 2-3 days
```

#### **Sprint 3.4: Documentation & Integration Tests**
```
Task 3.4.1: API Documentation
  Subtasks:
    - [ ] OpenAPI/Swagger spec for all endpoints
    - [ ] Request/response examples
    - [ ] Error code reference
    - [ ] Authentication & authorization guide
  Assigned: Technical Writer + Backend
  Est: 3 days
  
Task 3.4.2: Integration Tests
  Subtasks:
    - [ ] End-to-end test: create activity → approve → register → attend → score
    - [ ] Multi-user test scenarios
    - [ ] Error path testing
    - [ ] Coverage: 80%+ code coverage
  Assigned: QA Engineer
  Est: 4-5 days
  
Task 3.4.3: Business Logic Decision Trees
  Subtasks:
    - [ ] Flowchart for each scenario (6 main + 50 edge cases)
    - [ ] State machine diagrams
    - [ ] Validation rules summary
  Assigned: Business Analyst + Developer
  Est: 2-3 days
```

---

## 📊 TIMELINE & RESOURCE ALLOCATION

### **Project Timeline**

```
Phase 1 (Luồng 1-2): Weeks 1-3
├─ Week 1: Activity creation, approval workflow
├─ Week 2: Conflict detection, class assignment
├─ Week 3: Registration flow, deadline enforcement
└─ Validation: 34+ smoke tests pass

Phase 2 (Luồng 3-4): Weeks 4-7
├─ Week 4: QR session, attendance recording
├─ Week 5: Metadata safety, race condition tests
├─ Week 6-7: Scoring, bonus workflow
└─ Validation: All 50+ edge cases tested

Phase 3 (Infrastructure): Weeks 8-9
├─ Week 8: Database optimization, transactions
├─ Week 9: Audit logging, notifications, docs
└─ Validation: Integration tests pass, API docs complete

Stabilization & UAT: Weeks 10-12
└─ Load testing, bug fixes, final documentation
```

### **Resource Requirements**

| Role | Count | Responsibility |
|------|-------|-----------------|
| Backend Developer | 2-3 | API endpoints, database, business logic |
| Frontend Developer | 2 | UI components, forms, dashboards |
| QA Engineer | 1-2 | Testing, race condition validation, load testing |
| Technical Writer | 1 | API documentation, user guides |
| DevOps/DBA | 1 | Database optimization, migrations, backup |

---

## ✅ VALIDATION & READINESS CHECKLIST

### **By End of Phase 1:**
- [ ] All 34 smoke tests passing
- [ ] Conflict detection working correctly
- [ ] Class assignment filtering accurate
- [ ] 0 critical bugs found

### **By End of Phase 2:**
- [ ] All 50+ edge cases tested and passing
- [ ] QR metadata parsing safe
- [ ] Bonus double-approval guard verified
- [ ] Race condition tests pass (concurrent registration, attendance)
- [ ] Point calculations accurate

### **By End of Phase 3:**
- [ ] Audit logs comprehensive and immutable
- [ ] Notifications delivering correctly
- [ ] API documentation complete
- [ ] Integration tests 80%+ coverage
- [ ] Performance benchmarks met (5000+ users, 100k+ records)

### **Pre-UAT Checklist:**
- [ ] Database schema frozen (no more changes)
- [ ] All 150+ error codes translated
- [ ] Backup/restore procedures documented
- [ ] Monitoring & alerting configured
- [ ] Load test: 100 concurrent users → <200ms response time

---

## 🎯 SUCCESS CRITERIA

✅ **System is "Production Ready" when:**

1. **All Core Flows Working:**
   - Create → Approve → Register → Attend → Score → Bonus (end-to-end)

2. **Edge Cases Handled:**
   - 50+ edge case scenarios tested and passing
   - No unhandled exceptions or data corruption

3. **Data Integrity Guaranteed:**
   - No race conditions (transaction testing passed)
   - Audit trail complete and immutable
   - Backups tested and restorable

4. **Performance Acceptable:**
   - List endpoints: <500ms even with 10k+ records
   - Concurrent registration: race-guard working at 100+ RPS
   - Database: all queries optimized with proper indexes

5. **User Experience Satisfactory:**
   - Error messages clear and actionable (Vietnamese)
   - UI responsive and intuitive
   - Notifications timely and informative

6. **Documentation Complete:**
   - API spec with examples
   - Business logic decision trees
   - Deployment runbooks

---

**Prepared by:** GitHub Copilot  
**Date:** 18/03/2026  
**Version:** 3.0  
**Status:** Ready for Implementation Sprint Planning
