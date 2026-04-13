# UniAct

Điểm vào chuẩn cho repo này là:
- `README.md` này, dùng cho cài đặt, thiết lập, seed dữ liệu, kiểm thử, demo và internal release prep
- `CANONICAL_DOCS.md`, dùng để biết tài liệu nào còn active và tài liệu nào chỉ là archive/history

Nếu có mâu thuẫn giữa tài liệu cũ và repo hiện tại, ưu tiên:
1. `package.json`
2. `README.md`
3. `CANONICAL_DOCS.md`
4. các tài liệu RC/smoke đang active trong `docs/`

---

## 1. UniAct là gì

UniAct là hệ thống quản lý hoạt động ngoại khóa/phong trào cho 3 vai trò chính:
- **Admin**: quản trị dữ liệu, duyệt hoạt động, cấu hình, báo cáo
- **Teacher / cán bộ quản lý**: tạo hoạt động, quản lý lớp, điểm danh, đánh giá
- **Student**: xem hoạt động, đăng ký, điểm danh, theo dõi điểm và lịch sử tham gia

Tech stack hiện tại:
- Next.js 15
- React 19
- TypeScript
- SQLite
- Vitest
- Playwright

---

## 2. Trạng thái repo hiện tại

Repo hiện đang được harden theo hướng **internal release candidate** cho backbone admin/teacher/student, chưa nên mô tả là public production-ready.

Baseline đã xác nhận gần đây:
- `npm run build` chạy được
- backbone regression bundle đã được mở rộng
- production-like smoke subset đã từng pass trên `npm run build` + `next start`
- canonical QA/demo accounts đã chuyển sang bộ **ANND**

Tài liệu liên quan:
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`
- `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`
- `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`

---

## 3. Yêu cầu môi trường

Tối thiểu:
- Node.js 18+
- npm 9+
- Git

Khuyến nghị:
- Linux/macOS hoặc Windows 10/11
- đủ dung lượng cho `node_modules`, build output và SQLite DB local

---

## 4. Cài đặt nhanh

```bash
git clone <repo-url> uniact
cd uniact
npm install
```

Tạo file env local từ mẫu:

```bash
cp .env.example .env
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Biến quan trọng nhất cho production-like runtime:
- `JWT_SECRET` là **bắt buộc** khi chạy `npm start`

---

## 5. Thiết lập dữ liệu và database

### 5.1 Migrate schema

```bash
npm run db:migrate
```

### 5.2 Các mode seed hiện có

```bash
npm run seed
npm run seed:reset
npm run seed:minimal
npm run seed:enhanced
npm run seed:qa
```

Ý nghĩa thực dụng:
- `npm run seed` → demo seed cơ bản
- `npm run seed:minimal` → seed tối thiểu
- `npm run seed:enhanced` → seed demo phong phú hơn
- `npm run seed:qa` → seed ưu tiên cho QA/UAT/smoke backbone hiện tại
- `npm run seed:reset` → reset trạng thái seed theo script hiện hành

### 5.3 Luồng local setup khuyến nghị hiện tại

