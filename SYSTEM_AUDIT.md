# UniAct System Audit

_Status: phase 4 / corrupted test files quarantined_

## Goal

- Liệt kê đầy đủ các luồng/use case trong hệ thống
- Xác định các tính năng cốt lõi, tính năng phụ, tính năng thử nghiệm
- Xác định các chức năng đang dang dở / lệch schema / lỗi test / lỗi build
- Xác định file lỗi, file binary/rác, artifact thừa
- Ưu tiên các luồng trọng yếu để vừa phát triển vừa sửa nghẽn

---

## 1. Bản đồ module / cấu trúc repo

### 1.1 App modules cấp cao (`src/app`)

Các nhóm page chính hiện diện:

- `activities`
- `admin`
- `api`
- `biometric`
- `classes`
- `consent-settings`
- `dashboard`
- `demo`
- `forgot-password`
- `login`
- `register`
- `reset-password`
- `student`
- `teacher`
- `upgrade`
- `welcome`

### 1.2 API tree cấp cao (`src/app/api`)

Repo có API surface rất rộng, bao phủ các nhóm nghiệp vụ sau:

- auth / login / reset password / security fallback / webauthn / demo accounts
- activities / approvals / participation / register / clone / cancel / submit-approval
- attendance / manual attendance / QR sessions / validate
- users / admin users / role / class / move class / reset password / import / export
- teacher classes / teacher dashboard / teacher reports / teacher students
- admin activities / admin reports / admin config / audit / backup / system-health
- notifications / settings / delete / read
- awards / bonus / scoring / leaderboard / ranking / reports
- health / cron / export / upload / test accounts

### 1.3 Supporting layers

- `src/components` – UI/components dùng chung
- `src/contexts` – auth/global state
- `src/features` – feature modules, đặc biệt cho reports/admin pages
- `src/lib` – business helpers, auth, validation, notification, rate limit, biometric, webauthn, security questions
- `src/infrastructure` – DB/query layer
- `scripts` – setup, maintenance, migration, fix scripts, build-lite, tooling
- `migrations` – schema bootstrap/migration
- `test` – unit, workflow, UAT/integration, page/route smoke/regression

---

## 2. Luồng theo vai trò (actors & use cases)

## 2.1 Admin

### 2.1.1 User management

Use cases đã thấy từ page/API/code:

- xem danh sách người dùng hợp nhất (`/admin/users`)
- lọc theo tab `all / teacher / student`
- tìm kiếm người dùng
- phân trang
- tạo người dùng mới
- sửa người dùng
- xem chi tiết người dùng
- xóa người dùng đơn lẻ
- xóa hàng loạt
- export CSV người dùng đã chọn
- import users
- đổi vai trò / reset password / gán lớp / chuyển lớp

Đánh giá:
- **core flow**
- page `/admin/users` khá hoàn chỉnh, có dấu hiệu đã được hợp nhất từ nhiều page cũ
- có comment rõ: `UNIFIED USER MANAGEMENT (Phase 7)` → cho thấy đây là phần đang tiến hóa, nhưng tương đối trưởng thành

### 2.1.2 Activity approval / activity governance

Use cases:
- xem hoạt động chờ duyệt
- phê duyệt hoạt động
- từ chối hoạt động
- theo dõi pending approvals
- quản lý hoạt động admin-level

Đánh giá:
- **core flow**
- page `/admin/approvals` hoạt động theo mô hình fetch pending → approve/reject qua API
- là một trong các xương sống nghiệp vụ cần ưu tiên giữ xanh

### 2.1.3 System configuration / governance

Các khu vực đã thấy từ route tree / build artifacts:
- `admin/config/*`
- `admin/system-config/*`
- `admin/organization-levels`
- `admin/time-slots`
- `admin/activity-types`
- `admin/activity-templates`
- `admin/scoring-config`
- `admin/scoring-formula`
- `admin/qr-settings / qr-design`
- `admin/approval-deadline`

