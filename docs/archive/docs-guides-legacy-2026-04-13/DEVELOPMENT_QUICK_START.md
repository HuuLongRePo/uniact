# 📌 HƯỚNG PHÁT TRIỂN - TÓM TẮT NHANH
**UniACT v3.0 - Lộ trình phát triển & Chia task thực hiện**

---

## 🎯 Mục tiêu

**Vừa phát triển tính năng mới vừa đảm bảo ổn định** cho 4 luồng chính:
1. **Tạo & Phê duyệt hoạt động** → Teacher tạo → Admin duyệt
2. **Đăng ký hoạt động** → Sinh viên xem & đăng ký
3. **Điểm danh QR** → Teacher tạo QR → Sinh viên scan → Ghi nhận
4. **Tính điểm & Phát thưởng** → Tính điểm → Gợi ý bonus → Duyệt

---

## 📊 Luồng Chính & Edge Cases

### **Luồng 1: TẠO HOẠT ĐỘNG (15 tasks)**

```
Happy Path:     Teacher tạo → Validate → Save draft → Submit → Admin approve → Published

Edge Cases (10):
  ✅ 1.2.1   Xung đột địa điểm (location overlap)
  ✅ 1.2.2   Cảnh báo lịch giảng viên (±2h warning)
  ⚠️ 1.2.3   Giảm max participant < hiện tại → DENY
  ⚠️ 1.2.4   Xóa draft có người → DENY
  ⚠️ 1.2.5   Xóa draft không người → ALLOW
  ⚠️ 1.2.6   Từ chối rồi gửi lại → NEW approval
  ⚠️ 1.2.7   Deadline < 24h trước → DENY
  ⚠️ 1.2.8   Gán nhiều lớp → Validate không duplicate
  ⚠️ 1.2.9   Edit sau deadline → Admin override only
  ⚠️ 1.2.10  Timezone chuẩn hóa → ISO 8601 UTC
```

**Implementation:** 6-7 tasks, ~14 ngày

---

### **Luồng 2: ĐĂNG KÝ HOẠT ĐỘNG (10 tasks)**

```
Happy Path:     Sinh viên xem list → Filter đúng lớp → Kiểm tra deadline → Đăng ký → Ghi nhận

Edge Cases (10):
  ✅ 2.2.1   Lớp không khớp → 403 Forbidden
  ✅ 2.2.2   Deadline passed → 400 Not allowed
  ✅ 2.2.3   Slot full → 400 Activity full
  ✅ 2.2.4   Đã đăng ký → 400 Duplicate
  ⚠️ 2.2.5   Hoạt động bị hủy → DELETE participations + notify
  ⚠️ 2.2.6   Hoạt động di chuyển sang quá khứ → 400 Deny
  ⚠️ 2.2.7   Race condition: 2 SV, 1 slot → 1 thành công (TRANSACTION)
  ⚠️ 2.2.8   Hoạt động không filter lớp → Tất cả SV thấy
  ⚠️ 2.2.9   Hủy đăng ký sau khi bắt đầu → 400 Deny
  ⚠️ 2.2.10  SV bị khóa/chuyển lớp → Prevent scoring
```

**Implementation:** 5-6 tasks, ~12 ngày

---

### **Luồng 3: ĐIỂM DANH QR (10 tasks)**

```
Happy Path:     Teacher tạo QR → Sinh viên scan → Validate → Ghi nhận attendance → Points

Edge Cases (10):
  ✅ 3.2.1   QR hết hạn → 400 Expired
  ✅ 3.2.2   JSON metadata lỗi → Parse fallback (TESTED)
  ✅ 3.2.3   Max scans vượt limit → 400 Limit exceeded
  ✅ 3.2.4   Single-use scan 2 lần → 1st OK, 2nd ERROR + deactivate (TESTED)
  ✅ 3.2.5   Sinh viên không registered → 403 Ineligible
  ⚠️ 3.2.6   Không có participation record → Allow orphan attendance?
  ⚠️ 3.2.7   Race condition: 2 SV scan single-use → TRANSACTION (TESTED)
  ⚠️ 3.2.8   Scan sau khi activity ended → Allow as "makeup"?
  ⚠️ 3.2.9   QR token không tồn tại → 400 Invalid
  ⚠️ 3.2.10  Parse error + race → Safe exception + fallback (TESTED)
```

**Implementation:** 5-6 tasks, ~13 ngày (Metadata safety ✅ DONE)

---

### **Luồng 4: TÍNH ĐIỂM & PHÁT THƯỞNG (12 tasks)**

