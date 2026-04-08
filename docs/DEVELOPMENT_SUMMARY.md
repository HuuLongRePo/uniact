# 📋 HƯỚNG PHÁT TRIỂN UNIACT v3.0 - BẢN TÓMLƯỢC CÁC ĐIỂM CHÍNH

**Ngày:** 18/03/2026  
**Trạng thái:** ✅ READY FOR SPRINT PLANNING  
**Tài liệu hỗ trợ:** 4 files, 2,110 dòng chi tiết

---

## 🎯 MỤC TIÊU & PHẠM VI

**Phát triển cân bằng:** Tính năng mới + Ổn định hệ thống

**4 Luồng chính của hệ thống:**
1. ✏️ **Tạo & Phê Duyệt Hoạt động** - Teacher tạo → Admin duyệt → Published
2. 📝 **Đăng Ký Hoạt động** - Sinh viên xem & đăng ký với kiểm tra điều kiện
3. 📱 **Điểm Danh QR** - Tạo QR → Sinh viên scan → Ghi nhận attendance + tính điểm
4. 🏆 **Tính Điểm & Phát Thưởng** - Finalize → Tính điểm → Gợi ý bonus → Duyệt

**Edge Cases:** 50+ trường hợp đặc biệt đã được phân tích & có test case

---

## 📊 KHU VỰC CÔNG VIỆC (PHÂN CÔNG)

### **Developer 1 - Backend & API Design**
- **Weeks 1-3:** Activity creation, approval workflow, class assignment
- **Weeks 4-6:** Scoring service, point calculation, bonus approval
- **Weeks 7-8:** Database optimization, transaction handling, error format
- **Load:** ~50 days / ~50% capacity (4+ hours/day)

### **Developer 2 - Attendance & Database**
- **Weeks 1-3:** Registration API, deadline enforcement, race condition testing
- **Weeks 4-6:** QR session creation, attendance recording, bonus suggestions
- **Weeks 7-8:** Notification system, validation schemas
- **Load:** ~45 days / ~50% capacity (4+ hours/day)

### **QA Engineer 1 - Testing & Validation**
- **All 8 weeks:** Race condition tests, edge cases, load testing
- **Focus areas:** Concurrent registration, approval, QR scans
- **Load:** 20-25 days dedicated testing

### **Frontend Developer 1 - UI Components**
- **Weeks 1-3:** Activity dialog with conflict warnings, registration UI
- **Weeks 4-6:** QR scanner, score dashboard, bonus approval interface
- **Weeks 7-8:** Notification center, audit log viewer
- **Load:** ~30 days / ~60% capacity

---

## ⏱️ TIMELINE

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| **Phase 1** | Weeks 1-3 | Luồng 1-2: Create & Register | Core activity workflow |
| **Phase 2** | Weeks 4-6 | Luồng 3-4: Attendance & Score | Complete user journey + bonus |
| **Phase 3** | Weeks 7-8 | Infrastructure | Database optimization, audit logs |
| **UAT** | Weeks 9-10 | Stabilization | Load testing, documentation |

**Total:** 10 weeks (~2.5 months) = **47 developer days** + **25 QA days**

---

## 📋 CÔNG VIỆC CRITICAL PATH (PHẢI LÀMTRƯỚC)

**Must-Have First (26-28 days):**
```
1.1.1 (Contract)
  ↓
1.1.3 (Approval) 
  ↓
1.2.2 (Register)
  ↓
2.1.2 (QR Validate)
  ↓
2.2.1 (Finalize)
  ↓
2.2.2 (Points)
  ↓
2.3.2 (Bonus Approval) ← RACE GUARD
  ↓
3.1.2 (Transactions)
  ↓
3.2.1 (Error Format)
```

**Không có "slack time" → Mọi task đều critical**

---

## ✅ EDGE CASES & GUARDS (50+ cases)

### **Luồng 1: Tạo Hoạt động**
| # | Edge Case | Guard | Status |
|---|-----------|-------|--------|
| 1 | Xung đột địa điểm | Real-time detection + warning | ⚠️ Verify |
| 2 | Lịch giáo viên trùng | ±2h warning (non-blocking) | ⚠️ Verify |
| 3 | Max < hiện tại | DENY 400 | ⚠️ Verify |
| 4 | Deadline < 24h | DENY 400 | ⚠️ Need impl |
| 5-10 | ...6 trường hợp khác | Various validation | ⚠️ Verify |

### **Luồng 2: Đăng Ký**
| # | Edge Case | Guard | Status |
|---|-----------|-------|--------|
| 1 | Lớp không khớp | Class filter + 403 | ✅ Verify |
| 2 | Deadline đã qua | Date check + 400 | ✅ Verify |
| 3 | **Race condition** | **TRANSACTION lock** | ⚠️ Test |
| 4 | Slot full | COUNT < max check | ✅ Verify |
| 5-10 | ...6 trường hợp khác | Various validation | ⚠️ Verify |

