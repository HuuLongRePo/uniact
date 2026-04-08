# MASTER PLAN HOÀN THIỆN UNIACT (2026)

**Vai trò lập kế hoạch:** Technical Product Manager + Senior Full-stack

**Phạm vi bám theo tài liệu:**
- Kiến trúc: Next.js App Router + React + Tailwind + TypeScript + SQLite
- Bảo mật: JWT trong HTTP-only Cookie, SameSite, Rate Limit, chống SQLi
- Nghiệp vụ lõi: Admin / Teacher / Student, Activity lifecycle, QR attendance, Scoring, Reports

**Giả định trạng thái hiện tại:** Dự án đã có nền tảng và đã tồn tại nhiều API/UI. Kế hoạch này tập trung vào **đóng gap, chuẩn hóa, hardening và release-ready**.

---

## 1) GAP ANALYSIS – TÓM TẮT TÍNH NĂNG CÒN THIẾU

### 1.1 Module bắt buộc theo PRD/đồ án

| Module | Kỳ vọng cuối | Đánh giá hiện tại | Gap cần xử lý |
|---|---|---|---|
| Auth & RBAC | JWT cookie, phân quyền chặt Admin/Teacher/Student, guard nhất quán FE+API | Đã có login/logout/me và role routes | Chuẩn hóa middleware + matrix quyền thống nhất + test phân quyền âm (negative cases) |
| User/Class Management | CRUD user/class, import/export CSV, reset password, chuyển lớp | Đã có nhiều API | Đồng bộ validation, audit trail, xử lý bulk lớn, nhất quán response/error |
| Activity Management | Tạo/sửa/xóa, submit approval, approve/reject, đăng ký/hủy đăng ký | Có nhiều endpoint liên quan | Chuẩn hóa state machine, idempotency, conflict handling, quota/deadline race-condition |
| QR Attendance | Tạo phiên QR động, quét QR, validate token/time window, manual attendance | Có route qr-sessions + attendance | Chuẩn hóa token TTL/nonce/chống replay, chống scan trùng, log gian lận |
| Scoring/Achievements | Tính điểm tự động theo config, bonus đề xuất/duyệt, xếp hạng | Có scoring/awards/bonus APIs | Đồng nhất công thức, snapshot điểm theo kỳ, chạy job an toàn/idempotent |
| Reports/Dashboard | Dashboard theo vai trò, xuất CSV, báo cáo lớp/học viên/hoạt động | Có report/export routes | Chuẩn hóa bộ chỉ số, tối ưu query/index, giới hạn export lớn |
| Notifications | Thông báo hệ thống/nghiệp vụ đến user phù hợp vai trò | Có notification routes | Quy tắc gửi theo sự kiện, chống gửi trùng, theo dõi read/delivery |
| Audit & Security Ops | Audit logs, health check, backup/restore cơ bản, rate-limit theo nhóm API | Có route audit/health/backup | Bổ sung policy chi tiết, giám sát bất thường, review quyền thao tác dữ liệu nhạy cảm |
| Testing & Release | Unit + E2E cho luồng lõi, checklist release, runbook rollback | Đã có Vitest/Playwright + release docs | Đóng coverage theo luồng nghiệp vụ lõi, smoke test trước phát hành |

### 1.2 Các khoảng trống kỹ thuật xuyên suốt
- Chưa chắc chắn tính nhất quán giữa nhiều endpoint trùng chức năng (do phát triển nhiều wave).
- Khả năng có technical debt về chuẩn response/error, validation schema và transaction boundaries.
- Cần chuẩn hóa “single source of truth” cho nghiệp vụ điểm và approval lifecycle.

---

## 2) AGILE SPRINT PLAN (1–2 TUẦN / SPRINT)

## Sprint 1 — Auth & User Management
**Mục tiêu:** Khóa chặt xác thực/phân quyền, chuẩn hóa user/class management.

