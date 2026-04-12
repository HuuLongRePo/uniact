# PHẦN II (TIẾP): THIẾT KẾ HỆ THỐNG

---

## 4.1. KIẾN TRÚC TỔNG THỂ

### 4.1.1. Kiến trúc 3 tầng

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Admin   │  │ Teacher  │  │ Student  │  │  Public  │   │
│  │Dashboard │  │Dashboard │  │Dashboard │  │  Pages   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       React Components (các trang theo vai trò)             │
│       Tailwind CSS, TypeScript                              │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/JSON
┌─────────────────────────▼───────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Next.js API Routes                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Authentication    Authorization    Validation       │  │
│  │  (JWT)            (RBAC)            (Zod)            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Business Logic:                                     │  │
│  │  • Activities CRUD    • QR Sessions                  │  │
│  │  • Attendance         • Scoring Engine               │  │
│  │  • Awards             • Alerts                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQL Queries
┌─────────────────────────▼───────────────────────────────────┐
│                   DATA ACCESS LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SQLite Database                              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  • Users, Classes     • Activities, Participations   │  │
│  │  • QR Sessions        • Attendance Records           │  │
│  │  • Scoring, Awards    • Alerts, Audit Logs          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Indexes  |  Transactions  |  WAL Mode              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.1.2. Component Diagram

```
Frontend Components
├── Layout
│   ├── Navigation
│   ├── Sidebar
│   └── Footer
├── Admin
│   ├── Dashboard
│   ├── UserManagement
│   ├── ActivityApproval
│   └── SystemConfig
├── Teacher
│   ├── Dashboard
│   ├── ActivityCRUD
│   ├── QRSession
│   └── ClassManagement
├── Student
│   ├── Dashboard
│   ├── ActivityBrowse
│   └── QRScanner
└── Shared
    ├── ActivityCard
    ├── DataTable
    ├── Forms
    └── Charts
```

---

## 4.2. THIẾT KẾ DATABASE

### 4.2.1. Entity Relationship Diagram (ERD)

**Core Tables:**

```
┌─────────────┐       ┌──────────────┐
│   users     │───┬───│   classes    │
├─────────────┤   │   ├──────────────┤
│ id (PK)     │   │   │ id (PK)      │
│ email       │   └──<│ teacher_id   │
│ password    │       │ name         │
│ name        │       │ grade        │
│ role        │       └──────────────┘
│ class_id    │
└─────────────┘
      │
      │
      ▼
┌──────────────────────┐
│   activities         │
├──────────────────────┤
│ id (PK)              │
│ title                │
│ teacher_id (FK)      │
│ activity_type_id     │
│ organization_level   │
│ status               │
│ date_time            │
└──────────────────────┘
      │
      ├────┬────────────┐
      │    │            │
      ▼    ▼            ▼
┌─────────┐  ┌───────────┐  ┌──────────┐
│particip.│  │qr_sessions│  │attendance│
├─────────┤  ├───────────┤  ├──────────┤
│student  │  │session_id │  │activity  │
│activity │  │activity   │  │student   │
│status   │  │expires_at │  │timestamp │
└─────────┘  └───────────┘  └──────────┘
```

### 4.2.2. Thiết kế bảng dữ liệu

Phần này mô tả nhóm bảng dữ liệu và mối quan hệ chính theo **thiết kế**. Khi bước sang giai đoạn triển khai, schema sẽ được hiện thực bằng migration và được cập nhật/đối chiếu lại trong phụ lục.

Trong phạm vi báo cáo, nhóm bảng dữ liệu chính phục vụ nghiệp vụ gồm:

- **Người dùng & lớp**: người dùng, vai trò, lớp, phân công
- **Hoạt động**: hoạt động, loại hoạt động, cấp tổ chức, đăng ký/tham gia
- **Điểm danh**: phiên QR, điểm danh, lịch sử/ghi chú
- **Thi đua & điểm số**: điểm theo kỳ, lịch sử cộng/trừ, cấu hình công thức
- **Khen thưởng**: loại khen thưởng, đề xuất, phê duyệt, lịch sử
- **Thông báo & cảnh báo**: thông báo hệ thống, cảnh báo theo ngưỡng
- **Nhật ký & vận hành**: audit log, error log, cấu hình hệ thống

