# Logic Mối Quan Hệ - Hệ Thống Quản Lý Hoạt Động

## 📊 Sơ đồ quan hệ tổng quan

```
┌──────────────────────────────────────────────────────────────┐
│                    QUẢN LÝ HOẠT ĐỘNG NGOẠI KHÓA                │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Teacher   │      │  Activities  │      │   Classes   │
│             │──────│              │──────│             │
│   (users)   │ 1:N  │              │ M:N  │             │
└─────────────┘      └──────────────┘      └─────────────┘
      │                     │                      │
      │                     │ M:N                  │ 1:N
      │                     │                      │
      │              ┌──────────────┐              │
      │              │Participations│              │
      └──────────────│              │──────────────┘
            1:N      │  (M:N join)  │        1:N
                     └──────────────┘
                            │
                            │ M:N
                            │
                     ┌─────────────┐
                     │   Students  │
                     │   (users)   │
                     └─────────────┘
```

---

## 1. 👨‍🏫 Teacher - Activities (1:N)

### Quan hệ
- **1 Teacher** có thể tạo **nhiều Activities**
- **1 Activity** chỉ thuộc về **1 Teacher** (người tạo/quản lý)

### Schema
```sql
activities {
  id: INTEGER PRIMARY KEY
  teacher_id: INTEGER REFERENCES users(id)  -- FK đến bảng users
  title: TEXT NOT NULL
  status: TEXT DEFAULT 'draft'
  ...
}
```

### Business Logic
1. **Ownership (Quyền sở hữu)**
   - Teacher chỉ được chỉnh sửa/xóa hoạt động do mình tạo
   - Kiểm tra: `activity.teacher_id === user.id`

2. **Workflow**
   - Teacher tạo → status = 'draft'
   - Teacher gửi phê duyệt → status = 'pending'
   - Admin duyệt → status = 'published'

3. **Quyền hạn**
   - **Teacher**: CRUD hoạt động của mình
   - **Admin**: READ tất cả, UPDATE status

### Code example
```typescript
// Kiểm tra ownership
if (user.role === 'teacher' && activity.teacher_id !== user.id) {
  return errorResponse(ApiError.forbidden('Chỉ được sửa hoạt động của mình'))
}

// Lấy hoạt động của teacher
const activities = await dbAll(
  'SELECT * FROM activities WHERE teacher_id = ?',
  [teacherId]
)
```

---

## 2. 🎯 Activities - Classes (M:N)

### Quan hệ
- **1 Activity** có thể dành cho **nhiều Classes**
- **1 Class** có thể tham gia **nhiều Activities**

### Schema
```sql
activity_classes {  -- Bảng trung gian
  activity_id: INTEGER REFERENCES activities(id)
  class_id: INTEGER REFERENCES classes(id)
  PRIMARY KEY (activity_id, class_id)
}
```

### Business Logic
1. **Class Assignment**
   - Teacher chọn lớp nào được tham gia
   - Nếu không chọn lớp nào → hoạt động mở cho tất cả

2. **Visibility Rules**
   - Student chỉ thấy hoạt động:
     - Dành cho lớp của mình (`class_id IN activity.class_ids`)
     - HOẶC không giới hạn lớp (open for all)

3. **Ví dụ thực tế**
   - **Hoạt động A**: Dành cho K66CNTT1, K66CNTT2
   - **Hoạt động B**: Không giới hạn lớp (tất cả sinh viên)

### Code example
```typescript
// Tạo hoạt động với lớp
await dbRun(`INSERT INTO activities ...`)
for (const classId of class_ids) {
  await dbRun(
    'INSERT INTO activity_classes (activity_id, class_id) VALUES (?, ?)',
    [activityId, classId]
  )
}

// Lấy hoạt động cho sinh viên
const activities = await dbAll(`
  SELECT a.* FROM activities a
  WHERE a.status = 'published'
  AND (
    NOT EXISTS (SELECT 1 FROM activity_classes WHERE activity_id = a.id)
    OR EXISTS (
      SELECT 1 FROM activity_classes 
      WHERE activity_id = a.id AND class_id = ?
    )
  )
`, [studentClassId])
```

---

## 3. 👥 Activities - Students (M:N via Participations)

### Quan hệ
- **1 Activity** có thể có **nhiều Students** đăng ký
- **1 Student** có thể đăng ký **nhiều Activities**

### Schema
```sql
participations {  -- Bảng trung gian
  id: INTEGER PRIMARY KEY
  activity_id: INTEGER REFERENCES activities(id)
  student_id: INTEGER REFERENCES users(id)
  status: TEXT DEFAULT 'registered'  -- registered, attended, absent
  registered_at: DATETIME
  attendance_time: DATETIME
  bonus_points: INTEGER DEFAULT 0
  ...
}
```

### Business Logic
1. **Registration Flow**
   - Student đăng ký → tạo record `participations`
   - Status: `registered` (chưa điểm danh)
   
2. **Attendance (Điểm danh)**
   - Teacher đánh dấu → status = `attended` hoặc `absent`
   - Lưu thời gian: `attendance_time = NOW()`