```
Happy Path:     Teacher finalize → Tính điểm → SV xem score → Admin duyệt bonus → Update total

Edge Cases (10):
  ✅ 4.2.1   Finalize 2 lần → Idempotent (return existing)
  ✅ 4.2.2   Không có attendance → Create 0-point records
  ✅ 4.2.3   Attendance partial → Calculate separate per SV
  ✅ 4.2.5   Bonus double-approve → 1st OK, 2nd ERROR (TESTED)
  ⚠️ 4.2.4   Teacher thêm điểm sau finalize → Edit endpoint + audit
  ⚠️ 4.2.6   Bonus reject rồi request lại → Clarify: new entry or reopen?
  ⚠️ 4.2.7   Admin edit bonus amount → Deny, chỉ approve/reject
  ⚠️ 4.2.8   Race: finalize + rules trigger = duplicate bonus → UNIQUE constraint
  ⚠️ 4.2.9   Điểm âm → Validate >= 0
  ⚠️ 4.2.10  Điểm overflow → Cap or unlimited?
```

**Implementation:** 8-9 tasks, ~16 ngày

---

## 📈 Timeline & Chia Task

### **PHASE 1: Luồng 1 + 2 (3 tuần)**
- **Week 1** (5 days)
  - Task 1.1.1: API Contract & Validation → **Dev 1** (2-3 ngày)
  - Task 1.1.3: Approval Workflow → **Dev 1** (3 ngày)
  - Task 1.1.2: Conflict Detection → **Dev 1** (3-4 ngày, parallel)
  
- **Week 2** (5 days)
  - Task 1.2.1: Student List API → **Dev 1** (3 ngày)
  - Task 1.2.2: Registration Endpoint → **Dev 1** (3 ngày)
  - Task 1.2.4: Deadline Enforcement → **Dev 1** (2-3 ngày, overlap)
  - **QA**: Race condition test (concurrent registration) → **QA 1** (3 ngày)
  
- **Week 3** (5 days)
  - Task 1.1.4: Class Assignment → **Dev 1** (2 ngày)
  - Task 1.2.3: Unregistration → **Dev 2** (2 ngày)
  - Task 1.2.5: Eligibility Validation → **Dev 2** (2 ngày)
  - **Infrastructure**: Transaction handling start → **Dev 1** (parallel)

### **PHASE 2: Luồng 3 + 4 (4 tuần)**
- **Week 4** (5 days)
  - Task 2.1.1: QR Session Creation → **Dev 2** (3-4 ngày)
  - Task 2.1.2: QR Validation & Attendance → **Dev 2** (4 ngày)
  - Task 2.1.3: Metadata Parsing Safety → **Dev 2** (1 ngày) ✅ DONE
  - **QA**: Concurrent QR test → **QA 1** (2 ngày)

- **Week 5-6** (10 days)
  - Task 2.2.1: Activity Finalization → **Dev 1** (3 ngày)
  - Task 2.2.2: Point Calculation → **Dev 1** (2-3 ngày)
  - Task 2.2.3: Participation Scores → **Dev 1** (2 ngày)
  - Task 2.3.1: Bonus Suggestion → **Dev 2** (3 ngày)
  - Task 2.3.2: Bonus Approval (race-guard) → **Dev 1** (3 ngày) ✅ DONE
  - **QA**: Point calculation tests → **QA 1** (3 ngày)

### **PHASE 3: Infrastructure (2 tuần)**
- **Week 7** (5 days)
  - Task 3.1.1: Schema Review & Migration → **Dev 1 + DBA** (2-3 ngày)
  - Task 3.1.2: Transaction Optimization → **Dev 1** (3 ngày)
  - Task 3.2.1: Standard Error Format → **Dev 1** (2-3 ngày)
  - Task 3.3.1: Audit Logging → **Dev 1** (3 ngày)
  
- **Week 8** (5 days)
  - Task 3.2.2-4: Input Validation Schemas → **Dev 1 + Dev 2** (4-6 ngày)
  - Task 3.3.2: Notification System → **Dev 2** (3-4 ngày)
  - Task 3.4.1-3: Documentation & Tests → **QA + Tech Writer** (8-12 ngày, overlap)

**Total:** 8-9 tuần = **2.5 months**

---

## 🎯 Phân Công Cụ Thể

