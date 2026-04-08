# PHỤ LỤC

---

## PHỤ LỤC A: THIẾT KẾ KỸ THUẬT CHI TIẾT

### A.1. Schema Database (Thiết kế thực tế)

#### Bảng chính
```sql
-- users: Quản lý người dùng (Admin/Teacher/Student)
-- classes: Lớp học
-- activities: Hoạt động ngoại khóa
-- activity_classes: Junction table (Activities M-N Classes)
-- participations: Đăng ký tham gia (Activities M-N Students)
-- attendance_records: Ghi nhận điểm danh
-- qr_sessions: Phiên QR điểm danh
-- student_scores: Điểm tổng hợp
-- awards: Khen thưởng
-- audit_logs: Nhật ký hệ thống
-- notifications: Thông báo
```

**Chi tiết**: Xem `schema-dump.json` và `migrations/` folder

#### ERD - Mối quan hệ chính
```
users (teacher_id) 1:N activities
users (student_id) M:N activities (via participations)
activities M:N classes (via activity_classes)
classes 1:N users (students)
activities 1:N qr_sessions
activities 1:N attendance_records
```

### A.2. Xác thực & Phân quyền

**Cơ chế:**
- JWT authentication với HTTP-only cookies
- RBAC (Role-Based Access Control)
- 3 roles: admin, teacher, student

**Implementation:**
```typescript
// lib/guards.ts
export async function requireAuth(req: NextRequest): Promise<User>
export async function requireRole(req: NextRequest, roles: Role[]): Promise<User>
```

**Permission Matrix**: Xem `de-tai/PERMISSIONS_AND_BUSINESS_RULES.md`

### A.3. QR Code - Điểm danh

**API Endpoints:**
- `POST /api/qr-sessions` - Tạo phiên QR
- `GET /api/qr-sessions` - Lịch sử phiên
- `POST /api/attendance/validate` - Xác nhận điểm danh

**Quy trình:**
1. Teacher tạo QR session (expires: 30 phút)
2. Student scan QR code
3. System validate: session valid + student in activity + not duplicate
4. Update attendance_records + participations.attendance_status

**Security:**
- Session-based (không tái sử dụng)
- Expiration time (30 phút default)
- Geolocation verification (optional)
- Anti-duplicate scanning

### A.4. Tính điểm & Tổng hợp

**Formula:**
```typescript
total_points = (base_points × organization_multiplier) + bonus_points
where attendance_status = 'attended'
```

**Service Layer:**
```typescript
// lib/scoring-service.ts
export class PointCalculationService {
  static async calculatePoints(participationId: number)
  static async recalculateAll()
  static async getStudentTotalScore(studentId: number)
}
```

**Trigger:**
- After attendance marking
- After teacher evaluation (bonus points)
- Manual recalculate by admin

---

## PHỤ LỤC B: NGHIỆP VỤ & QUY TẮC

### B.1. Quy Tắc Nghiệp Vụ Chi Tiết

**Source**: `de-tai/PERMISSIONS_AND_BUSINESS_RULES.md`

#### Permission Matrix

| Action | Admin | Teacher (Owner) | Teacher (Other) | Student |
|--------|-------|----------------|-----------------|---------|
| **CREATE Activity** | ✅ | ✅ | ❌ | ❌ |
| **READ Own** | ✅ | ✅ | ✅ | ✅ |
| **READ Others** | ✅ Full | ✅ Limited | ✅ Limited | ⚠️ Filtered |
| **UPDATE** | ✅ | ✅ Own only | ❌ | ❌ |
| **DELETE** | ✅ | ✅ Draft only | ❌ | ❌ |
| **APPROVE** | ✅ | ❌ | ❌ | ❌ |
| **Register** | ✅ | ✅ | ❌ | ✅ Self |
| **Attendance** | ✅ | ✅ Own activity | ❌ | ❌ |

#### Visibility Rules

**Teacher View:**
- Xem TẤT CẢ hoạt động published (limited fields)
- Mục đích: Tránh trùng lịch, nghiên cứu kế hoạch
- Không xem: description (full), participant list, bonus points

**Student View:**
- Chỉ xem hoạt động:
  - status = 'published'
  - date_time > NOW()
  - (Không giới hạn lớp OR class_id = student.class_id)

**Admin View:**
- Full details tất cả hoạt động

#### Conflict Detection

**Location Conflict (ERROR):**
- KHÔNG được 2 hoạt động cùng địa điểm trong cùng khung giờ
- 3-case overlap detection algorithm
- Real-time warning trong form

**Teacher Schedule Conflict (WARNING):**
- Cảnh báo nếu teacher có hoạt động khác trong ±3 giờ
- Không chặn, chỉ thông báo

### B.2. Business Scenarios

**6 Kịch bản đầy đủ** (chi tiết trong PERMISSIONS_AND_BUSINESS_RULES.md):

