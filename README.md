# uniact

> Lưu ý tài liệu: dùng [CANONICAL_DOCS.md](CANONICAL_DOCS.md) làm điểm vào chuẩn cho tài liệu hiện tại của repo. Nếu có mâu thuẫn giữa README này với các file kế hoạch/audit ở root, ưu tiên `CANONICAL_DOCS.md` và nhóm tài liệu điều hành hiện tại.
>
> Từ 2026-04-12, các tài liệu historical/report không còn active ở root đã được gom vào `docs/archive/root-legacy/` để giữ cấu trúc repo gọn hơn.

# [cite_start]CÔNG TRÌNH THAM DỰ CUỘC THI SINH VIÊN NGHIÊN CỨU KHOA HỌC - UNITECH NĂM HỌC 2024 - 2025 [cite: 10]
[cite_start]**Tên đề tài:** Xây dựng Hệ thống Quản lý hoạt động ngoại khóa, phong trào thanh niên [cite: 30]
[cite_start]**Tên phần mềm/sản phẩm công nghệ:** UniAct [cite: 31]
[cite_start]**Học viên thực hiện:** Nguyễn Hữu Long – VB2-D3A [cite: 32]
[cite_start]**Chuyên ngành:** An ninh điều tra [cite: 15]

---

## I. MỤC TIÊU VÀ TỔNG QUAN GIẢI PHÁP
[cite_start]Hệ thống UniAct được xây dựng nhằm hỗ trợ quản lý hoạt động ngoại khóa theo hướng tập trung, nâng cao độ chính xác trong công tác điểm danh (bằng mã QR), giảm tải khối lượng công việc thủ công, đồng thời hỗ trợ tổng hợp dữ liệu phục vụ công tác đánh giá, xếp loại và khen thưởng[cite: 57]. 

### [cite_start]Mục tiêu cụ thể [cite: 66, 67, 69, 70, 71, 72]
- Quản lý hoạt động ngoại khóa và phong trào thanh niên theo cấu hình nghiệp vụ.
- Hỗ trợ điểm danh học viên bằng mã QR có thời gian hiệu lực.
- Tự động tổng hợp điểm rèn luyện, điểm thi đua theo cấu hình.
- Hỗ trợ đề xuất, xét duyệt khen thưởng.
- Theo dõi, cảnh báo tình trạng tham gia hoạt động của học viên.
- Phân quyền chi tiết theo vai trò người dùng (RBAC).

---

## II. KIẾN TRÚC VÀ CÔNG NGHỆ (TECH STACK)
[cite_start]Hệ thống được thiết kế theo mô hình 3 tầng (3-tier Architecture): Tầng giao diện (Presentation Layer), Tầng nghiệp vụ (Business Logic Layer) và Tầng dữ liệu (Data Layer)[cite: 95, 96, 97, 98].

### [cite_start]Công nghệ sử dụng [cite: 285, 286, 287, 288, 289, 290]
- **Framework:** Next.js (15.x) - Hỗ trợ Full-stack, App Router, SSR và API Routes.
- **Ngôn ngữ:** TypeScript (5.x) - Đảm bảo an toàn kiểu dữ liệu.
- **Giao diện (Frontend):** React (19.x) & Tailwind CSS.
- **Cơ sở dữ liệu (Database):** SQLite - Gọn nhẹ, dạng file, phù hợp triển khai mạng nội bộ.
- **Mã QR:** react-qr-code + jsqr.
- **Kiểm thử:** Vitest (Unit Test) & Playwright (E2E).

---

## III. PHÂN QUYỀN VÀ TÍNH NĂNG (ACTORS & MODULES)

### [cite_start]1. Admin (Quản trị viên) [cite: 199]
- **Quản lý người dùng:** Thêm/sửa/xóa/khóa tài khoản, Import/Export người dùng qua CSV, phân quyền.
- **Quản lý lớp học:** Quản lý danh sách lớp.
- **Quản lý hoạt động:** Phê duyệt / Từ chối hoạt động do giảng viên đề xuất.
- **Tính điểm & Khen thưởng:** Cấu hình công thức tính điểm, duyệt cộng điểm, duyệt khen thưởng.
- **Báo cáo:** Xem Dashboard toàn trường, xem nhật ký hệ thống (Audit logs).