### **Developer 1** (Backend, API Design)
- **Weeks 1-3**: Tasks 1.1.1, 1.1.3, 1.1.2, 1.1.4
- **Weeks 4-6**: Tasks 2.2.1, 2.2.2, 2.2.3, 2.3.2
- **Weeks 7-8**: Tasks 3.1.1, 3.1.2, 3.2.1, 3.3.1, 3.2.2-4
- **Total Load**: 45-50 days / ~50% capacity over 2.5 months

### **Developer 2** (Backend, Database, Bonus)
- **Weeks 1-3**: Tasks 1.2.3, 1.2.5, infrastructure prep
- **Weeks 4-6**: Tasks 2.1.1, 2.1.2, 2.1.3, 2.3.1
- **Weeks 7-8**: Tasks 3.3.2, 3.2.2-4
- **Total Load**: 40-45 days / ~50% capacity over 2.5 months

### **QA Engineer 1** (Testing, Race Conditions)
- **Weeks 1-8**: Race condition tests, edge case tests, load tests
- Tasks: Concurrent registration, concurrent approval, concurrent QR, point calculation
- **Total Load**: 20-25 days of dedicated testing

### **Frontend Developer 1** (UI, Dialogs, Components)
- **Weeks 1-3**: ActivityDialog (conflict warning), Student registration UI
- **Weeks 4-6**: QR scanner UI, Score display, Bonus approval dashboard
- **Weeks 7-8**: Notification center, Audit log viewer
- **Total Load**: 25-30 days / ~60% capacity (can parallelize)

### **Tech Writer / Business Analyst**
- **Weeks 7-8**: API documentation, business logic diagrams, decision trees
- **Total Load**: 10-15 days

---

## ✅ Checklist Thực Hiện

### **Trước khi bắt đầu (Day 1)**
- [ ] Họp team: Xác nhận timeline, phân công, blockers
- [ ] Finalize database schema (migrations)
- [ ] Setup CI/CD pipeline (if not done)
- [ ] Create test environments (dev, staging)
- [ ] Prepare seed data for each phase

### **Hằng tuần**
- [ ] **Monday**: Sprint planning & standup
- [ ] **Wed**: Mid-sprint check-in (any blockers?)
- [ ] **Friday**: Sprint review & retro
- [ ] **Update**: SPRINT_TRACKING_BOARD.md with progress

### **Sau mỗi phase**
- [ ] Code review: 2+ approvers
- [ ] Test results: Pass rate ≥95%
- [ ] Documentation: Up-to-date
- [ ] UAT prep: Gather stakeholder feedback

### **Trước release**
- [ ] All 50+ edge cases tested ✓
- [ ] Race condition testing passed ✓
- [ ] Load test: 100 concurrent users ✓
- [ ] Backup/restore tested ✓
- [ ] API documentation complete ✓
- [ ] Deployment runbook ready ✓

---

## 🚨 Critical Success Factors

| Factor | Action | Owner |
|--------|--------|-------|
| **Race Conditions** | Test concurrent registration, approval, attendance before deploy | QA 1 |
| **Data Integrity** | Transaction handling for all state changes | Dev 1 |
| **Error Handling** | Standard response format + localization | Dev 1 |
| **Performance** | Index optimization, pagination on all lists | Dev 1 + DBA |
| **Testing** | 80%+ code coverage, all 50+ edge cases tested | QA 1 |
| **Documentation** | API spec + business logic trees | Tech Writer |
| **Stakeholder Buy-in** | Weekly demos, UAT involvement | PM |

---

## 📞 Key Decisions to Make NOW

1. **Bonus reject & resubmit?** → Allow new entry or reopen?
2. **QR after activity ended?** → Deny or allow as "makeup"?
3. **Teacher retroactive edit?** → Allow with reason or audit immutable?
4. **Max points cap?** → Limit or unlimited?

→ **Escalate to PM/Stakeholder** this week!

---

**Documents Created:**
- ✅ [DEVELOPMENT_ROADMAP_V3.md](DEVELOPMENT_ROADMAP_V3.md) - Chi tiết toàn bộ (50+ pages)
- ✅ [SPRINT_TRACKING_BOARD.md](SPRINT_TRACKING_BOARD.md) - Sprint planning & tasks
- ✅ [EDGE_CASE_VALIDATION_REPORT.md](EDGE_CASE_VALIDATION_REPORT.md) - Test results (✅ DONE)

**Nhất thiết đọc:** DEVELOPMENT_ROADMAP_V3.md → SPRINT_TRACKING_BOARD.md → Then start Day 1

---

**Created:** 18/03/2026 | **Version:** 3.0 | **Status:** Ready to Sprint
