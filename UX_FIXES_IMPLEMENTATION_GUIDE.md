# UniAct UX/UI Fixes Implementation Guide

**Status**: 5 High-Priority UX Gaps Identified  
**Effort**: ~8-12 hours for full implementation  
**Priority**: Must complete before launch

---

## Gap #1: Missing Empty State in Student Activities List

**Location**: `src/app/student/activities/page.tsx`  
**Issue**: When no activities match filters, shows blank area  
**Impact**: Users confused about whether data is loading or empty

### Fix Implementation

```typescript
// src/app/student/activities/page.tsx
import EmptyState from '@/components/EmptyState';
import ActivitySkeleton from '@/components/ActivitySkeleton';

export default function StudentActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [filters]);

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  // ✅ FIX: Add empty state
  if (activities.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="Không có hoạt động"
        description={`No activities match the "${currentFilter}" filter. Try clearing filters to see all activities.`}
        action={{
          label: 'Xóa bộ lọc',
          onClick: () => clearFilters(),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

**Files to Update**:
- `src/app/student/activities/page.tsx` - Add EmptyState component
- `src/app/teacher/activities/page.tsx` - Add EmptyState component
- `src/app/admin/approvals/page.tsx` - Add EmptyState component
- `src/app/admin/users/page.tsx` - Add EmptyState component

---

## Gap #2: Missing Loading Skeleton in Activity Fetch

**Location**: `src/app/admin/approvals/ApprovalList.tsx`  
**Issue**: Shows "Đang tải..." text but not actual skeleton matching list layout  
**Impact**: Inconsistent user experience, perceived slowness

### Fix Implementation

```typescript
// Example in src/app/admin/approvals/page.tsx
import ActivitySkeleton from '@/components/ActivitySkeleton';

export default function ApprovalsPage() {
  const { activities, isLoading } = useActivities({ status: 'pending' });

  // ✅ FIX: Replace text loader with skeleton
  if (isLoading) {
    return <ActivitySkeleton />;  // Shows 4 shimmer rows
  }

  return <ApprovalList activities={activities} />;
}
```

**Affected Components**:
- `src/app/admin/approvals/ApprovalList.tsx` - Loading state
- `src/app/teacher/activities/PageActivityList.tsx` - Loading state
- `src/app/student/activities/page.tsx` - Loading state
- `src/app/admin/users/UserList.tsx` - Loading state

---

## Gap #3: Missing Success Toast After Mutations

**Location**: All mutation endpoints (POST/PUT/DELETE)  
**Issue**: After form submission, only page refresh but no toast notification  
**Impact**: Users unsure if action succeeded

### Fix Implementation

```typescript
// Example in src/app/teacher/activities/page.tsx
import { useToast } from '@/hooks/useToast';

export default function CreateActivity() {
  const { toast } = useToast();

  async function handleCreate(formData: ActivityFormData) {
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create activity');

      const data = await response.json();

      // ✅ FIX: Show success toast
      toast.success('Hoạt động được tạo thành công');

      // Redirect after brief delay
      setTimeout(() => {
        router.push(`/activities/${data.activity.id}`);
      }, 1000);
    } catch (error) {
      // ✅ FIX: Show error toast
      toast.error(error.message || 'Lỗi tạo hoạt động');
    }
  }

  return (
    <form onSubmit={handleCreate}>
      {/* Form fields */}
      <button type="submit">Tạo</button>
    </form>
  );
}
```

**Required Toast Library Setup** (if not already present):

```typescript
// src/hooks/useToast.ts
import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export const useToastStore = create<{
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
}>((set) => ({
  toasts: [],
  add: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString() },
      ],
    })),
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function useToast() {
  const store = useToastStore();

  return {
    success: (message: string) =>
      store.add({ type: 'success', message }),
    error: (message: string) =>
      store.add({ type: 'error', message }),
    warning: (message: string) =>
      store.add({ type: 'warning', message }),
    info: (message: string) =>
      store.add({ type: 'info', message }),
    toast: store,
  };
}
```

---

## Gap #4: N+1 Query Pattern in Teacher Reports

**Location**: `src/app/api/teacher/reports/attendance/student-summary/route.ts`  
**Issue**: Loops through students, then queries attendance per student  
**Impact**: 100+ students = 100+ database queries (vs 1 optimized query)

### Fix Implementation

**BEFORE (N+1 pattern)**:
```typescript
const students = await dbAll(
  `SELECT id, name, email FROM users WHERE class_id = ?`, [classId]
);