1. **Teacher tạo hoạt động Workshop** (10 steps)
2. **Admin duyệt hoạt động** (4 decision paths)
3. **Student đăng ký hoạt động** (8 steps + validation)
4. **Teacher điểm danh** (7 steps + batch actions)
5. **Teacher xem hoạt động người khác** (6 steps)
6. **Conflict warning workflow** (5 steps + 3 options)

### B.3. Edge Cases & Validation

1. **Registration Deadline**: Phải ít nhất 24h trước hoạt động
2. **Max Participants Overflow**: Không giảm nếu đã có người đăng ký
3. **Delete Safety**: Chỉ xóa draft + chưa có participant
4. **Late Registration**: Chặn sau deadline (trừ teacher manual add)
5. **Concurrent Registration**: Database transaction + unique constraint
6. **QR Session Expiration**: Validate thời gian trước khi accept

---

## PHỤ LỤC C: LOGIC MỐI QUAN HỆ

**Source**: `de-tai/LOGIC_MOI_QUAN_HE.md`

### C.1. Sơ đồ Quan Hệ Tổng Quan

```
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

### C.2. Quan Hệ Chi Tiết

**1. Teacher - Activities (1:N)**
- 1 Teacher tạo nhiều Activities
- Foreign key: `activities.teacher_id → users.id`
- Ownership: Teacher chỉ CRUD hoạt động của mình

**2. Activities - Classes (M:N)**
- Via junction table: `activity_classes`
- Activity có thể dành cho nhiều lớp
- Không chỉ định lớp = mở cho tất cả

**3. Activities - Students (M:N via Participations)**
- Table: `participations` (activity_id, student_id, status, bonus_points)
- Student đăng ký → `status='registered'`
- Teacher điểm danh → `status='attended'|'absent'`

**4. Classes - Students (1:N)**
- Foreign key: `users.class_id → classes.id`
- 1 Student thuộc 1 Class

### C.3. Query Patterns

**Lấy hoạt động cho Student:**
```sql
SELECT a.* 
FROM activities a
WHERE a.status = 'published'
AND (
  NOT EXISTS (SELECT 1 FROM activity_classes WHERE activity_id = a.id)
  OR EXISTS (SELECT 1 FROM activity_classes WHERE activity_id = a.id AND class_id = ?)
)
```

**Kiểm tra xung đột địa điểm:**
```sql
SELECT a.*, u.name as teacher_name
FROM activities a
LEFT JOIN users u ON a.teacher_id = u.id
WHERE a.location = ?
AND a.status IN ('published', 'pending')
AND (
  datetime(?) BETWEEN datetime(a.date_time) AND datetime(a.date_time, '+120 minutes')
  OR ...  -- 3 overlap cases
)
```

---

## PHỤ LỤC D: KẾT QUẢ KIỂM THỬ

### D.1. Kiểm thử Đơn vị (Unit Test)

**Framework**: Vitest + TypeScript

**Coverage**:
- API Routes: 60%
- Database Queries: 70%
- Components: 40%

**Nhóm kiểm thử:**
1. **Activities**: CRUD operations, validation, workflow
2. **Attendance**: QR validation, manual marking, duplicate prevention
3. **Scoring**: Point calculation, aggregation, recalculate
4. **Permissions**: Role-based access, ownership validation

### D.2. Kiểm thử Tích hợp (Integration Test)

**Test Scenarios:**
1. **Full Activity Workflow**:
   - Teacher create → Submit → Admin approve → Student register → Attend → Score calculated
2. **QR Attendance Flow**:
   - Teacher create session → Student scan → Validate → Mark attendance
3. **Conflict Detection**:
   - Create activity → Check location/time → Warning displayed

### D.3. Kiểm thử Smoke

**Script**: `test-api-endpoints.sh`
- Auto-login với 3 roles
- Probe 60+ endpoints
- Report: OK/FAIL với status code

**Results**: 95% endpoints pass (3 known issues documented)

---

## PHỤ LỤC E: HÌNH ẢNH & SCREENSHOT

### E.1. Database ERD

[Sơ đồ ERD - Xem schema-dump.json hoặc migrations/]

### E.2. UI Screenshots

**1. Login Page**
- Form đăng nhập
- Demo accounts dropdown

**2. Teacher Dashboard**
- Activity list với filters
- Status badges
- Action buttons

**3. ActivityDialog**
- Full form với all fields
- Conflict warnings (Red/Yellow alerts)
- Max participants dropdown

**4. QR Attendance**
- QR code generation
- Scanner interface
- Attendance list

**5. Reports & Analytics**
- Dashboard charts
- Export functionality
- Filtering options

---

## PHỤ LỤC F: TÀI LIỆU THAM KHẢO NỘI BỘ

### Tài liệu Kỹ thuật
1. `01-README.md` - Overview hệ thống
2. `02-PROGRESS.md` - Báo cáo tiến độ
3. `03-DEVELOPMENT_GUIDE.md` - Hướng dẫn phát triển
4. `04-DEPLOYMENT.md` - Hướng dẫn triển khai
5. `06-CHANGELOG.md` - Lịch sử thay đổi

### Tài liệu Nghiệp vụ
1. `PERMISSIONS_AND_BUSINESS_RULES.md` - Quy tắc nghiệp vụ (1,400+ dòng)
2. `LOGIC_MOI_QUAN_HE.md` - Logic mối quan hệ
3. `NHAT-KY-THUC-HIEN.md` - Nhật ký thực hiện
4. `HUONG-DAN-SU-DUNG.md` - Hướng dẫn người dùng

### Tài liệu Kiểm thử
1. `docs/UAT_BY_ACTOR.md` - UAT theo vai trò
2. `docs/MANUAL_TEST_CHECKLIST.md` - Checklist kiểm thử thủ công
3. `TEST_SUITE_FINAL_REPORT.md` - Báo cáo kiểm thử

---

**Ghi chú**: Phụ lục này tổng hợp các tài liệu kỹ thuật chi tiết. Khi chuyển sang báo cáo Word/PDF, có thể trích dẫn hoặc tóm tắt các phần cần thiết.
...
```