| Task | [Frontend] | [Backend/API] | [Database] | DoD |
|---|---|---|---|---|
| S1-T1 RBAC Matrix thống nhất | Role-aware nav/menu, route guard theo role | Chuẩn hóa auth middleware, policy check helper cho toàn bộ API | Bổ sung bảng/pivot policy nếu cần, index theo role/status | 100% endpoint lõi đi qua cùng cơ chế authorize |
| S1-T2 Auth session hardening | Login UX + trạng thái hết phiên rõ ràng | Login/logout/me + refresh/session-verify nhất quán | Lưu session metadata (ip, ua, revoked_at) nếu áp dụng | Không truy cập chéo role; logout thu hồi hiệu lực |
| S1-T3 User CRUD chuẩn hóa | Admin pages: list/filter/create/edit/lock | Chuẩn hóa /api/users và /api/admin/users (validation + response contract) | Rà unique index (username/email/code), soft-delete fields | CRUD + lock/unlock chạy ổn, có audit logs |
| S1-T4 CSV import/export users | Import wizard + preview lỗi dòng | API import/export có validate, reject file lỗi | Batch insert transaction + bảng log import | Import 1k bản ghi không vỡ transaction |
| S1-T5 Password lifecycle | UI đổi/đặt lại mật khẩu theo vai trò | Reset/change/request API thống nhất token flow | password_reset_tokens TTL + attempts counter | Token reset hết hạn đúng, chống brute force |

**Security checklist Sprint 1**
- Cookie: `HttpOnly`, `Secure` (prod), `SameSite=Strict`, path/domain đúng phạm vi.
- JWT: có `exp`, `iat`, `iss`, `aud`; rotate secret theo môi trường.
- Rate-limit nhóm Auth: login/reset/password APIs (strict hơn read APIs).
- Chống user enumeration: thông báo lỗi login/reset dạng trung tính.

---

## Sprint 2 — Activity Management Core
**Mục tiêu:** Hoàn thiện vòng đời hoạt động từ tạo → duyệt → đăng ký.

| Task | [Frontend] | [Backend/API] | [Database] | DoD |
|---|---|---|---|---|
| S2-T1 Activity state machine | UI badge trạng thái + action theo quyền | Chuẩn hóa transition: draft/submitted/approved/rejected/canceled/completed | `activities.status`, `submitted_at`, `approved_at`, `reviewed_by` | Không thể nhảy trạng thái sai luật |
| S2-T2 Create/Edit/Delete + attachments | Form đa bước, upload file, validate client-side | CRUD + upload route + ownership check | Bảng file đính kèm + foreign key cascade | Teacher chỉ sửa hoạt động của mình (trừ admin) |
| S2-T3 Approval workflow | Admin review queue + reject reason | submit-for-approval / approve / reject + history | `activity_approval_history` chuẩn hóa | Có đầy đủ timeline phê duyệt |
| S2-T4 Registration/unregistration | Student list + register/cancel + quota hiển thị realtime | register/cancel APIs idempotent, deadline/quota checks | `participations` unique(activity_id, student_id), status/history | Không đăng ký trùng; hủy theo rule |
| S2-T5 Conflict detection & class assignment | Cảnh báo xung đột lịch/phòng/lớp | check-conflicts endpoint, validate class eligibility | Index theo timeslot/location/class | Cảnh báo chính xác, phản hồi <300ms |

**Security checklist Sprint 2**
- Kiểm tra ownership trước mọi thao tác chỉnh sửa/xóa.
- Transaction cho đăng ký khi gần full quota.
- Validation server-side bắt buộc (không tin dữ liệu FE).
- Audit mọi hành động duyệt/từ chối/cập nhật trạng thái.

---

## Sprint 3 — QR Code Attendance System
**Mục tiêu:** Điểm danh QR động an toàn, chống gian lận và chống replay.