3. **Bonus Points**
   - Teacher đánh giá → cập nhật `bonus_points`
   - Điểm thưởng áp dụng vào tổng điểm rèn luyện

4. **Constraints**
   - Giới hạn số lượng: `COUNT(*) <= max_participants`
   - Không trùng: `UNIQUE(activity_id, student_id)`
   - Deadline: `NOW() <= registration_deadline`

### Code example
```typescript
// Đăng ký tham gia
await dbRun(`
  INSERT INTO participations (activity_id, student_id, status, registered_at)
  VALUES (?, ?, 'registered', datetime('now'))
`, [activityId, studentId])

// Cập nhật điểm danh
await dbRun(`
  UPDATE participations
  SET status = ?, attendance_time = datetime('now')
  WHERE activity_id = ? AND student_id = ?
`, [attendanceStatus, activityId, studentId])

// Lấy danh sách tham gia
const participants = await dbAll(`
  SELECT u.*, p.status, p.bonus_points, p.registered_at
  FROM participations p
  JOIN users u ON u.id = p.student_id
  WHERE p.activity_id = ?
`, [activityId])
```

---

## 4. 🏫 Classes - Students (1:N)

### Quan hệ
- **1 Class** có **nhiều Students**
- **1 Student** thuộc về **1 Class**

### Schema
```sql
users {
  id: INTEGER PRIMARY KEY
  class_id: INTEGER REFERENCES classes(id)
  role: TEXT  -- 'student', 'teacher', 'admin'
  ...
}

classes {
  id: INTEGER PRIMARY KEY
  name: TEXT NOT NULL  -- VD: K66CNTT1
  ...
}
```

### Business Logic
1. **Class Assignment**
   - Student được gán vào 1 lớp khi tạo tài khoản
   - Không thể thay đổi lớp sau khi tạo (business rule)

2. **Auto-registration**
   - Khi teacher thêm "cả lớp" vào hoạt động
   - Tự động tạo `participations` cho tất cả sinh viên trong lớp

### Code example
```typescript
// Lấy tất cả sinh viên trong lớp
const students = await dbAll(
  'SELECT * FROM users WHERE role = "student" AND class_id = ?',
  [classId]
)

// Thêm cả lớp vào hoạt động
const students = await dbAll(
  'SELECT id FROM users WHERE role = "student" AND class_id = ?',
  [classId]
)
for (const student of students) {
  await dbRun(
    'INSERT INTO participations (activity_id, student_id, status) VALUES (?, ?, "registered")',
    [activityId, student.id]
  )
}
```

---

## 5. 🔄 Luồng nghiệp vụ hoàn chỉnh

### Use Case 1: Teacher tạo hoạt động Workshop Python

```
1. Teacher tạo hoạt động
   ├─ Thông tin cơ bản: "Workshop Python nâng cao"
   ├─ max_participants: 50 (dropdown: 30, 50, 100, 150, 200, 300, 500, 1000, Tùy chỉnh)
   ├─ Chọn lớp: K66CNTT1, K66CNTT2
   └─ status: 'draft'

2. Lưu vào DB
   ├─ INSERT INTO activities (teacher_id, title, ..., max_participants)
   └─ INSERT INTO activity_classes (activity_id, class_id) x2

3. Teacher gửi phê duyệt
   └─ UPDATE activities SET status = 'pending'

4. Admin duyệt
   └─ UPDATE activities SET status = 'published'

5. Student đăng ký (trong K66CNTT1)
   ├─ Kiểm tra: activity.class_ids CONTAINS student.class_id
   ├─ Kiểm tra: COUNT(participations) < max_participants
   └─ INSERT INTO participations (activity_id, student_id)

6. Teacher thêm thủ công học viên khác
   └─ INSERT INTO participations (activity_id, student_id)
      (không giới hạn bởi class_ids - teacher quyền cao hơn)

7. Teacher điểm danh sau hoạt động
   ├─ UPDATE participations SET status = 'attended' WHERE ...
   └─ UPDATE participations SET bonus_points = 5 WHERE ...

8. Hoàn thành
   └─ UPDATE activities SET status = 'completed'
```

### Use Case 2: Teacher thêm "cả lớp K66CNTT3" vào hoạt động

```
1. Activity đang ở status = 'published'

2. Teacher click "Thêm lớp học"
   ├─ Dialog hiện danh sách classes
   └─ Chọn: K66CNTT3 (30 sinh viên)

3. Backend xử lý
   ├─ Kiểm tra: COUNT(participations) + 30 <= max_participants
   ├─ Lấy tất cả sinh viên: SELECT * FROM users WHERE class_id = 3
   └─ Batch insert:
       for student in students:
         INSERT INTO participations (activity_id, student_id, status)
         VALUES (?, ?, 'registered')

4. Kết quả
   └─ Tất cả 30 sinh viên K66CNTT3 được thêm vào danh sách
```

---

## 6. 🎯 Max Participants - Logic mới

### UI Design

