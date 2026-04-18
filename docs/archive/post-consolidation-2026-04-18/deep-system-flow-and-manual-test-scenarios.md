# Deep System Flow and Manual Test Scenarios

This document turns the current UniAct backbone understanding into a practical deep-dive plus a manual test script set for full-system verification.

---

# PHẦN A. BẢN ĐỒ HỆ THỐNG

## 1. Tóm tắt kiến trúc
UniAct là hệ thống quản lý hoạt động ngoại khóa cho 3 vai trò chính:
- **Admin**
- **Teacher / cán bộ quản lý**
- **Student**

Kiến trúc web hiện tại bám theo:
- **Next.js App Router** tại `src/app/**`
- **API routes** tại `src/app/api/**`
- **Auth/session** qua `AuthContext`, `/api/auth/*`, cookie session/JWT, và `src/middleware.ts`
- **Database facade** qua `src/lib/database.ts`
- **SQLite + infrastructure layer** tại `src/infrastructure/db/**`

## 2. Các role chính
### Admin
- quản trị user/lớp
- duyệt hoạt động
- xem thống kê/báo cáo/xếp hạng
- reset password, soft deactivate

### Teacher
- tạo/chỉnh sửa hoạt động
- gửi duyệt / thu hồi / resubmit
- quản lý lớp/học viên trong scope được phép
- điểm danh
- đánh giá tham gia
- xem class stats / participation reports

### Student
- xem hoạt động
- đăng ký / hủy đăng ký
- xem lịch sử tham gia
- xem điểm, thống kê, breakdown

## 3. Các module chính
- **Auth & session backbone**
- **Activity workflow**
- **Participation & registration**
- **Attendance**
- **Evaluation**
- **Scoring persistence**
- **Student visibility**
- **Admin/teacher reporting**

## 4. Flow backbone quan trọng nhất
1. đăng nhập đúng role
2. teacher tạo activity
3. teacher submit approval
4. admin approve/reject
5. student thấy activity và register
6. teacher/admin điểm danh
7. teacher đánh giá
8. scoring được persist
9. student xem điểm/lịch sử
10. admin/teacher xem báo cáo

## 5. Dependency giữa các subsystem
- **Auth** bảo vệ toàn bộ route/page theo role
- **Activity approval** quyết định activity có được student thấy hay không
- **Participation** là cầu nối giữa activity và student
- **Attendance** chỉ xác nhận tham gia
- **Evaluation** là bước chốt trước khi scoring chính thức hoàn tất
- **Scoring** nuôi student history/points/scores và admin/teacher reports
- **Reports** chỉ đáng tin nếu persistence từ attendance/evaluation ổn định

---

# PHẦN B. BẢN ĐỒ LUỒNG NGHIỆP VỤ END-TO-END

## 1. Auth/session
### Actor
- admin / teacher / student

### Preconditions
- account tồn tại
- env/session config hợp lệ

### Happy path
- user login
- server set auth cookie/session
- `/api/auth/me` trả đúng identity
- middleware + UI redirect đúng khu vực role

### Alternative path
- refresh trang vẫn giữ session
- logout xóa cookie đúng và quay lại login

### Failure path
- token invalid / stale cookie
- wrong role access
- unauthorized session

### Data chính
- auth cookie/JWT
- identity payload từ `/api/auth/me`

### API/page liên quan
- `/api/auth/login`
- `/api/auth/me`
- `/api/auth/logout`
- `src/contexts/AuthContext.tsx`
- `src/middleware.ts`
- `src/app/login/page.tsx`

## 2. Admin quản trị người dùng/lớp
### Actor
- admin

### Happy path
- xem list user
- mở detail
- edit user
- reset password
- soft deactivate
- xem list lớp
- tạo/sửa/xóa/deactivate lớp

### Failure path
- invalid id
- forbidden
- self-deactivate guard
- conflict dữ liệu

### Data chính
- `users`
- `classes`

### Surface liên quan
- `/api/admin/users`
- `/api/admin/users/[id]`
- `/api/admin/users/[id]/reset-password`
- `/api/admin/classes`
- `/api/admin/classes/[id]`
- admin users/classes pages