| Task | [Frontend] | [Backend/API] | [Database] | DoD |
|---|---|---|---|---|
| S3-T1 QR session creation | Teacher UI tạo phiên, chọn TTL/ràng buộc | `/api/qr-sessions` tạo mã động, ký token | `qr_sessions` có expires_at, max_scans, nonce | QR sinh ra hợp lệ, hết hạn đúng thời điểm |
| S3-T2 QR scan & validate | Student scanner page + fallback manual input | `/api/attendance/validate` kiểm token/time/device rules | `attendance_records` unique(session_id, student_id) | Quét thành công 1 lần, không duplicate |
| S3-T3 Manual attendance + reconciliation | Teacher bulk attendance UI | `/api/attendance/manual` + rule không đè dữ liệu sai | Cờ nguồn điểm danh (`qr`/`manual`) + reason | Đồng bộ dữ liệu QR & manual rõ nguồn |
| S3-T4 Anti-fraud controls | Cảnh báo quét trùng/quá hạn | replay detection, nonce blacklist ngắn hạn | bảng/log suspicious scans | Replay bị chặn, có log theo dõi |
| S3-T5 Export attendance evidence | UI export theo phiên/lớp | export CSV attendance + filter theo session/activity | Index session_id/activity_id/student_id | Export nhanh, đúng dữ liệu đối soát |

**Security checklist Sprint 3**
- QR token ngắn hạn, không chứa PII nhạy cảm ở dạng plaintext.
- Validate chữ ký token + `exp` + `jti/nonce`.
- Rate-limit scan API theo IP + user + session.
- Log bất thường (scan từ nhiều thiết bị trong thời gian ngắn).

---

## Sprint 4 — Scoring, Achievements & Notifications
**Mục tiêu:** Tính điểm tự động chuẩn, đề xuất/duyệt khen thưởng, thông báo theo sự kiện.

| Task | [Frontend] | [Backend/API] | [Database] | DoD |
|---|---|---|---|---|
| S4-T1 Scoring engine chuẩn hóa | UI config công thức + preview điểm | service tính điểm theo rule versioned | `scoring_config`, `score_snapshots`, `student_scores` | Cùng input cho cùng output (deterministic) |
| S4-T2 Activity finalization | Nút chốt hoạt động + xem preview kết quả | finalize endpoint idempotent + transaction | khóa kết quả sau finalize (`finalized_at`) | Chạy finalize nhiều lần không nhân đôi điểm |
| S4-T3 Bonus suggestion workflow | UI đề xuất + admin approve/reject | gợi ý bonus + duyệt/từ chối + lý do | `suggested_bonus_points`, `achievements` | Quy trình khép kín có lịch sử quyết định |
| S4-T4 Rankings & student insight | Dashboard điểm, breakdown tiến độ | ranking/statistics APIs theo kỳ/lớp | index theo term/class/student | Truy vấn top-N <300ms ở dữ liệu thực |
| S4-T5 Notifications automation | Notification center và trạng thái đã đọc | trigger theo sự kiện (approve, score update, award) | `notifications` + read status | Gửi đúng đối tượng, không gửi trùng |

**Security checklist Sprint 4**
- Chỉ role được phép mới sửa scoring formula.
- Job tính điểm phải có lock/idempotency key.
- Audit đầy đủ mọi quyết định ảnh hưởng điểm/khen thưởng.
- Chặn mass-update trái quyền ở endpoint admin scoring.

---

## Sprint 5 — Dashboards, Reporting, Export CSV & Audit Logs
**Mục tiêu:** Hoàn thiện báo cáo vận hành và kiểm soát truy vết.