---

## 4.3. THIẾT KẾ API

### 4.3.1. RESTful API Design

**Nguyên tắc:**
- GET: Đọc dữ liệu
- POST: Tạo mới
- PUT/PATCH: Cập nhật
- DELETE: Xóa

**Authentication:**
- JWT token trong HTTP-only cookie (mặc định)
- (Tùy chọn) `Authorization: Bearer <token>` để hỗ trợ kiểm thử/tích hợp

**Response format (thực tế triển khai hiện tại):**

Trong quá trình hiện thực, hệ thống sử dụng response helpers để chuẩn hóa phản hồi API. Ở mức khái quát, client hiện đọc dữ liệu theo các shape canonical như:

- Thành công: dữ liệu nghiệp vụ nằm trong object phản hồi, ví dụ `{ activities: [...] }`, `{ activity: {...} }`, hoặc payload thành công tương đương kèm `message` khi cần.
- Thất bại: phản hồi chứa `error`, `code` và có thể kèm `details` để client hoặc test xử lý theo ngữ nghĩa lỗi.

Điểm quan trọng là các route backbone đang được chuẩn hóa dần để giữ đúng semantic của lỗi nghiệp vụ và tránh collapse toàn bộ về lỗi máy chủ nội bộ.

### 4.3.2. Danh sách API/Giao tiếp hệ thống (thiết kế đề xuất)

#### a) Danh sách module API (tổng quan)

Các module API dự kiến (chia theo nghiệp vụ) gồm:

- `auth`: đăng nhập/đăng xuất/đổi mật khẩu
- `users`, `classes`: quản lý người dùng, lớp, phân công
- `activities`, `activity-types`, `activity-approvals`: hoạt động và luồng duyệt
- `qr-sessions`, `attendance`: điểm danh QR
- `scores`, `scoreboard`: tổng hợp điểm/thi đua
- `bonus`, `awards`: đề xuất/duyệt cộng điểm và khen thưởng
- `reports`, `export`: báo cáo, xuất dữ liệu
- `notifications`, `alerts`: thông báo/cảnh báo (nếu bật trong phạm vi)
- `audit-logs`, `health`: nhật ký thao tác và kiểm tra tình trạng hệ thống

Trong phạm vi báo cáo, phần dưới đây mô tả chi tiết các API cốt lõi phục vụ luồng chính: đăng nhập → quản lý hoạt động → điểm danh QR → theo dõi.

#### b) API cốt lõi (có method + request/response)

**1) Đăng nhập**
- **Method/Path:** `POST /api/auth/login`
- **Request body:** `{ "email": string, "password": string }`
- **Response:** trả về `{ user, message, token? }` và set cookie `token` dạng HTTP-only (token chỉ được trả về trong môi trường không phải production để phục vụ kiểm thử tự động).

**2) Lấy danh sách hoạt động**
- **Method/Path:** `GET /api/activities`
- **Auth:** cookie `token` hoặc `Authorization: Bearer <token>`
- **Response:** `{ activities: Activity[] }` (dữ liệu có thể khác nhau theo vai trò: admin/teacher/student).

**3) Tạo hoạt động (giáo viên)**
- **Method/Path:** `POST /api/activities`
- **Auth:** teacher
- **Request body (các trường chính):** `{ title, date_time (hoặc start_time), location, ... }`
- **Response:** `{ activity, message }`.

**4) Tạo phiên QR (giáo viên hoặc admin)**
- **Method/Path:** `POST /api/qr-sessions`
- **Request body:** `{ "activity_id": number, "expires_minutes"?: number, "single_use"?: boolean, "max_scans"?: number }`
- **Response:** `{ session_token, expires_at, options }`.

**5) Sinh viên quét QR để điểm danh**
- **Method/Path:** `POST /api/attendance/validate`
- **Request body:** `{ "session_token": string }`
- **Response:** `{ success: boolean, message?: string }` hoặc `{ error: string }`.

**6) Điểm danh thủ công (Teacher/Admin) – hỗ trợ tick bulk**
- **Method/Path:** `POST /api/attendance/manual`
- **Request body:**
      - `{ "activity_id": number, "student_ids": number[] }`
      - (Tùy chọn) `achievements`: `{ [student_id: number]: 'excellent' | 'good' | 'participated' | null }`