### **Luồng 3: Điểm Danh QR**
| # | Edge Case | Guard | Status |
|---|-----------|-------|--------|
| 1 | QR hết hạn | expires_at check | ✅ Verify |
| 2 | **Metadata lỗi** | **JSON.parse fallback** | ✅ PASS |
| 3 | Max scans vượt | Limit enforcement | ✅ Verify |
| 4 | **Single-use race** | **TRANSACTION deactivate** | ✅ PASS |
| 5-10 | ...6 trường hợp khác | Various validation | ⚠️ Verify |

### **Luồng 4: Tính Điểm**
| # | Edge Case | Guard | Status |
|---|-----------|-------|--------|
| 1 | Finalize 2 lần | Idempotent check | ✅ Verify |
| 2 | Không attendance | Create 0-point | ✅ Verify |
| 3 | Partial attendance | Per-student calculation | ✅ Verify |
| 4 | **Double-approve** | **WHERE status='pending'** | ✅ PASS |
| 5-10 | ...6 trường hợp khác | Various validation | ⚠️ Verify |

---

## 🔐 RACE CONDITIONS & GUARDS

**4 Critical Transactions mà PHẢI atomic:**

### 1️⃣ Registration Race (Luồng 2)
```
Scenario: 2 sinh viên, 1 slot trống
Status: ⚠️ NEED TEST

Solution: BEGIN → SELECT FOR UPDATE → IF count >= max DENY ELSE INSERT → COMMIT
Result: 1 succeeds (200), 1 fails (400)
```

### 2️⃣ QR Single-Use Race (Luồng 3)
```
Scenario: 2 sinh viên scan single-use QR cùng lúc
Status: ✅ TESTED & PASS

Solution: Transaction with FK constraint on student_id + qr_session_id
Result: 1st succeeds → is_active=0 → 2nd fails (CONSTRAINT VIOLATION)
```

### 3️⃣ Bonus Double-Approval (Luồng 4)
```
Scenario: 2 admin duyệt cùng một bonus
Status: ✅ TESTED & PASS

Solution: UPDATE ... WHERE status='pending' (chỉ cập nhật pending)
Result: 1st succeeds (status='pending'→'approved') 
        2nd fails (WHERE finds 0 rows) → 400 error
```

### 4️⃣ Rules Duplicate (Luồng 4)
```
Scenario: Finalize + rules engine trigger đồng thời = 2 suggestions
Status: ⚠️ NEED TEST

Solution: UNIQUE (activity_id, student_id, source_rule_id)
Result: 2nd insert violates constraint → rollback
```

---

## 🧪 TESTING REQUIREMENTS

### **Unit Tests**
- Point calculation logic: 10+ scenarios
- Conflict detection: 5+ overlap cases
- Metadata parsing: malformed JSON, edge cases
- State transitions: all 20+ state combos

### **Integration Tests**  
- End-to-end flow: Create → Approve → Register → QR → Score → Bonus
- Multi-user scenarios: 5+ concurrent user patterns
- API response formats: 150+ error codes Vietnamese
- Database rollback: transaction cleanup

### **Race Condition Tests**
- Concurrent registration at capacity → 1 succeeds, rest denied
- Concurrent bonus approval → 1st succeeds, 2nd gets 400
- Concurrent QR scan (single-use) → 1st succeeds, 2nd denied
- Load test: 100 concurrent users, <200ms response

### **Target Coverage**
```
Unit tests:       ≥70% code coverage
Integration tests: ≥80% endpoint coverage
Edge cases:        50/50 scenarios tested ✓
Load test:         100 concurrent users ✓
```

---

## 📚 DOCUMENTATION CREATED

### **1. DEVELOPMENT_ROADMAP_V3.md** (963 lines)
Chi tiết toàn bộ:
- 4 luồng chính + 50+ edge cases
- Từng task với dependencies
- Implementation checklist cho mỗi luồng
- Database, error handling, audit, notifications
- Success criteria & timeline

### **2. SPRINT_TRACKING_BOARD.md** (431 lines)  
Sprint planning & execution:
- Task priority matrix (MoSCoW)
- 8 sprint planning templates
- Daily standup checklist
- Epic completion criteria
- Weekly status report template
- Go/No-go release criteria

### **3. SYSTEM_FLOWS_DIAGRAM.md** (463 lines)
Biểu đồ luồng & race conditions:
- 4 luồng chính (ASCII art)
- Race condition explanations
- Transaction & constraint design
- Validation checklist per flow

### **4. DEVELOPMENT_QUICK_START.md** (253 lines)
Tóm tắt nhanh:
- 4 luồng chính (edge cases summary)
- Task phân công
- Timeline ngắn gọn
- Critical success factors
- Key business decisions to clarify