## 3. Teacher tạo hoạt động
### Actor
- teacher

### Preconditions
- teacher có scope lớp/đơn vị phù hợp

### Happy path
- tạo draft
- edit draft
- cấu hình target scope
- lưu thành công

### Alternative path
- clone activity
- cancel draft/pending flow theo semantics hiện tại

### Failure path
- validation error
- forbidden class scope
- contract mismatch page/route

### Data chính
- `activities`
- target scope / class scope / participant scope

### Surface liên quan
- `src/app/teacher/activities/page.tsx`
- `/api/activities`
- `/api/activities/[id]`

## 4. Teacher submit approval
### Happy path
- activity từ draft sang requested
- hiện trong pending list của admin

### Failure path
- wrong status transition
- legacy requested/approval drift

### Surface
- `/api/activities/[id]/submit-approval`
- workflow helpers / approval logic

## 5. Admin approve/reject activity
### Happy path
- admin xem pending list
- approve -> activity published
- reject -> teacher thấy rejected/draft state để sửa/resubmit

### Failure path
- approval route guard fail
- status transition fail
- history/log không nhất quán

### Surface
- `/api/admin/activities/pending`
- `/api/admin/activities/[id]/approval`
- approval history routes/pages

## 6. Student xem/đăng ký/hủy đăng ký
### Preconditions
- activity đã published/visible
- student đúng target scope hoặc voluntary scope

### Happy path
- student xem list activity
- filter theo loại
- mở detail
- register
- cancel registration

### Failure path
- activity hidden do status chưa publish
- forbidden/target mismatch
- conflict rule theo thời gian
- duplicate registration

### Surface
- `src/app/student/activities/page.tsx`
- `src/app/student/activities/[id]/page.tsx`
- `/api/activities`
- `/api/activities/[id]/register`

## 7. Teacher/Admin điểm danh
### Happy path
- manual attendance hoặc bulk attendance
- participation attendance_status cập nhật đúng
- persistence ghi nhận ổn định

### Failure path
- duplicate attendance
- override policy sai
- wrong scope actor

### Surface
- `/api/teacher/attendance/bulk`
- attendance/manual/QR related routes

## 8. Teacher đánh giá tham gia
### Rule backbone
- attendance chỉ xác nhận tham gia
- evaluation mới là bước chốt điểm chính thức

### Happy path
- đánh giá participation/activity
- chọn achievement level
- hệ thống tính điểm hoặc gọi scoring service

### Failure path
- evaluate lượt chưa attended
- invalid achievement level
- không persist calculation

### Surface
- `/api/teacher/evaluate`
- `/api/teacher/activities/[id]/evaluate`
- `/api/participations/[id]/evaluate`

## 9. Tính điểm và persist điểm
### Source of truth
- `point_calculations`
- `student_scores`
- award/adjustment entries

### Happy path
- evaluation/bulk attendance trigger scoring service
- point result được lưu
- có thể hiện lại ở student/admin/teacher surfaces

### Failure path
- tính mà không lưu
- summary route đọc sai source-of-truth
- report dùng cột cũ/shape cũ

## 10. Student xem lịch sử/điểm/thống kê
### Happy path
- student history hiển thị participations
- student points breakdown hiển thị by activity/type/level/achievement/awards
- student scores page hiển thị summary + detail modal
- student statistics hiển thị tổng hợp hợp lệ

### Failure path
- page đọc sai canonical payload
- fetch fail nhưng UI câm
- số liệu lệch scoring persistence

## 11. Admin xem reports / leaderboard / rankings
### Happy path
- admin scores report hiển thị distribution/stats
- leaderboard trả top sinh viên theo điểm
- rankings có filter/page/sort
- activity-statistics export CSV được
- custom report preview/export được

### Failure path
- guard error bị collapse sai
- CSV/export fail
- pagination/filter drift

## 12. Teacher xem class stats / participation reports / export
### Happy path
- class stats load đúng role
- participation report load records + summary
- export PDF hoạt động

