# 🎯 TASK PRIORITY MATRIX & TRACKING BOARD
**Document:** DEVELOPMENT_ROADMAP_V3 Support  
**Date:** 18/03/2026  
**Target:** Sprint Planning & Execution Tracking

---

## 📊 Task Priority Matrix (MoSCoW Method)

### **MUST HAVE (Critical Path) ⭐⭐⭐**
Must complete before moving to next phase

| Task ID | Task Name | Component | Est. Days | Dependencies | Assigned | Status |
|---------|-----------|-----------|-----------|--------------|----------|--------|
| **1.1.1** | API Contract & Validation | Activity CRUD | 2-3 | None | Dev 1 | 🔴 NOT STARTED |
| **1.1.3** | Approval Workflow | State Machine | 3 | 1.1.1 | Dev 1 | 🔴 NOT STARTED |
| **1.2.2** | Registration Endpoint | Registration | 3 | 1.1.3 | Dev 1 | 🔴 NOT STARTED |
| **2.1.2** | QR Validation & Attendance | Attendance | 4 | 1.2.2 | Dev 2 | 🔴 NOT STARTED |
| **2.2.1** | Activity Finalization | Scoring | 3 | 2.1.2 | Dev 2 | 🔴 NOT STARTED |
| **2.2.2** | Point Calculation Service | Scorer | 2-3 | 2.2.1 | Dev 2 | 🔴 NOT STARTED |
| **2.3.2** | Bonus Approval Workflow | Bonus | 3 | 2.2.2 | Dev 1 | 🔴 NOT STARTED |
| **3.1.2** | Transaction Handling | DB | 3 | 2.3.2 | Dev 1 | 🔴 NOT STARTED |
| **3.2.1** | Error Response Format | Middleware | 2-3 | All APIs | Dev 1 | 🔴 NOT STARTED |

**Total Must-Have:** 26-28 days (4 weeks)

---

### **SHOULD HAVE (High Priority) ⭐⭐**
Implement in current phase but won't block release

| Task ID | Task Name | Component | Est. Days | Dependencies | Status |
|---------|-----------|-----------|-----------|--------------|--------|
| **1.1.2** | Conflict Detection System | Activity | 3-4 | 1.1.1 | 🔴 NOT STARTED |
| **1.1.4** | Class Assignment | Activity | 2 | 1.1.1 | 🔴 NOT STARTED |
| **1.2.1** | Student Activity Listing | Registration | 3 | 1.1.3 | 🔴 NOT STARTED |
| **1.2.4** | Deadline Enforcement | Registration | 2-3 | 1.2.2 | 🔴 NOT STARTED |
| **2.1.1** | QR Session Creation | Attendance | 3-4 | 2.2.1 | 🔴 NOT STARTED |
| **2.3.1** | Suggested Bonus Generation | Bonus | 3 | 2.2.2 | 🔴 NOT STARTED |
| **3.1.1** | Schema Review & Migration | DB | 2-3 | All tables | 🔴 NOT STARTED |
| **3.3.1** | Audit Log System | Logging | 3 | All endpoints | 🔴 NOT STARTED |

**Total Should-Have:** 21-23 days (3 weeks)

---

### **COULD HAVE (Nice to Have) ⭐**
Implement if time permits; can defer to next release

| Task ID | Task Name | Component | Est. Days | Status |
|---------|-----------|-----------|-----------|--------|
| **1.1.5** | Error Messages Localization | UX | 1-2 | 🔴 NOT STARTED |
| **1.2.3** | Unregistration Endpoint | Registration | 2 | 🔴 NOT STARTED |
| **1.2.5** | Eligibility Validation | Registration | 2 | 🔴 NOT STARTED |
| **2.1.3** | Metadata Parsing Safety | QR | 1 | 🔴 NOT STARTED |
| **2.1.4** | Attendance Records Table | DB | 2 | 🔴 NOT STARTED |
| **2.2.3** | Participation Scores Table | Scoring | 2 | 🔴 NOT STARTED |
| **2.3.3** | Bonus Rejection Endpoint | Bonus | 1-2 | 🔴 NOT STARTED |
| **3.2.2-4** | Input Validation Schemas | Validation | 4-6 | 🔴 NOT STARTED |
| **3.3.2** | Notification System | Notifications | 3-4 | 🔴 NOT STARTED |
| **3.4.1-3** | Documentation & Tests | QA/Docs | 8-12 | 🔴 NOT STARTED |

---

## 🔄 Critical Path Analysis

### **Luồng 1 → 2 → 3 → 4 Dependencies**