Đánh giá:
- **supporting flow nhưng rất quan trọng với đúng nghiệp vụ thật**
- nhiều module cấu hình cho thấy hệ thống đang hướng đến tính cấu hình hóa chứ không hard-code toàn bộ

### 2.1.4 Reports / oversight / audit / maintenance

Các use cases đã thấy:
- admin reports tổng hợp
- `activity-statistics`
- `participation`
- `scores`
- `teachers`
- `custom`
- `system-health`
- `audit`, `audit-logs`
- `backup`
- `leaderboard`, `scoreboard`
- health checks

Đánh giá:
- **secondary flow**
- có độ rộng lớn, dễ thành vùng technical debt / build nặng
- reports đang là cụm có nhiều regression/smoke tests nhất → repo coi đây là cụm dễ vỡ

### 2.1.5 Awards / scoring / bonus

Các use cases từ route/page/build tree:
- quản lý awards / award-types
- scoring / scoreboard
- suggested bonus points / bonus approval / bonus reports

Đánh giá:
- **core business expansion**
- đây là phần rất có giá trị sản phẩm, nhưng có thể chưa phải ưu tiên số 1 để hệ thống “chạy được”

---

## 2.2 Teacher

### 2.2.1 Teacher dashboard

Use cases từ `src/app/teacher/page.tsx`:
- xem thống kê tổng hoạt động
- xem chờ duyệt
- xem tổng học viên
- truy cập nhanh hoạt động / approvals / attendance / reports / notifications / awards

Đánh giá:
- **secondary / navigational**
- dashboard nhiều UI và icon, có thể góp phần làm graph bundle nặng

### 2.2.2 Teacher activities

Use cases từ `src/app/teacher/activities/page.tsx`:
- xem danh sách hoạt động của mình
- filter theo trạng thái `draft / pending / rejected / published / completed`
- tạo hoạt động mới
- chỉnh sửa hoạt động
- gửi duyệt
- hủy hoạt động
- clone hoạt động
- xóa hoạt động
- xem chi tiết
- đi tới đánh giá học viên / participants

Đánh giá:
- **core flow tối quan trọng**
- đã có nhiều logic hoàn chỉnh ở UI
- đây là luồng cần được kiểm thử sâu và giữ thông suốt trước tiên

### 2.2.3 Teacher class management

Use cases từ `src/app/teacher/classes/page.tsx`:
- xem danh sách lớp được quản lý
- chọn lớp
- xem thống kê lớp
- tìm sinh viên theo tên/email
- thêm sinh viên vào lớp qua email
- thêm hàng loạt qua email list
- xóa sinh viên khỏi lớp
- export CSV danh sách lớp

Đánh giá:
- **core/supporting flow**
- đây là cầu nối giữa quản trị lớp và nghiệp vụ hoạt động/điểm

### 2.2.4 Attendance

Use cases từ `src/app/teacher/attendance/page.tsx` và API tree:
- chọn hoạt động đang diễn ra/đã hoàn thành
- xem sinh viên đăng ký
- điểm danh thủ công
- đánh giá achievement level (`excellent/good/participated`)
- tạo QR sessions
- QR attendance / validate / records
- export attendance reports

Đánh giá:
- **core flow cực quan trọng**
- attendance + QR là điểm khác biệt sản phẩm; cần ưu tiên cao nhất cùng với activities/approval

### 2.2.5 Teacher reports / notifications / awards / notes

Các use cases thấy từ route tree:
- attendance reports
- class stats
- participation reports
- export reports
- notify students / notifications / broadcast
- student notes
- award suggestions
- polls
- QR pages riêng

Đánh giá:
- **secondary flow**
- nhiều khả năng một số phần đã có UI nhưng mức hoàn thiện không đồng đều

---

## 2.3 Student

### 2.3.1 Student activities

Use cases từ `src/app/student/activities/page.tsx`:
- xem hoạt động có thể đăng ký
- filter upcoming/all
- tìm kiếm theo tên/mô tả/địa điểm
- filter theo loại hoạt động
- filter theo trạng thái `registered / available`
- đăng ký hoạt động
- hủy đăng ký
- xem chi tiết hoạt động

