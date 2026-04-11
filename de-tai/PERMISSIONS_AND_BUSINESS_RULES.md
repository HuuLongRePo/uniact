# Phân Quyền & Nghiệp Vụ Chi Tiết - Hệ Thống Quản Lý Hoạt Động

## 📋 Mục lục

1. [Permission Matrix](#1-permission-matrix)
2. [Visibility Rules](#2-visibility-rules)
3. [Conflict Detection](#3-conflict-detection)
4. [Business Scenarios](#4-business-scenarios)
5. [Edge Cases & Validation](#5-edge-cases--validation)
6. [Implementation Guide](#6-implementation-guide)

---

## 1. 🔐 Permission Matrix

### 1.1. CRUD Operations trên Activities

| Action | Admin | Teacher (Owner) | Teacher (Other) | Student |
|--------|-------|----------------|-----------------|---------|
| **CREATE** | ✅ Tạo thay cho teacher | ✅ Tạo cho mình | ❌ Không | ❌ Không |
| **READ (Own)** | ✅ Xem tất cả | ✅ Xem của mình | ✅ Xem của mình | ✅ Xem đã đăng ký |
| **READ (Others)** | ✅ Full details | ✅ **Limited view** | ✅ **Limited view** | ⚠️ **Filtered** |
| **UPDATE** | ✅ Sửa tất cả | ✅ Sửa của mình | ❌ Không | ❌ Không |
| **DELETE** | ✅ Xóa nếu DRAFT | ✅ Xóa nếu DRAFT & không có participant | ❌ Không | ❌ Không |
| **APPROVE** | ✅ Duyệt/từ chối | ❌ Không | ❌ Không | ❌ Không |
| **CANCEL** | ✅ Hủy bất cứ lúc nào | ✅ Hủy của mình (nếu published) | ❌ Không | ❌ Không |

### 1.2. Operations trên Participations

| Action | Admin | Teacher (Activity Owner) | Teacher (Other) | Student (Self) | Student (Other) |
|--------|-------|--------------------------|-----------------|----------------|-----------------|
| **Register** | ✅ Đăng ký cho bất kỳ ai | ✅ Thêm bất kỳ học viên | ❌ Không | ✅ Tự đăng ký | ❌ Không |
| **Unregister** | ✅ Hủy đăng ký cho ai cũng được | ✅ Xóa học viên | ❌ Không | ✅ Tự hủy (nếu chưa điểm danh) | ❌ Không |
| **Attendance** | ✅ Điểm danh | ✅ Điểm danh | ❌ Không | ❌ Không | ❌ Không |
| **Award Points** | ✅ Chấm điểm | ✅ Chấm điểm | ❌ Không | ❌ Không | ❌ Không |
| **View List** | ✅ Xem tất cả | ✅ Xem của hoạt động mình tạo | ❌ Không | ✅ Xem danh sách tham gia (tất cả) | ❌ Không |

### 1.3. Class & System Configuration

| Resource | Admin | Teacher | Student |
|----------|-------|---------|---------|
| **Classes** | ✅ CRUD | 🔍 Read only | 🔍 View own class |
| **Activity Types** | ✅ CRUD | 🔍 Read only | 🔍 Read only |
| **Organization Levels** | ✅ CRUD | 🔍 Read only | 🔍 Read only |
| **Users** | ✅ CRUD | 🔍 View students trong hoạt động | 🔍 View own profile |
| **System Config** | ✅ Full access | ❌ No access | ❌ No access |

---

## 2. 👁️ Visibility Rules

### 2.1. Teacher View - "Xem hoạt động của giảng viên khác"

**Use Case**: Giảng viên muốn xem hoạt động đã có để **tránh trùng lịch, nghiên cứu kế hoạch**.

#### Option A: **Full Transparency** (Recommended)

```typescript
// Teacher có thể xem TẤT CẢ hoạt động published
GET /api/activities?view=all&status=published

Response: {
  activities: [
    {
      id: 1,
      title: "Workshop Python",
      teacher_name: "Nguyễn Văn A",  // ← Hiển thị tên người tạo
      date_time: "2026-01-20 09:00",
      location: "Phòng 201 - Tòa A",
      max_participants: 50,
      participant_count: 30,
      status: "published",
      // Các trường KHÔNG hiển thị cho teacher khác:
      // - description (chi tiết nội dung)
      // - participant list (danh sách người đăng ký)
      // - bonus_points (điểm thưởng)
    }
  ]
}
```

**Quyền hạn khi xem hoạt động của người khác:**
- ✅ **Được xem**: title, teacher_name, date_time, location, participant_count/max_participants, status
- ❌ **KHÔNG được xem**: description (full), participant list, attendance records, bonus points
- ❌ **KHÔNG được thao tác**: Edit, Delete, Attendance, Award Points

**UI Design:**

```tsx
// Trong teacher/activities page
<Tabs>
  <Tab label="Hoạt động của tôi" /> {/* Default */}
  <Tab label="Tất cả hoạt động" /> {/* View all published activities */}
</Tabs>

// Khi ở tab "Tất cả hoạt động"
<ActivityCard>
  <h3>{activity.title}</h3>
  <p>👨‍🏫 Người tạo: {activity.teacher_name}</p>
  <p>📅 {activity.date_time}</p>
  <p>📍 {activity.location}</p>
  <p>👥 {activity.participant_count}/{activity.max_participants}</p>
  
  {/* KHÔNG hiển thị actions nếu không phải owner */}
  {activity.teacher_id === currentUserId && (
    <ButtonGroup>
      <EditButton />
      <DeleteButton />
    </ButtonGroup>
  )}
</ActivityCard>
```

#### Option B: **Department-level Sharing**

Chỉ xem hoạt động trong cùng khoa/bộ môn:

```sql
SELECT a.*, u.name as teacher_name 
FROM activities a
LEFT JOIN users u ON a.teacher_id = u.id
LEFT JOIN users current_user ON current_user.id = ?
WHERE (
  a.teacher_id = ? -- Của mình
  OR (
    a.status = 'published' 
    AND u.department_id = current_user.department_id -- Cùng khoa
  )
)
ORDER BY a.date_time DESC
```

### 2.2. Student View - "Học viên xem hoạt động nào?"

**Rule**: Student CHỈ thấy hoạt động **được phép tham gia** (theo class assignment).

#### Filtering Logic

```typescript
// API: /api/activities?role=student
async function getActivitiesForStudent(studentId: number, classId: number) {
  return await db.query(`
    SELECT a.*, 
           u.name as teacher_name,
           (SELECT COUNT(*) FROM participations WHERE activity_id = a.id) as participant_count,
           (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND student_id = ?) as is_registered,
           (a.max_participants - (SELECT COUNT(*) FROM participations WHERE activity_id = a.id)) as available_slots
    FROM activities a
    LEFT JOIN users u ON a.teacher_id = u.id
    WHERE a.status = 'published'  -- Chỉ hoạt động đã duyệt
    AND a.date_time > datetime('now')  -- Chưa qua ngày
    AND (
      -- Case 1: Hoạt động mở cho TẤT CẢ (không có class assignment)
      NOT EXISTS (SELECT 1 FROM activity_classes WHERE activity_id = a.id)
      
      OR
      
      -- Case 2: Hoạt động chỉ định lớp CỦA MÌNH
      EXISTS (
        SELECT 1 FROM activity_classes 
        WHERE activity_id = a.id AND class_id = ?
      )
    )
    ORDER BY a.date_time ASC
  `, [studentId, classId])
}
```

**Visibility Matrix for Students:**

| Activity Type | Class Assignment | Student sees? |
|---------------|------------------|---------------|
| Workshop Python | Không chỉ định lớp | ✅ TẤT CẢ sinh viên thấy |
| Khóa học AI | K66CNTT1, K66CNTT2 | ✅ Chỉ SV lớp CNTT1 & CNTT2 |
| Thi Olympic | K66CNTT1 | ❌ SV lớp CNTT2 KHÔNG thấy |
| Tình nguyện | Tất cả các lớp | ✅ TẤT CẢ sinh viên thấy |

#### Student UI

```tsx
// student/activities page
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {activities.map(activity => (
    <ActivityCard key={activity.id}>
      <Badge>{activity.is_registered ? "Đã đăng ký" : "Chưa đăng ký"}</Badge>
      <h3>{activity.title}</h3>
      <p>👨‍🏫 {activity.teacher_name}</p>
      <p>📅 {activity.date_time}</p>
      <p>📍 {activity.location}</p>
      <ProgressBar current={activity.participant_count} max={activity.max_participants} />
      
      {/* Hiển thị deadline */}
      {activity.registration_deadline && (
        <p className="text-red-500">
          ⏰ Đăng ký trước: {new Date(activity.registration_deadline).toLocaleString()}
        </p>
      )}
      
      {/* CTA buttons */}
      {!activity.is_registered && activity.available_slots > 0 && (
        <Button onClick={() => handleRegister(activity.id)}>
          Đăng ký ngay
        </Button>
      )}
      
      {activity.is_registered && (
        <Button variant="outline" onClick={() => handleUnregister(activity.id)}>
          Hủy đăng ký
        </Button>
      )}
    </ActivityCard>
  ))}
</div>
```

### 2.3. Admin View

**Rule**: Admin thấy TẤT CẢ hoạt động với **full details**.

```typescript
GET /api/admin/activities

Response: {
  activities: [
    {
      ...activityData,
      teacher_name: "...",
      approval_status: "pending",  // Admin-only field
      participant_list: [...],      // Full list
      total_bonus_points: 150,      // Stats
      conflicts: [...]              // Conflict warnings
    }
  ]
}
```

---

## 3. ⚠️ Conflict Detection

### 3.1. Location Conflict - "Phòng đã được sử dụng"

**Business Rule**: **KHÔNG được** tạo 2 hoạt động cùng địa điểm trong cùng khung giờ.

#### Detection API

```typescript
// POST /api/activities/check-conflicts
interface ConflictCheckRequest {
  location: string
  date_time: string  // "2026-01-20 09:00"
  duration?: number  // Minutes (default: 120)
  exclude_activity_id?: number  // Khi edit, bỏ qua activity hiện tại
}

interface ConflictCheckResponse {
  has_conflict: boolean
  conflicts: Array<{
    activity_id: number
    title: string
    teacher_name: string
    date_time: string
    location: string
    overlap_minutes: number
  }>
}
```

#### Implementation

```typescript
// lib/conflict-detection.ts
export async function checkLocationConflict(params: ConflictCheckRequest) {
  const duration = params.duration || 120 // 2 hours default
  const startTime = new Date(params.date_time)
  const endTime = new Date(startTime.getTime() + duration * 60000)
  
  const conflicts = await db.query(`
    SELECT a.id, a.title, a.date_time, a.location, u.name as teacher_name
    FROM activities a
    LEFT JOIN users u ON a.teacher_id = u.id
    WHERE a.location = ?
    AND a.status IN ('published', 'pending')  -- Chỉ check hoạt động active
    AND a.id != ?  -- Exclude current activity
    AND (
      -- Overlap detection: [start1, end1] overlaps [start2, end2]
      datetime(a.date_time) BETWEEN datetime(?) AND datetime(?)
      OR datetime(a.date_time, '+120 minutes') BETWEEN datetime(?) AND datetime(?)
      OR (
        datetime(?) BETWEEN datetime(a.date_time) AND datetime(a.date_time, '+120 minutes')
        AND datetime(?) BETWEEN datetime(a.date_time) AND datetime(a.date_time, '+120 minutes')
      )
    )
  `, [
    params.location,
    params.exclude_activity_id || -1,
    startTime.toISOString(), endTime.toISOString(),
    startTime.toISOString(), endTime.toISOString(),
    startTime.toISOString(), endTime.toISOString()
  ])
  
  return {
    has_conflict: conflicts.length > 0,
    conflicts
  }
}
```

#### UI Integration

```tsx
// ActivityDialog.tsx
const [locationConflicts, setLocationConflicts] = useState([])
const [timeConflicts, setTimeConflicts] = useState([])

// Debounce conflict check khi user nhập location hoặc time
useEffect(() => {
  const timer = setTimeout(async () => {
    if (formData.location && formData.date_time) {
      const response = await fetch('/api/activities/check-conflicts', {
        method: 'POST',
        body: JSON.stringify({
          location: formData.location,
          date_time: formData.date_time,
          exclude_activity_id: activityId
        })
      })
      const data = await response.json()
      if (data.has_conflict) {
        setLocationConflicts(data.conflicts)
      } else {
        setLocationConflicts([])
      }
    }
  }, 500)
  
  return () => clearTimeout(timer)
}, [formData.location, formData.date_time])

// Hiển thị warning
{locationConflicts.length > 0 && (
  <Alert variant="warning" className="mt-2">
    <AlertTriangle className="w-4 h-4" />
    <div>
      <p className="font-semibold">⚠️ Phát hiện xung đột địa điểm!</p>
      <ul className="mt-2 space-y-1 text-sm">
        {locationConflicts.map(conflict => (
          <li key={conflict.activity_id}>
            • <strong>{conflict.title}</strong> ({conflict.teacher_name}) 
            - {new Date(conflict.date_time).toLocaleString()}
          </li>
        ))}
      </ul>
      <p className="text-xs mt-2 text-orange-600">
        Bạn có thể tiếp tục tạo nhưng cần chọn địa điểm khác hoặc đổi thời gian.
      </p>
    </div>
  </Alert>
)}
```

### 3.2. Teacher Schedule Conflict

**Rule**: Cảnh báo (WARNING, không chặn) nếu giảng viên tạo 2 hoạt động gần nhau.

```typescript
// Kiểm tra teacher có hoạt động khác trong khoảng ±2 giờ không
export async function checkTeacherSchedule(teacherId: number, dateTime: string) {
  const conflicts = await db.query(`
    SELECT * FROM activities 
    WHERE teacher_id = ?
    AND status IN ('published', 'pending')
    AND ABS((julianday(date_time) - julianday(?)) * 24) < 2  -- Within 2 hours
  `, [teacherId, dateTime])
  
  return {
    has_warning: conflicts.length > 0,
    conflicts,
    message: "Bạn đã có hoạt động khác gần thời điểm này. Chắc chắn lịch của bạn không bị xung đột?"
  }
}
```

---

## 4. 📋 Business Scenarios

### Scenario 1: Teacher Tạo Hoạt động Workshop

**Actors**: Teacher (Nguyễn Văn A)

**Flow:**

1. **Teacher login** → Navigate to "Hoạt động của tôi"
2. **Click "Tạo hoạt động mới"** → Dialog mở
3. **Nhập thông tin:**
   - Tên: "Workshop Python nâng cao"
   - Mô tả: "Học lập trình Python cho AI..."
   - Thời gian: 2026-01-25 14:00
   - Địa điểm: "Phòng 301 - Tòa B"
   - Số lượng: Chọn dropdown "100 người"
   - Loại: Chọn "Workshop"
   - Cấp tổ chức: "Khoa"
   - Chọn lớp: K66CNTT1, K66CNTT2
4. **System check conflicts** (real-time):
   - ✅ Phòng 301 trống lúc 14:00
   - ✅ Teacher không có hoạt động khác
5. **Click "Tạo hoạt động"** → Loading spinner
6. **Backend:**
   - Insert into `activities` table với `status='draft'`, `approval_status='draft'`
   - Insert into `activity_classes` table (2 records)
   - Invalidate cache
7. **Response**: "Tạo thành công! Hoạt động đang ở trạng thái nháp."
8. **Teacher review** → Click "Gửi phê duyệt"
9. **Status update**: `status='draft'` giữ nguyên, `approval_status='draft' → 'requested'`
10. **Notification**: Email/notification gửi cho Admin

### Scenario 2: Admin Duyệt Hoạt động

**Actors**: Admin

**Flow:**

1. **Admin login** → Navigate to "Quản lý hoạt động"
2. **Filter**: `status=pending`
3. **View activity details**:
   - Title, Teacher name, Date/Time, Location
   - Max participants, Classes assigned
   - **Conflict warnings** (nếu có)
4. **Decision:**
   - **Approve** → `status='published'`, `approval_status='approved'`
     - Notification gửi Teacher: "Hoạt động đã được duyệt!"
     - Activity hiển thị cho Students (nếu thuộc class được chỉ định)
   - **Reject** → `approval_status='rejected'`, thêm `rejection_reason`
     - Notification gửi Teacher: "Hoạt động bị từ chối. Lý do: ..."
     - Teacher có thể edit và gửi lại

### Scenario 3: Student Đăng Ký Hoạt động

**Actors**: Student (Trần Thị B, class K66CNTT1)

**Flow:**

1. **Student login** → Navigate to "Hoạt động ngoại khóa"
2. **System filter**:
   - Status = 'published'
   - date_time > now
   - (No class assignment OR class_id = K66CNTT1)
3. **Student views** "Workshop Python" (do teacher chỉ định K66CNTT1, K66CNTT2)
4. **Check conditions:**
   - ✅ Chưa đăng ký (`is_registered = false`)
   - ✅ Còn chỗ (30/100)
   - ✅ Chưa qua deadline (2026-01-24 14:00)
5. **Click "Đăng ký ngay"** → Confirm modal
6. **Backend:**
   - Check: `COUNT(*) < max_participants`
   - Check: `NOW() <= registration_deadline`
   - Insert into `participations`: `(activity_id, student_id, status='registered')`
7. **Response**: "Đăng ký thành công!"
8. **UI update**: Button → "Hủy đăng ký" (nếu trước deadline)

### Scenario 4: Teacher Điểm Danh

**Actors**: Teacher (Nguyễn Văn A)

**Flow:**

1. **After activity ends** → Navigate to "Hoạt động của tôi" → Click activity
2. **View "Quản lý học viên"** tab
3. **Student list** (100 rows):
   ```
   | STT | MSSV | Họ tên | Lớp | Trạng thái | Hành động |
   |-----|------|--------|-----|------------|-----------|
   | 1 | 2151050001 | Trần Thị B | K66CNTT1 | Đã đăng ký | [✓ Có mặt] [✗ Vắng mặt] |
   ```
4. **Batch actions:**
   - **Select all** → Click "Điểm danh tất cả có mặt"
   - Or manual: Click từng button
5. **Backend update:**
   ```sql
   UPDATE participations 
   SET attendance_status = 'attended', attendance_time = NOW()
   WHERE activity_id = ? AND student_id IN (...)
   ```
6. **Award bonus points:**
   - Input: 5 điểm
   - Update: `bonus_points = 5` for attended students
7. **Finalize**: Click "Hoàn thành hoạt động"
   - Status: `published → completed`

### Scenario 5: Teacher Xem Hoạt động Của Người Khác (Tránh Trùng Lịch)

**Actors**: Teacher (Nguyễn Văn C)

**Flow:**

1. **Teacher login** → Navigate to "Hoạt động của tôi"
2. **Switch tab**: "Tất cả hoạt động" ← **MỚI**
3. **System query:**
   ```sql
   SELECT a.id, a.title, a.date_time, a.location, 
          a.max_participants, a.participant_count,
          u.name as teacher_name
   FROM activities a
   LEFT JOIN users u ON a.teacher_id = u.id
   WHERE a.status = 'published'
   ORDER BY a.date_time DESC
   ```
4. **View list** (read-only):
   ```
   📅 2026-01-25 14:00 | Phòng 301 - Tòa B
   Workshop Python nâng cao
   👨‍🏫 Nguyễn Văn A | 👥 30/100
   
   📅 2026-01-25 16:00 | Phòng 201 - Tòa A
   Hackathon AI
   👨‍🏫 Lê Thị D | 👥 50/50 (ĐẦY)
   ```
5. **Teacher C notes**: "Phòng 301 đã được dùng lúc 14:00, tôi sẽ chọn 9:00 hoặc phòng khác"
6. **No actions** available (không phải owner):
   - ❌ Không có nút Edit
   - ❌ Không có nút Delete
   - ❌ Không xem được participant list

### Scenario 6: Conflict Warning khi Tạo Hoạt động

**Actors**: Teacher (Phạm Văn E)

**Flow:**

1. **Teacher creates activity:**
   - Thời gian: 2026-01-25 14:00
   - Địa điểm: "Phòng 301 - Tòa B"
2. **onBlur event** → API call: `/api/activities/check-conflicts`
3. **Backend detects**: "Workshop Python" (Teacher A) đang dùng Phòng 301 lúc 14:00
4. **UI shows warning:**
   ```
   ⚠️ Phát hiện xung đột địa điểm!
   
   • Workshop Python nâng cao (Nguyễn Văn A) - 25/01/2026 14:00
   
   Phòng 301 - Tòa B đã được đặt trong khung giờ này.
   Vui lòng chọn địa điểm khác hoặc đổi thời gian.
   ```
5. **Options:**
   - **A**: Đổi địa điểm → "Phòng 302 - Tòa B" → ✅ Conflict cleared
   - **B**: Đổi thời gian → "2026-01-25 16:00" → ✅ Conflict cleared
   - **C**: Ignore warning (Admin có thể override)

---

## 5. ✅ Edge Cases & Validation

### 5.1. Registration Deadline

**Rule**: Deadline phải **ít nhất 24h** trước thời gian hoạt động.

```typescript
// Validation
if (registration_deadline) {
  const deadline = new Date(registration_deadline)
  const activityDate = new Date(date_time)
  const hoursDiff = (activityDate.getTime() - deadline.getTime()) / (1000 * 60 * 60)
  
  if (hoursDiff < 24) {
    throw new Error('Deadline đăng ký phải ít nhất 24 giờ trước hoạt động')
  }
}
```

### 5.2. Max Participants Overflow

**Problem**: Nếu teacher giảm `max_participants` từ 100 → 50 nhưng đã có 70 người đăng ký?

**Solution:**

```typescript
// Validation khi update
const currentCount = await db.query(
  'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
  [activityId]
)

if (newMaxParticipants < currentCount.count) {
  throw new Error(
    `Không thể giảm số lượng xuống ${newMaxParticipants} vì đã có ${currentCount.count} người đăng ký`
  )
}
```

### 5.3. Delete Activity với Participants

**Rule**: CHỈ xóa được nếu:
- Status = 'draft'
- Chưa có người đăng ký

```typescript
async function deleteActivity(activityId: number, userId: number) {
  const activity = await db.getActivityById(activityId)
  
  // Check ownership
  if (activity.teacher_id !== userId && user.role !== 'admin') {
    throw new Error('Không có quyền xóa')
  }
  
  // Check status
  if (activity.status !== 'draft') {
    throw new Error('Chỉ xóa được hoạt động ở trạng thái nháp')
  }
  
  // Check participants
  const participantCount = await db.query(
    'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
    [activityId]
  )
  
  if (participantCount.count > 0) {
    throw new Error('Không thể xóa hoạt động đã có người đăng ký')
  }
  
  // Safe to delete
  await db.run('DELETE FROM activity_classes WHERE activity_id = ?', [activityId])
  await db.run('DELETE FROM activities WHERE id = ?', [activityId])
}
```

### 5.4. Late Registration (Sau Deadline)

**Rule**: Không cho đăng ký sau deadline NHƯNG teacher có thể **thêm thủ công**.

```typescript
// Student registration
if (activity.registration_deadline && new Date() > new Date(activity.registration_deadline)) {
  throw new Error('Đã hết hạn đăng ký')
}

// Teacher manual add (bypass deadline)
if (user.role === 'teacher' && activity.teacher_id === user.id) {
  // Allow
}
```

### 5.5. Concurrent Registration (Race Condition)

**Problem**: 2 students đăng ký cùng lúc cho slot cuối cùng.

**Solution**: Database transaction + unique constraint

```typescript
// Use transaction
await db.transaction(async (tx) => {
  // Lock activity row
  const activity = await tx.query(
    'SELECT * FROM activities WHERE id = ? FOR UPDATE',
    [activityId]
  )
  
  const currentCount = await tx.query(
    'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
    [activityId]
  )
  
  if (currentCount.count >= activity.max_participants) {
    throw new Error('Hoạt động đã đầy')
  }
  
  // Insert participation
  await tx.run(
    'INSERT INTO participations (activity_id, student_id, status) VALUES (?, ?, ?)',
    [activityId, studentId, 'registered']
  )
})

// Schema constraint
CREATE UNIQUE INDEX idx_unique_participation 
ON participations(activity_id, student_id)
```

---

## 6. 🛠️ Implementation Guide

### 6.1. Database Schema Updates

```sql
-- Add duration column for conflict detection
ALTER TABLE activities ADD COLUMN duration INTEGER DEFAULT 120; -- minutes

-- Add rejection reason for admin
ALTER TABLE activities ADD COLUMN rejection_reason TEXT;

-- Add conflict tracking
CREATE TABLE activity_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER REFERENCES activities(id),
  conflict_type TEXT, -- 'location' | 'teacher_schedule'
  conflict_with_id INTEGER REFERENCES activities(id),
  severity TEXT, -- 'error' | 'warning'
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2. New API Endpoints

```typescript
// 1. Check conflicts
POST /api/activities/check-conflicts
Body: { location, date_time, duration, exclude_activity_id }
Response: { has_conflict, conflicts: [...] }

// 2. View all activities (for teachers)
GET /api/activities?view=all&role=teacher
Response: { activities: [...limited fields...] }

// 3. Teacher manual add student
POST /api/activities/:id/participants
Body: { student_id, bypass_deadline: true }
Auth: Teacher (owner) only

// 4. Admin override conflict
POST /api/activities (with admin role)
Body: { ...activityData, override_conflict: true }
```

### 6.3. Frontend Components

**New Components:**

1. **`ConflictWarning.tsx`**: Hiển thị cảnh báo xung đột
2. **`ActivityViewToggle.tsx`**: Switch "Của tôi" / "Tất cả"
3. **`ParticipantManager.tsx`**: Quản lý điểm danh, chấm điểm
4. **`PermissionGuard.tsx`**: HOC kiểm tra quyền

**Updates:**

- `ActivityDialog.tsx`: Thêm conflict detection logic
- `teacher/activities/page.tsx`: Thêm tab "Tất cả hoạt động"
- `student/activities/page.tsx`: Filtering theo class assignment

### 6.4. Testing Scenarios

```typescript
// Test 1: Conflict detection
test('should detect location conflict', async () => {
  // Create activity A: Room 301 at 14:00
  const activityA = await createActivity({
    location: 'Phòng 301',
    date_time: '2026-01-25 14:00'
  })
  
  // Try to create activity B: Same room, overlapping time
  const conflicts = await checkConflicts({
    location: 'Phòng 301',
    date_time: '2026-01-25 15:00' // Overlap 1 hour
  })
  
  expect(conflicts.has_conflict).toBe(true)
  expect(conflicts.conflicts[0].activity_id).toBe(activityA.id)
})

// Test 2: Permission - Teacher cannot edit others' activity
test('teacher cannot edit another teacher activity', async () => {
  const teacherA = await createUser({ role: 'teacher' })
  const teacherB = await createUser({ role: 'teacher' })
  
  const activity = await createActivity({ teacher_id: teacherA.id })
  
  await expect(
    updateActivity(activity.id, { title: 'Hacked' }, teacherB.id)
  ).rejects.toThrow('Không có quyền')
})

// Test 3: Student visibility filtering
test('student only sees activities for their class', async () => {
  const student = await createUser({ role: 'student', class_id: 1 })
  
  const activityA = await createActivity({ class_ids: [1, 2] })
  const activityB = await createActivity({ class_ids: [3] })
  const activityC = await createActivity({ class_ids: [] }) // Open for all
  
  const activities = await getActivitiesForStudent(student.id, student.class_id)
  
  expect(activities).toContainEqual(expect.objectContaining({ id: activityA.id }))
  expect(activities).toContainEqual(expect.objectContaining({ id: activityC.id }))
  expect(activities).not.toContainEqual(expect.objectContaining({ id: activityB.id }))
})
```

---

## 7. 📊 Summary Checklist

### Core Features

- [x] Permission matrix implemented (Admin/Teacher/Student)
- [x] Visibility rules for teachers (view all published activities)
- [x] Student filtering (class-based access control)
- [ ] Location conflict detection API
- [ ] Teacher schedule conflict warning
- [ ] Conflict UI integration in ActivityDialog
- [x] Teacher name display in activity cards
- [ ] Registration deadline validation (24h rule)
- [ ] Max participants overflow prevention
- [ ] Delete safety checks (draft + no participants)
- [ ] Late registration handling
- [ ] Concurrent registration handling (transactions)

### Advanced Features

- [ ] Department-level activity sharing (optional)
- [ ] Activity conflict tracking table
- [ ] Admin conflict override functionality
- [ ] Email notifications for approvals/rejections
- [ ] Activity analytics dashboard
- [ ] Batch attendance marking
- [ ] QR code check-in system
- [ ] Activity calendar view (prevent overlaps visually)

### Documentation

- [x] Permission matrix documented
- [x] Visibility rules documented
- [x] Conflict detection logic documented
- [x] Business scenarios documented
- [x] Edge cases documented
- [x] Implementation guide provided
- [x] Testing scenarios provided

---

**Tác giả**: GitHub Copilot  
**Ngày cập nhật**: 2026-01-14  
**Version**: 1.0

**Next Steps:**
1. Implement conflict detection API
2. Update UI với conflict warnings
3. Add "Tất cả hoạt động" tab cho teachers
4. Write integration tests
5. Deploy và UAT testing