### [cite_start]2. Teacher (Giảng viên / Cán bộ quản lý) [cite: 200]
- **Quản lý hoạt động:** Tạo, chỉnh sửa (nếu là chủ sở hữu), gửi duyệt, hủy hoạt động.
- **Điểm danh:** Tạo phiên điểm danh bằng mã QR (có thời gian hiệu lực), điểm danh thủ công (Bulk).
- **Đánh giá & Điểm:** Đánh giá học viên tham gia, đề xuất cộng điểm, đề xuất khen thưởng.
- **Báo cáo:** Xem danh sách lớp, xem báo cáo điểm danh và xuất báo cáo kết quả.

### [cite_start]3. Student (Học viên) [cite: 201]
- **Tham gia hoạt động:** Xem danh sách hoạt động mở, đăng ký tham gia, hủy đăng ký.
- **Điểm danh:** Quét mã QR do giảng viên cung cấp để điểm danh.
- **Theo dõi cá nhân:** Tra cứu điểm rèn luyện, lịch sử tham gia, thông báo khen thưởng cá nhân.

---

## IV. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)
[cite_start]Các bảng dữ liệu chính trong SQLite được chia thành các nhóm[cite: 198]:
- **Nhóm Người dùng & Lớp học:** `users`, `departments`, `classes`, `class_teachers`.
- **Nhóm Hoạt động & Lịch:** `activities`, `activity_time_slots`, `activity_classes`.
- **Nhóm Cấu hình:** `activity_types`, `organization_levels`.
- **Nhóm Tham gia & Điểm:** `participations`, `point_calculations`, `student_scores`.
- **Nhóm Điểm danh:** `qr_sessions`, `attendance_records`.
- **Nhóm Phê duyệt:** `activity_approvals`, `activity_approval_history`.
- **Nhóm Khen thưởng:** `achievements`, `achievement_multipliers`, `suggested_bonus_points`, `award_types`.
- **Nhóm Hỗ trợ:** `audit_logs`, `notifications`, v.v.

---

## [cite_start]V. ĐẶC TẢ API CỐT LÕI (RESTFUL API) [cite: 243, 244, 245, 246, 247, 248, 249]
Hệ thống sử dụng Next.js API Routes với các điểm cuối chính:
1. `POST /api/auth/login`: Xác thực người dùng, thiết lập token (HTTP-only cookie).
2. `GET /api/activities`: Truy xuất danh sách hoạt động (lọc theo Role).
3. `POST /api/qr-sessions`: Giảng viên khởi tạo phiên QR Code động.
4. `POST /api/attendance/validate`: Học viên gửi mã QR để hệ thống xác thực và ghi nhận điểm.
5. `POST /api/attendance/manual`: Giảng viên điểm danh thủ công.
6. `GET /api/export/scoreboard`: Kết xuất bảng điểm thi đua dạng CSV.
7. `GET /api/health`: Kiểm tra tình trạng kết nối CSDL và tài nguyên.

---

## VI. BẢO MẬT & VẬN HÀNH (SECURITY)
[cite_start]Do đặc thù triển khai nội bộ, hệ thống chú trọng các giải pháp[cite: 275, 276, 277, 278, 281, 282, 283]:
- **Xác thực:** JSON Web Token (JWT) lưu trong HTTP-only Cookie (chống XSS).
- **Cookie Policy:** Thiết lập `SameSite=Strict` để chống CSRF.
- **Bảo mật dữ liệu:** Mật khẩu mã hóa bằng `bcryptjs`. Sử dụng Parameterized Queries chống SQL Injection.
- [cite_start]**Kiểm soát lưu lượng (Rate Limiting):** Phân nhóm giới hạn tần suất truy cập cho API (Đọc, Ghi, Bảo mật) để chống DoS[cite: 256, 257, 258].
- **Lưu trữ CSDL:** Dùng file SQLite, sao lưu định kỳ bằng script copy file `.db`.

---

## VII. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY HỆ THỐNG

### 1. YÊU CẦU HỆ THỐNG
- **Node.js:** Phiên bản 18.x hoặc mới hơn
- **npm:** Phiên bản 9.x hoặc mới hơn
- **Hệ điều hành:** Windows, macOS, hoặc Linux
- **Dung lượng:** Tối thiểu 500MB không gian đĩa