Đánh giá:
- **core flow tối quan trọng**
- đây là phía đối xứng với teacher activities và approval

### 2.3.2 Student activity details / history / scores

Từ route tree/build tree có dấu hiệu các use cases:
- xem chi tiết một hoạt động theo id
- xem lịch sử tham gia
- xem điểm / score / ranking / awards cá nhân
- recommendations
- dashboard cá nhân

Đánh giá:
- **student core mở rộng / secondary**
- cần phân biệt cái nào thật sự hoàn thiện, cái nào mới là aspirational UI

### 2.3.3 Student notifications

Use cases từ `src/app/student/notifications/page.tsx`:
- xem danh sách thông báo
- lọc unread/all
- đánh dấu đã đọc
- đánh dấu tất cả đã đọc
- chọn nhiều thông báo
- xóa hàng loạt
- lưu cài đặt thông báo

Đánh giá:
- **secondary flow**
- nhưng khá hoàn chỉnh ở UI

### 2.3.4 Student check-in / attendance

Từ README/API tree:
- scan QR
- attendance validate
- xem tình trạng điểm danh / tham gia

Đánh giá:
- **core flow**
- cần audit thêm route/page cụ thể ở vòng sau

---

## 2.4 Auth / Account / Recovery

Các use cases hiện thấy:
- login
- register
- forgot-password
- request-password-reset
- confirm-password-reset
- security questions fallback
- webauthn register/login
- biometric auth / biometric enroll
- consent-settings / welcome / upgrade / demo-auth-fallbacks

Đánh giá:
- `login / reset password` = **core flow**
- `security questions / webauthn / biometric / demo-auth-fallbacks` = **advanced / experimental / currently unstable**

Ghi chú:
- password reset đã từng có schema mismatch (`used_at`)
- `security_questions` từng mismatch schema/code
- biometric và webauthn đang thuộc nhóm rất đáng nghi về build/bundle nặng

---

## 2.5 System / Cron / Operational

Các use cases từ API/scripts:
- health check
- cron send reminders
- backup
- audit logs
- validate project / fix project / maintenance scripts
- seed / migrations / db setup

Đánh giá:
- **operational flows**
- cần giữ được nhưng không phải blocker trước core business flow

---

## 3. Core flows đề xuất ưu tiên số 1

Các luồng cần đảm bảo thông suốt trước:

### P0 – Core backbone
1. **Auth cơ bản**
   - login
   - logout
   - password reset
2. **Admin user management**
   - tạo/sửa/xóa user
   - gán lớp / role cơ bản
3. **Teacher activity lifecycle**
   - tạo hoạt động
   - chỉnh sửa
   - gửi duyệt
4. **Admin approval lifecycle**
   - xem pending
   - approve/reject
5. **Student registration lifecycle**
   - xem hoạt động
   - đăng ký
   - hủy đăng ký
6. **Attendance lifecycle**
   - QR/manual attendance
   - validate attendance
7. **Evaluation / points basic**
   - teacher đánh giá
   - ghi nhận điểm/achievement mức cơ bản

### P1 – Important but after backbone
- teacher class management
- notifications
- admin reports cốt lõi
- export/import người dùng
- score/ranking/awards cơ bản

### P2 – Advanced / optional / should not block launch
- biometric
- webauthn
- security questions fallback
- recommendations
- complex dashboards / analytics-heavy UI
- demo/welcome/upgrade flows

---

## 4. Tính năng dang dở / dấu hiệu chưa hoàn tất

## 4.1 Dấu hiệu trực tiếp trong code / comment

### User management unified – đang tiến hóa
- `/admin/users` có comment `UNIFIED USER MANAGEMENT (Phase 7)`
- cho thấy trước đây tồn tại nhiều trang rời (`/admin/users`, `/admin/teachers`, `/admin/students`) và đang hợp nhất
- đây là tín hiệu **đang được phát triển/tái cấu trúc**, dù hiện khá usable