- **Response:** `{ message, successCount, alreadyAttended, results }`.

**7) Điểm danh hàng loạt (Teacher)**
- **Method/Path:** `POST /api/teacher/attendance/bulk`
- **Request body:** `{ "activity_id": number, "student_ids": number[], "notes"?: string }`
- **Response:** `{ success: true, data: { success: any[], failed: any[] }, message? }`.

**6) Kiểm tra tình trạng hệ thống**
- **Method/Path:** `GET /api/health`
- **Response:** `{ status, uptime_*, database: { ... }, disk, node, timestamp }`.

#### c) API mở rộng theo module (trích các tuyến tiêu biểu)

Lưu ý: danh sách dưới đây chọn các tuyến tiêu biểu theo thiết kế (duyệt, bonus, khen thưởng, xuất dữ liệu, nhật ký) để mô tả cho dễ theo dõi.

**1) Duyệt hoạt động**
- `GET /api/teacher/activities/approvals?status=all|pending|approved|rejected` → danh sách hoạt động theo trạng thái duyệt cho teacher/admin
- `POST /api/admin/activities/:id/approval` body `{ action: 'approve'|'reject', notes? }` → cập nhật trạng thái duyệt theo workflow hiện tại
- `POST /api/teacher/activities/:id/resubmit` body `{ message? }` → teacher gửi duyệt lại hoạt động đã bị từ chối

**2) Bonus (đề xuất/duyệt cộng điểm)**
- `GET /api/bonus?status=pending|approved|rejected` → `{ suggestions: [...] }`
- `POST /api/bonus` (teacher/admin) body `{ student_id, points, source_type?, source_id?, evidence_url? }` → `{ success: true, suggestion_id }`
- `POST /api/bonus/:id/approve` (admin) body `{ action: 'approve'|'reject', note? }` → `{ success: true, status }`

**3) Awards (đề xuất/duyệt khen thưởng)**
- `GET /api/awards?status=pending|approved|rejected` (teacher/admin) → `{ suggestions: [...] }`
- `POST /api/awards` (teacher/admin) body:
      - `{ action: 'generate' }` → `{ success: true, count, message }`
      - hoặc `{ action: 'create', student_id, award_type_id }` → `{ success: true, suggestion_id }`
- `PUT /api/awards` (admin) body `{ suggestion_id, action: 'approve'|'reject', note? }` → `{ success: true, message }`

**4) Audit logs (nhật ký thao tác)**
- `GET /api/audit-logs?page=&per_page=&actor_id=&action=&date_from=&date_to=` → `{ logs, meta }`
- `GET /api/audit-logs?export=csv...` → `{ csv, meta }` (phục vụ tải về phía client)

**5) Export dữ liệu (CSV)**
- `GET /api/export/attendance?class_id=&start_date=&end_date=` → trả file CSV (teacher bắt buộc có `class_id`; student bị chặn)
- `GET /api/export/scoreboard?class_id=` → trả file CSV (student chỉ được xuất lớp của mình)



### 4.3.3. API Authentication Flow

```typescript
// 1. Login
POST /api/auth/login
Body: { email, password }
Response: Set-Cookie: token=<jwt>; HttpOnly; SameSite=Strict

// 2. Các request tiếp theo
GET /api/activities
Cookie: token=<jwt>
Middleware: Verify JWT → req.user

// 3. Logout
POST /api/auth/logout
Response: Clear cookie
```

### 4.3.4. Rate Limiting

Giới hạn tần suất (rate limiting) áp dụng theo cấu hình hệ thống để giảm lạm dụng và ổn định vận hành. Thông thường tách theo nhóm: đọc dữ liệu, ghi dữ liệu, đăng nhập và xuất báo cáo.

### 4.3.5. Trạng thái canonical quan trọng trong workflow hoạt động

Để tránh nhầm lẫn giữa trạng thái hiển thị và trạng thái lưu trữ, hệ thống hiện phân biệt:

- `activities.status`: phản ánh trạng thái vận hành của hoạt động, gồm các giá trị như `draft`, `published`, `completed`, `cancelled`
- `activities.approval_status`: phản ánh trạng thái duyệt, gồm `draft`, `requested`, `approved`, `rejected`
- `pending` chỉ nên hiểu là trạng thái hiển thị/UI mapping cho `approval_status='requested'`, không phải canonical DB status của activity

Điểm này rất quan trọng trong cả phân tích nghiệp vụ lẫn thiết kế API/client.

---

## 4.4. THIẾT KẾ GIAO DIỆN

### 4.4.1. Wireframes chính

**1. Tổng quan quản trị:**
```
┌────────────────────────────────────────────────┐
│ Thanh điều hướng                       [User]  │
├──────┬─────────────────────────────────────────┤
│      │  Tổng quan                              │
│ Side │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │
│ bar  │  │Users│  │Acts │  │Attn │  │Score│   │
│      │  │ ... │  │ ... │  │ ... │  │ ... │   │
│ • Tổng   └─────┘  └─────┘  └─────┘  └─────┘   │
│   quan   ┌─────────────────────────────────┐  │
│ • Người  │   Biểu đồ/Thống kê (nếu có)     │  │
│   dùng   │                                 │  │
│ • Hoạt   │                                 │  │
│   động   │                                 │  │
│ • Cấu    └─────────────────────────────────┘  │
│   hình                                     │  │
│ • Báo cáo                                  │  │
│      │   └─────────────────────────────────┘  │
└──────┴─────────────────────────────────────────┘
```

**2. Giáo viên - Tạo hoạt động:**
```
┌────────────────────────────────────────────────┐
│ Tạo hoạt động                                   │
├────────────────────────────────────────────────┤
│ Tiêu đề: [_________________________________]  │
│ Mô tả: [___________________________________]  │
│ Ngày & giờ: [__________] [__________]         │
│ Địa điểm: [________________________________]  │
│ Loại: [Chọn: Học thuật ▼]                      │
│ Cấp: [Chọn: Trường ▼]                          │
│ Số lượng tối đa: [____]                        │
│ Lớp được tham gia: [☑ Lớp A] [☐ Lớp B]         │
│ Attachments: [Upload]                          │
│                                                │
│ [Cancel]  [Save Draft]  [Submit for Approval] │
└────────────────────────────────────────────────┘
```

**3. Student - Browse Activities:**
```
┌────────────────────────────────────────────────┐
│ Activities                              [Filter]│
├────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐   │
│ │ Hội thảo Khoa học             [Register]│   │
│ │ Date: 15/11/2024 | Place: Hall A | 50/100│   │
│ └─────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────┐   │
│ │ Giải bóng đá               [Registered]│   │
│ │ Date: 20/11/2024 | Place: Field | 20/30  │   │
│ └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

### 4.4.2. Design System

Hệ thống dự kiến sử dụng TailwindCSS và các thành phần UI theo hướng design system.

- Màu sắc/khoảng cách/kiểu chữ tuân theo theme thống nhất (sẽ cấu hình khi triển khai).
- Thành phần giao diện tập trung vào các nhóm: nút bấm, thẻ (card), biểu mẫu, bảng dữ liệu, thông báo lỗi.

---

**KẾT LUẬN (THIẾT KẾ HỆ THỐNG):**

Phần này đã thiết kế:
- Kiến trúc tổng thể và phân ra thành phần
- CSDL theo schema thiết kế (ERD và mô tả bảng)
- API theo mô hình REST (danh sách endpoint và request/response)
- Nguyên tắc thiết kế giao diện theo Tailwind và responsive design

Đây là nền tảng để triển khai ở phần tiếp theo.

---

**TÀI LIỆU BỔ SUNG:**

Để hiểu rõ logic mối quan hệ giữa các thực thể và query patterns, tham khảo:
- **[LOGIC_MOI_QUAN_HE.md](LOGIC_MOI_QUAN_HE.md)** - Relationship logic, ERD chi tiết, Query patterns, Performance indexes (500+ dòng)
- **[PERMISSIONS_AND_BUSINESS_RULES.md](PERMISSIONS_AND_BUSINESS_RULES.md)** - Permission matrix, Conflict detection algorithms (1,400+ dòng)