| Task | [Frontend] | [Backend/API] | [Database] | DoD |
|---|---|---|---|---|
| S5-T1 Role-based dashboards | Dashboard riêng Admin/Teacher/Student | tổng hợp metrics theo role | materialized-like summary (hoặc cache table) | KPI chính hiển thị đúng và nhất quán |
| S5-T2 Reporting suite | Bộ lọc theo kỳ/lớp/đơn vị | reports API (attendance, participation, score, awards) | index đa cột cho query báo cáo | Thời gian phản hồi ổn định với dataset lớn |
| S5-T3 CSV exports | UI export có tiến trình/trạng thái | export APIs có pagination/stream | bảng audit export (người tải, tham số) | File CSV đúng chuẩn, không timeout |
| S5-T4 Audit log completeness | Trang tra cứu log + filter | log middleware chuẩn hóa actor/action/resource | `audit_logs` bổ sung metadata JSON | Truy vết được mọi thao tác nhạy cảm |
| S5-T5 Ops & health endpoints | Trang trạng thái hệ thống | `/api/health`, backup/restore safeguards | bảng job/backup history | Có runbook xử lý sự cố tối thiểu |

**Security checklist Sprint 5**
- CSV export cần kiểm soát quyền và giới hạn dữ liệu theo role.
- Ẩn/sanitized trường nhạy cảm trước khi export.
- Audit log bất biến tương đối: không cho sửa/xóa tùy tiện.
- Health endpoint không lộ secrets/paths nội bộ.

---

## Sprint 6 — Testing, Optimization & Deployment
**Mục tiêu:** Release production-ready, có test pipeline và rollback rõ ràng.

| Task | [Frontend] | [Backend/API] | [Database] | DoD |
|---|---|---|---|---|
| S6-T1 Unit tests nghiệp vụ lõi | Test UI states quan trọng | test service/auth/approval/scoring | test migration + repository layer | Coverage luồng lõi đạt mục tiêu đề ra |
| S6-T2 E2E critical journeys | E2E Admin-Teacher-Student full flow | mock/seed data ổn định cho e2e | seed DB script tái lập | Pass các journey cốt lõi trên CI |
| S6-T3 Performance & query tuning | Tối ưu render list/dashboard | tối ưu endpoint chậm, cache hợp lý | thêm index theo profiler | p95 API đạt ngưỡng mục tiêu |
| S6-T4 Security verification | Kiểm tra CSRF/XSS/auth bypass case | pentest checklist nội bộ + hardening headers | verify constraints/foreign keys | Không còn lỗ hổng mức High/Critical |
| S6-T5 Deployment & rollback | Hướng dẫn vận hành + release note | release script + smoke tests sau deploy | backup pre-deploy + restore drill | Có thể rollback trong <30 phút |

**Security checklist Sprint 6**
- Kiểm tra đầy đủ cookie flags trên môi trường production.
- Kiểm thử bypass phân quyền cho tất cả endpoint nhạy cảm.
- Rate-limit load test cho nhóm Auth/Attendance/Export.
- Backup/restore rehearsal trước release chính thức.

---

## 3) CHECKLIST KỸ THUẬT & BẢO MẬT THEO YÊU CẦU ĐỒ ÁN

### 3.1 Checklist bắt buộc toàn dự án
- [ ] JWT lưu bằng HTTP-only cookie; không lưu token trong `localStorage`.
- [ ] `SameSite=Strict`, `Secure=true` ở production, timeout phiên rõ ràng.
- [ ] Chống SQL Injection: chỉ dùng parameterized queries/repository chuẩn.
- [ ] Rate-limit theo nhóm API:
  - [ ] Read APIs (nới hơn)
  - [ ] Write APIs (chặt hơn)
  - [ ] Security APIs: login/reset/validate QR (chặt nhất)
- [ ] Chuẩn hóa response lỗi (không lộ stack trace ở production).
- [ ] Audit log cho toàn bộ thao tác: auth, approval, scoring, export, admin config.
- [ ] Dữ liệu nhạy cảm được ẩn/mask khi log hoặc export.