### Activities root page là deprecated redirect
- `src/app/activities/page.tsx` chỉ làm redirect sang role-specific pages
- cho thấy kiến trúc đã thay đổi, còn dấu vết compatibility layer

### Biometric / WebAuthn / Security Questions
- độ phức tạp cao
- import nặng
- nhiều dấu hiệu là advanced features chưa ổn định hoàn toàn
- không nên để chặn core flows

### Demo / welcome / upgrade / consent-settings
- có dấu hiệu là onboarding / showcase / experimental hoặc hậu kỳ
- không nên ưu tiên trước backbone nghiệp vụ

## 4.2 Planned features theo README
README còn liệt kê planned features:
- export XLSX
- WebSocket real-time notifications
- mobile app
- LDAP/AD SSO
- 2FA
- analytics dashboard sâu
- tích hợp HR/SIS

=> Đây là **planned / future scope**, chưa nên coi là blocker cho release hiện tại.

---

## 5. File lỗi / binary / artifact / tech debt rõ ràng

## 5.1 File source/test bất thường hoặc hỏng

### `src/app/student/page.tsx`
- **không còn tồn tại trong tree hiện tại**
- kết luận mới: cảnh báo trước đó nhiều khả năng đến từ stale path / artifact, không phải source file còn sống

### Các file đã xác nhận sai loại / corrupted và đã quarantine
Đã di chuyển sang `quarantine/corrupted-tests/`:

- `workflow.test.ts`
  - không phải TypeScript test
  - nội dung là **Dart/Flutter source** trong file `.ts`
- `recommendation.test.ts`
  - không phải unit test repo
  - nội dung là **WordCopilot / JS blob rác/minified**
- `teacher-student-workflow.spec.ts`
  - hành xử như **binary/garbled file**, không phải text spec hợp lệ
- `admin-teacher-workflow.spec.ts`
  - thuộc nhóm nghi ngờ cao / đã quarantine cùng cụm workflow hỏng

Kết luận:
- đây không phải “test fail bình thường” mà là **source contamination / sai loại file**
- không nên giữ chúng trong `test/` nếu muốn phát triển và typecheck ổn định

## 5.2 Build artifacts quá lớn / cần loại khỏi audit logic

`.next` hiện chứa artifact rất lớn:
- `.next/cache/webpack/server-production/0.pack` ~ **406 MB**
- `.next/cache/webpack/client-production/1.pack` ~ **140 MB**
- nhiều `.rsc`, `.html`, `.meta`, `.pack`, `.tsbuildinfo`

Kết luận:
- `.next` là **artifact nặng**, không phải source
- nên luôn exclude khỏi audit source/business logic
- đồng thời đây là thêm bằng chứng build graph rất nặng

## 5.3 DB / repo artifacts

- `uniact.db` có trong repo thư mục làm việc
- thuận tiện dev/demo nhưng là điểm cần quản trị cẩn thận

## 5.4 Non-source generated tests present

Trong `test/unit` có cả:
- `.d.ts`
- `.d.ts.map`
- `.js`
- `.js.map`

Điều này gợi ý test tree có lẫn generated artifacts, không chỉ source test thuần.
Nên dọn dẹp hoặc tách rõ source vs generated test outputs.

---

## 6. Điểm nghẽn build / toolchain hiện đã xác định

## 6.1 Điều đã biết chắc

- `npm install` thành công nhưng không thay đổi hành vi build
- production typecheck đã được dọn và pass qua `tsconfig.release.json`
- `next build` treo ở `Creating an optimized production build ...`
- không nhả stacktrace rõ
- tiến trình phần lớn idle, nhưng `.next/cache/webpack/client-production/*.pack` và nhiều `page_client-reference-manifest.js` vẫn được tạo
- đây giống **webpack client-production bundling/cache stall** hơn là compile fail thông thường
- Playwright UAT infrastructure mới đã chạy được `--list` và thực thi smoke test; blocker hiện tại của UAT là **không có app server chạy tại BASE_URL**, không phải do test framework hỏng