### Failure path
- route dùng auth legacy và nuốt forbidden
- export error bị generic, không surfacing message thật

## 13. Luồng phụ khác
- dashboard summary by role
- login demo account gates
- legacy compatibility routes
- UAT/demo seed assumptions

Các luồng này quan trọng nhưng hiện không nên lấn át backbone P0/P1.

---

# PHẦN C. CHECKLIST MANUAL QA CHI TIẾT

## Admin

### A-01
- **Tên:** Admin login và giữ session
- **Mục tiêu:** xác nhận auth backbone ổn định
- **Preconditions:** có `admin@annd.edu.vn`
- **Steps:** login -> refresh -> mở dashboard -> logout
- **Expected:** vào đúng dashboard, không flicker, logout quay lại login
- **Priority:** P0
- **RC blocker:** Có

### A-02
- **Tên:** Admin user detail/edit/reset password
- **Mục tiêu:** xác nhận CRUD quản trị user lõi
- **Preconditions:** có user không phải admin hiện tại
- **Steps:** mở users page -> mở detail -> edit -> reset password
- **Expected:** toast/success đúng, data refresh đúng
- **Priority:** P0
- **RC blocker:** Có

### A-03
- **Tên:** Soft deactivate user
- **Mục tiêu:** xác nhận semantics vô hiệu hóa đúng, không hard delete giả
- **Steps:** deactivate một user thường
- **Expected:** wording là vô hiệu hóa, list cập nhật đúng
- **Priority:** P1
- **RC blocker:** Có nếu sai semantics dữ liệu

### A-04
- **Tên:** Class create/edit/delete
- **Mục tiêu:** xác nhận admin classes flow
- **Steps:** tạo lớp -> sửa -> xóa/deactivate theo flow thật
- **Expected:** dữ liệu đổi đúng, list refresh đúng
- **Priority:** P0
- **RC blocker:** Có

### A-05
- **Tên:** Pending approval review
- **Mục tiêu:** admin xử lý activity pending
- **Steps:** mở pending list -> approve 1 activity -> reject 1 activity khác
- **Expected:** approved thành published, rejected quay về state phù hợp
- **Priority:** P0
- **RC blocker:** Có

### A-06
- **Tên:** Admin activity detail tabs
- **Mục tiêu:** xác nhận participants/approval history
- **Steps:** mở activity detail -> participants -> approval history
- **Expected:** attendance state đúng, history hiển thị đúng
- **Priority:** P1
- **RC blocker:** Có nếu sai dữ liệu operational

### A-07
- **Tên:** Admin cancel activity
- **Mục tiêu:** xác nhận semantics hủy hoạt động
- **Steps:** cancel activity từ admin UI
- **Expected:** toast/copy là hủy, không giả làm xóa cứng
- **Priority:** P1
- **RC blocker:** Watch

### A-08
- **Tên:** Admin score report page
- **Mục tiêu:** xác nhận score distribution render
- **Steps:** mở `/admin/reports/scores`
- **Expected:** average/median/max/min/distribution hiện đúng
- **Priority:** P1
- **RC blocker:** Có nếu report cốt lõi fail hoàn toàn

### A-09
- **Tên:** Leaderboard / rankings filters
- **Mục tiêu:** xác nhận xếp hạng hoạt động đúng
- **Steps:** mở leaderboard/rankings -> đổi page/filter/sort
- **Expected:** payload/page/filter ổn, không crash
- **Priority:** P1
- **RC blocker:** Watch

### A-10
- **Tên:** Custom report preview/export
- **Mục tiêu:** xác nhận preview/export report tùy chỉnh
- **Steps:** chọn report -> preview -> export CSV
- **Expected:** preview có data, export tải file, error surfacing rõ nếu fail
- **Priority:** P1
- **RC blocker:** Có nếu happy path fail

## Teacher

### T-01
- **Tên:** Teacher login + dashboard
- **Mục tiêu:** xác nhận teacher auth/dashboard
- **Steps:** login -> mở dashboard -> refresh
- **Expected:** dashboard/stats load ổn
- **Priority:** P0
- **RC blocker:** Có