### 3.2 Checklist per-task (Definition of Security Done)
- [ ] Mỗi task API có: authn + authz + validation + rate-limit + audit.
- [ ] Mỗi task DB có: transaction boundary + index phù hợp + rollback path.
- [ ] Mỗi task FE có: route guard + UX thông báo lỗi an toàn (không lộ thông tin nhạy cảm).

---

## 4) CÁCH THỰC HIỆN DẦN (EXECUTION MODE)

### 4.1 Nhịp làm việc đề xuất mỗi tuần
- **Ngày 1:** Chốt scope sprint + cập nhật schema/API contract.
- **Ngày 2–4:** Code + review theo task ưu tiên MUST trước.
- **Ngày 5:** Tích hợp, test, fix bug, demo nội bộ.

### 4.2 Cập nhật tiến độ trong repo
- Dùng tài liệu này làm “master source”.
- Mỗi khi xong task, thêm tag trạng thái ngay tại mục sprint:
  - `TODO` → `IN PROGRESS` → `DONE`.
- Khi task ảnh hưởng API/DB, cập nhật thêm changelog và migration notes.

### 4.3 Định nghĩa hoàn thành dự án (100%)
- [ ] Sprint 1–6 hoàn thành toàn bộ task MUST + SHOULD.
- [ ] E2E pass cho 3 vai trò chính và 5 luồng nghiệp vụ lõi.
- [ ] Release checklist pass trên môi trường staging trước production.
- [ ] Tài liệu vận hành + backup/restore + rollback đầy đủ.

---

## 5) ƯU TIÊN TRIỂN KHAI NGAY (NEXT 10 NGÀY)
- Ưu tiên 1: Sprint 1 (RBAC + Auth hardening + user import/export ổn định).
- Ưu tiên 2: Sprint 2 (state machine hoạt động + registration idempotent).
- Ưu tiên 3: Sprint 3 (QR token validation + anti-replay).

> Gợi ý vận hành: Hoàn thành xong mỗi sprint thì chạy lại release check nhanh + smoke test theo 3 role trước khi chuyển sprint kế tiếp.

---

## 6) NHẬT KÝ THỰC THI (EXECUTION STATUS)

### 2026-03-24
- `DONE` S1-T1 (pha 1): Chuẩn hóa guard API dùng chung tại `src/lib/guards.ts`
  - Thêm `requireApiAuth(req)` và `requireApiRole(req, roles)` trả về `ApiError` chuẩn.
- `DONE` S1-T1 (pha 1.1): Áp dụng guard chuẩn cho API lõi ưu tiên
  - `src/app/api/users/route.ts`
  - `src/app/api/activities/route.ts`
  - `src/app/api/qr-sessions/route.ts`
  - `src/app/api/attendance/validate/route.ts`
- `DONE` Kiểm tra lỗi sau thay đổi: không phát sinh lỗi ở các file đã chỉnh.
- `DONE` S1-T2 (pha 1): Session cookie hardening + token extraction chuẩn hóa
  - Thêm `src/lib/session-cookie.ts` (`setAuthCookie`, `clearAuthCookie`, `getTokenFromRequest`).
  - Áp dụng vào `auth/login`, `auth/logout`, `auth/me` để thống nhất chính sách cookie.
  - `auth/me` hỗ trợ xác thực Bearer token song song cookie để phục vụ script/health flow.
- `DONE` Lint focused cho các file đã sửa: chỉ còn warning `no-explicit-any` từ code legacy, không có lỗi mới.
- `DONE` S1-T3 (pha 1): Chuẩn hóa User Management endpoint trọng yếu
  - `users/import`: dùng guard chuẩn admin, sửa ghi DB từ `password` -> `password_hash`, thống nhất response contract.
  - `users/export`: dùng guard chuẩn admin, validate role đầu vào, bổ sung audit log export.
  - `users/:id/reset-password`: guard chuẩn admin, sửa update cột `password_hash`, bỏ log lộ mật khẩu.