## 6.2 Các giả thuyết đã được thử và không đủ để giải quyết tận gốc

Đã thử / đã loại trừ mạnh như nguyên nhân duy nhất:
- stale `node_modules`
- stale `.next`
- simple TS compile failure
- simple static generation issue
- `face-api.js` alone
- `argon2` alone
- `@simplewebauthn/server` alone
- SQLite top-level DB open alone
- route pruning lite mode cấp 1 và cấp 2

## 6.3 Toolchain scripts

- `scripts/tools/run-with-node-env.mjs` từng bị lỗi `spawn EINVAL` trên Windows
- đã được vá để chạy được `production:build`
- nhưng bản thân build vẫn treo sau khi script đã hoạt động đúng

---

## 7. Route / Page / API / Use-case matrix (phase 2)

## 7.1 Auth backbone

| Flow | Page / UI | API | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Login | `/login` | `POST /api/auth/login` | Khá rõ / P0 | Có rate limit, set auth cookie, loginUser abstraction |
| Password reset request | `/forgot-password` | `request-password-reset` route | P0 nhưng từng lỗi schema | Đã từng mismatch `used_at` |
| Password reset confirm | `/reset-password` | `confirm-password-reset` route | P0 nhưng cần regression | Phải giữ xanh cùng auth |
| Advanced auth fallback | demo / consent / security questions / webauthn / biometric | nhiều route auth nâng cao | P2 | Tách khỏi core backbone |

## 7.2 Activities backbone

| Flow | Page / UI | API | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Teacher list/manage activities | `/teacher/activities` | `GET/POST /api/activities` + action routes | P0 | Rất quan trọng, UI khá hoàn chỉnh |
| Activity create | `ActivityDialog` từ teacher activities | `POST /api/activities` | P0 | Tạo `draft`, enforce 2-step approval |
| Submit approval | teacher activity actions | `/api/activities/[id]/submit-approval` | P0 | Cần audit route chi tiết tiếp |
| Admin pending approvals | `/admin/approvals` | `GET /api/admin/activities/pending` | P0 | Fetch pending theo `approval_status='requested'` |
| Approve / reject | `ApprovalDialog` | `/api/activities/[id]/approve`, `/reject` | P0 | Cần regression chặt |
| Student browse activities | `/student/activities` | `GET /api/activities` | P0 | Student list có filter/search khá hoàn chỉnh |
| Register activity | student activities UI | `POST /api/activities/[id]/register` | P0 | Có policy, transaction, duplicate/capacity checks |
| Cancel registration | student activities UI | `DELETE /api/activities/[id]/register` | P0 | Có 24h cutoff |

## 7.3 Attendance backbone

| Flow | Page / UI | API | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Manual attendance | `/teacher/attendance` | `GET/POST /api/attendance/manual` | P0 | Cho phép achievement levels |
| Create QR session | QR UI / teacher QR flow | `POST /api/qr-sessions` | P0 | Kiểm tra publish+approved, rate limit, metadata |
| Student QR validate | student scan flow | `POST /api/attendance/validate` | P0 | Có transaction, duplicate protection, quota handling |
| QR history | teacher/admin QR session history | `GET /api/qr-sessions` | P1 | Hữu ích vận hành |

## 7.4 User/Class backbone

| Flow | Page / UI | API | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Admin users listing | `/admin/users` | `GET /api/admin/users` | P0 | Tab-based unified management |
| Admin create user | `/admin/users` dialog | `POST /api/admin/users` | P0 | Tạo user + code + optional teacher-class assignment |
| Teacher class management | `/teacher/classes` | `/api/teacher/classes*` | P1 gần P0 | Phục vụ quản trị lớp và hoạt động |
| Bulk add/remove/export students in class | `/teacher/classes` | teacher class APIs | P1 | Khá hoàn chỉnh ở UI |

## 7.5 Notifications / secondary flows