### T-02
- **Tên:** Create draft activity
- **Mục tiêu:** xác nhận teacher tạo hoạt động
- **Steps:** mở activities page -> tạo activity mới
- **Expected:** draft lưu được, data hiển thị lại đúng
- **Priority:** P0
- **RC blocker:** Có

### T-03
- **Tên:** Submit approval
- **Mục tiêu:** đưa activity sang requested
- **Steps:** chọn draft -> submit approval
- **Expected:** trạng thái đổi đúng, admin pending list thấy được
- **Priority:** P0
- **RC blocker:** Có

### T-04
- **Tên:** Resubmit/cancel/clone activity
- **Mục tiêu:** xác nhận action phụ của teacher activity page
- **Steps:** thao tác từng action nếu available
- **Expected:** toast/copy đúng semantics, page không drift
- **Priority:** P1
- **RC blocker:** Watch

### T-05
- **Tên:** Teacher students page
- **Mục tiêu:** xác nhận list/filter lớp-học viên
- **Steps:** mở students page -> thử filter/search
- **Expected:** class-backed data đúng
- **Priority:** P1
- **RC blocker:** Watch

### T-06
- **Tên:** Bulk attendance
- **Mục tiêu:** xác nhận attendance persistence
- **Steps:** mở activity đã có participant -> bulk attendance
- **Expected:** attendance cập nhật thành công, score chain có thể theo sau
- **Priority:** P0
- **RC blocker:** Có

### T-07
- **Tên:** Evaluate participation
- **Mục tiêu:** xác nhận evaluation + scoring
- **Steps:** evaluate một participation attended
- **Expected:** điểm được tính/persist, không chỉ toast thành công giả
- **Priority:** P0
- **RC blocker:** Có

### T-08
- **Tên:** Class stats report
- **Mục tiêu:** xác nhận teacher report auth + payload
- **Steps:** mở class stats
- **Expected:** data load đúng, forbidden auth không bị nuốt sai
- **Priority:** P1
- **RC blocker:** Watch

### T-09
- **Tên:** Participation report + export PDF
- **Mục tiêu:** xác nhận reporting/export flow teacher
- **Steps:** mở participation report -> export PDF
- **Expected:** report load đúng, export file được, lỗi surfacing đúng nếu fail
- **Priority:** P1
- **RC blocker:** Có nếu happy path fail

## Student

### S-01
- **Tên:** Student login/session continuity
- **Mục tiêu:** xác nhận student auth flow
- **Steps:** login -> refresh -> logout
- **Expected:** session giữ đúng, logout chuẩn
- **Priority:** P0
- **RC blocker:** Có

### S-02
- **Tên:** Student activity discovery
- **Mục tiêu:** xác nhận xem/list/filter activity
- **Steps:** mở student activities -> filter type -> mở detail
- **Expected:** list/detail load đúng payload
- **Priority:** P0
- **RC blocker:** Có

### S-03
- **Tên:** Register activity
- **Mục tiêu:** xác nhận student register
- **Steps:** register từ detail hoặc list
- **Expected:** success toast đúng, registration state đổi đúng
- **Priority:** P0
- **RC blocker:** Có

### S-04
- **Tên:** Cancel registration
- **Mục tiêu:** xác nhận student cancel register
- **Steps:** cancel registration
- **Expected:** trạng thái quay về hợp lệ, toast đúng
- **Priority:** P0
- **RC blocker:** Có

### S-05
- **Tên:** Student history page
- **Mục tiêu:** xác nhận history/filter/sort/export
- **Steps:** mở history -> filter attended/registered -> sort points/date -> export CSV
- **Expected:** history đúng dữ liệu, export ra file, fetch error không câm
- **Priority:** P1
- **RC blocker:** Có nếu core data sai/blank

### S-06
- **Tên:** Points breakdown
- **Mục tiêu:** xác nhận breakdown theo activity/type/level/achievement/awards
- **Steps:** mở points page -> đổi tab
- **Expected:** summary cards và tabs render đúng
- **Priority:** P1
- **RC blocker:** Watch