```
Week 1: Core APIs
  Task 1.1.1 (API Contract)
       ↓
  Task 1.1.3 (Approval)
       ↓
Task 1.2.2 (Registration) ← Task 1.1.2 (Conflict) [parallel]
       ↓
Week 2-3: Registration UI
  Task 1.2.1 (List API) [parallel with 1.2.2]
  Task 1.2.4 (Deadline)
       ↓
Week 4: Attendance
  Task 2.1.1 (QR Session)
  Task 2.1.2 (QR Validation) ← Task 3.1.2 (Transaction) [parallel]
       ↓
Week 5: Scoring
  Task 2.2.1 (Finalization)
  Task 2.2.2 (Point Calc)
  Task 2.2.3 (Storage)
       ↓
Week 6: Bonus
  Task 2.3.1 (Suggestion)
  Task 2.3.2 (Approval)
       ↓
Week 7: Infrastructure
  Task 3.1.1 (Schema)
  Task 3.2.1 (Error Handling)
  Task 3.3.1 (Audit Logs)
```

**Critical Path Length:** ~26-28 days (4 weeks)  
**Slack Time:** 0 days → Every task is critical

---

## 📋 Sprint Planning Template

### **SPRINT 1 (Week 1) - Activity Create & Approval**

```markdown
## Sprint Goal
Implement activity creation, conflict detection, and approval workflow
(No registration yet)

## Planned Tasks (In Priority Order)
1. [MUST] 1.1.1 - API Contract & Validation (2-3 days) → Dev1
2. [MUST] 1.1.3 - Approval Workflow (3 days) → Dev1  
3. [SHOULD] 1.1.2 - Conflict Detection (3-4 days) → Dev1
4. [SHOULD] 1.1.4 - Class Assignment (2 days) → Dev1

## Team Capacity
- Dev 1: 5 days * 1 person = 5 days available
  - Assigned: 1.1.1 (2-3) + partial 1.1.3 (1-2 days)
- Dev 2: 5 days * 1 person = 5 days available
  - Assigned: 1.1.3 (rest) + 1.1.2 (start)
- Frontend: 5 days * 1 person = 5 days available
  - Assigned: ActivityDialog UI prep

## Definition of Done
- [ ] All API endpoints return standard response format
- [ ] 5+ validation test cases pass
- [ ] Conflict detection algorithm correct
- [ ] Admin approval workflow state machine working
- [ ] 0 critical bugs; max 2 minor bugs

## Success Metrics
- Test coverage: ≥50% for new code
- API response time: <200ms (empty database)
- Code review approval: 2+ reviewers

## Blockers & Risks
- Risk: Conflict detection algorithm complexity
  - Mitigation: Pair programming session Day 2
- Blocker: Database schema undefined
  - Resolution: Finalize schema Day 1
```

### **SPRINT 2 (Week 2) - Registration & Deadline**

```markdown
## Sprint Goal
Complete registration flow with deadline enforcement and class filtering
(Attendance work begins in parallel)

## Planned Tasks
1. [MUST] 1.2.1 - Student Activity Listing (3 days) → Dev1
2. [MUST] 1.2.4 - Deadline Enforcement (2-3 days) → Dev1
3. [SHOULD] 1.2.3 - Unregistration (2 days) → Dev2
4. [SHOULD] 1.2.5 - Eligibility Validation (2 days) → Dev2
5. [TESTING] Race condition tests: concurrent registration (3 days) → QA

## Parallel Work (Attendance Foundation)
- Dev2: Task 2.1.1 - QR Session Creation (start)
- Dev2: Task 3.1.2 - Transaction handling for registration

## Definition of Done
- [ ] Student can view and register for activities
- [ ] Class filtering works correctly (3+ test scenarios)
- [ ] Deadline enforcement prevents registration past deadline
- [ ] Race condition test: 100 concurrent registrations when 1 slot left → only 1 succeeds
- [ ] Unregister prevents removal after activity started

## Success Metrics
- Registration endpoint: <100ms even with 10k activities
- Concurrent user test: 100 users, 99 rejections (1 slot limited)
- No database integrity violations

## Blockers & Risks
- Risk: Concurrent registration race condition
  - Mitigation: Transaction wrapper + stress test Day 1
```

### **SPRINT 3 (Week 3) - Attendance Foundation**