| Flow | Page / UI | API | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Student notifications | `/student/notifications` | `/api/notifications*` | P1 | UI khá hoàn chỉnh |
| Notification settings | modal settings | `/api/notifications/settings` | P1 | Không nên block backbone |
| Alerts to teacher/admin | side-effect trong register/manual attendance | `alerts`, `notifications` writes | P1 | Phụ thuộc DB consistency |

---

## 8. Page / API / DB matrix cho backbone P0 (phase 3)

## 8.1 Auth backbone

| Flow | UI / API | Bảng DB chính | Helpers / service | Rủi ro hiện tại |
|---|---|---|---|---|
| Login | `POST /api/auth/login` | `users`, `devices` (optional) | `loginUser`, `rateLimit`, `setAuthCookie` | phụ thuộc bcrypt/jwt/device checks |
| Register user account | `registerUser` / admin create user | `users`, `audit_logs`, `classes`, `class_teachers` | `dbHelpers.createUser`, `generateUserCode` | có 2 luồng tạo user song song (self-register vs admin create) |
| Password reset | forgot/reset routes | `password_reset_requests`, `users` | reset routes + auth helpers | từng mismatch `used_at`, cần regression |
| Session / token resolve | auth context / guards | `users` | `verifyToken`, `getUserFromToken`, `getUserFromSession` | token/cookie guards là xương sống mọi flow |

## 8.2 Activities & approvals backbone

| Flow | UI / API | Bảng DB chính | Helpers / service | Rủi ro hiện tại |
|---|---|---|---|---|
| List teacher/admin/student activities | `GET /api/activities` | `activities`, `users`, `participations`, `activity_types`, `organization_levels`, `activity_classes` | `dbHelpers.getActivitiesByTeacher`, `getAllActivitiesWithTeachers`, `getActivitiesForStudent` | 3 role branches khác nhau, dễ lệch contract |
| Create activity | `POST /api/activities` | `activities`, `activity_classes`, `audit_logs` | `validateCreateActivityBody`, `dbHelpers.createActivity` | phải bảo toàn draft/requested workflow |
| Submit approval | submit-approval route | `activities`, `activity_approvals`, `activity_approval_history`, `audit_logs`, `notifications` | `submitActivityForApproval`, `notifyAdminsOfApprovalSubmission` | rất quan trọng, chưa audit route action kỹ |
| View pending approvals | `GET /api/admin/activities/pending` | `activities`, `users`, `organization_levels`, `activity_types`, `participations` | `getActivityDisplayStatus` | cần đồng bộ với workflow status/approval_status |
| Approve / reject | approve/reject routes | `activity_approvals`, `activities`, `activity_approval_history`, `notifications`, `alerts`, `audit_logs` | `decideApproval` | flow giao dịch trọng yếu, cần test end-to-end |
| Student register / cancel | `/api/activities/[id]/register` | `activities`, `participations`, `activity_classes`, `notifications`, `alerts`, `audit_logs`, `system_config` | `evaluateRegistrationPolicies`, `withTransaction`, notification service | đã phức tạp, là điểm dễ lỗi business rules |

## 8.3 Attendance & QR backbone

| Flow | UI / API | Bảng DB chính | Helpers / service | Rủi ro hiện tại |
|---|---|---|---|---|
| Manual attendance GET | `GET /api/attendance/manual` | `activities`, `participations`, `users`, `attendance_records` | `requireApiRole`, DB joins | cần nhất quán với teacher ownership |
| Manual attendance POST | `POST /api/attendance/manual` | `activities`, `participations`, `attendance_records`, `notifications`, `audit_logs` | direct db ops + `PointCalculationService.autoCalculateAfterEvaluation` | scoring side effects cần test kỹ |
| Create QR session | `POST /api/qr-sessions` | `qr_sessions`, `activities`, `audit_logs` | `parseSessionOptions`, `dbHelpers.createQRSession` | phụ thuộc publish+approved state |
| Validate QR attendance | `POST /api/attendance/validate` | `qr_sessions`, `activities`, `attendance_records`, `participations`, `audit_logs`, `notifications` | `getQRSessionByToken`, transaction, `checkExistingAttendance` | backbone check-in, tuyệt đối không được vỡ |
| QR session history | `GET /api/qr-sessions` | `qr_sessions`, `activities`, `attendance_records` | DB history query | vận hành / support flow |