### S-07
- **Tên:** Student scores page
- **Mục tiêu:** xác nhận score summary + detail modal
- **Steps:** mở scores page -> mở detail
- **Expected:** summary đúng, modal hiển thị đúng
- **Priority:** P1
- **RC blocker:** Watch

## Cross-role / security / session

### X-01
- wrong role vào route admin/teacher/student
- expected: redirect hoặc forbidden rõ ràng
- priority: P0
- blocker: Có

### X-02
- stale cookie / invalid token
- expected: session cleanup đúng, không treo UI
- priority: P0
- blocker: Có

### X-03
- export/report route khi không có quyền
- expected: error rõ, không false success
- priority: P1
- blocker: Có nếu leak sai content/quyền

## Reporting / scoring consistency

### R-01
- attendance xong nhưng chưa evaluate
- expected: attendance visible, điểm chính thức chưa finalize theo flow
- priority: P0
- blocker: Có nếu sai rule nghiệp vụ

### R-02
- evaluate xong
- expected: point persisted, student history/points/scores đồng bộ
- priority: P0
- blocker: Có

### R-03
- sau scoring persist
- expected: admin scores/leaderboard/rankings/report phản ánh dữ liệu tương ứng
- priority: P0
- blocker: Có

## Homepage / dashboard / navigation UX

### UX-01
- **Tên:** Trang chủ phục vụ ai?
- **Kiểm:** nếu app là internal tool, homepage/login entry có dẫn người dùng vào flow nhanh không
- **Expected:** không vòng vo, CTA rõ cho login và role-specific journey
- **Priority:** P1
- **Blocker:** Không, trừ khi điều hướng làm gãy onboarding nội bộ

### UX-02
- **Tên:** Dashboard theo role có khoa học không
- **Kiểm:** admin/teacher/student dashboard có nêu đúng việc chính cần làm đầu tiên không
- **Expected:** thông tin quan trọng nằm trên cùng, card/số liệu không gây nhiễu
- **Priority:** P1
- **Blocker:** Watch

---

# PHẦN D. MA TRẬN KIỂM THỬ SCORE CONSISTENCY

| Source action | Expected persistence | Expected student visibility | Expected teacher/admin visibility | Risk nếu sai |
|---|---|---|---|---|
| Student register activity | participation record created / updated | activity state phản ánh đã đăng ký | teacher/admin thấy participant đúng scope | student không tham gia được flow sau |
| Bulk/manual attendance | attendance_status updated | history có thể phản ánh attended state | teacher thấy attendance đúng | evaluate/scoring sai chain |
| Teacher evaluate participation | point calculation persisted | student points/scores/history thay đổi tương ứng | teacher/admin reports thay đổi tương ứng | điểm ảo hoặc mất đồng bộ |
| Award/adjustment entry | student_scores / award source persisted | total score / breakdown cập nhật | admin reports/leaderboard/rankings cập nhật | report sai tổng điểm |
| Export/report fetch | không đổi DB nhưng phản ánh source-of-truth hiện tại | student không trực tiếp thấy | teacher/admin export đúng snapshot | decision sai vì report sai |

---

# PHẦN E. ĐÁNH GIÁ TRANG CHỦ / HOMEPAGE / DASHBOARD

## 1. Trang chủ hiện tại đang phục vụ ai
Từ dấu hiệu repo và tài liệu release nội bộ, hệ thống hiện phù hợp nhất với **internal operational web app** hơn là landing page marketing công khai.

## 2. Điểm mạnh
- dashboard role-based đã được ưu tiên harden
- luồng chính bám theo actor rõ ràng: admin / teacher / student
- phần reporting/scoring đã gần khép kín hơn trước

## 3. Điểm yếu / rủi ro UX
- nếu homepage vẫn mang tính “generic portal”, có thể chưa đủ sắc cho từng vai trò
- dashboard có nguy cơ hiển thị nhiều số liệu hơn hành động ưu tiên
- trang đầu nếu chưa nêu rõ “việc tiếp theo cần làm” sẽ làm người dùng nội bộ chậm thao tác