### 2. CÀI ĐẶT

#### **Bước 1: Tải mã nguồn**
```bash
git clone <repository-url> uniact
cd uniact
```

#### **Bước 2: Cài đặt dependencies**
```bash
npm install
```

#### **Bước 3: Khởi tạo cơ sở dữ liệu**
```bash
npm run db:setup
```
Lệnh này sẽ:
- Tạo file `uniact.db` (SQLite)
- Chạy migrations để tạo bảng dữ liệu
- Tạo tài khoản admin mặc định (xem console output để lấy mật khẩu tạm thời)

#### **Bước 4: (Tuỳ chọn) Import dữ liệu mẫu**
```bash
npm run seed
```
Import dữ liệu mẫu (sinh viên, lớp, hoạt động) cho environment của nhà phát triển.

### 3. CHẠY HỆ THỐNG

#### **Development Server** (với live reload)
```bash
npm run dev
```
Hệ thống sẽ chạy tại: `http://localhost:3000`

#### **Production Build** (tối ưu hóa)
```bash
npm run build
npm start
```

#### **Chạy Tests**
```bash
# Chạy tất cả tests (unit + integration)
npm test

# Chạy regression bundle riêng cho core flows
npm run test:core-flows

# Chạy regression route-level cho admin reports
npm run test:admin-report-routes

# Chạy smoke test page-level cho admin reports
npm run test:admin-report-pages

# Chạy regression bundle riêng cho admin reports
npm run test:admin-reports

# Chạy regression bundle xương sống (core flows + admin reports)
npm run test:backbone

# Chạy tests của file cụ thể
npm test -- api/users

# Chạy với watch mode
npm test -- --watch

# Chạy E2E tests (Playwright)
npm run test:e2e
```

#### **Internal RC prep**
- Xem `docs/RELEASE_CANDIDATE_CHECKLIST.md` để biết regression baseline hiện tại cho mốc internal release candidate.
- Xem `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md` để chạy smoke test ngắn cho các flow admin/teacher/student quan trọng nhất.
- Xem `docs/INTERNAL_RELEASE_NOTE_2026-04-12.md` để có milestone note ngắn gọn về trạng thái internal RC hiện tại.
- Xem `docs/INTERNAL_RC_TAGGING_PLAN_2026-04-12.md` và `docs/INTERNAL_RC_ANNOUNCEMENT_TEMPLATE_2026-04-12.md` để chốt tag/announcement sau khi smoke sạch.
- Lưu ý: repo đang được harden dần theo backbone ưu tiên, nên trạng thái hiện tại gần với “internal RC prep” hơn là “public production release”.

#### **Format & Lint Code**
```bash
# Format code (Prettier)
npm run format

# Kiểm tra lint errors (ESLint)
npm run lint

# Sửa lint errors tự động
npm run lint:fix
```

### 4. ĐĂNG NHẬP BAN ĐẦU

#### **Tài khoản Admin (mặc định)**
- **Email:** admin@school.edu
- **Mật khẩu:** (xem console sau khi `npm run db:setup` - password tạm thời)

⚠️ **QUAN TRỌNG:** Thay đổi mật khẩu admin ngay sau lần đăng nhập đầu tiên!

#### **Tài khoản Demo** (nếu dữ liệu mẫu được import)
- **Giáo viên:** teacher@school.edu | Mật khẩu: teacher123
- **Học viên:** student1@school.edu | Mật khẩu: student123

### 5. CẤU HÌNH MÔI TRƯỜNG

Tạo file `.env.local` trong thư mục gốc để override cấu hình mặc định:

```bash
# Database
DATABASE_URL=./uniact.db
DB_FOREIGN_KEYS=1              # Bật FK enforcement (SQLite)

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# Email (tuỳ chọn, để trống nếu không dùng)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin
ADMIN_PASSWORD=YourSecurePassword123

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 6. BACKUP DỮ LIỆU

#### **Sao lưu database**
```bash
# Windows
copy uniact.db uniact.db.backup.%DATE%