**Dropdown options:**
```
┌─────────────────────────┐
│ 30 người                │
│ 50 người                │
│ 100 người               │
│ 150 người               │
│ 200 người               │
│ 300 người               │
│ 500 người               │
│ 1000 người              │
│ Tùy chỉnh...            │ <- Khi chọn: hiện input number
└─────────────────────────┘
```

**Khi chọn "Tùy chỉnh":**
```
┌──────────────┬───────────────────┐
│ Tùy chỉnh... │ [____50____] người │
└──────────────┴───────────────────┘
```

### Implementation

**State management:**
```typescript
const [selectedOption, setSelectedOption] = useState(30)
const [customParticipants, setCustomParticipants] = useState<number | null>(null)

// Khi chọn dropdown
if (value === -1) {  // Tùy chỉnh
  setCustomParticipants(formData.max_participants || 50)
} else {
  setFormData({ ...formData, max_participants: value })
}
```

**Validation:**
- Không giới hạn tối đa (có thể nhập 10,000+ nếu cần)
- Tối thiểu: 1 người
- Default: 30 người

---

## 7. 🔍 Query Patterns thường dùng

### Lấy hoạt động của teacher
```sql
SELECT a.*, 
       COUNT(p.id) as participant_count,
       SUM(CASE WHEN p.status = 'attended' THEN 1 ELSE 0 END) as attended_count
FROM activities a
LEFT JOIN participations p ON p.activity_id = a.id
WHERE a.teacher_id = ?
GROUP BY a.id
ORDER BY a.date_time DESC
```

### Lấy hoạt động cho student
```sql
SELECT a.*,
       (SELECT COUNT(*) FROM participations WHERE activity_id = a.id) as participant_count,
       (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND student_id = ?) as is_registered
FROM activities a
WHERE a.status = 'published'
AND (
  -- Không giới hạn lớp
  NOT EXISTS (SELECT 1 FROM activity_classes WHERE activity_id = a.id)
  -- Hoặc lớp của student
  OR EXISTS (SELECT 1 FROM activity_classes WHERE activity_id = a.id AND class_id = ?)
)
ORDER BY a.date_time DESC
```

### Kiểm tra đã đầy chưa
```sql
SELECT 
  a.max_participants,
  COUNT(p.id) as current_count,
  (a.max_participants - COUNT(p.id)) as available_slots
FROM activities a
LEFT JOIN participations p ON p.activity_id = a.id
WHERE a.id = ?
GROUP BY a.id
```

---

## 8. 🚨 Edge Cases cần xử lý

### 1. **Vượt quá max_participants**
```typescript
const count = await dbGet(
  'SELECT COUNT(*) as count FROM participations WHERE activity_id = ?',
  [activityId]
)
if (count.count >= activity.max_participants) {
  throw new Error('Hoạt động đã đầy')
}
```

### 2. **Student đăng ký trùng**
```sql
-- Constraint trong schema
CREATE UNIQUE INDEX idx_unique_participation 
ON participations(activity_id, student_id)
```

### 3. **Teacher xóa hoạt động có người tham gia**
```typescript
// Chỉ cho phép xóa nếu status = 'draft' VÀ chưa có người đăng ký
if (activity.status !== 'draft') {
  throw new Error('Chỉ xóa được hoạt động ở trạng thái nháp')
}
const participantCount = await dbGet(...)
if (participantCount.count > 0) {
  throw new Error('Không thể xóa hoạt động đã có người đăng ký')
}
```

### 4. **Activity_classes bị xóa nhưng participations còn**
```typescript
// Soft delete hoặc cascade
ON DELETE CASCADE  -- Trong foreign key constraint
```

---

## 9. 📈 Performance Optimization

### Index cần có
```sql
CREATE INDEX idx_activities_teacher ON activities(teacher_id)
CREATE INDEX idx_activities_status ON activities(status)
CREATE INDEX idx_participations_activity ON participations(activity_id)
CREATE INDEX idx_participations_student ON participations(student_id)
CREATE INDEX idx_activity_classes_activity ON activity_classes(activity_id)
CREATE INDEX idx_activity_classes_class ON activity_classes(class_id)
CREATE INDEX idx_users_class ON users(class_id)
```

### Caching strategy
- **Activities list**: Cache 5 phút với key `activities:{role}:{userId}:page{page}`
- **Participant count**: Real-time (không cache)
- **Classes list**: Cache 10 phút (ít thay đổi)

---

## 10. ✅ Checklist Implementation

- [x] Teacher - Activities (1:N) ✅
- [x] Activities - Classes (M:N) ✅
- [x] Activities - Students (M:N) ✅
- [x] Classes - Students (1:N) ✅
- [x] Max participants dropdown ✅
- [x] Custom participants input ✅
- [x] Validation rules ✅
- [x] Query patterns ✅
- [x] Edge cases handling ✅
- [x] Performance indexes ✅

---

**Tác giả**: GitHub Copilot  
**Ngày cập nhật**: 2026-01-13  
**Version**: 2.0