Để dựng môi trường local dùng cho kiểm thử, demo và smoke backbone:

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run seed:qa
npm run build
npm start
```

### 5.4 Tài khoản canonical cho QA / demo / UAT

Dùng bộ account này làm source of truth hiện tại:
- `admin@annd.edu.vn / Admin@2025`
- `gvcn.nguyenvanmanh@annd.edu.vn / teacher123`
- `sv31a001@annd.edu.vn / student123`

Lưu ý:
- repo có thể còn một số account `school.edu` để tương thích legacy
- với smoke, UAT, demo hiện tại, **ưu tiên bộ ANND ở trên**

---

## 6. Chạy ứng dụng

### Development

```bash
npm run dev
```

LAN dev:

```bash
npm run dev:lan
```

### Production-like local runtime

```bash
npm run build
npm start
```

Hoặc dùng script wrapper production:

```bash
npm run production:build
npm run production:start
```

Khuyến nghị hiện tại:
- để xác minh smoke/release-like behavior, ưu tiên `npm run build` + `npm start`
- không nên coi `next dev --turbopack` là smoke gate đáng tin nhất cho chained runs

---

## 7. Toàn bộ npm scripts quan trọng

### 7.1 Runtime

```bash
npm run dev
npm run dev:lan
npm run build
npm start
npm run production:build
npm run production:start
```

### 7.2 Database / seed

```bash
npm run db:migrate
npm run db:setup
npm run seed
npm run seed:reset
npm run seed:minimal
npm run seed:enhanced
npm run seed:qa
```

### 7.3 Kiểm thử

```bash
npm test
npm run test:core-flows
npm run test:admin-report-routes
npm run test:admin-report-pages
npm run test:admin-reports
npm run test:backbone
npm run test:e2e
npm run test:activity-contract
```

### 7.4 Validation / audit / fix

```bash
npm run validate
npm run validate:schema
npm run validate:data
npm run validate:indexes
npm run audit:routes
npm run audit:i18n
npm run fix
npm run fix:queries
npm run fix:schema
npm run fix:dry-run
```

### 7.5 Release / maintenance / ops

```bash
npm run release:check
npm run release:check:fast
npm run backup-db
npm run benchmark
npm run load-test
npm run health-check
npm run logs
npm run system-info
npm run jobs:start
npm run jobs:test
npm run cleanup
npm run cleanup:dry-run
npm run cleanup:soft
```

### 7.6 Formatting / lint

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

---

## 8. Kiểm thử khuyến nghị theo mục đích

### 8.1 Kiểm tra nhanh sau khi sửa nhỏ

```bash
npm run build
```

### 8.2 Regression backbone

```bash
npm run test:backbone
```

### 8.3 Khi sửa core flows

```bash
npm run test:core-flows
```

### 8.4 Khi sửa admin reports

```bash
npm run test:admin-reports
```

### 8.5 Khi cần smoke gần release nhất

Luồng local khuyến nghị:

```bash
npm run db:migrate
npm run seed:qa
npm run build
npm start
```

Sau đó chạy subset UAT backbone phù hợp.

---

## 9. UAT / smoke / demo

Tài liệu ngắn liên quan:
- `test/uat/README.md`
- `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`
- `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md`

Subset backbone có giá trị cao hiện tại:
- admin approval
- student discovery/registration
- teacher class management

Nguyên tắc hiện tại:
- smoke gate đáng tin hơn là production runtime, không phải chained dev runtime
- không coi seed/account drift là bằng chứng app hỏng nếu runtime chưa align đúng

---

## 10. Internal RC / release prep

Khi cần đánh giá mốc internal RC, xem:
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`
- `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`
- `docs/INTERNAL_RC_TAGGING_PLAN_2026-04-12.md`
- `docs/INTERNAL_RC_ANNOUNCEMENT_TEMPLATE_2026-04-12.md`
- `docs/INTERNAL_RELEASE_NOTE_2026-04-12.md`

Lưu ý trạng thái hiện tại:
- internal RC prep / stronger internal RC milestone
- chưa nên mô tả là public production release hoàn chỉnh

---

## 11. Env tối thiểu nên biết

File mẫu: `.env.example`

Biến quan trọng:
- `JWT_SECRET`
- `WEBAUTHN_ORIGIN`
- `BIOMETRIC_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `BACKUP_DIR`

Quy tắc:
- không commit `.env` local
- chỉ commit `.env.example`

---

## 12. Dọn dữ liệu rác / artifacts local

Các output local/generated không nên coi là nội dung repo:
- `.next/`
- `test-results/`
- `playwright-report/`
- DB local runtime như `uniact.db`, `*.db-shm`, `*.db-wal`
- log/tmp/report outputs

Repo đã có `.gitignore` cho phần lớn các file này.

Nếu cần cleanup local working tree:

```bash
npm run cleanup:dry-run
npm run cleanup
```

Hoặc cleanup mềm:

```bash
npm run cleanup:soft
```

---

## 13. Khi tiếp quản repo này nên đọc gì trước

1. `README.md`
2. `CANONICAL_DOCS.md`
3. `PROJECT_AUDIT.md`
4. `CORE_PRODUCT_FLOW.md`
5. `BUSINESS_DECISIONS.md`
6. `TASK_QUEUE.md`

---

## 14. Tài liệu đã archive

Các tài liệu roadmap/progress/changelog/report/prompt cũ đã được gom sang:
- `docs/archive/root-legacy/`
- `docs/archive/docs-legacy-2026-04-13/`
- `docs/archive/docs-reports-legacy-2026-04-13/`

Mục tiêu là giữ repo gọn hơn và tránh nhầm tài liệu historical với source of truth hiện tại.