- `DONE` Kiểm tra sau sửa cho nhóm user management: không phát sinh lỗi editor, lint chỉ còn warning `no-explicit-any` legacy.
- `DONE` S2-T1 (pha 1): Chuẩn hóa state machine lifecycle hoạt động theo hợp đồng DB
  - Chuẩn hóa `activity-workflow` theo `status` hợp lệ: `draft|published|completed|cancelled`.
  - Tách rule approval lifecycle qua helper `canSubmitForApproval` và `canDecideApproval`.
  - Áp dụng cho các route: `submit`, `submit-for-approval`, `submit-approval`, `approve`, `reject`, `status`, `cancel`.
  - Đồng bộ `activities/[id]/route.ts`: loại bỏ status legacy (`pending/rejected/deleted`) và validate transition trước khi update.
  - Sửa soft-delete lệch schema: chuyển về `cancelled` thay vì `deleted`.
- `DONE` S2-T2 (pha 1): Registration hardening lõi
  - `activities/[id]/register`: dùng guard chuẩn `requireApiRole` cho đăng ký/hủy đăng ký.
  - Sửa lỗi nghiêm trọng `max_participants = null` gây chặn đăng ký sai: chỉ check capacity khi cấu hình giới hạn hợp lệ (>0).
  - Đồng bộ query đếm slot theo schema hiện tại (`registered|attended`) để tránh lệch trạng thái legacy.

### Next
- `DONE` Sprint 2 - S2-T2 (pha 2): Chuẩn hóa hủy đăng ký/idempotency và audit log cho luồng đăng ký.
  - `activities/[id]/register` bổ sung audit log nhất quán cho `student_register_activity`, `student_unregister_activity` và nhánh no-op `student_unregister_activity_noop`.
  - Luồng hủy đăng ký (`DELETE`) chuyển sang idempotent: nếu chưa đăng ký thì trả về thành công có cờ `already_not_registered` thay vì trả lỗi nghiệp vụ.
  - Luồng hủy đăng ký được gom trong transaction để đảm bảo kiểm tra + xóa nhất quán theo race condition.
- `DONE` Sprint 2 - S2-T3 (pha 1): Approval workflow security + contract hardening.
  - Chặn lỗ hổng phân quyền ở `activity-approvals` (`POST`): chỉ `admin` được phép ra quyết định approve/reject; teacher không còn quyền quyết định.
  - Chuẩn hóa guard API cho các endpoint admin approval/history/review (`requireApiRole`), loại bỏ luồng session check legacy rời rạc.
  - Đồng bộ response contract về `successResponse/errorResponse` cho review + approval history để hành vi lỗi/thành công nhất quán.

- `DONE` Sprint 2 - S2-T3 (pha 2): Dọn tuyến API approval trùng lặp và thống nhất chuẩn response/permission theo một nguồn sự thật.
  - Đã đồng bộ rule từ chối: endpoint review legacy cũng bắt buộc nhập lý do khi reject (không còn lệch với endpoint approval chính).
  - Đã tăng tính toàn vẹn timeline: approval history chuyển `JOIN users` -> `LEFT JOIN users` để không mất bản ghi lịch sử khi user thay đổi/xóa.
  - Endpoint trùng lặp `admin/activities/[id]/review` được chuyển trạng thái deprecated và không còn xử lý quyết định phê duyệt; quyết định tập trung về `admin/activities/[id]/approval`.

- `IN PROGRESS` Sprint 3 - S3-T1: QR session lifecycle hardening theo mức ưu tiên kế tiếp.
  - `qr-sessions/route` đã harden tạo phiên: kiểm tra ownership teacher, ép trạng thái hoạt động `approved + published`, giới hạn TTL hợp lệ, chuẩn hóa metadata `single_use/max_scans` và chặn tạo trùng active session.
  - `qr-sessions/[id]/end` đã chuẩn hóa guard `requireApiRole`, thêm idempotent end (`already_ended`) và bổ sung audit log `end_qr_session`.