// ❌ WRONG: Loop executes N queries
const result = await Promise.all(
  students.map(async (student) => {
    const attendance = await dbAll(
      `SELECT COUNT(*) as count FROM attendance WHERE student_id = ?`,
      [student.id]
    );
    return { student, attendance_count: attendance[0].count };
  })
);
```

**AFTER (Optimized with JOIN)**:
```typescript
// ✅ CORRECT: Single query with JOIN + GROUP BY
const result = await dbAll(`
  SELECT
    s.id as student_id,
    s.name as student_name,
    s.email,
    COUNT(DISTINCT a.id) as attendance_count,
    COUNT(DISTINCT CASE WHEN a.status = 'attended' THEN a.id END) as attended_count,
    COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.id END) as absent_count
  FROM users s
  LEFT JOIN attendance a ON s.id = a.student_id
  WHERE s.class_id = ? AND s.role = 'student'
  GROUP BY s.id
  ORDER BY s.name
`, [classId]);
```

**Affected Endpoints**:
- `src/app/api/teacher/reports/attendance/student-summary/route.ts`
- `src/app/api/teacher/reports/participation/class-summary/route.ts`
- `src/app/api/admin/users/route.ts` (GET list with counts)

---

## Gap #5: Mobile Responsiveness in Data Tables

**Location**: `src/app/admin/users/UserTable.tsx`, `src/app/admin/approvals/ApprovalList.tsx`  
**Issue**: Wide tables don't wrap on mobile—horizontal scroll required  
**Impact**: Unusable interface on phones/tablets

### Fix Implementation

**Create Mobile-Friendly Table Component**:

```typescript
// src/components/ResponsiveTable.tsx
interface ResponsiveTableProps {
  columns: {
    key: string;
    label: string;
  }[];
  data: any[];
  onRowClick?: (row: any) => void;
}

export default function ResponsiveTable({
  columns,
  data,
  onRowClick,
}: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop table - visible on md+ screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              {columns.map((col) => (
                <th key={col.key} className="text-left p-3 font-medium text-sm">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="p-3 text-sm">
                    {String(row[col.key] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view - visible on sm screens */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border p-4 cursor-pointer"
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between py-2 border-b last:border-0">
                <span className="font-medium text-sm text-gray-600">{col.label}</span>
                <span className="text-sm text-gray-900">{String(row[col.key] || '-')}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

**Usage in Pages**:

```typescript
// src/app/admin/users/page.tsx
import ResponsiveTable from '@/components/ResponsiveTable';

export default function UsersPage() {
  return (
    <ResponsiveTable
      columns={[
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'is_active', label: 'Status' },
      ]}
      data={users}
      onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
    />
  );
}
```

---

## Implementation Checklist

### Phase 1: Empty States (2 hours)
- [ ] Install/update EmptyState component
- [ ] Add to: activities list, approvals, users, notifications, bonus proposals
- [ ] Test with filters + empty results
- [ ] Verify responsive on mobile

### Phase 2: Loading Skeletons (2 hours)
- [ ] Update ActivitySkeleton component
- [ ] Create UserTableSkeleton component
- [ ] Create ReportSkeleton component
- [ ] Add to all data-fetching pages
- [ ] Animate shimmer effect

### Phase 3: Toast Notifications (2 hours)
- [ ] Implement useToast hook (if not present)
- [ ] Add ToastContainer component to layout
- [ ] Update all mutation forms (create, edit, delete)
- [ ] Test success/error cases

### Phase 4: Query Optimization (2-3 hours)
- [ ] Review `teacher/reports/*` endpoints
- [ ] Refactor N+1 patterns to JOINs
- [ ] Test performance with 500+ students
- [ ] Verify exported data accuracy

### Phase 5: Mobile Responsiveness (2-3 hours)
- [ ] Create ResponsiveTable component
- [ ] Replace old tables in admin/users, admin/approvals
- [ ] Test on iPhone 12, Android device
- [ ] Verify sorting/filtering still works
- [ ] Check touch interactions

---

## Testing Before Launch

```bash
# 1. Visual regression testing (mobile + desktop)
npm run test:e2e

# 2. Performance testing (load time check)
npm run analyze

# 3. Accessibility (keyboard navigation)
npm run lint:a11y

# 4. Build size check
npm run build -- --analyze
```

---

## Rollout Strategy

1. **Development**: Complete all 5 gaps, test locally
2. **Staging**: Deploy to staging, QA team tests on real devices
3. **Production**: Feature-flag the changes (50% users for 24h, then 100%)
4. **Monitor**: Track error rates, page load times, user feedback

---

**Estimated Timeline**: 8-12 hours development + 4 hours QA = ~2 days  
**Priority**: **CRITICAL** - Launch blockers if not completed