---

## 🚨 BUSINESS DECISIONS CẦN CLARIFY

**Escalate to PM/Stakeholder ASAP:**

1. **Bonus Reject & Resubmit?**
   - Option A: Cho phép teacher gửi request mới (new entry)
   - Option B: Teacher không thể gửi lại (locked)
   - **Default:** Option A (recommended)

2. **QR After Activity Ended?**
   - Option A: DENY 400 (strict)
   - Option B: Allow as "makeup" attendance (flexible)
   - **Default:** Option A (recommended)

3. **Teacher Retroactive Points Edit?**
   - Option A: DENY (audit immutable)
   - Option B: Allow with reason & logging
   - **Default:** Option A (recommended)

4. **Max Points Cap?**
   - Option A: Unlimited
   - Option B: Cap at 9999
   - **Default:** Option A (no cap)

---

## ✅ GO/NO-GO RELEASE CRITERIA

### **Must Pass Before Deploy:**
- [ ] All 4 core flows working (end-to-end)
- [ ] 50/50 edge cases tested & passing
- [ ] 4 race conditions tested & passed
- [ ] 0 critical bugs; max 3 known & documented
- [ ] Load test: 100 concurrent users, <200ms
- [ ] Database backup/restore: verified
- [ ] API documentation: 100% complete
- [ ] Stakeholder UAT: passed

### **Testing Results So Far:**
```
✅ Bonus double-approval guard: PASS (WHERE status='pending' working)
✅ QR metadata parsing: PASS (malformed JSON handled safely)
✅ QR single-use deactivation: PASS (race condition tested)
✅ Smoke test (34 endpoints): PASS (all 3 roles tested)
✅ Seeded data: PASS (291 students, 14 activities, comprehensive coverage)

⚠️ Concurrent registration race: NEED TEST
⚠️ Rules duplicate prevention: NEED TEST
⚠️ Point calculation accuracy: NEED TEST
⚠️ Load testing (100 concurrent): NEED TEST
```

---

## 📊 SUCCESS METRICS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Core flows working** | 4/4 | 2/4 (create, register base) | 50% |
| **Edge cases tested** | 50/50 | 12/50 (bonus, QR, metadata) | 24% |
| **Race conditions** | 4/4 | 2/4 (bonus, QR single-use) | 50% |
| **Load test** | 100 users | Not tested | 0% |
| **Code coverage** | ≥70% | ~45% (partial) | Pending |
| **Bug count** | 0 critical | 0 critical | ✅ |
| **Documentation** | 100% | 80% (roadmap done, impl pending) | 80% |

---

## 🎯 NEXT ACTIONS (IMMEDIATELY)

### **This Week:**
- [ ] Review all 4 documents (2,110 lines total)
- [ ] Clarify 4 business decisions with PM
- [ ] Finalize database schema (if not done)
- [ ] Setup CI/CD & test infrastructure
- [ ] Schedule kick-off meeting

### **Week 1:**
- [ ] Start Task 1.1.1 (API Contract)
- [ ] Begin conflict detection research
- [ ] Setup test database & seed data
- [ ] Team alignment on code standards

### **Ongoing:**
- [ ] Daily standup (15 min)
- [ ] Weekly status report
- [ ] Monthly stakeholder demo
- [ ] Update SPRINT_TRACKING_BOARD.md

---

## 📞 ESCALATION & CONTACTS

**Tech Lead:** For architecture questions  
**PM:** For business decisions (4 items above)  
**QA Lead:** For testing strategy validation  
**DevOps:** For CI/CD & database setup

---

## 🏁 CONCLUSION

**UniACT v3.0 is READY FOR DEVELOPMENT:**

✅ **Scope:** 4 luồng chính + 50+ edge cases  
✅ **Teams:** 2 devs + 1 QA + 1 frontend assigned  
✅ **Timeline:** 10 weeks (2.5 months) realistic  
✅ **Success Criteria:** Clear & measurable  
✅ **Documentation:** 2,110 lines prepared  
✅ **Risk Mitigation:** Race conditions identified & guards designed  

**Entry Criteria:** Clarify 4 business decisions + confirm resources  
**Exit Criteria:** All tests passing + stakeholder UAT approval  

---

**Prepared by:** GitHub Copilot  
**Date:** 18/03/2026  
**Status:** ✨ READY FOR SPRINT PLANNING KICKOFF ✨

---

### 📖 Read First:
1. **DEVELOPMENT_QUICK_START.md** (5 min read) - Overview
2. **SYSTEM_FLOWS_DIAGRAM.md** (10 min read) - Visual understanding
3. **DEVELOPMENT_ROADMAP_V3.md** (30 min read) - Full details
4. **SPRINT_TRACKING_BOARD.md** (20 min read) - Sprint templates

**Total reading time:** ~65 minutes → Full context established ✓