## 4. Đánh giá khoa học / tối ưu
### Nên có ở homepage/login entry
- CTA rõ: đăng nhập
- nếu cần demo nội bộ, chỉ hiện khi env cho phép
- không trộn quá nhiều thông tin marketing nếu sản phẩm đang là internal tool

### Nên có ở dashboard role-based
- **Admin:** pending approvals, user/class health, reporting shortcuts
- **Teacher:** draft/requested activities, attendance/evaluation backlog, report shortcuts
- **Student:** upcoming registrations, recent scores, history shortcuts

### Dấu hiệu chưa tối ưu
- card thống kê đứng trên mọi thứ nhưng không dẫn đến action chính
- hierarchy giữa “việc cần làm ngay” và “số liệu tham khảo” chưa rõ
- shortcut vào flow backbone không đủ nổi bật

## 5. Đề xuất cải tiến cụ thể
### High impact
1. Đưa **action-first modules** lên trên cùng dashboard theo role
2. Gom **reporting shortcuts** thành 1 vùng riêng, không lẫn với action queue
3. Trên login/home chỉ giữ CTA cần thiết cho internal use

### Medium impact
4. Chuẩn hóa copy giữa create/submit/approve/cancel/deactivate
5. Giảm card metrics nếu không giúp hành động tiếp theo
6. Thêm trạng thái empty/loading/error nhất quán hơn ở các dashboard

### Low impact
7. polish hierarchy màu sắc/icon
8. giảm noise text ở các trang report dày dữ liệu

---

# PHẦN F. DANH SÁCH RỦI RO / GAPS / KHU VỰC CẦN TEST KỸ

## Flow có nguy cơ drift cao
- attendance -> evaluation -> score persistence
- report/export surfaces dùng derived data
- wrong-role / stale-session guards
- seeded demo/UAT assumptions

## Route/page còn mang tính compatibility
- một số legacy compatibility routes vẫn tồn tại để chuyển tiếp
- cần kiểm manual nhưng không tự động xem là blocker nếu chúng không nằm trong active web backbone

## Khu vực cần exploratory testing kỹ hơn
- admin/teacher reports với data lớn
- custom report combinations
- edge cases empty state / no data / forbidden / invalid id
- publish/edit/resubmit edge cases sau approval lifecycle

## Safe to defer
- analytics/jobs backlog ngoài core
- notification/polls tooling
- security questions fallback branch
- mobile parity

---

# PHẦN G. KẾT LUẬN THỰC DỤNG

## Nếu chỉ có 1 buổi test
Ưu tiên test theo thứ tự:
1. auth/session cho 3 role
2. teacher create -> submit approval
3. admin approve/reject
4. student view -> register/cancel
5. attendance -> evaluate -> scoring
6. student history/points/scores
7. admin reports chính

## Nếu có 1 ngày test
### Buổi 1
- auth/session
- admin users/classes
- teacher activity workflow
- admin approval

### Buổi 2
- student participation flows
- attendance/evaluation
- scoring persistence

### Buổi 3
- student visibility
- teacher reports
- admin reports/export
- exploratory cross-role checks

## Những bug phải coi là blocker ngay
- login/logout/session continuity hỏng
- wrong role truy cập được content sai
- create/submit/approve/register/cancel/evaluate hỏng
- scoring không persist hoặc lệch visibility
- report/export happy path fail trên luồng chính

## Những bug có thể để sau
- copy chưa đẹp
- layout minor
- analytics phụ
- tooling ngoài backbone release

## Final practical verdict
UniAct web backbone hiện phù hợp để bước vào **manual QA-driven closeout**. Dùng tài liệu này cùng với:
- `docs/web-release-readiness-report.md`
- `docs/manual-qa-checklist-web-rc.md`
- `docs/release-blocker-matrix.md`
- `docs/qa-issue-intake-template.md`

để biến manual QA thành các batch bugfix rất nhanh, thay vì tiếp tục refactor rộng.