```markdown
## Sprint Goal
Complete QR attendance system with metadata safety and race condition handling

## Planned Tasks
1. [MUST] 2.1.2 - QR Validation & Attendance (4 days) → Dev2
2. [SHOULD] 2.1.1 - QR Session Creation (3-4 days) → Dev2
3. [SHOULD] 2.1.3 - Metadata Parsing Safety (1 day) → Dev2
4. [TESTING] Concurrent QR scan test (2 days) → QA
5. [INFRASTRUCTURE] Transaction optimization (2 days) → Dev1

## Definition of Done
- [ ] QR session creation generates valid codes
- [ ] Attendance validation checks expiry and max_scans
- [ ] Single-use QR auto-deactivates after 1st scan
- [ ] Malformed metadata safely parsed with fallback
- [ ] Race condition test: concurrent scans on single-use QR → only 1 succeeds

## Success Metrics
- QR code generation: <50ms
- Attendance validation: <100ms
- Concurrent QR test: 50 scans, 1 succeeds (single-use)
- Metadata parsing: 100% safe (no exceptions thrown)

## Blockers & Risks
- Risk: QR library integration (if using external library)
  - Mitigation: Test library integration Day 1
```

### **SPRINT 4 (Week 4) - Scoring & Bonus Start**

```markdown
## Sprint Goal
Finalize scoring and begin bonus workflow; stabilize transaction layer

## Planned Tasks
1. [MUST] 2.2.1 - Activity Finalization (3 days) → Dev1
2. [MUST] 2.2.2 - Point Calculation Service (2-3 days) → Dev1
3. [SHOULD] 2.2.3 - Participation Scores Table (2 days) → Dev1
4. [SHOULD] 2.3.1 - Bonus Suggestion Generation (3 days) → Dev2
5. [TESTING] Finalization idempotency tests (2 days) → QA

## Definition of Done
- [ ] Activity finalization calculates points per student
- [ ] Point formula: base * multiplier + bonus
- [ ] Idempotency: finalize twice returns same result
- [ ] Bonus suggestion triggered on finalize (if rules match)
- [ ] 10+ point calculation scenarios passing

## Success Metrics
- Finalization: <200ms for 100 students
- Point calculation accuracy: 100% for 10 test cases
- No duplicate bonus suggestions

## Blockers & Risks
- Risk: Rules engine complexity for bonus suggestion
  - Mitigation: Clarify rules logic before coding
```

---

## ✅ Sprint Execution Checklist

### **Daily Standup Template**

```
Date: ___________
Attendees: Dev1, Dev2, Frontend, QA Lead

[Dev1]
  Yesterday:
    - [ ] Completed: Task ___
    - [ ] In Progress: Task ___
  Today:
    - [ ] Plan: Task ___
  Blockers:
    - [ ] None / Describe...

[Dev2]
  Yesterday:
    - [ ] Completed: Task ___
    - [ ] In Progress: Task ___
  Today:
    - [ ] Plan: Task ___
  Blockers:
    - [ ] None / Describe...

[QA]
  Testing Results:
    - [ ] Test passed: ___
    - [ ] Test failed: ___ (assigned to Dev X for fix)

[Frontend]
  UI Progress:
    - [ ] Component completed: ___
```

### **Epic Completion Criteria**

#### **Epic 1: Core Creation & Approval Workflow**
- [ ] All MUST + SHOULD tasks in Tasks 1.1.x complete
- [ ] 0 critical bugs
- [ ] Conflict detection tested (5+ scenarios)
- [ ] API documentation updated
- **Owner:** Dev1 | **Target:** End of Week 1

#### **Epic 2: Registration & Eligibility**
- [ ] All MUST tasks in Tasks 1.2.x complete
- [ ] Race condition handling for concurrent registration verified
- [ ] Class filtering tested (8+ scenarios)
- **Owner:** Dev1 | **Target:** End of Week 2

#### **Epic 3: Attendance & QR System**
- [ ] All MUST tasks in Tasks 2.1.x complete
- [ ] Metadata parsing safety verified (✅ already passed)
- [ ] Single-use QR deactivation tested
- [ ] 0 unhandled parse exceptions
- **Owner:** Dev2 | **Target:** End of Week 3

#### **Epic 4: Scoring, Points & Bonus**
- [ ] All MUST tasks in Tasks 2.2.x + 2.3.2 complete
- [ ] 50+ edge cases tested and passing
- [ ] Bonus double-approval guard verified (✅ already passed)
- [ ] Point calculation accuracy 100%
- **Owner:** Dev1 + Dev2 | **Target:** End of Week 4

