# 🗺️ UNIACT - LỘ TRÌNH SẢN PHẨM

> **Phiên Bản Hiện Tại**: v2.2.0 (Production Ready)  
> **Cập Nhật Lần Cuối**: 14/01/2026 (Permissions & Business Logic)  
> **Kế Hoạch**: Q1 2026 - Q4 2026  
> **Duy Trì Bởi**: Development Team

---

## 📋 MỤC LỤC

- [Tóm Tắt Điều Hành](#tóm-tắt-điều-hành)
- [Phiên Bản 2.0.0 - Hoàn Thành](#phiên-bản-200---hoàn-thành-✅)
- [Phiên Bản 2.1.0 - Enhancements](#phiên-bản-210---enhancements-q1-2026)
- [Phiên Bản 2.2.0 - Parent Module](#phiên-bản-220---parent-module-q2-2026)
-
- [Bản Đồ Phụ Thuộc](#bản-đồ-phụ-thuộc)
- [Các Mốc Quan Trọng & Tiêu Chí Thành Công](#các-mốc-quan-trọng--tiêu-chí-thành-công)

---

## 🎯 TÓM TẮT ĐIỀU HÀNH

### ✅ Trạng Thái Hiện Tại (v2.2.0)

**Phát Hành**: 14/01/2026 (Permissions & Business Logic Update)  
**Hoàn Thành Tính Năng**: 98% (125/128 tính năng)  
**Bao Phủ Kiểm Thử**: 88%  
**Trạng Thái Production**: ✅ Hoàn Toàn Triển Khai trên LAN

**Thành Tựu v2.2.0** (NEW):
- ⭐ **Conflict Detection API**: Location overlap + Schedule warnings
- ⭐ **Permissions Matrix**: 3 roles × 15 operations documented
- ⭐ **Teacher Info Display**: Creator visibility for transparency
- ⭐ **Business Rules**: 1,400+ lines comprehensive documentation
- ⭐ **Relationship Logic**: 500+ lines ERD & query patterns
- ✅ Real-time validation: Debounced checks (800ms), Red/Yellow alerts
- ✅ Updated NHAT-KY: 6 phases timeline, 8 implementation waves
- ✅ Updated PHU-LUC: Integrated 6 appendixes

**Thành Tựu v2.0.0**:
- ✅ Teacher Module: 100% hoàn thành (32/32 features)
- ✅ Admin Module: 100% triển khai (24/24 pages)
- ✅ Student Module: 100% triển khai (12/12 pages)
- ✅ Advanced Authentication: Face + WebAuthn + Security Questions
- ✅ Performance Optimization: Time slots, caching, indexing
- ✅ 35+ API Endpoints hoàn chỉnh
- ✅ 25+ Database tables tối ưu
- ✅ 100% Khả Năng Ngoại Tuyến
- ✅ Branding & naming updated to "UniAct"

**Công Việc Còn Lại** (55 enhancement tasks):
- 🔧 Admin: 32 tasks (CRUD enhancements, bulk ops, advanced filters)
- 🔧 Student: 23 tasks (recommendations, analytics, notifications)
- 📖 Chi tiết: xem backlog/sprint trong 02-PROGRESS.md (đã hợp nhất, không dùng file TODO rời)

**Technical Debt**:
- 🔴 18 critical UX issues (alert(), race conditions, navigation overflow)
- 🟡 27 high-priority issues (search, bulk actions, error handling)
- 🟢 55 medium/low priority enhancements

### Strategic Goals

**2025 Q4**: Fix critical gaps → 90%+ feature completion  
**2026 Q1**: Achieve UX excellence → 95%+ completion  
**2026 Q2**: Nâng cấp quản trị nâng cao trong phạm vi ngoại khóa  
**2026 Q3-Q4**: Tối ưu báo cáo & hiệu năng theo nhu cầu thực tế

---

## ⭐ VERSION 2.2.0 - PERMISSIONS & BUSINESS LOGIC

**Released**: 14/01/2026  
**Theme**: Comprehensive Permissions, Conflict Detection & Business Documentation  
**Status**: ✅ Complete

### Features Delivered

| # | Feature | Type | Impact | Lines of Code |
|---|---------|------|--------|---------------|
| 1 | **Conflict Detection API** | Feature | 🔴 CRITICAL | 145 lines |
| 2 | **Real-time Conflict Warnings** | UI | 🔴 CRITICAL | 80 lines |
| 3 | **Teacher Info Display** | UI | 🟡 HIGH | 15 lines |
| 4 | **PERMISSIONS_AND_BUSINESS_RULES.md** | Docs | 🔴 CRITICAL | 1,400+ lines |
| 5 | **LOGIC_MOI_QUAN_HE.md** | Docs | 🟡 HIGH | 500+ lines |
| 6 | **Updated NHAT-KY-THUC-HIEN.md** | Docs | 🟡 HIGH | 500+ lines |
| 7 | **Updated 11-PHU-LUC.md** | Docs | 🟡 HIGH | Integrated 6 appendixes |

**Total**: 7/7 (100%)  
**Code Added**: +240 lines (API + UI)  
**Documentation Added**: +2,400 lines

### Technical Details

#### 1. Conflict Detection System
- **API**: `POST /api/activities/check-conflicts`
- **Algorithm**: 3-case overlap detection (Before/During/After)
- **Warnings**:
  - 🔴 **Location Conflicts** (ERROR): Same room, overlapping time
  - 🟡 **Schedule Warnings** (WARNING): Teacher has activity within ±3 hours
- **Performance**: Debounced checks (800ms), async validation

#### 2. Permission Matrix
- **Roles**: Admin, Teacher, Student
- **Operations**: 15 actions (Create, View, Edit, Delete, Approve, Register, etc.)
- **Visibility Rules**:
  - Teacher: View all published activities (avoid conflicts)
  - Student: View activities for enrolled classes only
  - Admin: View all activities

#### 3. Documentation Structure
- **PERMISSIONS_AND_BUSINESS_RULES.md** (1,400+ lines):
  - Section 1: Permission Matrix (3 tables)
  - Section 2: Visibility Rules
  - Section 3: Conflict Detection algorithms
  - Section 4: 6 Business Scenarios
  - Section 5: 6 Edge Cases
  - Section 6: Implementation Guide
  - Section 7: Summary Checklist
  
- **LOGIC_MOI_QUAN_HE.md** (500+ lines):
  - 4 Relationships: Teacher-Activities-Classes-Students
  - Max Participants dropdown logic
  - 7 Query patterns
  - Performance indexes

### Files Modified

**Code**:
- `src/app/api/activities/check-conflicts/route.ts` (NEW)
- `src/components/ActivityDialog.tsx` (ENHANCED)
- `src/app/teacher/activities/page.tsx` (UPDATED)

**Documentation**:
- `de-tai/PERMISSIONS_AND_BUSINESS_RULES.md` (NEW)
- `de-tai/LOGIC_MOI_QUAN_HE.md` (NEW)
- `de-tai/NHAT-KY-THUC-HIEN.md` (UPDATED)
- `de-tai/11-PHU-LUC.md` (UPDATED)
- `de-tai/README.md` (UPDATED)
- `06-CHANGELOG.md` (UPDATED)
- `02-PROGRESS.md` (UPDATED)

### Success Metrics
- ✅ 100% permission rules documented
- ✅ Conflict detection accuracy: 100%
- ✅ Documentation coverage: 2,400+ lines
- ✅ 0 TypeScript errors
- ✅ Code review: Passed

---

## 📦 VERSION 1.1.0 - CRITICAL GAPS

**Target Release**: 15/12/2025 (4 weeks)  
**Theme**: Complete essential features + Fix blocking UX issues  
**Status**: 🟡 In Progress (25% complete)

### Features (8 items)

| # | Feature | Priority | Complexity | Owner | Status | Dependencies |
|---|---------|----------|------------|-------|--------|--------------|
| 1 | Student QR Check-in Page | 🔴 CRITICAL | 2 days | - | ✅ Done | QR scanner component |
| 2 | Teacher Edit Activity UI | 🔴 CRITICAL | 3 days | - | ✅ Done | Activity API |
| 3 | Replace alert() with Toast | 🔴 CRITICAL | 2 days | - | ✅ Done | react-hot-toast |
| 4 | Navigation Responsive Fix | 🔴 CRITICAL | 1 day | - | ✅ Done | lucide-react |
| 5 | Student Recommendations | 🟡 HIGH | 3 days | - | ✅ Done | Participation data |
| 6 | Admin Dashboard Panels | 🟡 HIGH | 2 days | - | ✅ Done | system-health API |
| 7 | Bulk Approve Activities | 🟡 MEDIUM | 2 days | - | ✅ Done | Approval API |
| 8 | Password Self-Service | 🟡 MEDIUM | 3 days | - | ✅ Done | Request/Reset password APIs |

**Completed**: 6/8 (75%)  
**Story Points**: 18 total, 12 completed  
**Estimated Completion**: 08/12/2025

### Technical Improvements (5 items)

| # | Issue | Type | Impact | Status | ETA |
|---|-------|------|--------|--------|-----|
| 1 | Database Transactions | Security | 🔴 CRITICAL | ⬜ Planned | Week 49 |
| 2 | Race Condition Fixes | Security | 🔴 CRITICAL | ⬜ Planned | Week 49 |
| 3 | Error Boundaries | Stability | 🔴 CRITICAL | ⬜ Planned | Week 49 |
| 4 | Request Debouncing | Performance | 🟡 HIGH | ⬜ Planned | Week 50 |
| 5 | Database Indexes | Performance | 🟡 HIGH | ⬜ Planned | Week 50 |

### Success Criteria

- [ ] 90%+ feature completion (99/110 features)
- [ ] All 8 critical gaps closed
- [ ] 0 alert() calls in codebase
- [ ] Navigation responsive on all screen sizes
- [ ] All transactions atomic
- [ ] 87%+ test coverage

### Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Bulk approve requires complex UI | Medium | Medium | Start with simple table view + checkboxes |
| Password reset needs email | High | High | Use admin-assisted flow instead |
| Database transactions break existing code | Medium | High | Comprehensive integration testing |
| Recommendation algorithm accuracy | Low | Medium | Use simple rule-based approach first |

---

## 🎨 VERSION 1.2.0 - UX EXCELLENCE

**Target Release**: 31/01/2026 (12 weeks from 1.1.0)  
**Theme**: Polish user experience to production-grade  
**Status**: ⬜ Planned

### UX Improvements (45 items total)

#### Critical UX Issues (18 items - All must be fixed)

| # | Issue | Current State | Target State | Complexity | Priority |
|---|-------|---------------|--------------|------------|----------|
| 1 | ~~Alert() blocking UI~~ | ~~27 instances~~ | ~~Toast notifications~~ | ~~2 days~~ | ✅ Done |
| 2 | Loading states block UX | Full-screen spinners | Skeleton loaders | 3 days | 🔴 CRITICAL |
| 3 | No error boundaries | Crashes crash app | Graceful fallbacks | 2 days | 🔴 CRITICAL |
| 4 | ~~Navigation overflow~~ | ~~11+ links overflow~~ | ~~Hamburger menu~~ | ~~1 day~~ | ✅ Done |
| 5 | No optimistic UI | Wait for server | Instant feedback | 4 days | 🔴 CRITICAL |
| 6 | No request caching | Redundant fetches | Cache with SWR | 2 days | 🔴 CRITICAL |
| 7 | AuthContext retry loop | Infinite retries | Exponential backoff | 1 day | 🔴 CRITICAL |
| 8 | No double submit prevention | Race conditions | Disabled buttons | 1 day | 🔴 CRITICAL |
| 9 | Inconsistent error messages | Various formats | Standardized toast | 2 days | 🔴 CRITICAL |
| 10 | No network error detection | Generic errors | Offline banner | 2 days | 🔴 CRITICAL |
| 11 | No landing page separation | Auth check delay | Public landing page | 2 days | 🔴 CRITICAL |
| 12 | Duplicate fetch logic | Copy-paste code | Shared hooks | 3 days | 🔴 CRITICAL |
| 13 | No input validation (FE) | Server errors only | Client-side zod | 3 days | 🔴 CRITICAL |
| 14 | No performance logging | No metrics | Performance API | 2 days | 🔴 CRITICAL |
| 15 | Missing DB indexes | Slow queries | Indexed columns | 1 day | 🔴 CRITICAL |
| 16 | No form auto-save | Lost on navigate | localStorage save | 2 days | 🟡 HIGH |
| 17 | No search autocomplete | Manual typing | Fuzzy search | 3 days | 🟡 HIGH |
| 18 | No keyboard shortcuts | Mouse only | Cmd+K quick actions | 3 days | 🟡 HIGH |

#### High Priority UX Issues (27 items)

**Top 10**:
1. Infinite scroll (Load all data at once)
2. Bulk actions (Time consuming for admins)
3. Undo capability (Mistakes are permanent)
4. Multi-step progress (No visual feedback)
5. Tooltips/help text (Missing guidance)
6. Form validation feedback (Unclear errors)
7. Table sorting/filtering (Manual search)
8. Export multiple formats (CSV only)
9. Drag-drop for lists (Awkward reordering)
10. Mobile-first design (Desktop-centric)

**Full list**: See [4.2-UX_AUDIT.md](4.2-UX_AUDIT.md)

### Performance Targets

| Metric | Current | Target v1.2 | Measurement |
|--------|---------|-------------|-------------|
| **API Response Time** | < 300ms | < 200ms | P95 latency |
| **Page Load Time** | < 2s | < 1s | First contentful paint |
| **Database Queries** | < 20ms | < 10ms | P95 latency |
| **Cache Hit Rate** | 0% | > 80% | Request cache ratio |
| **Test Coverage** | 85% | 90% | Jest + Vitest |
| **Lighthouse Score** | 75 | 90+ | Performance |

### Success Criteria

- [ ] 95%+ feature completion (105/110 features)
- [ ] All 18 critical UX issues fixed
- [ ] All 27 high-priority UX issues fixed
- [ ] < 200ms API response time (P95)
- [ ] 90%+ test coverage
- [ ] Lighthouse performance score > 90
- [ ] 0 accessibility violations (WCAG AA)

### Dependency Decisions

| Decision Ref | Topic | Status | Target |
|--------------|-------|--------|--------|
| P001 | Rate limiting strategy | ⬜ Pending | Dec 2025 |
| P002 | Token refresh / rotation | ⬜ Pending | Dec 2025 |
| P005 | E2E test framework | ⬜ Pending | Dec 2025 |

---

## 🔗 DEPENDENCY MAP

### Critical Path (v1.1.0 → v1.2.0)

```
v1.0.0 (DONE)
  ↓
Student QR Check-in (DONE) ────┐
Teacher Edit Activity (DONE) ──┤
Alert → Toast (DONE) ──────────┤
Navigation Fix (DONE) ─────────┤
Recommendations (DONE) ────────┤
Admin Dashboard (DONE) ────────┤
  ↓                             ↓
Bulk Approve ──────────────────┤
Password Self-Service ─────────┤
  ↓                             ↓
Database Transactions ─────────┤
Race Condition Fixes ──────────┤
Error Boundaries ──────────────┤
  ↓                             ↓
v1.1.0 (Target: 15/12/2025)
  ↓
Optimistic UI ─────────────────┐
Request Caching ───────────────┤
Performance Logging ───────────┤
  ↓                             ↓
v1.2.0 (Target: 31/01/2026)
```
```

### Feature Dependencies

| Feature | Depends On | Blocks |
|---------|-----------|--------|
| Bulk Approve | Approval API | - |
| Password Reset | Email service | - |
| Optimistic UI | Request caching | - |

### Technical Dependencies

| Technology | Version | Purpose | Migration Path |
|------------|---------|---------|----------------|
| SQLite | 3.x | Database | → PostgreSQL (v2.0+) |
| In-Memory Cache | Custom | Caching | → Redis (v2.0+) |
| JWT Stateless | HS256 | Auth | → Refresh tokens (v1.1) |
| Bcrypt | 12 rounds | Hashing | → Argon2id (v2.0) |
| React 19 | Latest | Frontend | - |
| Next.js 15 | Latest | Framework | - |

---

## 🎯 DECISION POINTS

### Immediate Decisions (Dec 2025)

1. **Rate Limiting Strategy** (P001)
   - Options: In-memory vs Redis
   - Criteria: Offline capability, scalability
   - Impact: Auth endpoint security

2. **Token Refresh Mechanism** (P002)
   - Options: Sliding expiration vs Refresh tokens
   - Criteria: UX (seamless) vs Security (rotation)
   - Impact: Session management

3. **E2E Test Framework** (P005)
   - Options: Playwright vs Cypress
   - Criteria: TypeScript support, speed, debuggability
   - Impact: Test coverage targets

### Near-Term Decisions (Jan 2026)

4. **Database Migration** (P003)
   - Trigger: SQLite file > 500MB OR write contention
   - Options: PostgreSQL, MySQL
   - Impact: Operations complexity, feature richness

5. **Centralized Cache** (P004)
   - Trigger: Horizontal scaling needed
   - Options: Redis, Memcached
   - Impact: Multi-instance support

---

## 👥 RESOURCE ALLOCATION

### Team Structure (Current)

- **Development**: 2 full-time engineers
- **QA**: 1 part-time tester
- **DevOps**: 0 (automated CI/CD)
- **Product**: 1 part-time PM

### Hiring Roadmap

| Role | Timeframe | Justification |
|------|-----------|---------------|
| **DevOps Engineer** | Q4 2026 | Scaling & infrastructure |
| **Designer (UX/UI)** | Q1 2026 | UX excellence (v1.2) |
| **QA Engineer** (full-time) | Q2 2026 | Test coverage > 90% |

### Budget Allocation (2026)

| Category | Q1 | Q2 | Q3 | Q4 | Total |
|----------|----|----|----|----|-------|
| **Personnel** | $30K | $40K | $50K | $60K | $180K |
| **Infrastructure** | $2K | $3K | $4K | $5K | $14K |
| **Tools/Licenses** | $1K | $1K | $1K | $1K | $4K |
| **Training** | $2K | $3K | $2K | $3K | $10K |
| **Contingency** | $5K | $5K | $5K | $5K | $20K |
| **TOTAL** | **$40K** | **$52K** | **$62K** | **$74K** | **$228K** |

---

## 🏆 MILESTONES & SUCCESS CRITERIA

### Milestone 1: Critical Gaps Closed ✅ ACHIEVED (08/12/2025)

**Criteria**:
- ✅ Student QR check-in working
- ✅ Teacher can edit activities
- ✅ All alert() replaced with toast
- ✅ Navigation responsive
- ✅ Recommendations implemented
- ✅ Admin dashboard panels

**Result**: 6/6 criteria met → v1.1.0 achieved early

### Milestone 2: UX Excellence 🎯 TARGET (31/01/2026)

**Criteria**:
- [ ] All CRITICAL UX issues fixed (18 items)
- [ ] All HIGH UX issues fixed (27 items)
- [ ] Error boundaries implemented
- [ ] Optimistic UI pattern
- [ ] Request caching (>80% hit rate)
- [ ] Performance < 200ms (P95)
- [ ] 95%+ feature completion

**Progress**: 18% (4/22 critical items done)

---

## 📊 VELOCITY TRACKING

### Historical Velocity

| Period | Features Completed | Story Points | Velocity (pts/week) |
|--------|-------------------|--------------|---------------------|
| Week 44 (28/10-03/11) | 8 | 21 | 21 |
| Week 45 (04/11-10/11) | 12 | 34 | 34 |
| Week 46 (11/11-17/11) | 15 | 42 | 42 |
| Week 47 (18/11-24/11) | 0 | 0 | 0 (docs only) |
| Week 48 (25/11-01/12) | 6 | 12 | 12 |
| **Average** | **8.2** | **21.8** | **22 pts/week** |

### Forecasted Completion

Based on 22 pts/week velocity:

| Target | Remaining Points | ETA | Confidence |
|--------|------------------|-----|------------|
| v1.1.0 (90% features) | 6 pts | 08/12/2025 | ✅ Done |
| v1.2.0 (95% features) | 48 pts | 31/01/2026 | 🟢 High |

---

## 📝 CHANGELOG INTEGRATION

This roadmap integrates with:
- **3.5-CHANGELOG.md**: Version history tracking
- **1.4-PROJECT_STATUS.md**: Current sprint status
- **6.2-DECISION_LOG.md**: Technical decisions (P001-P005)
- **4.2-UX_AUDIT.md**: UX issue backlog

**Update Frequency**: Monthly (or after major milestones)

---

## 🔗 REFERENCES

- [1.3-FEATURES_CHECKLIST.md](1.3-FEATURES_CHECKLIST.md) - Complete feature matrix
- [1.4-PROJECT_STATUS.md](1.4-PROJECT_STATUS.md) - Current status details
- [3.5-CHANGELOG.md](3.5-CHANGELOG.md) - Version history
- [6.2-DECISION_LOG.md](6.2-DECISION_LOG.md) - Pending decisions
- [4.2-UX_AUDIT.md](4.2-UX_AUDIT.md) - Technical debt inventory

---

**Last Updated**: 22/11/2025  
**Next Review**: 30/12/2025  
**Maintained By**: Development Team  
**Feedback**: Submit issues to project backlog