### C.2. Screenshots

*Danh sách screenshots cần chụp:*

1. **Trang đăng nhập**
2. **Tổng quan quản trị**
3. **Quản lý người dùng**
4. **Phê duyệt hoạt động**
5. **Cấu hình hệ thống**
6. **Tổng quan giáo viên**
7. **Tạo hoạt động**
8. **Tạo phiên QR**
9. **Quét QR điểm danh**
10. **Tổng quan sinh viên**
11. **Danh sách hoạt động**
12. **Quét mã QR**
13. **Hồ sơ & điểm**
14. **Bảng xếp hạng**
15. **Báo cáo thống kê**

---

## PHỤ LỤC D: DỮ LIỆU MẪU

### D.1. Loại hoạt động (ví dụ)

Lưu ý: danh mục thực tế và điểm cơ bản (nếu áp dụng) lấy theo schema/migrations và dữ liệu seed trong repo.

| Tên | Mô tả |
|-----|------|
| Học thuật | Hội thảo, seminar khoa học |
| Văn hóa - Văn nghệ | Ngày hội, biểu diễn |
| Thể dục - Thể thao | Giải thể thao |
| Tình nguyện | Hiến máu, từ thiện |
| Khác | Các hoạt động khác |

### D.2. Cấp độ tổ chức (ví dụ)

Lưu ý: hệ số/cách quy đổi (nếu có) phụ thuộc cấu hình; không gán cứng trong báo cáo.

| Tên | Mô tả |
|-----|------|
| Lớp | Cấp lớp học |
| Khoa | Cấp khoa/bộ môn |
| Trường | Cấp trường |

### D.3. Loại khen thưởng (ví dụ)

Lưu ý: tiêu chí/ngưỡng (nếu có) lấy theo danh mục `award_types` trong CSDL.

| Tên | Mô tả |
|-----|------|
| Giấy khen | Tham gia tích cực |
| Chiến sĩ thi đua cấp Khoa | Xuất sắc cấp Khoa |
| Chiến sĩ thi đua cấp Trường | Xuất sắc cấp Trường |
| Sinh viên 5 tốt | Theo tiêu chí đơn vị |

---

## PHỤ LỤC E: CẤU HÌNH HỆ THỐNG

### E.1. Environment Variables

```bash
# Ví dụ .env.local (tham khảo)
DATABASE_PATH=./uniact.db
JWT_SECRET=<secret>
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# Production (ví dụ)
# NODE_ENV=production
# NEXT_PUBLIC_API_URL=http://<server-host>:<port>
```

### E.2. Dependency & phiên bản (dự kiến)

Danh sách dependency và phiên bản sẽ được chốt ở giai đoạn triển khai (theo công nghệ đã chọn trong phần nền tảng/công nghệ).

### E.3. System Requirements

Yêu cầu hệ thống phụ thuộc quy mô dữ liệu và số lượng người dùng đồng thời.

- Thiết bị người dùng: trình duyệt hiện đại trên máy tính/điện thoại.
- Máy chủ: cấu hình phù hợp triển khai nội bộ và có kế hoạch sao lưu.
- Mạng: theo mô hình triển khai của đơn vị (ưu tiên nội bộ).

---

## PHỤ LỤC F: HƯỚNG DẪN TRIỂN KHAI (THAM KHẢO)

Lưu ý: phần này mô tả quy trình triển khai tổng quát theo thiết kế. Khi bước sang giai đoạn triển khai, nhóm sẽ bổ sung script/cấu hình cụ thể theo môi trường.

### F.1. Các bước triển khai cơ bản

Các bước triển khai cơ bản (mô tả):

1) Cài đặt môi trường chạy (Node.js, trình quản lý package)
2) Thiết lập biến môi trường (DB path, JWT secret, URL truy cập)
3) Khởi tạo CSDL (migration) và nạp dữ liệu mẫu (nếu cần demo/kiểm thử)
4) Build và chạy dịch vụ theo mô hình triển khai (dev/prod)

---

**KẾT THÚC PHỤ LỤC**

Tổng số trang phụ lục: ~15-20 trang (khi chuyển sang Word với code formatting, hình ảnh)