## 8.4 User/Class backbone

| Flow | UI / API | Bảng DB chính | Helpers / service | Rủi ro hiện tại |
|---|---|---|---|---|
| Admin users list | `GET /api/admin/users` | `users`, `classes` | `ensureUserColumns` | query lớn, nhiều trường legacy/optional |
| Admin create user | `POST /api/admin/users` | `users`, `classes`, `class_teachers`, `audit_logs` | `generateUserCode`, bcrypt, `ensureUserColumns` | vừa nghiệp vụ vừa data migration compatibility |
| Teacher class management | `teacher/classes` + APIs | `classes`, `users`, `class_teachers`, có thể `student_scores` / `participations` | teacher class routes | cần audit route detail tiếp |

## 8.5 Scoring / achievement backbone phụ thuộc attendance

| Flow | UI / API | Bảng DB chính | Helpers / service | Rủi ro hiện tại |
|---|---|---|---|---|
| Auto score after evaluation | attendance/manual, evaluate pages | `student_scores`, `point_calculations`, `participations`, `activities`, `achievement_multipliers`, `activity_types`, `organization_levels` | `PointCalculationService`, `ScoringCalculator`, `ScoreQueries` | nếu sai sẽ làm lệch scoreboard/awards toàn hệ |
| Scoreboard / totals | reports / ranking | `student_scores`, `users`, `classes` | `dbHelpers.getScoreboard`, `getStudentTotalScore` | nên để sau backbone nhưng phải thống nhất schema |

---

## 9. Regression checklist cho P0 backbone

## 9.1 Auth checklist
- [ ] đăng nhập admin thành công
- [ ] đăng nhập teacher thành công
- [ ] đăng nhập student thành công
- [ ] sai mật khẩu trả đúng lỗi, không lộ thông tin
- [ ] rate limit login hoạt động
- [ ] reset password request tạo token hợp lệ
- [ ] reset password confirm đánh dấu `used_at`
- [ ] token cũ/expired không dùng lại được

## 9.2 Activity lifecycle checklist
- [ ] teacher tạo activity mới → trạng thái `draft`
- [ ] teacher sửa activity draft
- [ ] teacher submit approval → `approval_status=requested`
- [ ] admin pending list thấy activity đó
- [ ] admin approve → activity thành `published + approved`
- [ ] admin reject → activity quay về `draft + rejected`
- [ ] teacher resubmit sau reject hoạt động đúng
- [ ] clone/cancel/delete routes không làm vỡ state machine

## 9.3 Student registration checklist
- [ ] student xem được published activities phù hợp class
- [ ] student đăng ký activity thành công
- [ ] duplicate registration bị chặn
- [ ] capacity full bị chặn
- [ ] registration deadline bị chặn đúng
- [ ] same-day conflict warning hoạt động
- [ ] force register override hoạt động nếu business rule cho phép
- [ ] cancel registration trước 24h thành công
- [ ] cancel <24h bị chặn đúng

## 9.4 Attendance checklist
- [ ] teacher xem danh sách học viên đã đăng ký
- [ ] manual attendance ghi `attendance_records`
- [ ] participation chuyển `registered -> attended`
- [ ] achievement level lưu đúng
- [ ] auto scoring sau evaluation hoạt động
- [ ] QR session chỉ tạo cho activity `published + approved`
- [ ] QR token hết hạn bị chặn
- [ ] duplicate QR attendance trả idempotent success / already recorded
- [ ] single_use / max_scans hoạt động đúng

## 9.5 Users/classes checklist
- [ ] admin list users hoạt động với tab/filter/search
- [ ] admin create teacher/student/admin thành công
- [ ] teacher-class assignment được lưu đúng
- [ ] delete user xử lý soft/hard constraints đúng
- [ ] teacher classes load đúng lớp và sinh viên
- [ ] add student / bulk add / remove student khỏi lớp hoạt động

