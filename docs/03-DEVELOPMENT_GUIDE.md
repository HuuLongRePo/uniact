# 👨‍💻 HƯỚNG DẪN PHÁT TRIỂN

**Dành cho**: Các nhà phát triển làm việc trên UniAct  
**Cập nhật Lần Cuối**: 08/12/2025  
**Trạng Thái**: Hoàn Thành cho Giai Đoạn 1-2

---

## 📚 Điều Hướng Nhanh

1. **[Vấn Đề Chất Lượng Mã](#vấn-đề-chất-lượng-mã)** - 42 vấn đề cần sửa
2. **[Chiến Lược Kiểm Thử](#chiến-lược-kiểm-thử)** - Unit, Integration, E2E
3. **[Thành Phần Dùng Chung](#thành-phần-dùng-chung)** - Thành phần tái sử dụng
4. **[Tiêu Chuẩn Mã Hóa](#tiêu-chuẩn-mã-hóa)** - Thực tiễn tốt nhất
5. **[Các Mẫu Phổ Biến](#các-mẫu-phổ-biến)** - Các mẫu được sử dụng trong mã
6. **[Performance Guidelines](#performance-guidelines)** - Optimization tips

---

## 🔒 Scope Guard

**Phạm vi**: Module quản lý hoạt động ngoại khóa/phong trào cho 3 vai trò (Admin/Teacher/Student) trên nền tảng web (Next.js App Router), REST API nội bộ, cơ sở dữ liệu SQLite, UI responsive (375px–1920px), vận hành offline trên LAN.

**Ngoài phạm vi**: AI/ML (tự chấm điểm, dự báo, chatbot), ứng dụng di động (iOS/Android), integration hub đa hệ, gamification mở rộng, blockchain chứng chỉ, AR/VR. Duy trì và ưu tiên các hạng mục xác thực nâng cao trong phạm vi hiện tại.

**Giới hạn/giả định**: Offline-first ở mức web; email khôi phục mật khẩu có thể thay bằng quy trình hỗ trợ thủ công; không yêu cầu push notification di động; không phụ thuộc dịch vụ đám mây.

**Hook tương lai**: Chuẩn hóa API để có thể cắm SSO/SMTP/Redis/PostgreSQL khi mở rộng; thiết kế mã nguồn giữ điểm móc nhưng không cam kết timeline triển khai các hạng mục ngoài phạm vi.

---

## 🔍 Vấn Đề Chất Lượng Mã

### Vấn Đề Quan Trọng (Sửa Trước)

#### 1. Xóa Chú Thích TODO (Ưu Tiên: CAO)
| File | Dòng | Vấn Đề | Sửa |
|------|------|-------|-----|
| src/app/admin/students/page.tsx | 221 | Load classes dynamically | Implement dropdown loading from DB |
| src/app/admin/students/page.tsx | 301 | Add Modal - Not implemented | Use new <Modal> component |
| src/lib/retry-logic.ts | 139 | @deprecated decorator | Remove deprecated function |
| src/lib/toast.ts | 94 | Commented import | Delete dead code |

**Status**: ✅ Already completed in Phase 2

---

#### 2. Refactor Large Files (Priority: HIGH, 6 hours)

| File | Size | Issues | Split Into | Status |
|------|------|--------|-----------|--------|
| src/lib/database.ts | 742L | Too many exports, mixed concerns | db-core.ts, db-queries.ts, db-helpers.ts | 🔴 TODO |
| src/app/admin/scoring-config/page.tsx | 678L | Giant page component | ScoreForm, FormulaEditor, PreviewPanel | 🔴 TODO |
| src/app/admin/users/page.tsx | 467L | Multiple responsibilities | UserTable, UserDialog, UserFilters | 🔴 TODO |
| src/app/admin/students/page.tsx | 479L | Multiple concerns | StudentTable, StudentFilters, StudentActions | 🔴 TODO |
| src/app/admin/approvals/page.tsx | 382L | Too complex | ApprovalList, ApprovalForm | 🔴 TODO |
| src/app/admin/audit-logs/page.tsx | 392L | Complex with modals | AuditTable, AuditFilters, DetailModal | 🔴 TODO |
| src/lib/scoring.ts | 352L | Complex logic | ScoringFormula, ScoringCalculator | 🔴 TODO |
| src/components/Sidebar.tsx | 395L | Bloated navigation | SidebarMenu, UserMenu, MenuItems | 🔴 TODO |
| src/app/admin/classes/[id]/students/page.tsx | 379L | Multiple modals | StudentList, MoveDialog, ActionButtons | 🔴 TODO |

**Strategy**: Extract into smaller, focused components. Start with database.ts.

---

#### 3. API Consistency (Priority: HIGH)
| Endpoint | Current Issue | Target Fix |
|----------|---------------|-----------|
| POST /api/users/*/reset-password | Inconsistent error response | Standardize to ApiErrorResponse |
| POST /api/activities/*/upload | Success response varies | Use successResponse() helper |
| PUT /api/users/*/move-class | Missing error codes | Add 400/409/500 mappings |
| DELETE endpoints | Soft delete unclear | Document soft vs hard delete |
| All error responses | "error" vs "message" | Standardize to ApiErrorResponse |
| Pagination | Not all implement pagination | Add limit/offset support |

**Status**: ✅ Api-response.ts framework ready. Implement in each endpoint.

---

#### 4. Unused/Deprecated Code (Priority: MEDIUM)
| Code | Location | Action |
|------|----------|--------|
| WebAuthn functions | src/lib/webauthn.ts | Complete implementation or remove |
| Internet blocker | src/lib/internet-blocker.ts | Check if duplicate with network-status.tsx |
| Security questions | src/lib/security-questions.ts | Remove if unused |
| Recommendation engine | src/lib/recommendation-engine.ts | Complete or remove |
| Archived files | src/templates/ | Move to /archived folder |

**Status**: 🟡 Partially done. Finish cleanup.

---

### Missing Features (Priority: HIGH, 18.5 hours total)

| Feature | UC ID | Status | Est. Time | Blocker |
|---------|-------|--------|-----------|---------|
| Clone activity | UC-A21 | 0% | 2h | None |
| Ranking page (student) | UC-S12 | 0% | 1h | API ready |
| Activity types CRUD | UC-A25 | 0% | 3h | Database ready |
| File upload integration | UC-T02 | 50% | 1.5h | Component done, need API |
| Reset password email | UC-A05 | 80% | 1h | API done, email pending |
| QR expiration config | UC-A29 | 20% | 2h | Component needed |
| Award approval workflow | UC-A42 | 30% | 3h | Complex logic |
| Award types CRUD | UC-A30 | 20% | 2h | API needed |
| Session monitoring | UC-A52 | 0% | 3h | Analytics design needed |

---

### Code Duplication (Priority: MEDIUM, Already addressed in Phase 3)

**Status**: ✅ 14 shared components created (Modal, DataTable, Filters, UI)  
**Benefit**: Eliminates ~800-1000 lines of duplication

---

### Performance Issues (Priority: MEDIUM)

| Issue | Current | Target | Fix |
|-------|---------|--------|-----|
| Database indexes | ~10 | 15+ | Add composite indexes on frequently queried columns |
| N+1 queries | Some present | Zero | Eager load relations, use joins |
| Bundle size | Not measured | <500KB | Tree-shake, code split, lazy routes |
| Lazy loading | 5 pages | All pages | Dynamic import for heavy components |
| Image optimization | Raw uploads | Optimized | Compress on upload, use next/image |

---

## 🧪 Testing Strategy

### 1. Unit Testing (Vitest)

**Goal**: Test individual business logic (services, utils, helpers)

**Coverage Target**: 80%+ for critical functions

**Test files** to create/enhance:
- `test/scoring.test.ts` - Scoring calculation logic
- `test/approval.test.ts` - Approval workflow state machine
- `test/guards.test.ts` - Authorization logic
- `test/database.test.ts` - CRUD helpers

**Example test**:
```typescript
import { calculateActivityScore } from '@/lib/scoring'

test('scoring: excellent achievement x2 multiplier', () => {
  const score = calculateActivityScore({
    basePoints: 10,
    typeMultiplier: 1.0,
    levelMultiplier: 2.0,
    achievement: 'excellent'
  })
  expect(score).toBe(30) // 10 × 1.0 × 2.0 × 1.5
})
```

**Run**: `npm test`

---

### 2. Integration Testing

**Goal**: Test API routes + database interactions

**Coverage Target**: 70%+ for critical endpoints

**Test files** to create:
- `test/integration/activity-workflow.test.ts`
- `test/integration/attendance.test.ts`
- `test/integration/scoring.test.ts`
- `test/integration/approval.test.ts`

**Example test**:
```typescript
test('activity workflow: draft -> requested -> published', async () => {
  const teacherId = 12
  const adminId = 1
  const activityId = await dbHelpers.createActivity({
    status: 'draft',
    approval_status: 'draft',
    teacher_id: teacherId,
  })

  await dbHelpers.submitActivityForApproval(activityId, teacherId)
  let activity = await dbHelpers.getActivityById(activityId)
  expect(activity.status).toBe('draft')
  expect(activity.approval_status).toBe('requested')

  await dbHelpers.decideApproval(activityId, adminId, 'approve')
  activity = await dbHelpers.getActivityById(activityId)
  expect(activity.status).toBe('published')
  expect(activity.approval_status).toBe('approved')
})
```

---

### 3. E2E Testing (Multi-role scenarios)

**Goal**: Test complete user flows across multiple roles

**Coverage Target**: All critical paths

**Test scenarios**:
- **SC-01**: Multi-role login (✅ exists)
- **SC-02**: Activity lifecycle (teacher create → student register → grade)
- **SC-03**: Attendance & QR code flow
- **SC-04**: Scoring recalculation after config change
- **SC-05**: Award auto-assignment
- **SC-06**: Permission boundaries (student can't access admin)

**Current Status**: 2/6 scenarios exist. Need 4+ more.

---

### 4. Manual Testing Checklist

**Admin Workflow**:
- [ ] Dashboard shows all widgets
- [ ] Create/edit/delete activities
- [ ] View student scores
- [ ] Configure scoring formula
- [ ] Approve requested activities
- [ ] View audit logs

**Teacher Workflow**:
- [ ] Create activity
- [ ] View registered students
- [ ] Mark attendance (QR code)
- [ ] Input student scores
- [ ] Submit for approval (approval_status -> requested)

**Student Workflow**:
- [ ] Register for activity
- [ ] View registered activities
- [ ] Check participation history
- [ ] View total score & ranking

---

## 🧩 Shared Components

All components are in `src/components/` - Use these instead of creating duplicates!

### Modal Components (Modal.tsx)

```typescript
import { Modal, ConfirmDialog, FormDialog } from '@/components/Modal'

// Basic modal
<Modal isOpen={open} onClose={close} title="Edit Item">
  {children}
</Modal>

// Confirmation dialog
<ConfirmDialog
  isOpen={open}
  title="Delete item?"
  onConfirm={() => deleteItem()}
  onCancel={() => close()}
/>

// Form submission dialog
<FormDialog
  isOpen={open}
  title="Add New Item"
  onSubmit={(data) => createItem(data)}
  onCancel={() => close()}
>
  {/* Form fields */}
</FormDialog>
```

---

### Table Components (DataTable.tsx)

```typescript
import { DataTable, SimpleTable } from '@/components/DataTable'

// Advanced table with sorting, actions, loading
<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' }
  ]}
  data={students}
  actions={[
    { label: 'Edit', onClick: (item) => editItem(item) },
    { label: 'Delete', onClick: (item) => deleteItem(item) }
  ]}
  isLoading={loading}
/>

// Simple table for read-only data
<SimpleTable
  columns={[{ key: 'name', label: 'Name' }]}
  data={items}
/>
```

---

### Filter Components (Filters.tsx)

```typescript
import { FilterSelect, FilterSearch, FilterDateRange, FilterBar } from '@/components/Filters'

// Individual filters
<FilterSelect
  label="Class"
  options={classes}
  value={selectedClass}
  onChange={setSelectedClass}
/>

<FilterSearch
  placeholder="Search by name..."
  value={search}
  onChange={setSearch}
/>

<FilterDateRange
  label="Activity Date"
  startDate={startDate}
  endDate={endDate}
  onStartChange={setStartDate}
  onEndChange={setEndDate}
/>

// Combined filter bar
<FilterBar>
  <FilterSelect {...classFilter} />
  <FilterSearch {...searchFilter} />
  <FilterDateRange {...dateFilter} />
</FilterBar>
```

---

### UI Components (UI.tsx)

```typescript
import { ActionButtons, StatusBadge, LoadingButton } from '@/components/UI'

// Action buttons
<ActionButtons
  onEdit={() => editItem()}
  onDelete={() => deleteItem()}
  onView={() => viewItem()}
/>

// Status badge
<StatusBadge status="approved" /> // Auto-colored
<StatusBadgeAuto value="completed" /> // Auto-detect color

// Loading button
<LoadingButton isLoading={loading} onClick={saveItem}>
  Save Changes
</LoadingButton>
```

---

## 📋 Coding Standards

### TypeScript
- Always use strict mode: `"strict": true`
- Use interfaces for component props
- Avoid `any` type - use `unknown` + type guards
- Import types with `type` keyword: `import type { Props } from '...`

### React Components
- Use functional components (no class components)
- Extract logic into custom hooks when reusable
- Keep component files under 350 lines
- Use proper prop validation (TypeScript)

### File Organization
```
src/
├── app/           # Next.js pages & layouts
├── components/    # Reusable React components
├── lib/          # Utilities, helpers, business logic
├── types/        # TypeScript type definitions
└── features/     # Feature-specific modules
```

### Error Handling
- Use the standardized `ApiError` class:
  ```typescript
  import { ApiError, successResponse, errorResponse } from '@/lib/api-response'
  
  try {
    const user = await db.query.users.findById(id)
    return successResponse(user)
  } catch (error) {
    return errorResponse(ApiError.notFound('User not found'), 404)
  }
  ```

### Database Queries
- Always use prepared statements (database.ts helpers)
- Add indexes for frequently queried columns
- Use eager loading to avoid N+1 queries
- Log slow queries (>100ms)

---

## 🎯 Common Patterns

### API Route Handler Pattern

```typescript
import { successResponse, errorResponse, ApiError } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return errorResponse(ApiError.badRequest('Missing userId'), 400)
    }
    
    const user = await db.query.users.findById(userId)
    if (!user) {
      return errorResponse(ApiError.notFound('User not found'), 404)
    }
    
    return successResponse(user)
  } catch (error) {
    return errorResponse(ApiError.internal('Server error'), 500)
  }
}
```

### Component Hook Pattern

```typescript
import { useState, useEffect } from 'react'

export function useStudentScores(studentId: string) {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch(`/api/students/${studentId}/scores`)
        const data = await res.json()
        setScores(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchScores()
  }, [studentId])
  
  return { scores, loading, error }
}
```

### Form Validation Pattern

```typescript
import { z } from 'zod'

const activitySchema = z.object({
  name: z.string().min(3, 'Name too short'),
  type: z.enum(['learning', 'sports', 'arts', 'community', 'other']),
  points: z.number().min(0).max(100),
  maxParticipants: z.number().min(1)
})

type ActivityInput = z.infer<typeof activitySchema>

// In API route
const validated = activitySchema.parse(data)
```

---

## 🚀 Performance Guidelines

### Database Optimization
```typescript
// ❌ BAD: N+1 query
const users = await db.query.users.findAll()
users.forEach(user => {
  user.scores = await db.query.scores.findByUserId(user.id) // N queries!
})

// ✅ GOOD: Join or batch load
const users = await db.query.users.findAll({
  include: { scores: true } // Eager load
})
```

### Component Optimization
```typescript
// ❌ BAD: Re-renders all rows when data changes
<List items={items}>
  {items.map(item => <Item item={item} />)}
</List>

// ✅ GOOD: Use React.memo + stable keys
const Item = React.memo(({ item }) => (...))
<List items={items}>
  {items.map(item => <Item key={item.id} item={item} />)}
</List>
```

### Bundle Size
- Use dynamic imports for heavy components:
  ```typescript
  const HeavyComponent = dynamic(() => import('./HeavyComponent'))
  ```
- Tree-shake unused code: `"sideEffects": false` in package.json
- Monitor with `npm run build` output

---

## 📖 API Response Standard

All API endpoints should follow this pattern:

```typescript
// Success response
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}

// Error response
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": { /* optional details */ }
  }
}
```

Use the helper functions:
```typescript
successResponse(data)        // 200 OK
errorResponse(error, status) // 400/404/500
```

---

## 🔗 Related Files

---

## 🎯 BONUS POINTS MODULE

### Overview
Complete bonus points management system with teacher proposals, admin approvals, and comprehensive reporting.

**Status**: ✅ PRODUCTION READY (v1.0.0)
**Tests**: 103/103 PASSING
**Coverage**: >95%

### Architecture

**Database Tables**:
- `suggested_bonus_points` - Bonus point proposals
- `achievements` - Achievement definitions
- `role_assignments` - Teacher permissions

**API Endpoints** (6 routes):
```typescript
GET    /api/bonus/proposals              // List proposals
POST   /api/bonus/proposals              // Create proposal
PUT    /api/bonus/proposals/:id          // Edit proposal
POST   /api/bonus/proposals/:id/approve  // Approve
POST   /api/bonus/proposals/:id/reject   // Reject
GET    /api/bonus/reports                // Export reports (CSV/XLSX/JSON)
```

**UI Pages**:
- `/teacher/bonus-proposal` - Propose bonus points
- `/admin/bonus-approval` - Review & approve proposals
- `/admin/bonus-reports` - View & export reports

### Calculation Engine

**Files**:
- `src/lib/bonus-engine.ts` - Core calculation logic
- `src/lib/bonus-reports.ts` - Reporting & export

**Weight System**:
```typescript
interface BonusConfig {
  weights: { activity: 1.0, achievement: 2.0, development: 1.5 }
  dailyMax: 15,
  weeklyMax: 50,
  semesterMax: 100
}

Formula: min(basePoints × weight × multiplier, dailyMax, weeklyMax, semesterMax)
```

### Reports & Export

**Report Types**:
1. **Student Report** - Individual bonus breakdown
2. **Class Report** - Class-wide statistics
3. **Semester Report** - School-wide analytics

**Export Formats**:
```
CSV   ✅ Compatible with Excel, Google Sheets
XLSX  ✅ Native Excel format with formatting
JSON  ✅ Raw data for API consumption
```

### Testing

**Test Categories** (347 total - 100% passing):
- **P0 Critical** (136 tests): Bonus approval, Awards, RBAC, Apply-to logic, Data integrity
- **P1 High Priority** (97 tests): Admin CRUD, Teacher activities, Student dashboard
- **Integration** (12 tests): End-to-end workflows (10 steps)
- **P2 Optional** (102 tests): Advanced filtering, edge cases, performance

**Run Tests**:
```bash
# All tests
npm test

# Specific modules
npm test -- bonus                # Bonus module only
npm test -- awards              # Awards system
npm test -- security-rbac       # Permission tests
npm test -- teacher-activity    # Teacher workflow

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

**Test Framework**: Vitest + Playwright
- **Vitest**: Unit & integration tests for API routes, business logic
- **Playwright**: E2E browser tests for UI workflows

**Coverage**: ~90% (347/347 passing, 0 failures)

---

### 📋 UAT Testing Guide

**Testing by Actor Role** (see `docs/UAT_BY_ACTOR.md` archived):

#### 👨‍💼 Admin Testing Checklist
1. **User Management**
   - Create/Edit/Delete users (admin/teacher/student)
   - Bulk import/export users
   - Reset passwords
   - Lock/unlock accounts
   - Assign class to teacher (GVCN)

2. **Class Management**
   - Create/Edit/Delete classes
   - View class students
   - Transfer students between classes

3. **Activity Approval**
   - View requested approvals
   - Approve/Reject activities
   - View all activities (any teacher)

4. **Reports & Analytics**
   - Teacher performance reports
   - Student score reports
   - Activity statistics
   - Class participation reports
   - Export to CSV/XLSX

5. **Bonus & Awards**
   - Review bonus suggestions
   - Approve/Reject bonuses
   - Manual award creation
   - View award history

#### 👨‍🏫 Teacher Testing Checklist
1. **Activity Management**
   - Create draft activity
   - Submit for approval (draft stays draft, approval_status -> requested)
   - Edit/Clone/Cancel activities
   - View only own activities (unless admin)

2. **Participant Management**
   - Add individual students
   - Add entire class (bulk)
   - Remove participants
   - View participant list with metadata

3. **Attendance**
   - Create QR code session
   - Students scan QR → auto-mark attended
   - Manual attendance marking
   - Bulk attendance upload
   - View attendance history

4. **Evaluation**
   - Evaluate participant performance (excellent/good/average)
   - Add achievement notes
   - Submit evaluations
   - View evaluation history

5. **Reporting**
   - View class activity participation
   - Export attendance/evaluation reports
   - View student scores in managed classes

#### 👨‍🎓 Student Testing Checklist
1. **Activity Discovery**
   - View published activities (filtered by enrolled classes only)
   - Search/filter activities (date, type, status)
   - View activity details (location, time, description)

2. **Registration**
   - Register for published activities
   - View registration status
   - Cancel registration (before deadline)

3. **Attendance**
   - Scan QR code to mark attendance
   - View attendance confirmation
   - See real-time attendance status

4. **Scores & Grades**
   - View total training points (điểm rèn luyện)
   - View points by category (học_tập/rèn_luyện)
   - View points by activity
   - See achievement level per activity
   - View bonus/award history

5. **Dashboard**
   - View upcoming activities
   - See participation statistics
   - View notifications/alerts

---

### 🔍 Manual Testing Checklist

**Browser Compatibility** (see `docs/BROWSER_UAT_CHECKLIST.md` archived):
- ✅ Chrome/Edge (Windows, macOS, Linux)
- ✅ Firefox (Windows, macOS, Linux)
- ✅ Safari (macOS, iOS)
- ✅ Mobile browsers (iOS Safari, Android Chrome)

**Responsive Testing**:
- Desktop: 1920×1080, 1366×768
- Tablet: 768×1024 (iPad)
- Mobile: 375×667 (iPhone SE), 414×896 (iPhone XR)

**Accessibility**:
- Keyboard navigation (Tab, Enter, Esc)
- Screen reader compatibility (ARIA labels)
- Color contrast (WCAG AA)

**Performance**:
- Page load < 2s (localhost)
- API response < 500ms
- QR code generation < 100ms
- Export XLSX < 3s (1000 rows)

---

### 🎯 Test Scenarios (see `docs/COMPREHENSIVE_TEST_SCENARIOS.md` archived)

**Complete Workflow Test (10 steps)**:
1. Teacher creates activity (draft)
2. Teacher submits for approval (status stays draft, approval_status=requested)
3. Admin approves (status=published, approval_status=approved)
4. Students register (3 students)
5. QR attendance recorded
6. Teacher evaluates (excellent/good/average)
7. Points auto-calculated (15+12+10=37)
8. Bonus rules auto-apply
9. Admin approves bonus
10. Student verifies final grades

**Expected Results**: All steps complete without errors, points correctly calculated, audit trail complete

---

### Related Testing Files

- **test/uat/** - Playwright E2E tests
- **test/*.test.ts** - Vitest unit tests
- **scripts/test-*.sh** - Bash API smoke tests
- **docs/MANUAL_TEST_CHECKLIST.md** (archived) - Manual UAT checklist
- **docs/UAT_AUTOMATION_GUIDE.md** (archived) - Playwright setup guide

### Implementation Checklist

For new developers adding features to bonus module:

- [ ] Add migration for new tables (idempotent)
- [ ] Implement API route with auth checks
- [ ] Add input validation with Zod
- [ ] Write tests (unit + integration)
- [ ] Update UI components
- [ ] Add error handling
- [ ] Update documentation
- [ ] Test with sample data
- [ ] Code review by lead developer

### Common Tasks

**Add New Bonus Source Type**:
```typescript
// 1. Update enum in types
type SourceType = 'activity' | 'achievement' | 'development' | 'your_type'

// 2. Set weight in engine
const weights = { your_type: 1.5 }

// 3. Add validation
sourceTypeSchema.enum([..., 'your_type'])

// 4. Test calculation
test('calculate your_type bonus', () => {
  const points = calculateBonus({
    sourceType: 'your_type',
    basePoints: 10,
    multiplier: 1
  })
  expect(points).toBe(15) // 10 × 1.5 weight × 1 multiplier
})
```

**Extend Report Functionality**:
```typescript
// 1. Add new report function in bonus-reports.ts
export async function getCustomBonusReport(params) {
  // Implement query logic
}

// 2. Add export function
export async function exportCustomReportAsXLSX(params): Promise<Buffer> {
  // Implement XLSX export
}

// 3. Add API endpoint handler
if (reportType === 'custom') {
  const buffer = await exportCustomReportAsXLSX(params)
}

// 4. Test the export
test('export custom report as XLSX', async () => {
  const buffer = await exportCustomReportAsXLSX(params)
  expect(buffer).toBeInstanceOf(Buffer)
  expect(buffer.length).toBeGreaterThan(0)
})
```

### Related Files

- **src/lib/bonus-engine.ts** (350L) - Calculation logic
- **src/lib/bonus-reports.ts** (420L) - Reports & export
- **src/app/api/bonus/** - API endpoints
- **src/app/teacher/bonus-proposal/page.tsx** - Teacher UI
- **src/app/admin/bonus-approval/page.tsx** - Admin approval UI
- **src/app/admin/bonus-reports/page.tsx** - Reports UI
- **test/bonus*.test.ts** - Test files (4 files, 103 tests)
- **BONUS_MODULE_SUMMARY.md** - Detailed module documentation

---

## 🔗 Module Documentation

- **[BONUS_MODULE_SUMMARY.md](BONUS_MODULE_SUMMARY.md)** - Complete module overview
- **[TEACHER_INCOMPLETE_TASKS.md](TEACHER_INCOMPLETE_TASKS.md)** - Task tracking
- **Related Files**
- **src/lib/api-response.ts** - Response standardization
- **src/components/Modal.tsx** - Modal components
- **src/components/DataTable.tsx** - Table components
- **src/components/Filters.tsx** - Filter components
- **src/components/UI.tsx** - UI components
- **test/** - All test files

---

**Last Updated**: 14/12/2025  
**Next Review**: 21/12/2025  
**Maintainer**: UniAct Dev Team