#### **Epic 5: Infrastructure & Cross-Cutting**
- [ ] All MUST tasks in Tasks 3.x complete
- [ ] Transaction handling for all concurrent operations
- [ ] Audit logging on every state change
- [ ] Standard error response format across all endpoints
- [ ] API documentation 100% complete
- **Owner:** Dev1 + Dev2 | **Target:** End of Weeks 5-6

---

## 🎯 Metrics & Reporting

### **Weekly Status Report Template**

```html
╔═══════════════════════════════════════════════════════════════╗
║       WEEKLY DEVELOPMENT STATUS REPORT - Week X               ║
╚═══════════════════════════════════════════════════════════════╝

[ ] Tasks Completed This Week: ___/__ (___%)
[ ] Tasks In Progress: ___
[ ] Blockers: ___ (describe impact)
[ ] Critical Bugs Found: ___
[ ] Test Coverage: __% (target: ≥70%)

╔════════════════════════════════════════════════════════════════╗
║                   PROGRESS BY EPIC                            ║
╠════════════════════════════════════════════════════════════════╣
║ Epic 1 (Create/Approval):    [████████░░] 80% (Target: 100%)   ║
║ Epic 2 (Registration):       [██████░░░░] 60% (Target: 100%)   ║
║ Epic 3 (Attendance):         [████░░░░░░] 40% (Target: 100%)   ║
║ Epic 4 (Scoring/Bonus):      [██░░░░░░░░] 20% (Target: 100%)   ║
║ Epic 5 (Infrastructure):     [░░░░░░░░░░] 0%  (Target: 100%)   ║
╚════════════════════════════════════════════════════════════════╝

Task Details:
  ✅ Completed: 1.1.1, 1.1.3, 1.1.2
  🔄 In Progress: 1.1.4 (95%), 1.2.1 (30%)
  ⏸️  On Hold: None
  🔴 Blocked: None

Test Results:
  Unit Tests: ___/__ passed
  Integration Tests: ___/__ passed
  Edge Case Tests: ___/50 passed (target: 50/50)
  Load Test: ___ concurrent users without timeout
  Race Condition Tests: ___ scenarios passed

Velocity:
  Planned: ___ story points
  Completed: ___ story points
  Burndown: On track / At risk / Behind

Next Week:
  [ ] Priority 1: Task ___
  [ ] Priority 2: Task ___

Risks & Mitigations:
  [ ] Risk: ___ → Mitigation: ___
```

---

## 🚀 Go/No-Go Criteria by Release

### **Release Candidate 1.0 - "Core Flows"**

**Must Pass:**
- [ ] Create activity → Approve → Published (no errors)
- [ ] Student register → Participate (race-guarded)
- [ ] QR attend → Points calculated (no data loss)
- [ ] Bonus approve → Score updated (double-approval prevented)
- [ ] No unhandled exceptions (>= 99% uptime in load test)
- [ ] All 50+ edge cases tested
- [ ] 0 critical bugs; max 3 known bugs (documented)

**Testing Required:**
- [ ] Unit test coverage ≥70%
- [ ] Integration tests ≥80%
- [ ] Load test: 100 concurrent users, <200ms response
- [ ] Race condition tests: passing
- [ ] Database backup/restore: verified

**Documentation Required:**
- [ ] API endpoints documented (OpenAPI)
- [ ] Database schema finalized (ERD)
- [ ] Business logic decision trees complete
- [ ] Error code reference (150+ codes)
- [ ] Deployment runbook

**Sign-Off Required:**
- [ ] Tech Lead approval
- [ ] QA Lead approval
- [ ] Project Manager approval
- [ ] Stakeholder acceptance (UAT)

---

## 📞 Escalation & Decision Points

### **Critical Decision Points**

| Decision | Due Date | Owner | Options |
|----------|----------|-------|---------|
| Reject bonus after approval allowed? | Week 4 | PM | (A) Allow new submission; (B) Require admin override |
| Max points cap? | Week 5 | PM | (A) No limit; (B) Cap at 9999 |
| Teacher retroactive bonus edit? | Week 6 | PM | (A) Disallow (audit immutable); (B) Allow with reason |
| QR after activity ended? | Week 3 | Dev | (A) Deny; (B) Allow as "makeup" |

### **Escalation Path**

- **Code Issue** → Dev Lead → Tech Lead → Project Manager
- **UI/UX Issue** → Frontend Dev → UI Lead → Project Manager
- **Architecture Issue** → Tech Lead → CTO (if exists)
- **Timeline Issue** → Project Manager → Executive Sponsor

---

**Document Version:** 1.0  
**Last Updated:** 18/03/2026  
**Owner:** GitHub Copilot / Project Lead  
**Status:** Ready for Sprint Planning