---

## 10. Backlog ưu tiên fix & phát triển

## 10.1 P0 – Phải xử lý trước để backbone trơn tru

### P0.1 Dọn file hỏng/corrupted/blocker
- [x] xác minh `src/app/student/page.tsx` không còn tồn tại; loại khỏi danh sách blocker hiện hành
- [x] quarantine `test/unit/workflow.test.ts`
- [x] quarantine `test/unit/recommendation.test.ts`
- [x] quarantine `test/uat/integration/teacher-student-workflow.spec.ts`
- [x] quarantine `test/uat/integration/admin-teacher-workflow.spec.ts`
- [ ] tạo lại skeleton test/workflow thay thế đúng nghiệp vụ nếu cần

### P0.2 Khóa auth backbone
- [ ] regression login
- [ ] regression forgot/reset password
- [ ] kiểm tra lại schema + route reset flow sau các fix

### P0.3 Khóa activity backbone
- [ ] teacher create/edit/submit approval
- [ ] admin pending approvals + approve/reject
- [ ] student browse/register/cancel
- [ ] route detail actions: clone / cancel / delete / submit-approval

### P0.4 Khóa attendance backbone
- [ ] manual attendance GET/POST
- [ ] QR session create
- [ ] attendance validate
- [ ] duplicate attendance / quota / expired token cases

### P0.5 User backbone
- [ ] admin users GET/POST/PUT/DELETE
- [ ] class assignment / move class
- [ ] import/export path cơ bản

## 10.2 P1 – Làm ngay sau khi backbone ổn

- [ ] teacher class management end-to-end
- [ ] student notifications CRUD/settings
- [ ] admin reports core subset
- [ ] score / awards / bonus paths cơ bản
- [ ] audit logs / health / backup ops validation

## 10.3 P2 – Tách riêng, không để chặn release backbone

- [ ] biometric
- [ ] webauthn
- [ ] security questions fallback
- [ ] recommendation
- [ ] demo / onboarding pages
- [ ] heavy dashboards / ranking analytics

---

## 11. Kết luận vòng audit 1

UniAct là một codebase lớn, nhiều module, không còn là demo đơn giản. Nó có:
- core business khá rõ ràng và hữu ích thực tế
- nhiều nhánh advanced / experimental / legacy / compatibility
- một số file khả nghi bị hỏng hoặc không còn là source hợp lệ
- build/toolchain bottleneck riêng, tách biệt với nhiều lỗi nguồn đã được sửa

### Kết luận thực dụng

Muốn hoàn thiện hệ thống theo cách bền vững, cần đi theo thứ tự:

1. **Dọn file hỏng / binary / generated artifacts lẫn trong source**
2. **Khóa core flows (P0 backbone)**
3. **Thiết lập regression theo luồng nghiệp vụ**
4. **Chỉ sau đó mới đẩy mạnh reports/analytics/advanced auth/biometric**
5. **Song song tiếp tục điều tra build/toolchain bằng nhánh riêng**

---

## 12. Next steps đề xuất

### Phase 5 đề xuất
- dùng bộ UAT actor-based sạch mới dựng lại làm nền regression
- tiếp tục audit action routes còn lại của P0:
  - submit-approval
  - approve/reject
  - clone/cancel/delete activity
  - teacher/classes detail APIs
- tạo checklist manual test theo actor
- mở rộng smoke tests hiện tại thành regression thật theo từng backbone flow
- bổ sung cấu hình Playwright/runner vì repo hiện không thấy `playwright.config.*` ở root

### Deliverables tiếp theo
- `SYSTEM_AUDIT.md` v5: route-action audit chi tiết
- regression plan theo actor (dựa trên `test/uat/actor-*` sạch)
- danh sách chỗ coverage còn thiếu cần viết test mới
- checklist setup Playwright/UAT runner
- checklist runtime preconditions để chạy smoke/UAT backbone