# macOS/Linux
cp uniact.db uniact.db.backup.$(date +%Y%m%d)
```

#### **Phục hồi từ backup**
```bash
copy uniact.db.backup uniact.db    # Windows
cp uniact.db.backup uniact.db      # macOS/Linux
```

### 7. KIỂM TRA HỆ THỐNG

#### **Health Check Endpoint**
```bash
npm run health-check
```

Nếu cần gọi trực tiếp endpoint:

```bash
curl http://localhost:3000/api/health
```

Phản hồi sẽ cho biết:
- Tình trạng kết nối database
- Phiên bản ứng dụng
- Thông tin hệ thống

#### **Regression bundle xương sống**
```bash
npm run test:backbone
```

Lệnh này chạy lại các flow lõi (`approval`, `attendance`, `activities`) cùng cụm admin reports để xác minh nhanh phần xương sống hiện tại của dự án.

#### **Regression bundle core flows**
```bash
npm run test:core-flows
```

Lệnh này chỉ chạy các flow lõi `approval`, `attendance`, `activities`, phù hợp khi bạn đang sửa contract, workflow duyệt, điểm danh hoặc chi tiết hoạt động.

#### **Regression route-level admin reports**
```bash
npm run test:admin-report-routes
```

Lệnh này chỉ chạy cụm test route-level của admin reports, phù hợp khi bạn đang chỉnh API cho `participation`, `scores`, `teachers`, `activity-statistics` hoặc các route legacy của reports.

#### **Smoke test admin report pages**
```bash
npm run test:admin-report-pages
```

Lệnh này chỉ chạy 5 smoke test page-level của admin reports, phù hợp khi bạn đang chỉnh UI của `participation`, `custom`, `teachers`, `scores` hoặc `activity-statistics`.

#### **Regression bundle admin reports**
```bash
npm run test:admin-reports
```

Lệnh này chỉ chạy regression của cụm admin reports, phù hợp khi bạn đang sửa `participation`, `custom`, `teachers`, `scores` hoặc `activity-statistics`.

### 8. TROUBLESHOOTING

| Vấn đề | Giải pháp |
|--------|----------|
| **Port 3000 đã bị sử dụng** | `npm run dev -- -p 3001` (chạy trên port 3001) |
| **Database lock error** | Đảm bảo không có instance Next.js khác chạy, xóa `.db-journal` nếu tồn tại |
| **Migration failed** | Xóa `uniact.db` và chạy lại `npm run db:setup` |
| **ADMIN_PASSWORD không có hiệu lực** | Đặt biến env trong `.env.local`, import lại database |

---

## VIII. CẤU TRÚC THƯ MỤC DỰ ÁN

```
uniact/
├── src/
│   ├── app/                 # Next.js App Router (trang + API)
│   ├── components/          # React components
│   ├── contexts/            # React contexts (auth state, etc)
│   ├── lib/                 # Shared utilities (guards, validation, helpers)
│   ├── infrastructure/      # Database layer (db-core, db-queries)
│   ├── types/               # TypeScript type definitions
│   ├── features/            # Feature modules (admin pages)
│   └── middleware.ts        # Next.js middleware
├── public/                  # Static assets (images, icons)
├── test/                    # Test files (unit + integration)
├── migrations/              # Database migrations
├── reports/                 # Report generation scripts
├── uniact.db               # SQLite database (tạo sau khi run `db:setup`)
├── package.json
├── tsconfig.json
└── next.config.ts
```

### Mô tả các thư mục chính:
- **src/app:** Server-side rendering, trang web, API routes
- **src/lib:** Business logic, guards (auth), validators, utilities
- **src/infrastructure:** Tầng dữ liệu, database helpers, transactions
- **test:** Unit tests (Vitest), integration tests
- **migrations:** SQL scripts để quản lý schema database

---

## IX. CƠ CHẾ PHÁT TRIỂN TIẾP THEO

Danh sach các tính năng planned cho phiên bản tiếp theo:
- [ ] Export báo cáo dạng Excel (XLSX)
- [ ] Thông báo real-time via WebSocket
- [ ] Mobile app (React Native/Flutter)
- [ ] Single Sign-On (SSO) via LDAP/Active Directory
- [ ] Two-Factor Authentication (2FA)
- [ ] Analytics dashboard với biểu đồ thống kê
- [ ] Integ với hệ thống HR/Student Information System (SIS)

---

**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 2026-03-24  
**Người bảo trì:** Nguyễn Hữu Long
# uniact
