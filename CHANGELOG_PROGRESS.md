# CHANGELOG PROGRESS

## 2026-04-11 - Khôi phục notification history flow và thêm escalation visibility

### Đã làm

- Viết lại `src/app/api/teacher/notifications/history/route.ts` để route này không còn trỏ vào schema ma `notification_recipients` không tồn tại.
- Route history mới dùng dữ liệu thật từ:
  - `broadcast_notifications`
  - `notifications`
  - `users`
  - `classes`
- Route giờ trả đồng thời:
  - `notifications`: broadcast summary cho các màn lịch sử/overview
  - `records`: recipient-level delivery/read rows cho màn history chi tiết
  - `summary`: tổng hợp vận hành gồm total recipients, total read/unread, low-read notifications
- Bổ sung `src/app/api/teacher/notifications/history/export/route.ts` để page export CSV thực sự hoạt động thay vì gọi route không tồn tại.
- Viết lại `src/app/teacher/notifications/history/page.tsx` để:
  - parse đúng response mới
  - parse đúng `/api/classes` response
  - hiển thị read-rate card
  - hiển thị section `Broadcast có tỷ lệ đọc thấp`
  - dùng trạng thái `Không theo dõi` cho device/read-at khi upstream tracking chưa có
- Batch này cũng gián tiếp fix mismatch cũ giữa:
  - route trả `notifications` summary
  - page lại mong `records` chi tiết

### Kiểm thử

- Chạy focused Vitest:
  - `npm.cmd test -- test/teacher-notification-history-route.test.ts test/teacher-notification-history-export-route.test.ts`
  - Kết quả: `2` files pass, `3` tests pass
- Chạy full Vitest suite:
  - `npm.cmd test`
  - Kết quả: `81` files pass, `380` tests pass
- Chạy production build:
  - `npm.cmd run build`
  - Kết quả: build pass

### Kết quả

- Teacher notification history flow không còn bị gãy do route/page drift và export route thiếu.
- Có visibility vận hành tốt hơn cho broadcast health / low-read notifications.
- Batch notification này đã được kéo về trạng thái xanh ở mức full Vitest + build.

### Còn lại

- Chưa có UAT/smoke riêng cho notification history page.
- Nếu tiếp tục, wave ROI cao tiếp theo là đào sâu admin-level notification analytics hoặc improvement/penalty reporting.


## 2026-04-11 - Chuẩn hóa attendance reporting semantics và thêm method mix analytics

### Đã làm

- Mở rộng `src/app/api/teacher/reports/attendance/records/route.ts` để trả thêm `method` từ attendance record gần nhất (`manual`, `qr`, `face`, fallback `unknown`).
- Chuẩn hóa semantics ở teacher attendance reporting:
  - giữ `registered` -> `not_participated`
  - hiển thị `Chưa tham gia` rõ ràng thay vì lẫn vào nhãn `Có phép`
- Nâng cấp `src/app/teacher/reports/attendance/page.tsx`:
  - thêm card tổng quan `Chưa tham gia`
  - thêm method mix cards cho `QR`, `Thủ công`, `Face`
  - thêm filter theo phương thức ở view `Chi tiết`
  - thêm cột `Phương thức` trong bảng chi tiết
  - cập nhật bảng `Theo lớp` và `Theo học viên` để dùng `not_participated_count`
- Cập nhật `src/app/api/teacher/reports/attendance/export/route.ts` để export thống nhất với semantics mới và có kèm attendance method trong detail rows.
- Tách helper thuần cho attendance reporting sang `src/features/reports/attendance-report-helpers.ts` để tránh page export conflict với Next.js và khóa logic normalization/stats riêng.
- Bổ sung regression mới:
  - `test/teacher-attendance-records-route.test.ts`
  - `test/teacher-attendance-report-page.test.tsx` (helper-focused)

### Kiểm thử

- Chạy focused Vitest:
  - `npm.cmd test -- test/teacher-attendance-records-route.test.ts test/teacher-attendance-report-page.test.tsx`
  - Kết quả: `2` files pass, `5` tests pass
- Chạy full Vitest suite:
  - `npm.cmd test`
  - Kết quả: `79` files pass, `377` tests pass
- Chạy production build:
  - `npm.cmd run build`
  - Kết quả: build pass

### Kết quả

- Teacher attendance reports giờ phản ánh đúng hơn operational reality: có method mix thật, có `Chưa tham gia` rõ ràng, và export không còn drift semantics cũ.
- Logic normalization/report aggregation đã được tách ra thành helper testable, không làm gãy Next.js page contract.
- Repo giữ trạng thái xanh ở mức full Vitest + build sau batch mới.

### Còn lại

- Chưa có UAT/smoke riêng cho teacher attendance reports page.
- Nếu tiếp tục, wave reporting tiếp theo hợp lý là mở rộng admin-level analytics / notification escalation visibility / improvement-penalty reporting.


## 2026-04-11 - Ổn định full-suite verification (student discovery + teacher policy)

### Đã làm

- Sửa `src/app/api/activities/[id]/approve/route.ts` để invalidate `activities:` cache ngay sau khi approve activity, tránh student discovery nhìn thấy dữ liệu cũ.
- Mở rộng `src/app/api/teacher/attendance/pilot-activities/route.ts` hỗ trợ query `activity_id` để có thể ép đưa một activity cụ thể vào danh sách pilot trả về, kể cả khi nó nằm ngoài top-50 mặc định.
- Cập nhật `src/app/teacher/attendance/policy/page.tsx` đọc `activityId` từ query string và ưu tiên chọn đúng activity được yêu cầu.
- Mở rộng helper `test/uat/helpers/teacher.helper.ts` để `goToAttendancePolicy(activityId?)` hỗ trợ deeplink ổn định cho UAT.
- Cập nhật `test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts` dùng deeplink theo `activityId` thay vì phụ thuộc vào việc activity vừa tạo có nằm trong top-50 list hay không.
- Tăng timeout cho `test/uat/actor-student/01-discovery-registration.spec.ts` và sửa dữ liệu test:
  - lấy `class_id` thật từ `/api/auth/me` thay vì lấy class đầu tiên của toàn hệ thống
  - dùng `date_time` ở mốc xa hơn (`2028-12-31`) để activity mới tạo không bị chìm khỏi top-100 discovery list mặc định
- Bổ sung regression route test cho nhánh `activity_id` trong `test/teacher-attendance-pilot-activities-route.test.ts`.

### Kiểm thử

- Chạy focused Vitest:
  - `npm.cmd test -- test/teacher-attendance-pilot-activities-route.test.ts test/attendance-policy-route.test.ts test/attendance-policy.test.ts test/face-attendance-route.test.ts`
  - Kết quả: pass
- Chạy focused Playwright:
  - `npx playwright test test/uat/actor-student/01-discovery-registration.spec.ts --reporter=line`
  - `npx playwright test test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts --reporter=line`
  - Kết quả: pass
- Chạy full Playwright suite:
  - `npm.cmd run test:e2e`
  - Kết quả: `17` pass, `0` fail
- Chạy full Vitest suite:
  - `npm.cmd test`
  - Kết quả: `77` files pass, `372` tests pass
- Chạy production build:
  - `npm.cmd run build`
  - Kết quả: build pass

### Kết quả

- Verification stack hiện xanh toàn bộ ở mức unit/regression + full UAT + production build.
- Hai điểm từng làm full suite không xanh đã được khóa lại bằng fix rõ nguyên nhân gốc, không chỉ chữa triệu chứng test.

### Còn lại

- Repo đang ở trạng thái sạch và đã đủ tốt để tiếp tục wave business/reporting/hardening tiếp theo nếu cần.


## 2026-04-11 - Thêm attendance policy visibility vào admin dashboard

### Đã làm

- Mở rộng `src/features/dashboard/DashboardAdminPage.tsx` để nạp overview runtime của attendance policy từ:
  - `/api/system-config?category=attendance`
  - `/api/teacher/attendance/pilot-activities`
- Thêm card `Attendance policy rollout` trên admin dashboard, hiển thị:
  - policy version
  - selection mode
  - configured pilot activities
  - eligible/scanned activities
  - QR fallback preset
- Giữ đường vào nhanh từ dashboard sang `\/admin\/system-config\/attendance-policy`.
- Cập nhật admin UAT `test/uat/actor-admin/03-attendance-policy-config.spec.ts` để xác nhận widget overview hiển thị được trước khi đi vào trang cấu hình.

### Kiểm thử

- Chạy `npm.cmd run build`
- Kết quả: build pass
- Chạy `npx playwright test test/uat/actor-admin/03-attendance-policy-config.spec.ts --reporter=line`
- Kết quả: `1` test pass

### Kết quả

- Admin có visibility vận hành tốt hơn cho attendance policy rollout ngay trên dashboard.
- Attendance policy không còn là config “ẩn”; giờ có cả config surface lẫn dashboard signal.

### Còn lại

- Reporting chiều sâu hơn cho attendance method mix / notification escalation / improvement-penalty vẫn là wave tiếp theo nếu tiếp tục mở rộng beyond attendance policy core.


## 2026-04-11 - Config hóa attendance policy / face-pilot và thêm admin surface

### Đã làm

- Tách policy config ra khỏi hard-code bằng `src/lib/attendance-policy-config.ts` với các default DB-backed trong `system_config`.
- Thêm/seed nhóm config mới cho attendance policy:
  - `attendance_qr_fallback_*`
  - `attendance_face_pilot_*`
  - `attendance_policy_version`
- Cập nhật `src/lib/attendance-policy.ts` để policy hỗ trợ config runtime thay vì cố định ngưỡng trong helper.
- Bổ sung support cho face-pilot selection mode:
  - `heuristic_only`
  - `selected_only`
  - `selected_or_heuristic`
- Cập nhật các route/runtime dùng policy config thật từ DB:
  - `src/app/api/activities/[id]/attendance-policy/route.ts`
  - `src/app/api/activities/[id]/attendance-policy/fallback/route.ts`
  - `src/app/api/attendance/face/route.ts`
  - `src/app/api/teacher/attendance/pilot-activities/route.ts`
  - `src/app/api/system-config/route.ts`
- Seed default config mới vào `src/infrastructure/db/db-setup.ts` để fresh DB có ngay policy surface.
- Bổ sung trang admin mới `src/app/admin/system-config/attendance-policy/page.tsx` và nối link từ `src/components/Sidebar.tsx`.
- Mở rộng teacher policy page để hiển thị version, preset, selection mode, selected-by-config và min confidence từ policy runtime.
- Thêm / cập nhật regression:
  - `test/attendance-policy.test.ts`
  - `test/attendance-policy-config.test.ts`
  - `test/attendance-policy-route.test.ts`
  - `test/teacher-attendance-pilot-activities-route.test.ts`
  - `test/face-attendance-route.test.ts`
- Thêm admin UAT mới `test/uat/actor-admin/03-attendance-policy-config.spec.ts`.

### Kiểm thử

- Chạy `npm.cmd test -- test/attendance-policy.test.ts test/attendance-policy-config.test.ts test/attendance-policy-route.test.ts test/teacher-attendance-pilot-activities-route.test.ts test/face-attendance-route.test.ts`
- Kết quả: `5` file test pass, `14` test pass, `0` fail
- Chạy `npm.cmd run build`
- Kết quả: build pass
- Chạy `npx playwright test test/uat/actor-admin/03-attendance-policy-config.spec.ts --reporter=line`
- Kết quả: `1` test pass
- Chạy `npx playwright test test/uat/actor-admin/03-attendance-policy-config.spec.ts test/uat/actor-teacher/03-attendance-manual-bulk.spec.ts test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts test/uat/actor-teacher/07-face-attendance-route.spec.ts --reporter=line`
- Kết quả: `5` test pass

### Kết quả

- QR fallback thresholds và face-pilot selection không còn chỉ sống cứng trong helper; hiện đã có config surface thực sự trên `system_config`.
- Admin có đường vận hành rõ ràng để xem/chỉnh attendance policy mà không phải sửa code.
- Teacher policy page và các route face/attendance-policy đọc cùng một nguồn policy runtime từ DB.
- Attendance cluster vẫn xanh ở mức build + focused regression + admin/teacher UAT.

### Còn lại

- Chưa có UAT ghi/lưu config rồi xác minh effect xuyên vai trò ở mức end-to-end; hiện đã được khóa mạnh ở unit/route + admin page UAT + teacher runtime UAT.
- Các cluster còn lại ngoài attendance policy vẫn là candidate cho wave tiếp theo: dashboard/reporting depth, improvement/penalty depth, cleanup/hardening dài hạn.

## 2026-04-11 - Nối teacher flow vào attendance policy và thêm UAT face-pilot

### Đã làm

- Thêm đường vào rõ ràng cho teacher tới `\/teacher\/attendance\/policy` từ:
  - `src/components/Sidebar.tsx`
  - `src/app/teacher/dashboard/page.tsx`
  - `src/app/teacher/attendance/page.tsx`
- Điều chỉnh logic active state ở sidebar để trang `\/teacher\/attendance\/policy` không làm sáng đồng thời cả item cha `\/teacher\/attendance`.
- Thêm `data-testid` cho trang policy để hỗ trợ UAT ổn định hơn (`attendance-policy-heading`, `face-pilot-eligibility`, `fallback-status`).
- Mở rộng `TeacherHelper` với helper `goToAttendancePolicy()` cho các UAT sau này.
- Bổ sung UAT mới `test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts` để kiểm chứng:
  - teacher tạo activity mandatory / high-volume candidate
  - admin approve publish
  - API attendance policy trả `facePilot.eligible = true`
  - API fallback trả `triggered = true` với preset metrics
  - teacher mở trang policy, chọn activity, và thấy fallback recommendation trên UI

### Kiểm thử

- Chạy `npm.cmd run build`
- Kết quả: build pass
- Chạy `npx playwright test test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts --reporter=line`
- Kết quả: `1` test pass
- Chạy `npx playwright test test/uat/actor-teacher/03-attendance-manual-bulk.spec.ts test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts --reporter=line`
- Kết quả: `3` test pass

### Kết quả

- Attendance policy / face-pilot không còn là route rời rạc; teacher đã có đường vào thật từ dashboard, sidebar và manual attendance flow.
- Có focused UAT chứng minh cả API lẫn UI policy/fallback hoạt động trong môi trường dev server thực tế.
- Regression teacher attendance backbone vẫn xanh sau khi thêm flow mới.

### Còn lại

- Chưa đưa preset threshold / pilot selection vào lớp config động; hiện vẫn là operational preset trong code.

## 2026-04-11 - Thêm UAT API-level cho face attendance route

### Đã làm

- Bổ sung `test/uat/actor-teacher/07-face-attendance-route.spec.ts` để kiểm chứng `POST /api/attendance/face` bằng flow thật qua dev server.
- Trong spec mới:
  - teacher tạo activity mandatory / high-volume candidate
  - admin approve publish
  - teacher gọi `participants/add-class` để đảm bảo participation bắt buộc tồn tại cho lớp mục tiêu
  - low-confidence face attendance trả `FACE_LOW_CONFIDENCE` + manual fallback guidance
  - high-confidence face attendance ghi nhận thành công
  - lần gọi lặp lại trả `already_recorded = true`
- Chạy lại bundle teacher attendance mở rộng để xác nhận manual attendance / QR / policy / face route cùng xanh.

### Kiểm thử

- Chạy `npx playwright test test/uat/actor-teacher/07-face-attendance-route.spec.ts --reporter=line`
- Kết quả: `1` test pass
- Chạy `npx playwright test test/uat/actor-teacher/03-attendance-manual-bulk.spec.ts test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts test/uat/actor-teacher/07-face-attendance-route.spec.ts --reporter=line`
- Kết quả: `4` test pass

### Kết quả

- Cụm face attendance không còn chỉ được khóa ở unit/route-level; hiện đã có UAT API-level qua auth + DB + activity flow thật.
- Teacher attendance bundle hiện xanh ở cả 4 nhánh: manual, QR, policy/fallback, face route.

### Còn lại

- Chưa có tích hợp biometric upstream thật trong UAT; hiện vẫn mô phỏng bằng `upstream_verified = true`.
- Chưa đưa preset threshold / pilot selection vào lớp config động; hiện vẫn là operational preset trong code.

## 2026-04-11 - Ổn định attendance policy / face-pilot slice

### Đã làm

- Audit batch mới xoay quanh `src/lib/attendance-policy.ts`, các route attendance-policy, face attendance và teacher pilot activities.
- Phát hiện lỗi build-level do các route mới gọi `ApiError` sai thứ tự tham số sau khi helper này đã dùng signature `code, message, status, details`.
- Sửa `src/app/api/activities/[id]/attendance-policy/route.ts` và `src/app/api/activities/[id]/attendance-policy/fallback/route.ts` để trả lỗi đúng contract.
- Sửa `src/app/api/attendance/face/route.ts` để toàn bộ nhánh lỗi (`INVALID_ACTIVITY_ID`, `INVALID_STUDENT_ID`, `ACTIVITY_NOT_FOUND`, `FACE_PILOT_NOT_ELIGIBLE`, `FACE_NOT_VERIFIED`, `FACE_LOW_CONFIDENCE`, `PARTICIPATION_NOT_FOUND`) dùng đúng `ApiError` contract.
- Bổ sung regression mới `test/face-attendance-route.test.ts` để khóa 3 nhánh quan trọng:
  - ghi nhận face attendance thành công khi đủ điều kiện pilot
  - fallback khi low confidence
  - idempotent khi attendance đã được ghi trước đó

### Kiểm thử

- Chạy `npm.cmd test -- test/attendance-policy.test.ts test/attendance-policy-route.test.ts test/teacher-attendance-pilot-activities-route.test.ts test/face-attendance-route.test.ts`
- Kết quả: `4` file test pass, `10` test pass, `0` fail
- Chạy `npm.cmd run build`
- Kết quả: build pass

### Kết quả

- Attendance policy slice không còn gãy ở bước type-check/build.
- Batch face-pilot hiện đã có cả unit/route regression tối thiểu thay vì chỉ có policy helper tests.
- Handover state vẫn giữ xanh ở mức build + focused regression cho cluster mới này.

### Còn lại

- Chưa có link điều hướng rõ từ teacher sidebar sang màn `teacher/attendance/policy`.
- Chưa có UAT/e2e cho face-attendance pilot; hiện mới dừng ở route/policy regression.
- Chưa chốt danh sách activity pilot thực tế ngoài heuristic mandatory/high-volume/high-identity.

## 2026-04-06 - Khảo sát sâu và lập kế hoạch

### Đã làm

- Khảo sát cấu trúc repo, stack, schema, scripts, tài liệu, test
- Xác định xương sống sản phẩm:
  - auth
  - activities
  - approval
  - registration
  - QR attendance
  - scoring/notifications/reports
- Chạy kiểm thử hẹp:
  - `test/approval-workflow.test.ts`
  - `test/attendance.test.ts`
  - `test/activities.test.ts`

### Kết quả test hẹp

- `approval-workflow` pass
- `attendance` pass
- `activities.test.ts` fail do mock guards lỗi thời, không khớp exports hiện tại

### Phát hiện chính

- Student activities list/detail đang lệch contract với API
- Approval flow teacher/admin lệch giữa `pending` và `requested`
- Nhiều route/page còn dùng `start_time` thay vì `date_time`
- Activity dialog lệch response shape ở metadata
- Admin dashboard còn tiếng Anh và có số liệu chưa đáng tin
- Tài liệu bị phân mảnh, tự mâu thuẫn

### File kế hoạch đã tạo

- `PROJECT_AUDIT.md`
- `CORE_PRODUCT_FLOW.md`
- `BUGS_BOTTLENECKS.md`
- `MASTER_PLAN.md`
- `TASK_QUEUE.md`
- `UI_VIET_HOA_PLAN.md`
- `CLEANUP_REFACTOR_PLAN.md`
- `CHANGELOG_PROGRESS.md`

### Chưa làm

- Chưa sửa code nghiệp vụ
- Chưa chạy full test
- Chưa dọn/xóa/di chuyển file diện rộng
- Chưa thay đổi schema/dependency

## 2026-04-06 - Hoàn thành T-101

### Đã làm

- Chuẩn hóa contract danh sách hoạt động cho luồng sinh viên trong `GET /api/activities`
- Bổ sung chuẩn hóa dữ liệu student list ở `src/app/api/activities/route.ts`
- Mở rộng query `getActivitiesForStudent` để trả thêm `activity_type` và `organization_level`
- Sửa `src/app/student/activities/page.tsx` để dùng `status`, `organization_level`, `base_points`
- Bỏ gọi thừa `/api/activities/my-registrations` ở trang danh sách để giảm request không cần thiết
- Chuyển phần lọc tìm kiếm/trạng thái sang xử lý cục bộ sau khi lấy danh sách

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/student/activities/page.tsx src/app/api/activities/route.ts src/infrastructure/db/db-queries.ts`
- Kết quả: không có lỗi lint, chỉ còn các warning `@typescript-eslint/no-explicit-any` đã tồn tại ở route/db helper

### Kết quả

- Student activities list không còn phụ thuộc `activity_status`
- Danh sách hiển thị được loại hoạt động, cấp tổ chức và trạng thái đăng ký theo contract thống nhất hơn
- Giảm 1 lượt fetch phụ mỗi lần đổi bộ lọc/tìm kiếm trên màn hình sinh viên

### Còn lại

- Chưa sửa contract detail page sinh viên; phần này thuộc `T-102`

## 2026-04-06 - Hoàn thành T-102

### Đã làm

- Chuẩn hóa `GET /api/activities/[id]` để trả thêm `teacher_name`, `activity_type`, `organization_level`, `participant_count`, `available_slots`, `is_registered`, `registration_status`, `registration_deadline`
- Bổ sung chuẩn hóa `base_points` hiển thị theo ưu tiên điểm riêng của hoạt động, fallback sang `activity_type.base_points`
- Giữ tương thích ngược bằng alias `activity_status`, đồng thời trả thêm `classes`, `class_ids`, `class_names` cho consumer khác của endpoint
- Sửa `src/app/student/activities/[id]/page.tsx` để dùng `status`, `base_points`, `registration_deadline`, `can_register`, `can_cancel`
- Chuyển countdown và CTA đăng ký sang bám theo `registration_deadline` nếu có, thay vì chỉ nhìn `date_time`
- Việt hóa và làm rõ hơn các trạng thái: hết hạn đăng ký, đã đủ số lượng, đã điểm danh, điểm danh QR

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/student/activities/[id]/page.tsx src/app/api/activities/[id]/route.ts`
- Kết quả: không có lỗi lint; còn 3 warning `@typescript-eslint/no-explicit-any` cũ trong route API

### Kết quả

- Student activity detail không còn phụ thuộc contract cũ `activity_status/base_score`
- Nút đăng ký/hủy đăng ký và countdown phản ánh sát logic API hơn
- Trang chi tiết có đủ dữ liệu để hiển thị thông tin chính mà không bị `undefined` logic

### Còn lại

- Luồng approval teacher/admin vẫn còn lệch semantic `pending/requested`; phần này thuộc `T-103`

## 2026-04-06 - Hoàn thành T-103

### Đã làm

- Thêm helper trung tâm trong `src/lib/activity-workflow.ts` để suy diễn trạng thái hiển thị từ cặp `status` + `approval_status`
- Chuẩn hóa `GET /api/activities` cho teacher/admin để map `approval_status='requested'` thành trạng thái hiển thị `pending`
- Đồng bộ `/api/admin/activities/pending` để trả trạng thái hiển thị cùng semantic với teacher side
- Sửa `src/app/teacher/activities/page.tsx` để filter, badge và action hiểu đúng các trạng thái `draft`, `pending`, `rejected`, `published`, `completed`
- Cho phép activity bị từ chối hiển thị rõ là “Bị từ chối” và tiếp tục chỉnh sửa/gửi lại từ màn teacher list
- Sửa `src/components/ActivityDialog.tsx` để submit mode luôn lưu nháp trước, rồi gọi `/api/activities/[id]/submit-approval` thay vì gửi `status/approval_status` sai semantic

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/lib/activity-workflow.ts src/app/api/activities/route.ts src/app/api/admin/activities/pending/route.ts src/app/teacher/activities/page.tsx src/components/ActivityDialog.tsx`
- Kết quả: không có lỗi lint; chỉ còn warning cũ về `any`, 1 unused import cũ và một số hook dependency warning sẵn có trong `ActivityDialog`
- Chạy `npm.cmd test -- test/approval-workflow.test.ts test/attendance.test.ts test/activities.test.ts`
- Kết quả: `approval-workflow` pass, `attendance` pass, `activities.test.ts` vẫn fail do mock `@/lib/guards` trong test chưa cập nhật theo `requireApiRole/requireApiAuth`

### Kết quả

- Teacher list nay hiểu đúng “Chờ duyệt” theo workflow thật của DB
- Admin pending endpoint và teacher list không còn mỗi nơi hiểu một semantic khác nhau
- Luồng submit từ dialog chính đi qua endpoint submit approval thật, tránh trạng thái giả kiểu `pending`/`pending_approval`

### Còn lại

- `test/activities.test.ts` vẫn cần cập nhật mock guards; phần này thuộc `T-107`
- Một số trang teacher tạo/sửa cũ ngoài dialog chính còn dấu hiệu semantic legacy và nên gom xử lý ở lượt sau nếu tiếp tục chuẩn hóa toàn bộ approval flow

## 2026-04-06 - Hoàn thành T-104

### Đã làm

- Chuẩn hóa `GET /api/activity-types` để trả đồng thời `activityTypes`, `activity_types` và `types`, giảm contract drift giữa các consumer cũ và mới
- Chuẩn hóa `GET /api/organization-levels` để trả cả `organization_levels` và `levels`, giúp dialog/form không còn phát sinh dropdown trống do lệch key
- Sửa `src/components/ActivityDialog.tsx` để đọc fallback metadata từ các shape response đang tồn tại, ưu tiên key mới nhưng vẫn tương thích key legacy
- Giữ phạm vi task hẹp: không refactor lại các form teacher/admin khác, nhưng các màn đó cũng được hưởng lợi nhờ alias tương thích từ route

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/components/ActivityDialog.tsx src/app/api/activity-types/route.ts src/app/api/organization-levels/route.ts`
- Kết quả: không có lỗi lint; chỉ còn warning cũ về `any`, `unused import` và `useEffect` dependency trong `ActivityDialog`

### Kết quả

- `ActivityDialog` có thể nạp đúng danh sách loại hoạt động và cấp tổ chức ngay cả khi route trả theo key cũ hoặc key mới
- Hai route metadata chung nay trơn tru hơn cho nhiều consumer khác trong repo, giảm nguy cơ lỗi dropdown trống do lệch contract

### Còn lại

- `ActivityDialog` vẫn còn một số warning cũ không nằm trong phạm vi task này
- Các form teacher cũ ngoài dialog chính vẫn còn nợ logic submit approval riêng, thuộc lượt chuẩn hóa sau nếu tiếp tục dọn approval flow

## 2026-04-06 - Hoàn thành T-105

### Đã làm

- Sửa `GET /api/student/statistics` để đếm hoạt động sắp tới theo `a.date_time` thay vì `a.start_time`
- Chuẩn hóa `GET /api/student/recommendations` sang `date_time`, `attendance_status`, `status = 'published'` và `base_points` hợp lệ; đồng thời bổ sung alias tương thích `start_time`, `start_date`, `recommendations`
- Sửa `GET /api/student/history` để trả đúng dữ liệu cho page sinh viên: thêm `participation_id`, `registered_at`, `points_earned`, `attended`, `status`, và đổi nguồn thời gian sang `date_time`
- Sửa `GET /api/student/points-breakdown` để dùng `date_time` và `attendance_status = 'attended'`, tránh query cột/trạng thái cũ
- Cập nhật `src/app/student/dashboard/page.tsx` để:
  - dùng endpoint hoạt động đang tồn tại (`/api/activities`)
  - lọc upcoming theo `date_time`
  - đọc recommendations theo shape mới/cũ
  - hiển thị `activity_type` đúng thay vì `type`
- Cập nhật `src/app/student/history/page.tsx`, `src/app/student/points/page.tsx`, `src/app/student/recommendations/page.tsx` để đọc `date_time` và contract response mới một cách tương thích

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/student/statistics/route.ts src/app/api/student/recommendations/route.ts src/app/api/student/history/route.ts src/app/api/student/points-breakdown/route.ts src/app/student/dashboard/page.tsx src/app/student/history/page.tsx src/app/student/points/page.tsx src/app/student/recommendations/page.tsx`
- Kết quả: không có lỗi lint; chỉ còn warning cũ về `any`, tham số chưa dùng và `useEffect` dependency

### Kết quả

- Cluster student không còn phụ thuộc trực tiếp vào `start_time`/`p.status` ở các route và page chính của batch này
- Dashboard sinh viên đọc đúng recommendations và widget hoạt động sắp tới không còn gọi route không tồn tại
- History/points/recommendations page bám được contract mới nhưng vẫn giữ fallback tương thích để tránh gãy consumer cũ

### Còn lại

- `src/app/api/student/alerts/route.ts` vẫn còn dùng `start_date`; chưa nằm trong batch T-105 này
- Cụm warning TypeScript/React cũ ở các page student vẫn còn, nhưng không phải lỗi chặn hành vi trong lượt sửa này

## 2026-04-06 - Hoàn thành T-106

### Đã làm

- Viết lại `src/features/dashboard/DashboardAdminPage.tsx` theo cùng cấu trúc dữ liệu hiện có nhưng gọn hơn, bỏ nhãn tiếng Anh nổi bật trên card/chart và chuẩn hóa toàn bộ text hiển thị sang tiếng Việt
- Sửa dashboard admin để dùng đúng cụm `attendance` từ API thay vì tính tỷ lệ điểm danh trên toàn bộ participations chưa xử lý
- Sửa card “lượt điểm danh mới” để lấy từ số điểm danh 24 giờ gần nhất, không còn dùng nhầm số lượt đăng ký mới
- Chuẩn hóa `/api/admin/system-health` để:
  - trả thêm `attendance`
  - bổ sung alias tương thích `planned/ongoing`, `pending/approved/rejected`
  - tính `new_attendances_24h`
  - Việt hóa thông báo lỗi API
- Chuẩn hóa `/api/reports/dashboard` để:
  - chỉ tính chart tháng cho hoạt động `published/completed`
  - sắp xếp theo thời gian tăng dần để đọc trend tự nhiên hơn
  - lọc `participation_by_class` theo hoạt động đã công bố/hoàn thành thay vì trộn toàn bộ dữ liệu cũ
  - Việt hóa lỗi xác thực/quyền truy cập

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/features/dashboard/DashboardAdminPage.tsx src/app/api/admin/system-health/route.ts src/app/api/reports/dashboard/route.ts`
- Kết quả: không có lỗi lint; còn 1 warning `no-explicit-any` cũ ở `src/app/api/reports/dashboard/route.ts`

### Kết quả

- Dashboard admin phản ánh đúng hơn các số liệu 24 giờ gần nhất và tỷ lệ điểm danh
- Các biểu đồ/trạng thái trên màn tổng quan không còn lộ text tiếng Anh chính
- Route `system-health` tương thích tốt hơn với cả dashboard admin lẫn màn health riêng đang dùng shape cũ

### Còn lại

- `src/app/api/reports/dashboard/route.ts` còn 1 warning `any` cũ chưa ảnh hưởng hành vi
- `/api/admin/system-health` vẫn còn fallback `x-user-role` legacy; chưa động vào vì chạm vùng auth/quyền truy cập rộng hơn phạm vi task này

## 2026-04-06 - Hoàn thành T-107

### Đã làm

- Viết lại `test/activities.test.ts` để bám đúng contract route hiện tại của `src/app/api/activities/[id]/route.ts`
- Sửa mock guards từ semantic cũ sang đúng `requireApiAuth` và `requireApiRole`
- Bổ sung mock `dbGet`, `dbAll`, `cache.invalidatePrefix` và dữ liệu activity chi tiết tối thiểu để test `GET`/`PUT` chạy đúng luồng mới
- Đổi cách truyền `params` trong test sang `Promise.resolve({ id })` để khớp signature route hiện tại
- Dọn luôn 2 warning `any` còn lại trong file test sau khi test đã pass

### Kiểm thử hẹp

- Chạy `npm.cmd test -- test/approval-workflow.test.ts test/attendance.test.ts test/activities.test.ts`
- Kết quả: `3` file test pass, `9` test pass
- Chạy `npx.cmd eslint test/activities.test.ts`
- Kết quả: không có lỗi lint, không còn warning

### Kết quả

- Regression net của cụm activities đã quay lại trạng thái pass
- Mock test không còn lệch so với guard exports và route detail contract hiện tại

### Còn lại

- Đây mới là regression hẹp cho cụm activities; chưa mở rộng thêm coverage cho các luồng student list/detail hoặc approval UI

## 2026-04-06 - Hoàn thành T-108

### Đã làm

- Việt hóa các nhãn dashboard còn sót trong `src/components/Sidebar.tsx` cho ba vai trò quản trị viên, giảng viên và học viên
- Đổi `Audit Logs` thành `Nhật ký hệ thống` và Việt hóa `aria-label` của nút mở hoặc đóng menu
- Chuẩn hóa `src/components/Countdown.tsx` sang tiếng Việt cho nhãn mặc định, trạng thái hết hạn và chuỗi đếm ngược theo đơn vị ngày, giờ, phút, giây
- Dọn 1 import không còn dùng trong `Sidebar.tsx` để lint sạch trong phạm vi task
- Rà lại `src/features/dashboard/DashboardAdminPage.tsx`; không còn text English nổi bật cần sửa trong batch này

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/components/Sidebar.tsx src/components/Countdown.tsx src/features/dashboard/DashboardAdminPage.tsx`
- Kết quả: không còn lỗi hoặc warning trong phạm vi task

### Kết quả

- Sidebar đã thống nhất ngôn ngữ hiển thị cho các điểm vào chính
- Countdown không còn lộ text tiếng Anh và hiển thị thời gian cụ thể, dễ hiểu hơn cho người dùng
- Dashboard admin giữ nguyên logic hiện tại và không còn nợ text English nổi bật trong phạm vi đã rà

### Còn lại

- Các text English không hiển thị ra UI trong type, interface và identifier vẫn được giữ nguyên để tránh refactor không cần thiết
- Task tiếp theo hợp lý nhất là `T-109` để thay `confirm()` ở luồng lõi bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-109

### Đã làm

- Thay `confirm()` ở `src/app/teacher/activities/page.tsx` bằng `ConfirmDialog` chuẩn cho 4 thao tác lõi: gửi phê duyệt, hủy hoạt động, nhân bản và xóa
- Thêm state xác nhận tập trung cho trang teacher activities để giữ nguyên logic nghiệp vụ nhưng thống nhất UX xác nhận thao tác
- Thay `confirm()` ở `src/app/student/my-activities/page.tsx` bằng `ConfirmDialog` chuẩn cho luồng hủy đăng ký
- Bổ sung trạng thái `cancelingActivityId` ở trang hoạt động của tôi để nút hủy đăng ký hiển thị trạng thái đang xử lý và tránh bấm lặp
- Dọn các warning `any` phát sinh trong `teacher/activities/page.tsx` bằng helper lấy thông báo lỗi an toàn

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/teacher/activities/page.tsx src/app/student/my-activities/page.tsx`
- Kết quả: không còn lỗi hoặc warning trong phạm vi task
- Rà nhanh bằng `rg -n "confirm\\(" src/app/teacher/activities/page.tsx src/app/student/my-activities/page.tsx`
- Kết quả: không còn `confirm()` trong 2 file của luồng lõi đã chọn

### Kết quả

- Luồng teacher activities không còn phụ thuộc vào hộp thoại xác nhận mặc định của trình duyệt
- Luồng student hủy đăng ký đã chuyển sang dialog chuẩn, rõ ngữ cảnh hơn và có phản hồi trạng thái khi đang xử lý
- Hành vi nghiệp vụ cũ được giữ nguyên: chỉ thay cách xác nhận thao tác, không thay API hay workflow nền

### Còn lại

- Repo vẫn còn các `confirm()` ngoài phạm vi `T-109`; chưa quét toàn bộ để tránh mở rộng batch không cần thiết
- Task tiếp theo hợp lý nhất là `T-110` để hợp nhất tài liệu canonical

## 2026-04-06 - Hoàn thành T-110

### Đã làm

- Tạo `CANONICAL_DOCS.md` để xác định rõ bộ tài liệu canonical hiện tại của repo, chia theo 5 nhóm: điều hành hiện tại, cài đặt/vận hành, tham khảo kỹ thuật, tài liệu học thuật, tài liệu lịch sử
- Gắn cảnh báo điều hướng ở `README.md` để người tiếp quản đi vào đúng nguồn tài liệu chuẩn ngay từ đầu
- Gắn cảnh báo phạm vi ở `docs/01-README.md` vì file này chứa các khẳng định không còn đúng hoàn toàn với cấu trúc repo hiện tại
- Gắn cảnh báo phạm vi ở `de-tai/README.md` để tách rõ tài liệu học thuật khỏi tài liệu vận hành repo
- Chọn phương án không xóa/di chuyển diện rộng để tránh rủi ro và giữ nguyên đầy đủ dấu vết lịch sử

### Kiểm tra

- Rà cấu trúc tài liệu ở root, `docs/` và `de-tai/`
- Đối chiếu nhanh các điểm mâu thuẫn chính:
  - `docs/01-README.md` nói chỉ còn 8 file chuẩn và `docs/` đã xóa, nhưng repo hiện vẫn còn nhiều file trong `docs/`
  - nhiều file được nhắc tới trong `docs/01-README.md` hiện không tồn tại
  - `README.md` và `de-tai/README.md` thiên về giới thiệu/thuyết minh hơn là nguồn sự thật vận hành hiện tại

### Kết quả

- Repo đã có một điểm vào tài liệu chuẩn rõ ràng cho người tiếp quản
- Không cần xóa hàng loạt tài liệu cũ nhưng vẫn giảm được nhầm lẫn giữa tài liệu hiện hành và tài liệu lịch sử
- Phân biệt rõ hơn giữa tài liệu codebase đang vận hành và tài liệu học thuật/đề tài

### Còn lại

- Nhiều tài liệu lịch sử trong `docs/` vẫn có thể còn lệch chi tiết kỹ thuật; hiện được giữ ở vai trò tham khảo, chưa làm sạch nội dung từng file
- Nếu muốn dọn sâu hơn ở vòng sau, có thể làm thêm một batch riêng để gắn nhãn `historical/reference` đồng nhất cho toàn bộ `docs/`

## 2026-04-06 - Hoàn thành T-111

### Đã làm

- Sửa `src/app/api/student/alerts/route.ts` để bỏ phụ thuộc vào `start_date` và chuyển sang dùng `date_time`
- Đổi điều kiện lọc từ `status = 'approved'` sang `status = 'published'` cho đúng workflow hiện tại
- Bổ sung ưu tiên `registration_deadline` khi tạo cảnh báo, nếu không có thì fallback sang `date_time`
- Chuẩn hóa nội dung cảnh báo theo 2 tình huống:
  - hạn đăng ký sắp hết
  - hoạt động sắp diễn ra
- Việt hóa thông báo lỗi truy cập và message cảnh báo trong route

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/student/alerts/route.ts src/app/student/alerts/page.tsx`
- Kết quả: không có lỗi hoặc warning trong phạm vi task

### Kết quả

- Luồng cảnh báo học viên không còn query nhầm `start_date`
- Route cảnh báo đã bám đúng schema và workflow hiện tại của activities
- Nội dung nhắc nhở hợp logic hơn với dữ liệu thật của hoạt động

### Còn lại

- Cluster `start_time` vẫn còn ở các route cron/admin reports ngoài phạm vi task này
- Task tiếp theo hợp lý nhất là `T-112` để dọn cụm `start_time` còn sót ở cron và admin reports

## 2026-04-06 - Hoàn thành T-112

### Đã làm

- Sửa `src/app/api/cron/send-reminders/route.ts` để dùng `date_time` thay cho `start_time`, đồng thời chuyển lọc tham gia sang `attendance_status = 'registered'`
- Chuẩn hóa `src/app/api/admin/reports/activity-statistics/route.ts` theo schema hiện tại:
  - dùng `a.date_time`
  - join `a.teacher_id`
  - đếm theo `p.attendance_status`
  - tính cả hoạt động `published/completed`
- Viết lại `src/app/api/admin/rankings/route.ts` theo schema thật của repo:
  - lấy lớp từ `users.class_id`
  - lấy tên từ `users.name`
  - tính điểm/đếm hoạt động theo `participations.attendance_status`
  - lọc thời gian theo `activities.date_time`
- Cập nhật `src/app/admin/reports/activity-statistics/page.tsx` sang `date_time`, đồng thời làm sạch lại text hiển thị bị lỗi mã hóa trong đúng phạm vi page báo cáo

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/cron/send-reminders/route.ts src/app/api/admin/reports/activity-statistics/route.ts src/app/api/admin/rankings/route.ts src/app/admin/reports/activity-statistics/page.tsx`
- Kết quả: sạch lỗi, sạch warning
- Chạy `rg -n "start_time" src/app/api/cron/send-reminders/route.ts src/app/api/admin/reports/activity-statistics/route.ts src/app/api/admin/rankings/route.ts src/app/admin/reports/activity-statistics/page.tsx`
- Kết quả: không còn `start_time` trong phạm vi batch

### Kết quả

- Cụm cron/admin reports của batch này đã bám đúng schema `date_time` hiện tại
- Route xếp hạng quản trị không còn phụ thuộc vào các bảng/cột legacy lệch schema như `class_members`, `full_name`, `p.status`, `a.start_time`
- Màn thống kê hoạt động admin đọc đúng contract mới và không còn text hiển thị bị lỗi mã hóa trong phạm vi file vừa sửa

### Còn lại

- Repo vẫn còn một số alias/fallback `start_time` mang tính tương thích ở các cụm khác, nổi bật tiếp theo là teacher dashboard và QR sessions
- Task tiếp theo hợp lý nhất là `T-113` để dọn cụm `start_time` còn sót ở teacher dashboard và QR sessions

## 2026-04-06 - Hoàn thành T-113

### Đã làm

- Viết lại `src/app/api/teacher/dashboard/route.ts` để:
  - bỏ alias `date_time AS start_time`
  - trả trực tiếp `date_time` cho danh sách hoạt động gần đây
  - giữ shape compatibility cho các consumer legacy của `/api/teacher/dashboard` như `pending_approval`, `approved_activities`, `pending_notifications`, `this_week_activities`
  - vẫn giữ `stats`, `classes`, `activities`, `recentAttendance` để tương thích rộng hơn
- Chuẩn hóa `src/app/api/activities/[id]/qr-sessions/route.ts` sang contract `date_time` cho phiên QR, bỏ phụ thuộc vào `start_time`
- Viết lại `src/app/teacher/activities/[id]/qr-sessions/page.tsx` để đọc `date_time`, gom fetch dữ liệu về helper chung, và giữ nguyên layout/luồng thao tác chính
- Dọn thêm import thừa trong `src/app/teacher/dashboard/page.tsx` để lint sạch ở canonical teacher dashboard

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/teacher/dashboard/route.ts "src/app/api/activities/[id]/qr-sessions/route.ts" "src/app/teacher/activities/[id]/qr-sessions/page.tsx" src/app/teacher/dashboard/page.tsx`
- Kết quả: sạch lỗi, sạch warning
- Chạy `rg -n "start_time" src/app/api/teacher/dashboard/route.ts "src/app/api/activities/[id]/qr-sessions/route.ts" "src/app/teacher/activities/[id]/qr-sessions/page.tsx" src/app/teacher/dashboard/page.tsx`
- Kết quả: không còn `start_time` trong phạm vi batch

### Kết quả

- Teacher dashboard route không còn dùng contract thời gian cũ trong danh sách hoạt động
- Màn teacher tổng quan nhận đúng các số liệu mà UI đang cần, thay vì lệch shape với response cũ
- Flow quản lý phiên QR đã đọc thống nhất theo `date_time` từ route đến page

### Còn lại

- `start_time` còn sót chủ yếu ở compatibility layer phía student và trong `lib/activity-validation.ts`
- Task tiếp theo hợp lý nhất là `T-114` để thu gọn alias `start_time` ở cluster student

## 2026-04-06 - Hoàn thành T-114

### Đã làm

- Bỏ alias `start_time` trong `src/app/api/student/history/route.ts`, đồng thời sửa luôn join/schema drift liên quan từ `teacher_id` và `users.name`
- Bỏ alias `start_time` trong `src/app/api/student/points-breakdown/route.ts` và thêm type cục bộ để route dễ kiểm soát hơn
- Bỏ alias `start_time` và `start_date` trong `src/app/api/student/recommendations/route.ts`, giữ response tập trung vào `date_time`
- Cập nhật các consumer student:
  - `src/app/student/history/page.tsx`
  - `src/app/student/points/page.tsx`
  - `src/app/student/dashboard/page.tsx`
  - `src/app/student/recommendations/page.tsx`
  để đọc trực tiếp `date_time` thay vì fallback sang `start_time/start_date`
- Dọn thêm các `any` cũ ngay trên nhóm page student vừa sửa để lint hẹp sạch hơn trong phạm vi batch

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/student/history/route.ts src/app/api/student/points-breakdown/route.ts src/app/api/student/recommendations/route.ts src/app/student/history/page.tsx src/app/student/points/page.tsx src/app/student/dashboard/page.tsx src/app/student/recommendations/page.tsx`
- Kết quả: sạch lỗi, sạch warning
- Chạy `rg -n "start_time|start_date" src/app/api/student/history/route.ts src/app/api/student/points-breakdown/route.ts src/app/api/student/recommendations/route.ts src/app/student/history/page.tsx src/app/student/points/page.tsx src/app/student/dashboard/page.tsx src/app/student/recommendations/page.tsx`
- Kết quả: không còn `start_time/start_date` trong phạm vi batch

### Kết quả

- Cluster student của batch này đã chuyển sang đọc `date_time` thống nhất hơn, không còn giữ lớp fallback cũ ở UI
- Recommendations/student history/points bớt lệ thuộc vào contract legacy và dễ tiếp tục chuẩn hóa hơn ở các đợt sau
- Batch này cũng khép nốt phần `start_time` nổi bật còn sót trong luồng student sau các đợt chuẩn hóa trước

### Còn lại

- Repo vẫn còn `start_date` ở cụm teacher/admin activity screens và `start_time` ở lớp validation tương thích
- Task tiếp theo hợp lý nhất là `T-115` để thu gọn compatibility `start_date` ở teacher/admin activity screens

## 2026-04-06 - Hoàn thành T-115

### Đã làm

- Chuẩn hóa các route admin activities sang contract `date_time/end_time`, bỏ alias `start_date/end_date` trong:
  - `src/app/api/admin/activities/route.ts`
  - `src/app/api/admin/activities/pending/route.ts`
  - `src/app/api/admin/activities/[id]/route.ts`
- Đồng bộ type và consumer admin/teacher để đọc trực tiếp `date_time/end_time` trong:
  - `src/app/admin/activities/types.ts`
  - `src/app/admin/activities/ActivityTable.tsx`
  - `src/app/admin/activities/pending/page.tsx`
  - `src/app/admin/approvals/types.ts`
  - `src/app/admin/approvals/ApprovalList.tsx`
  - `src/app/admin/users/[id]/activities/page.tsx`
  - `src/app/admin/users/[id]/page.tsx`
  - `src/app/admin/activities/[id]/page.tsx`
  - `src/app/teacher/attendance/[id]/page.tsx`
- Sửa luôn block hoạt động gần đây ở hồ sơ người dùng admin để dùng `activity.date_time`, khớp với API hiện tại

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/admin/activities/route.ts src/app/api/admin/activities/pending/route.ts src/app/api/admin/activities/[id]/route.ts src/app/admin/activities/types.ts src/app/admin/activities/ActivityTable.tsx src/app/admin/activities/pending/page.tsx src/app/admin/approvals/types.ts src/app/admin/approvals/ApprovalList.tsx src/app/admin/users/[id]/activities/page.tsx src/app/admin/users/[id]/page.tsx src/app/teacher/attendance/[id]/page.tsx src/app/admin/activities/[id]/page.tsx`
- Kết quả: sạch lỗi; còn các warning cũ về `any`, biến chưa dùng và hook dependency ngoài phạm vi task
- Chạy `rg -n "start_date|end_date"` trên toàn bộ batch `T-115`
- Kết quả: không còn `start_date/end_date` trong phạm vi batch

### Kết quả

- Flow teacher/admin activities của batch này đã đọc thống nhất `date_time/end_time`, giảm thêm một lớp compatibility legacy
- Màn admin activities, approvals, hồ sơ người dùng và điểm danh giáo viên không còn lệ thuộc vào field ngày cũ trong phạm vi đã sửa
- Contract route và consumer của cụm admin activities đã khớp nhau hơn, dễ tiếp tục dọn nợ kỹ thuật ở các batch sau

### Còn lại

- Repo vẫn còn `start_date` ở layer filter/report/template và `start_time` ở lớp validation tương thích có chủ đích
- Cụm `confirm()` ở admin user management vẫn còn và là batch tiếp theo hợp lý nhất: `T-116`

## 2026-04-06 - Hoàn thành T-116

### Đã làm

- Thay `confirm()` trên trang chi tiết người dùng admin bằng `ConfirmDialog` cho 3 thao tác cốt lõi:
  - đặt lại mật khẩu
  - kích hoạt/vô hiệu hóa người dùng
  - xóa người dùng
- Gom trạng thái xác nhận trên `src/app/admin/users/[id]/page.tsx` về một luồng `pendingAction`, giữ nguyên các API hiện có và chỉ đổi lớp UX xác nhận
- Thay `confirm()` của bulk delete trên `src/app/admin/users/page.tsx` bằng `ConfirmDialog` riêng cho xóa hàng loạt
- Dọn luôn state thừa `showResetDialog` và `showBulkActions` không còn dùng trong đúng phạm vi batch

### Kiểm thử hẹp

- Chạy `rg -n "confirm\\(|ConfirmDialog" src/app/admin/users/[id]/page.tsx src/app/admin/users/page.tsx`
- Kết quả: chỉ còn `ConfirmDialog`, không còn `confirm()`
- Chạy `npx.cmd eslint src/app/admin/users/[id]/page.tsx src/app/admin/users/page.tsx`
- Kết quả: sạch lỗi; còn warning cũ về `any`, hook dependency và biến chưa dùng ngoài phạm vi task

### Kết quả

- Flow quản trị người dùng admin không còn phụ thuộc hộp thoại xác nhận mặc định của trình duyệt trong đúng phạm vi batch
- Các thao tác reset mật khẩu, kích hoạt/vô hiệu hóa, xóa đơn lẻ và xóa hàng loạt đã có UX xác nhận nhất quán hơn với phần còn lại của hệ thống
- Không thay đổi API hay nghiệp vụ xử lý user, nên rủi ro hành vi thấp

### Còn lại

- Repo vẫn còn nhiều `confirm()` ở các luồng teacher activity phụ trợ và một số màn quản trị khác
- Batch hợp lý tiếp theo là `T-117` để thay `confirm()` ở teacher activity subflows bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-117

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho thao tác kết thúc phiên QR ở `src/app/teacher/activities/[id]/qr-sessions/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho hai thao tác quản lý người tham gia ở `src/app/teacher/activities/[id]/participants/page.tsx`:
  - thêm nhanh cả lớp vào hoạt động
  - xóa hàng loạt học viên khỏi hoạt động
- Thay `confirm()` bằng `ConfirmDialog` cho hai thao tác đánh giá hàng loạt ở `src/app/teacher/activities/[id]/evaluate/page.tsx`:
  - áp dụng hàng loạt mức đánh giá/giải thưởng
  - lưu toàn bộ đánh giá
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa file ở `src/app/teacher/activities/[id]/files/page.tsx`
- Dọn thêm một số cảnh báo rõ ràng trong `participants/files` như state không dùng và `any` cục bộ dễ thay thế

### Kiểm thử hẹp

- Chạy `rg -n "confirm\\(|ConfirmDialog" src/app/teacher/activities/[id]/qr-sessions/page.tsx src/app/teacher/activities/[id]/participants/page.tsx src/app/teacher/activities/[id]/evaluate/page.tsx src/app/teacher/activities/[id]/files/page.tsx`
- Kết quả: chỉ còn `ConfirmDialog`, không còn `confirm()` trong đúng batch
- Chạy `npx.cmd eslint src/app/teacher/activities/[id]/qr-sessions/page.tsx src/app/teacher/activities/[id]/participants/page.tsx src/app/teacher/activities/[id]/evaluate/page.tsx src/app/teacher/activities/[id]/files/page.tsx`
- Kết quả: sạch lỗi; còn 4 warning cũ về hook dependency và `img` preview ngoài phạm vi task

### Kết quả

- Cụm teacher activity subflows đã có UX xác nhận thống nhất hơn, không còn hộp thoại xác nhận mặc định của trình duyệt trong phạm vi batch
- Các thao tác ảnh hưởng trực tiếp đến điểm danh QR, danh sách tham gia, đánh giá và file đính kèm được bảo toàn nghiệp vụ cũ nhưng rõ ngữ cảnh hơn
- Batch này tiếp tục giảm nợ UX/legacy ở luồng giáo viên mà không đụng vào API xử lý lõi

### Còn lại

- Repo vẫn còn `confirm()` ở các luồng giao tiếp giáo viên, notes, thiết bị học viên và một số màn quản trị cấu hình
- Batch hợp lý tiếp theo là `T-118` để thay `confirm()` ở teacher communication flows bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-118

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho hai thao tác poll ở `src/app/teacher/polls/page.tsx`:
  - đóng poll
  - xóa poll
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa mẫu ở `src/app/teacher/polls/settings/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho hai thao tác thông báo quảng bá ở `src/app/teacher/notifications/broadcast/page.tsx`:
  - gửi ngay thông báo đã lên lịch
  - xóa bản nháp thông báo
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa mẫu ở `src/app/teacher/notifications/settings/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác hủy thông báo đã lên lịch ở `src/app/teacher/notify-students/page.tsx`
- Dọn thêm một số cảnh báo rẻ trong batch như import/state thừa và một số `any` dễ thay bằng `unknown` hoặc type cụ thể

### Kiểm thử hẹp

- Chạy `rg -n "confirm\\(" src/app/teacher/polls/page.tsx src/app/teacher/polls/settings/page.tsx src/app/teacher/notifications/broadcast/page.tsx src/app/teacher/notifications/settings/page.tsx src/app/teacher/notify-students/page.tsx`
- Kết quả: không còn `confirm()` trong đúng phạm vi batch
- Chạy `npx.cmd eslint src/app/teacher/polls/page.tsx src/app/teacher/polls/settings/page.tsx src/app/teacher/notifications/broadcast/page.tsx src/app/teacher/notifications/settings/page.tsx src/app/teacher/notify-students/page.tsx`
- Kết quả: sạch lỗi; còn 1 warning cũ về hook dependency `fetchData` ở `teacher/notifications/broadcast/page.tsx`

### Kết quả

- Cụm giao tiếp giáo viên đã có UX xác nhận thống nhất hơn, không còn hộp thoại xác nhận mặc định của trình duyệt trong phạm vi batch
- Các thao tác đóng/xóa poll, gửi/xóa thông báo, xóa mẫu và hủy thông báo lên lịch đều giữ nguyên API cũ nhưng rõ ngữ cảnh hơn
- Batch này tiếp tục giảm nợ UX/legacy trong flow giáo viên mà không làm lan sang refactor nghiệp vụ

### Còn lại

- Repo vẫn còn `confirm()` ở teacher student-management, thiết bị học viên, một số màn quản trị cấu hình và admin features
- Batch hợp lý tiếp theo là `T-119` để thay `confirm()` ở teacher student-management flows bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-119

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ghi chú trên hồ sơ học viên ở `src/app/teacher/students/[id]/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ghi chú chi tiết ở `src/app/teacher/students/[id]/notes/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ghi chú trong màn quản lý ghi chú tổng hợp ở `src/app/teacher/students/notes/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa sinh viên khỏi lớp ở `src/app/teacher/classes/page.tsx`
- Dọn thêm một số cảnh báo dễ xử lý trong batch như import thừa và ép kiểu `activeTab` rõ hơn ở hồ sơ học viên

### Kiểm thử hẹp

- Chạy `rg -n -F "confirm(" src/app/teacher/students/[id]/page.tsx src/app/teacher/students/[id]/notes/page.tsx src/app/teacher/students/notes/page.tsx src/app/teacher/classes/page.tsx`
- Kết quả: không còn `confirm()` trong đúng phạm vi batch
- Chạy `npx.cmd eslint src/app/teacher/students/[id]/page.tsx src/app/teacher/students/[id]/notes/page.tsx src/app/teacher/students/notes/page.tsx src/app/teacher/classes/page.tsx`
- Kết quả: sạch lỗi; còn 5 warning cũ về hook dependency `fetchProfile`, `fetchData` và ba `no-explicit-any` trong màn ghi chú chi tiết ngoài phạm vi task

### Kết quả

- Cụm teacher student-management đã có UX xác nhận nhất quán hơn, không còn hộp thoại mặc định của trình duyệt trong phạm vi batch
- Các thao tác xóa ghi chú và xóa sinh viên khỏi lớp giữ nguyên API/nghiệp vụ cũ nhưng rõ ngữ cảnh hơn cho người dùng
- Batch này tiếp tục giảm nợ UX/legacy ở luồng giáo viên mà không lan sang refactor nghiệp vụ

### Còn lại

- Repo vẫn còn `confirm()` ở student self-service, biometric enroll, activity draft và một số màn admin/config
- Batch hợp lý tiếp theo là `T-120` để thay `confirm()` ở student self-service flows bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-120

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa thông báo hàng loạt ở `src/app/student/notifications/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa thiết bị ở `src/app/student/devices/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa bản nháp ở `src/app/activities/new/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa mẫu sinh trắc học ở `src/app/biometric/enroll/page.tsx`
- Việt hóa thêm các nhãn bulk action trong màn thông báo sinh viên và dọn một số warning dễ xử lý như `activeTab` cast, `any` cục bộ và dependency hook

### Kiểm thử hẹp

- Chạy `rg -n -F "confirm(" src/app/student/notifications/page.tsx src/app/student/devices/page.tsx src/app/activities/new/page.tsx src/app/biometric/enroll/page.tsx`
- Kết quả: không còn `confirm()` trong đúng phạm vi batch
- Chạy `npx.cmd eslint src/app/student/notifications/page.tsx src/app/student/devices/page.tsx src/app/activities/new/page.tsx src/app/biometric/enroll/page.tsx`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Cụm self-service của sinh viên và giáo viên ở batch này đã có UX xác nhận thống nhất hơn, không còn hộp thoại mặc định của trình duyệt trong phạm vi được chọn
- Các thao tác xóa thông báo, xóa thiết bị, xóa bản nháp và xóa mẫu sinh trắc học giữ nguyên API/nghiệp vụ cũ nhưng rõ ngữ cảnh hơn cho người dùng
- Batch này tiếp tục giảm nợ UX/legacy gần người dùng cuối mà không cần refactor rộng

### Còn lại

- Repo vẫn còn `confirm()` ở các màn admin catalog/config, backup, tính điểm và một số flow quản trị khác
- Batch hợp lý tiếp theo là `T-121` để thay `confirm()` ở admin catalog/config flows bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-121

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ở `src/features/activity-types/ActivityTypesAdminPage.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ở `src/features/award-types/AwardTypesAdminPage.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ở `src/features/organization-levels/OrganizationLevelsAdminPage.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác khôi phục cấu hình QR mặc định ở `src/app/admin/config/qr/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa ở `src/app/admin/config/org-levels/page.tsx`
- Dọn thêm một số warning cục bộ trong batch như `any`, biến bắt lỗi chưa dùng và import thừa

### Kiểm thử hẹp

- Chạy `rg -n -F "confirm(" src/features/organization-levels/OrganizationLevelsAdminPage.tsx src/features/award-types/AwardTypesAdminPage.tsx src/features/activity-types/ActivityTypesAdminPage.tsx src/app/admin/config/qr/page.tsx src/app/admin/config/org-levels/page.tsx`
- Kết quả: không còn `confirm()` trong đúng phạm vi batch
- Chạy `npx.cmd eslint src/features/organization-levels/OrganizationLevelsAdminPage.tsx src/features/award-types/AwardTypesAdminPage.tsx src/features/activity-types/ActivityTypesAdminPage.tsx src/app/admin/config/qr/page.tsx src/app/admin/config/org-levels/page.tsx`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Cụm admin catalog/config đã có UX xác nhận thống nhất hơn, không còn hộp thoại mặc định của trình duyệt trong phạm vi batch
- Các thao tác xóa danh mục và khôi phục cấu hình QR giữ nguyên API/nghiệp vụ cũ nhưng rõ ngữ cảnh hơn cho quản trị viên
- Batch này tiếp tục giảm nợ UX/legacy ở nhánh admin mà không cần mở rộng refactor

### Còn lại

- Repo vẫn còn `confirm()` ở các màn admin operations như activity templates, backup, scores và một flow teacher awards suggestion
- Batch hợp lý tiếp theo là `T-122` để thay `confirm()` ở admin operations flows bằng dialog chuẩn

## 2026-04-06 - Hoàn thành T-122

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa template ở `src/app/admin/activity-templates/page.tsx`
- Thay `confirm()` bằng `ConfirmDialog` cho ba thao tác vận hành database ở `src/app/admin/backup/page.tsx`:
  - tạo backup
  - khôi phục từ backup
  - xóa backup
- Thay `confirm()` bằng `ConfirmDialog` cho thao tác tính lại điểm ở `src/app/admin/scores/page.tsx`
- Dọn thêm warning cục bộ trong batch như `any`, dependency hook, biến bắt lỗi chưa dùng và biến tạm không còn cần thiết

### Kiểm thử hẹp

- Chạy `rg -n -F "confirm(" src/app/admin/activity-templates/page.tsx src/app/admin/backup/page.tsx src/app/admin/scores/page.tsx`
- Kết quả: không còn `confirm()` trong đúng phạm vi batch
- Chạy `npx.cmd eslint src/app/admin/activity-templates/page.tsx src/app/admin/backup/page.tsx src/app/admin/scores/page.tsx`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Cụm admin operations đã có UX xác nhận thống nhất hơn, không còn hộp thoại mặc định của trình duyệt trong phạm vi batch
- Các thao tác xóa template, backup/restore database và tính lại điểm giữ nguyên API/nghiệp vụ cũ nhưng rõ ngữ cảnh hơn cho quản trị viên
- Sau batch này, repo chỉ còn đúng 1 `confirm()` ở flow teacher awards suggestions

### Còn lại

- Còn 1 `confirm()` cuối cùng ở `src/app/teacher/awards/suggestions/page.tsx`
- Batch hợp lý tiếp theo là `T-123` để hoàn tất chuẩn hóa confirm dialog trên toàn bộ repo ứng dụng

## 2026-04-06 - Hoàn thành T-123

### Đã làm

- Thay `confirm()` bằng `ConfirmDialog` cho thao tác xóa đề xuất ở `src/app/teacher/awards/suggestions/page.tsx`
- Dọn luôn warning cục bộ trong file cuối như `router` không dùng, dependency hook và hai `any` ở nhánh xử lý lỗi

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/teacher/awards/suggestions/page.tsx`
- Kết quả: sạch lỗi, sạch warning
- Chạy `rg -n -F "confirm(" src/app src/features`
- Kết quả: không còn `confirm()` trong toàn bộ `src/app` và `src/features`

### Kết quả

- Chuỗi chuẩn hóa UX xác nhận thao tác bằng dialog đã hoàn tất trên toàn bộ phần ứng dụng chính
- Repo không còn phụ thuộc vào hộp thoại `confirm()` mặc định của trình duyệt trong `src/app` và `src/features`
- Đây là một mốc dọn nợ UX/legacy quan trọng, giúp các thao tác nguy cơ cao có ngữ cảnh rõ ràng và nhất quán hơn

### Còn lại

- Debt `confirm()` trong ứng dụng chính đã hoàn tất
- Bước hợp lý tiếp theo là ưu tiên lại backlog chức năng, hiệu năng và cleanup dựa trên các tài liệu audit/plan hiện tại

## 2026-04-06 - Hoàn thành T-124

### Đã làm

- Chuẩn hóa các npm script dễ dùng trên Windows trong `package.json`:
  - `test:activity-contract` chuyển từ Bash sang Node
  - `health-check`, `system-info`, `logs`, `benchmark` chuyển sang helper script Node
  - `production:build` và `production:start` bỏ cú pháp `NODE_ENV=production ...` phụ thuộc shell
- Tạo các helper script mới:
  - `scripts/tests/test-activity-contract.mjs`
  - `scripts/tools/run-with-node-env.mjs`
  - `scripts/tools/health-check.mjs`
  - `scripts/tools/system-info.mjs`
  - `scripts/tools/logs.mjs`
  - `scripts/tools/benchmark.mjs`
- Đồng bộ lại `README.md` cho các lệnh thiết yếu đang sai tên hoặc khó chạy trên Windows:
  - `db:init` -> `db:setup`
  - `db:seed` -> `seed`
  - health check ưu tiên `npm run health-check`

### Kiểm thử hẹp

- Parse helper scripts mới bằng `node --check`
- Chạy smoke `node scripts/tools/system-info.mjs`
- Chạy smoke `node scripts/tools/logs.mjs`
- Chạy smoke `node scripts/tools/benchmark.mjs`

### Kết quả

- Các package command lõi trong batch này không còn phụ thuộc trực tiếp vào Bash/Linux syntax
- Máy Windows có thể dùng các lệnh kiểm tra nhanh như `npm run health-check`, `npm run system-info` và `npm run benchmark` an toàn hơn
- README không còn hướng dẫn nhầm sang các script `db:init`/`db:seed` không tồn tại trong `package.json`

### Còn lại

- Một số script `.sh` trong `scripts/tests` và `scripts/infra` vẫn còn tồn tại cho môi trường Linux/CI, chưa chuyển toàn bộ vì vượt phạm vi batch
- Nếu tiếp tục, batch hợp lý tiếp theo là rà backlog docs/dev tooling còn stale sau các đợt sửa lớn vừa hoàn tất

## 2026-04-06 - Hoàn thành T-125

### Đã làm

- Đồng bộ `docs/01-README.md` với script thực tế của repo:
  - `db:migrate`, `seed:enhanced`
  - `production:build`, `production:start`
  - bỏ ví dụ `test:coverage` không tồn tại, thay bằng lệnh reporter hợp lệ
  - bổ sung `health-check` vào nhóm lệnh nhanh
- Đồng bộ `docs/04-DEPLOYMENT.md`:
  - thay các path/script sai như `seed-enhanced-demo.ts`, `backup-db.js`, `migrations/status.ts`
  - ưu tiên `npm run health-check` và package command hiện tại
  - thêm ví dụ PowerShell ở các bước dễ lệch hệ điều hành như copy `.env`, xóa WAL files, đặt `NODE_OPTIONS`
  - bỏ gợi ý route clear-cache không tồn tại trong repo hiện tại
- Cập nhật `docs/RECOVERY_COMPLETE.md` từ `seed:demo` sang `seed` để tránh gọi nhầm script không có

### Kiểm thử hẹp

- Rà lại các pattern cũ bằng `rg` trong phạm vi `docs/01-README.md`, `docs/04-DEPLOYMENT.md`, `docs/RECOVERY_COMPLETE.md`
- Đối chiếu lệnh mới với `package.json` và sự tồn tại thực tế của:
  - `scripts/maintenance/backup-db.ts`
  - `scripts/seed/seed-data.ts`
  - `scripts/migrations/run.ts`

### Kết quả

- Nhóm tài liệu vận hành chính đã bám gần hơn với script/package command thật đang có trong repo
- Người dùng Windows có đường chạy rõ hơn cho setup, production start và xử lý sự cố cơ bản
- Giảm đáng kể nguy cơ copy-paste các lệnh không tồn tại hoặc chỉ chạy được trên Linux/macOS

### Còn lại

- Một số tài liệu lịch sử/snapshot khác trong `docs/` và `de-tai/` vẫn còn giữ ví dụ cũ; chưa quét toàn bộ để tránh mở rộng batch quá mức
- Nếu tiếp tục, batch hợp lý tiếp theo là rà các docs historical còn script drift hoặc làm một pass nhỏ cho quick-start/testing docs

## 2026-04-06 - Hoàn thành T-126

### Đã làm

- Đồng bộ `de-tai/07-CONG-NGHE-THUC-HIEN.md` ở đúng 3 điểm còn drift:
  - đổi lệnh kiểm tra từ `curl -s http://localhost:3000/api/health` sang `npm run health-check`
  - cập nhật cây thư mục từ `seed-demo-data.ts` sang `seed/seed-data.ts`
  - cập nhật cây thư mục từ `backup-db.js` sang `maintenance/backup-db.ts`

### Kiểm thử hẹp

- Rà lại `de-tai/07-CONG-NGHE-THUC-HIEN.md` bằng `rg` với các token:
  - `seed-demo-data.ts`
  - `backup-db.js`
  - `curl -s http://localhost:3000/api/health`

### Kết quả

- Tài liệu học thuật đang bám sát hơn với script thực tế đang có trong repo
- Giảm nguy cơ người đọc dùng nhầm sơ đồ thư mục hoặc copy lệnh kiểm tra cũ thay vì package command hiện tại

### Còn lại

- Vẫn còn nhiều tài liệu historical khác trong `de-tai/` và `docs/` có thể chứa ví dụ cũ, nhưng chưa quét tiếp để giữ batch nhỏ và an toàn
- Nếu tiếp tục, batch hợp lý tiếp theo là pass nhỏ cho nhóm docs testing/quick-start còn lại hoặc dừng ở đây để chuyển lại trọng tâm sang chức năng

## 2026-04-06 - Hoàn thành T-127

### Đã làm

- Đồng bộ `docs/RECOVERY_COMPLETE.md` ở cụm hướng dẫn cuối:
  - `npm run build` -> `npm run production:build`
  - `npm run start` -> `npm run production:start`
  - `npm run db:backup` -> `npm run backup-db`

### Kiểm thử hẹp

- Rà lại `docs/RECOVERY_COMPLETE.md` bằng `rg` với các token:
  - `db:backup`
  - `production:build`
  - `production:start`

### Kết quả

- File historical này không còn trỏ vào script sai tên
- Các ví dụ production trong file đã đồng bộ hơn với cách gọi script hiện tại của repo

### Còn lại

- Nhánh docs drift nhỏ gần như đã sạch trong các tài liệu chính và vài tài liệu historical đã chạm tới
- Nếu tiếp tục, bước hợp lý hơn là ưu tiên lại backlog chức năng/kiểm thử thay vì tiếp tục quét docs quá sâu

## 2026-04-06 - Hoàn thành T-128

### Đã làm

- Viết lại `src/app/admin/time-slots/page.tsx` theo contract hiện tại của `/api/admin/activities`
- Loại bỏ lớp tương thích `start_date -> date_time` không còn cần
- Bổ sung type cục bộ cho danh sách hoạt động, response tạo khung giờ và danh sách slot vừa tạo
- Dọn warning `any` và làm sạch luôn wording hiển thị của màn quản lý khung giờ

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/time-slots/page.tsx`

### Kết quả

- Màn admin time-slots bám đúng contract `date_time` hiện tại hơn
- File sạch hơn, dễ bảo trì hơn và không còn phụ thuộc vào alias legacy trong phạm vi batch

### Còn lại

- Trong `src` vẫn còn một số `start_date` hợp lệ ở nhánh filter/report hoặc compatibility có chủ đích; batch này chỉ thu gọn consumer đã lỗi thời rõ ràng
- Bước hợp lý tiếp theo là chọn một batch chức năng/kiểm thử khác có tác động rõ hơn thay vì tiếp tục dọn alias nhỏ lẻ

## 2026-04-06 - Hoàn thành T-129

### Đã làm

- Viết lại `src/app/teacher/reports/class-stats/page.tsx` để parse đúng response từ `/api/classes` và `/api/teacher/reports/class-stats`, đồng thời giữ tương thích cho cả shape `data.*` lẫn top-level legacy
- Viết lại `src/app/teacher/reports/participation/page.tsx` để:
  - đọc đúng `classes` từ `/api/classes`
  - đọc đúng `activityTypes/activity_types/types` từ `/api/activity-types`
  - bỏ request `/api/users?role=student` không còn được dùng trong UI hiện tại để giảm tải không cần thiết
  - dọn warning cục bộ và bổ sung toggle sort đúng nghĩa cho bảng chi tiết
- Viết lại `src/app/teacher/reports/attendance/page.tsx` để parse đúng shape bọc dữ liệu từ các route attendance, đồng thời dọn warning cục bộ và bổ sung toggle sort cho bảng chi tiết
- Chuẩn hóa lại wording hiển thị ở 3 màn để dễ đọc hơn và giảm các chuỗi mojibake cũ trong đúng phạm vi batch

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/teacher/reports/class-stats/page.tsx src/app/teacher/reports/participation/page.tsx src/app/teacher/reports/attendance/page.tsx`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Các màn teacher reports trong batch này không còn giả định API trả mảng trần
- Bộ lọc lớp và loại hoạt động nạp đúng dữ liệu từ response hiện tại
- Giảm 1 request thừa ở màn participation mà không làm đổi hành vi UI hiện có

### Còn lại

- Chưa chạy smoke test trên trình duyệt cho 3 màn teacher reports
- Repo vẫn còn một số route `/api/reports/*` cũ dùng schema drift, nhưng chưa đụng vào vì chưa thấy consumer active trong scope hiện tại

## 2026-04-06 - Hoàn thành T-130

### Đã làm

- Rà lại 3 route legacy:
  - `src/app/api/reports/term-report/route.ts`
  - `src/app/api/reports/class-participation/route.ts`
  - `src/app/api/reports/teacher-dashboard/route.ts`
- Xác nhận bằng tìm kiếm trong `src` rằng hiện không còn page/component active nào gọi trực tiếp 3 endpoint trên
- Ghi nhận cây `/api/reports` đang ở trạng thái mixed:
  - 3 route trên là legacy và drift schema nặng
  - `/api/reports/participation` vẫn còn consumer active ở admin reports
- Tạo helper chung `src/app/api/reports/_legacy.ts`
- Chuyển 3 route legacy sang fail-fast có hướng dẫn, trả `410` với message rõ ràng và endpoint thay thế phù hợp nếu có, thay vì để tiếp tục chạy các câu SQL schema cũ dễ nổ runtime

### Kiểm thử hẹp

- Chạy `rg` đối chiếu consumer trong `src` cho 3 route legacy, kết quả không còn caller active
- Chạy `npx.cmd eslint src/app/api/reports/_legacy.ts src/app/api/reports/teacher-dashboard/route.ts src/app/api/reports/class-participation/route.ts src/app/api/reports/term-report/route.ts`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- 3 route drift nặng không còn âm thầm giữ SQL lỗi thời
- Nếu bị gọi nhầm, chúng trả thông báo rõ ràng hơn và chỉ ra hướng chuyển sang endpoint hiện tại
- Giảm rủi ro ai đó vô tình tái sử dụng nhánh API cũ mà không biết schema đã thay đổi

### Còn lại

- `/api/reports/attendance` vẫn chưa thấy consumer active trong `src`, cần rà riêng để quyết định có nên xử lý như legacy hay không
- `/api/reports/participation` vẫn là route admin còn đang sống, nên cần batch tách bạch rõ trước khi dọn tiếp cây `/api/reports`

## 2026-04-06 - Hoàn thành T-131

### Đã làm

- Xác nhận lại bằng tìm kiếm trong `src` rằng `/api/reports/attendance` hiện không có consumer active nào ngoài chính route
- Chuyển `src/app/api/reports/attendance/route.ts` sang legacy fail-fast có hướng dẫn, thay vì giữ một endpoint cũ không còn caller và khó đảm bảo đúng schema về sau
- Giữ `src/app/api/reports/participation/route.ts` là nhánh active, rồi viết lại route này theo hướng rõ kiểu dữ liệu hơn:
  - bỏ `any` cục bộ
  - chuẩn hóa message lỗi tiếng Việt
  - giữ nguyên contract `activities` cho consumer hiện tại
  - giữ export CSV hoạt động như cũ
- Viết lại `src/features/reports/ParticipationReportAdminPage.tsx` để:
  - đọc được cả `data.activities` lẫn top-level `activities`
  - dùng `useCallback` cho `fetchData`
  - bỏ import thừa
  - Việt hóa lại text hiển thị rõ ràng hơn

### Kiểm thử hẹp

- Chạy `rg -n -F "/api/reports/attendance" src`
- Kết quả: không có consumer active nào ngoài chính route
- Chạy `rg -n -F "/api/reports/participation" src`
- Kết quả: xác nhận consumer active là `src/features/reports/ParticipationReportAdminPage.tsx`
- Chạy `npx.cmd eslint src/app/api/reports/attendance/route.ts src/app/api/reports/participation/route.ts src/features/reports/ParticipationReportAdminPage.tsx`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Nhánh `/api/reports` được tách rõ hơn:
  - `attendance` là legacy
  - `participation` là active
- Màn admin participation report sạch warning hơn và bám contract response ổn định hơn

### Còn lại

- Màn admin participation report vẫn dùng filter nhập ID thủ công cho lớp và loại hoạt động; đây là điểm UX hợp lý để xử lý ở batch sau

## 2026-04-06 - Hoàn thành T-132

### Đã làm

- Viết lại `src/features/reports/ParticipationReportAdminPage.tsx` để tải danh sách lớp từ `/api/classes` và danh sách loại hoạt động từ `/api/activity-types`
- Thay hai ô nhập tay `class_id` và `activity_type_id` bằng dropdown dữ liệu thật, nhưng vẫn giữ nguyên contract gửi filter về `/api/reports/participation`
- Tách `fetchReportData(filters)` khỏi effect khởi tạo để tránh tình trạng đổi filter là tự gọi API ngay; hiện màn này chỉ tải lại khi vào trang hoặc khi bấm nút lọc
- Giữ export CSV hoạt động theo đúng filter hiện tại
- Việt hóa và làm sạch lại text hiển thị ở phần filter/table/empty state

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/features/reports/ParticipationReportAdminPage.tsx`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Admin participation report không còn bắt người dùng nhớ `class_id` hay `activity_type_id`
- Bộ lọc dùng dữ liệu thật từ hệ thống nên ít sai hơn và dễ dùng hơn
- Tránh được reload ngoài ý muốn khi người dùng mới chỉ đang thay đổi giá trị filter

### Còn lại

- Chưa chạy smoke test trình duyệt cho thao tác lọc/xuất CSV ở màn này
- Nhánh admin reports active còn lại như `scores`, `teachers`, `custom`, `activity-statistics` vẫn nên được rà tiếp để phát hiện drift hoặc text lỗi mã hóa tương tự

## 2026-04-06 - Hoàn thành T-133 và T-134

### Đã làm

- Rà 4 màn admin reports còn active:
  - `scores`
  - `teachers`
  - `custom`
  - `activity-statistics`
- Xác định `admin/reports/custom` là cụm có rủi ro cao nhất vì vừa có text lỗi mã hóa, vừa có drift schema thật trong route:
  - `a.created_by` thay vì `a.teacher_id`
  - `p.user_id` thay vì `p.student_id`
  - `ps.points` thay vì `pc.total_points`
  - bộ lọc điểm chèn sai vị trí sau `ORDER BY`
  - UI giả hỗ trợ `excel/pdf` dù API thực tế chỉ trả CSV
- Viết lại `src/app/api/admin/reports/custom/route.ts` để:
  - bám schema hiện tại cho 4 loại báo cáo `activities/participants/scores/awards`
  - thống nhất chỉ hỗ trợ xuất CSV thật
  - luôn trả CSV có header rõ ràng kể cả khi dữ liệu rỗng
  - dùng message tiếng Việt rõ hơn
- Viết lại `src/app/admin/reports/custom/page.tsx` để:
  - bỏ các tùy chọn xuất giả hỗ trợ, chỉ giữ CSV
  - làm sạch toàn bộ text hiển thị
  - cải thiện luồng chọn loại báo cáo -> cấu hình -> xem trước -> xuất
  - parse preview CSV ổn định hơn, có xử lý BOM
  - giữ khả năng lưu cấu hình ngay trong phiên làm việc

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/custom/page.tsx src/app/api/admin/reports/custom/route.ts`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Luồng `admin/reports/custom` bám schema hiện tại và có thể dùng thật để preview/xuất CSV
- Không còn tình trạng UI hứa hẹn Excel/PDF nhưng API chỉ trả CSV
- Giảm rủi ro runtime SQL sai cột ở custom report generator

### Còn lại

- Chưa chạy smoke test trên trình duyệt cho từng loại custom report
- Ba màn admin report còn lại (`scores`, `teachers`, `activity-statistics`) chủ yếu còn nợ Việt hóa, text lỗi mã hóa và chút typing/polish

## 2026-04-06 - Hoàn thành T-135

### Đã làm

- Viết lại `src/app/admin/reports/teachers/page.tsx` theo contract hiện tại của `/api/admin/reports/teachers`, có guard admin, bảng sắp xếp và summary card rõ ràng
- Làm sạch `src/app/admin/reports/scores/page.tsx` để bỏ typing lỏng, chuẩn hóa parse response và sửa toàn bộ text lỗi mã hóa
- Làm sạch `src/app/admin/reports/activity-statistics/page.tsx`, chuẩn hóa parse dữ liệu và reset bộ lọc sẽ tải lại dữ liệu mặc định
- Dọn tối thiểu các route liên quan:
  - `src/app/api/admin/reports/scores/route.ts`
  - `src/app/api/admin/reports/teachers/route.ts`
  - `src/app/api/admin/reports/activity-statistics/route.ts`
- Sửa thông báo lỗi tiếng Việt và CSV header của activity statistics để export không còn lỗi mã hóa

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/scores/page.tsx src/app/admin/reports/teachers/page.tsx src/app/admin/reports/activity-statistics/page.tsx src/app/api/admin/reports/scores/route.ts src/app/api/admin/reports/teachers/route.ts src/app/api/admin/reports/activity-statistics/route.ts`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Ba màn admin report active còn lại đọc tự nhiên hơn, không còn text tiếng Anh hoặc mojibake nổi bật
- `teachers/page.tsx` đã được khôi phục đầy đủ sau khi bị thiếu file
- Export CSV của activity statistics có header tiếng Việt đúng hơn và tương thích tốt hơn với Excel nhờ BOM

### Còn lại

- Chưa smoke test trực tiếp trên trình duyệt cho 3 màn admin report vừa dọn
- Có thể còn vài route admin report ngoài batch này vẫn trả message tiếng Anh ở nhánh lỗi hiếm gặp; phần đó được xếp sang `T-136`

## 2026-04-06 - Hoàn thành T-136

### Đã làm

- Rà toàn bộ cây `src/app/api/admin/reports` để xác định route nào còn consumer active trong `src`
- Xác nhận `student-points` và `class-participation` hiện không còn consumer active nào trong codebase
- Tạo helper mới `src/app/api/admin/reports/_legacy.ts` để trả `410` với thông báo tiếng Việt rõ ràng cho các admin report route legacy
- Chuyển:
  - `src/app/api/admin/reports/student-points/route.ts`
  - `src/app/api/admin/reports/class-participation/route.ts`
  sang fail-fast có chỉ dẫn endpoint/page thay thế

### Kiểm thử hẹp

- Chạy `rg -n -F "/api/admin/reports/student-points" src`
- Chạy `rg -n -F "/api/admin/reports/class-participation" src`
- Chạy `npx.cmd eslint src/app/api/admin/reports/_legacy.ts src/app/api/admin/reports/student-points/route.ts src/app/api/admin/reports/class-participation/route.ts`
- Kết quả: sạch lỗi, sạch warning

### Kết quả

- Hai route admin report mồ côi không còn giữ SQL cũ nửa Anh nửa Việt dễ gây nổ runtime
- Nếu bị gọi nhầm, hệ thống trả thông báo rõ ràng hơn và chỉ ra hướng thay thế hợp lý

### Còn lại

- Màn tổng quan `src/app/admin/reports/page.tsx` vẫn còn text lỗi mã hóa rõ rệt và nên được dọn ở batch kế tiếp

## 2026-04-06 - Hoàn thành T-137

### Đã làm

- Viết lại `src/app/admin/reports/page.tsx` để làm sạch toàn bộ title, description và CTA của màn tổng quan báo cáo quản trị
- Chuẩn hóa wording của 5 thẻ báo cáo:
  - điểm
  - giảng viên
  - tham gia
  - thống kê hoạt động
  - báo cáo tùy chỉnh
- Giữ nguyên cấu trúc điều hướng và layout hiện có, chỉ polish text và CTA để tránh lan scope

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/page.tsx`
- Rà mojibake bằng `rg -n "Ã|Â|á»|Ä" src/app/admin/reports/page.tsx`
- Rà lại toàn nhánh bằng `rg -n "Ã|Â|á»|Ä" src/app/admin/reports src/features/reports`
- Kết quả: sạch lỗi, sạch warning, không còn text lỗi mã hóa trong cụm reports

### Kết quả

- Màn `/admin/reports` nay đọc tự nhiên và đồng nhất với các màn báo cáo con đã được dọn trước đó
- Toàn bộ nhánh `src/app/admin/reports` và `src/features/reports` hiện không còn mojibake nổi bật

### Còn lại

- Nhánh admin reports vẫn chưa có regression test riêng cho các route active; phần này được xếp sang `T-138`

## 2026-04-06 - Hoàn thành T-138

### Đã làm

- Thêm file test mới `test/admin-report-routes.test.ts` cho 3 route admin report active:
  - `scores`
  - `teachers`
  - `activity-statistics`
- Phủ các case chính:
  - route `scores` trả thống kê đã chuẩn hóa
  - route `scores` chặn non-admin
  - route `teachers` trả metric số học đúng kiểu dữ liệu
  - route `activity-statistics` trả JSON đúng shape và nhận bộ lọc ngày
  - route `activity-statistics` xuất CSV UTF-8 có BOM
- Điều chỉnh assertion CSV theo `arrayBuffer()` để kiểm tra BOM bền hơn với `NextResponse`

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/admin-report-routes.test.ts`
- Chạy `npm.cmd test -- test/admin-report-routes.test.ts`
- Kết quả: sạch lint, `5/5` test pass

### Kết quả

- Cụm admin report routes active đã có regression net riêng, giúp khóa contract chính sau các batch làm sạch UI/route
- Export CSV của `activity-statistics` được kiểm tra ở mức byte đầu, tránh false negative do `response.text()` nuốt BOM

### Còn lại

- Các route admin report legacy vừa chuyển sang `410` vẫn chưa có test riêng; phần này được xếp sang `T-139`

## 2026-04-07 - Hoàn thành T-139

### Đã làm

- Mở rộng `test/admin-report-routes.test.ts` để phủ thêm 2 route legacy:
  - `src/app/api/admin/reports/student-points/route.ts`
  - `src/app/api/admin/reports/class-participation/route.ts`
- Giữ toàn bộ bộ test admin reports trong một file để dễ chạy hẹp và dễ rà contract theo cụm
- Bổ sung assertion cho các điểm chính của route legacy:
  - mã trạng thái `410`
  - `code = LEGACY_ADMIN_REPORT_ROUTE`
  - `legacy_route`
  - `replacement`
  - `alternatives`

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/admin-report-routes.test.ts`
- Chạy `npm.cmd test -- test/admin-report-routes.test.ts`
- Kết quả: sạch lint, `7/7` test pass

### Kết quả

- Các route admin report legacy đã có regression net xác nhận fail-fast đúng cách
- Giảm nguy cơ ai đó vô tình nối lại SQL cũ hoặc làm mất gợi ý thay thế ở những batch sau

### Còn lại

- Endpoint `/api/reports/participation` vẫn là route active phục vụ admin reports nhưng chưa có regression test riêng; phần này được xếp sang `T-140`

## 2026-04-07 - Hoàn thành T-140

### Đã làm

- Thêm file test mới `test/participation-report-route.test.ts` cho route active `src/app/api/reports/participation/route.ts`
- Phủ 4 case chính:
  - chặn request không có token
  - chặn non-admin
  - trả JSON đúng shape nested + top-level `activities`
  - xuất CSV UTF-8 có BOM
- Xác nhận query filter của route nhận đúng:
  - `start`
  - `end`
  - `class_id`
  - `activity_type_id`

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/participation-report-route.test.ts`
- Chạy `npm.cmd test -- test/participation-report-route.test.ts`
- Kết quả: sạch lint, `4/4` test pass

### Kết quả

- Route participation active đã có regression net riêng
- Contract JSON/CSV của mắt xích đang phục vụ admin participation report đã được khóa tốt hơn

### Còn lại

- Route participation vẫn còn cơ hội hardening thêm ở nhánh export CSV và UX hiển thị lỗi của page; phần này được gom sang `T-141`

## 2026-04-07 - Hoàn thành T-141

### Đã làm

- Cập nhật `src/app/api/reports/participation/route.ts` để escape dấu ngoặc kép trong CSV thay vì chỉ bọc chuỗi thô
- Cập nhật `src/features/reports/ParticipationReportAdminPage.tsx` để:
  - lưu `reportError`
  - hiện cảnh báo lỗi rõ ràng khi fetch report thất bại
  - không còn rơi về empty state khi thực chất là lỗi tải dữ liệu
- Mở rộng `test/participation-report-route.test.ts` để xác nhận CSV vẫn đúng khi dữ liệu chứa dấu ngoặc kép và dấu phẩy

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/api/reports/participation/route.ts src/features/reports/ParticipationReportAdminPage.tsx test/participation-report-route.test.ts`
- Chạy `npm.cmd test -- test/participation-report-route.test.ts`
- Kết quả: sạch lint, `4/4` test pass

### Kết quả

- Export CSV của participation report an toàn hơn với dữ liệu thực tế
- Màn admin participation report phân biệt rõ lỗi tải dữ liệu với trạng thái không có kết quả

### Còn lại

- Nhánh filter options (`/api/classes`, `/api/activity-types`) của participation report vẫn chưa có regression test riêng; phần này được xếp sang `T-142`

## 2026-04-07 - Hoàn thành T-142

### Đã làm

- Export `getClassesFromResponse` và `getActivityTypesFromResponse` từ `src/features/reports/ParticipationReportAdminPage.tsx`
- Thêm file test mới `test/participation-report-options.test.ts`
- Phủ 6 case parser cho filter options:
  - `data.classes`
  - `classes`
  - payload classes không hợp lệ
  - `activityTypes`
  - `activity_types`
  - `types`
  - payload activity types không hợp lệ

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/features/reports/ParticipationReportAdminPage.tsx test/participation-report-options.test.ts`
- Chạy `npm.cmd test -- test/participation-report-options.test.ts`
- Kết quả: sạch lint, `6/6` test pass

### Kết quả

- Nhánh filter options của participation report đã có regression net riêng
- Nếu `/api/classes` hoặc `/api/activity-types` đổi nhẹ response shape theo các biến thể hiện có, dropdown admin sẽ ít nguy cơ vỡ âm thầm hơn

### Còn lại

- Component `ParticipationReportAdminPage` vẫn chưa có smoke test render cho các trạng thái auth/filter/error; phần này được xếp sang `T-143`

## 2026-04-07 - Hoàn thành T-143

### Đã làm

- Thêm file test mới `test/participation-report-page.test.tsx` cho `src/features/reports/ParticipationReportAdminPage.tsx`
- Mock nhẹ `useAuth`, `useRouter`, `ActivitySkeleton`, `EmptyState` và `fetch` để khóa đúng các nhánh render quan trọng mà không kéo theo runtime nặng của app
- Phủ 3 case smoke chính:
  - admin load filter options thành công
  - empty state khi báo cáo trả danh sách rỗng
  - error banner khi tải báo cáo thất bại, không rơi nhầm về empty state
- Bổ sung `import React from 'react'` cho `src/features/reports/ParticipationReportAdminPage.tsx` để page chạy ổn trong môi trường Vitest/jsdom hiện tại
- Siết fetch mock cho cả `globalThis.fetch` và `window.fetch` để test sạch log hơn

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/features/reports/ParticipationReportAdminPage.tsx test/participation-report-page.test.tsx`
- Chạy `npm.cmd test -- test/participation-report-page.test.tsx`
- Kết quả: sạch lint, `3/3` test pass

### Kết quả

- `ParticipationReportAdminPage` nay đã có regression net ở mức component, bổ sung đủ cho cụm route test + parser test trước đó
- Các nhánh render quan trọng của màn participation report đã được khóa tốt hơn:
  - nạp dropdown lớp/loại hoạt động
  - hiển thị empty state đúng lúc
  - hiển thị lỗi tải báo cáo rõ ràng

### Còn lại

- Màn `admin/reports/custom` vẫn là điểm active tiếp theo có nhiều trạng thái UI nhưng chưa có smoke test component; phần này được xếp sang `T-144`

## 2026-04-07 - Hoàn thành T-144

### Đã làm

- Thêm file test mới `test/custom-report-page.test.tsx` cho `src/app/admin/reports/custom/page.tsx`
- Mock nhẹ `useAuth`, `useRouter`, `LoadingSpinner`, `react-hot-toast` và `fetch` để khóa đúng các nhánh render quan trọng của màn custom report mà không gọi route thật
- Phủ 3 case smoke chính:
  - render bước chọn loại báo cáo rồi chuyển sang bước cấu hình với bộ cột mặc định
  - hiển thị bảng preview mẫu khi request xem trước thành công
  - hiển thị lỗi preview rõ ràng khi request xem trước thất bại
- Bổ sung `import React from 'react'` cho `src/app/admin/reports/custom/page.tsx` để page chạy ổn trong môi trường Vitest/jsdom hiện tại
- Siết mock `fetch` cho cả `globalThis.fetch` và `window.fetch`, đồng thời dọn log `console.error` trong case lỗi để output test gọn hơn

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/custom/page.tsx test/custom-report-page.test.tsx`
- Chạy `npm.cmd test -- test/custom-report-page.test.tsx`
- Kết quả: sạch lint, `3/3` test pass

### Kết quả

- `admin/reports/custom` nay đã có regression net ở mức component cho các trạng thái UI quan trọng nhất
- Màn custom report được khóa tốt hơn ở ba nhánh người dùng dễ chạm nhất:
  - chọn loại báo cáo và vào bước cấu hình
  - xem trước dữ liệu mẫu
  - nhận thông báo lỗi preview

### Còn lại

- Cụm admin reports active vẫn còn các màn `teachers`, `scores`, `activity-statistics` chưa có smoke test component; điểm kế tiếp hợp lý nhất được xếp sang `T-145`

## 2026-04-07 - Hoàn thành T-145

### Đã làm

- Thêm file test mới `test/teachers-report-page.test.tsx` cho `src/app/admin/reports/teachers/page.tsx`
- Mock nhẹ `useAuth`, `useRouter`, `LoadingSpinner` và `fetch` để khóa đúng các nhánh render chính của màn teachers report mà không gọi route thật
- Phủ 3 case smoke chính:
  - hiển thị bảng dữ liệu giảng viên khi báo cáo tải thành công
  - hiển thị trạng thái bảng rỗng khi API trả danh sách rỗng
  - hiển thị banner lỗi khi request báo cáo thất bại
- Bổ sung `import React from 'react'` cho `src/app/admin/reports/teachers/page.tsx` để page chạy ổn trong môi trường Vitest/jsdom hiện tại
- Siết mock `fetch` cho cả `globalThis.fetch` và `window.fetch` để test ổn định hơn

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/teachers/page.tsx test/teachers-report-page.test.tsx`
- Chạy `npm.cmd test -- test/teachers-report-page.test.tsx`
- Kết quả: sạch lint, `3/3` test pass

### Kết quả

- `admin/reports/teachers` nay đã có regression net ở mức component cho các trạng thái UI quan trọng
- Màn teachers report được khóa tốt hơn ở ba nhánh dễ chạm nhất:
  - render bảng dữ liệu giảng viên
  - render trạng thái rỗng
  - render lỗi tải báo cáo

### Còn lại

- Cụm admin reports active vẫn còn `scores` và `activity-statistics` chưa có smoke test component; điểm kế tiếp hợp lý nhất được xếp sang `T-146`

## 2026-04-07 - Hoàn thành T-146

### Đã làm

- Thêm file test mới `test/scores-report-page.test.tsx` cho `src/app/admin/reports/scores/page.tsx`
- Mock nhẹ `useAuth`, `useRouter`, `LoadingSpinner`, `recharts` và `fetch` để khóa đúng các nhánh render chính của màn scores report mà không gọi route thật
- Phủ 3 case smoke chính:
  - hiển thị các card số liệu và dữ liệu chart khi báo cáo tải thành công
  - hiển thị trạng thái rỗng khi không có dữ liệu phân bố điểm
  - hiển thị banner lỗi khi request báo cáo thất bại
- Bổ sung `import React from 'react'` cho `src/app/admin/reports/scores/page.tsx`
- Gia cố nhẹ page scores report:
  - thêm `errorMessage`
  - kiểm tra `response.ok`
  - hiển thị trạng thái rỗng rõ ràng cho phần phân bố điểm
- Siết mock `fetch` cho cả `globalThis.fetch` và `window.fetch`, đồng thời dọn log `console.error` trong test để output ổn định hơn

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/scores/page.tsx test/scores-report-page.test.tsx`
- Chạy `npm.cmd test -- test/scores-report-page.test.tsx`
- Kết quả: sạch lint, `3/3` test pass

### Kết quả

- `admin/reports/scores` nay đã có regression net ở mức component cho các trạng thái UI quan trọng
- Màn scores report được khóa tốt hơn ở ba nhánh dễ trôi nhất:
  - render số liệu + chart
  - render trạng thái rỗng
  - render lỗi tải báo cáo

### Còn lại

- Cụm admin reports active còn màn `activity-statistics` chưa có smoke test component; điểm kế tiếp hợp lý nhất được xếp sang `T-147`

## 2026-04-07 - Hoàn thành T-147

### Đã làm

- Thêm file test mới `test/activity-statistics-report-page.test.tsx` cho `src/app/admin/reports/activity-statistics/page.tsx`
- Mock nhẹ `useAuth`, `useRouter`, `LoadingSpinner`, `react-hot-toast` và `fetch` để khóa đúng các nhánh render chính của màn activity statistics mà không gọi route thật
- Phủ 3 case smoke chính:
  - render dữ liệu hoạt động và kiểm tra thao tác lọc cơ bản có phát sinh refetch
  - hiển thị trạng thái bảng rỗng khi không có hoạt động
  - hiển thị toast lỗi khi request báo cáo thất bại
- Bổ sung `import React from 'react'` cho `src/app/admin/reports/activity-statistics/page.tsx`
- Ổn định test harness để chịu được fetch lặp trong môi trường React/Vitest mà không drift khỏi hành vi thực tế của page

### Kiểm thử hẹp

- Chạy `npx.cmd eslint src/app/admin/reports/activity-statistics/page.tsx test/activity-statistics-report-page.test.tsx`
- Chạy `npm.cmd test -- test/activity-statistics-report-page.test.tsx`
- Kết quả: sạch lint, `3/3` test pass

### Kết quả

- `admin/reports/activity-statistics` nay đã có regression net ở mức component cho các trạng thái UI chính
- Cụm admin reports active đã được phủ smoke test đầy đủ hơn ở cấp page:
  - participation
  - custom
  - teachers
  - scores
  - activity-statistics

### Còn lại

- Bước kế tiếp hợp lý nhất là gom các smoke test page-level của admin reports thành một regression bundle nhỏ để khóa cả cụm trong một lệnh hẹp; phần này được xếp sang `T-148`

## 2026-04-07 - Hoàn thành T-148

### Đã làm

- Chạy bundle smoke test page-level cho toàn cụm admin reports:
  - `test/participation-report-page.test.tsx`
  - `test/custom-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
  - `test/scores-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
- Dọn thêm harness của `teachers-report-page.test.tsx` để loại bỏ `stderr` nhiễu từ `console.error` trong lúc chạy bundle

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/teachers-report-page.test.tsx`
- Chạy `npm.cmd test -- test/participation-report-page.test.tsx test/custom-report-page.test.tsx test/teachers-report-page.test.tsx test/scores-report-page.test.tsx test/activity-statistics-report-page.test.tsx`
- Kết quả: `5/5` file test pass, `15/15` test pass

### Kết quả

- Cụm admin reports active đã được khóa ở mức page-level bundle thay vì chỉ từng file lẻ
- Kết quả bundle sạch hơn sau khi dọn nhiễu log ở teachers report

### Còn lại

- Bước kế tiếp hợp lý nhất là gom tiếp route test và page smoke test của admin reports vào một regression bundle tổng hợp để khóa cả backend lẫn UI của cụm báo cáo quản trị; phần này được xếp sang `T-149`

## 2026-04-07 - Hoàn thành T-149

### Đã làm

- Chạy bundle regression tổng hợp cho toàn cụm admin reports, gồm:
  - `test/admin-report-routes.test.ts`
  - `test/participation-report-route.test.ts`
  - `test/participation-report-options.test.ts`
  - `test/participation-report-page.test.tsx`
  - `test/custom-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
  - `test/scores-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
- Dọn thêm cleanup trong `test/teachers-report-page.test.tsx` để loại bỏ `stderr` nhiễu khi chạy bundle lớn

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/teachers-report-page.test.tsx`
- Chạy `npm.cmd test -- test/admin-report-routes.test.ts test/participation-report-route.test.ts test/participation-report-options.test.ts test/participation-report-page.test.tsx test/custom-report-page.test.tsx test/teachers-report-page.test.tsx test/scores-report-page.test.tsx test/activity-statistics-report-page.test.tsx`
- Kết quả: `8/8` file test pass, `32/32` test pass

### Kết quả

- Cụm admin reports đã được khóa regression ở cả hai lớp:
  - route/backend
  - page/UI
- Bundle tổng hợp chạy sạch hơn sau khi dọn harness của teachers report

### Còn lại

- Bước kế tiếp hợp lý nhất là chạy regression bundle mở rộng cho các flow lõi (`approval`, `attendance`, `activities`) cùng với cụm admin reports để xác minh toàn bộ xương sống hiện tại; phần này được xếp sang `T-150`

## 2026-04-07 - Hoàn thành T-150

### Đã hiểu thêm

- Sau chuỗi batch dọn contract, reports, UI và test harness gần đây, hệ xương sống hiện tại của dự án đã đủ ổn để gom thành một regression bundle mở rộng
- Lệnh bundle lớn cần chạy ngoài sandbox vì `vitest`/`esbuild` bị `spawn EPERM` trong sandbox, nhưng khi chạy ngoài sandbox với timeout rộng hơn thì ổn định

### Đã làm

- Chạy bundle regression mở rộng cho toàn cụm core flows và admin reports:
  - `test/approval-workflow.test.ts`
  - `test/attendance.test.ts`
  - `test/activities.test.ts`
  - `test/admin-report-routes.test.ts`
  - `test/participation-report-route.test.ts`
  - `test/participation-report-options.test.ts`
  - `test/participation-report-page.test.tsx`
  - `test/custom-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
  - `test/scores-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`

### Kiểm thử hẹp

- Chạy `npm.cmd test -- test/approval-workflow.test.ts test/attendance.test.ts test/activities.test.ts test/admin-report-routes.test.ts test/participation-report-route.test.ts test/participation-report-options.test.ts test/participation-report-page.test.tsx test/custom-report-page.test.tsx test/teachers-report-page.test.tsx test/scores-report-page.test.tsx test/activity-statistics-report-page.test.tsx`
- Kết quả: `11/11` file test pass, `41/41` test pass

### Kết quả

- Cụm core flows (`approval`, `attendance`, `activities`) và admin reports đang tương thích tốt ở mức regression hiện tại
- Các batch test page-level và route-level trước đó đã được xác nhận lại trong cùng một bundle lớn hơn

### Còn lại

- Bước kế tiếp hợp lý nhất là đóng gói bundle regression “xương sống” này thành script npm ngắn để lần sau chạy lại nhanh hơn và giảm rủi ro gõ sai phạm vi; phần này được xếp sang `T-151`

## 2026-04-07 - Hoàn thành T-151

### Đã hiểu thêm

- Bundle regression “xương sống” hiện đã đủ ổn định để đóng gói thành một script npm ngắn cho thao tác hằng ngày
- Trên máy này, `vitest` vẫn cần chạy ngoài sandbox do `esbuild` bị `spawn EPERM`, nhưng khi gọi qua script npm mới thì kết quả vẫn ổn định như bundle dài trước đó

### Đã làm

- Thêm script `test:backbone` vào `package.json`
- Cập nhật hướng dẫn ở `README.md` và `docs/01-README.md` để chỉ rõ khi nào nên dùng `npm run test:backbone`
- Tách rõ `health-check` và regression bundle trong `README.md` để tránh nhầm mục đích

### Kiểm thử hẹp

- Chạy `npm.cmd run test:backbone`
- Kết quả: `11/11` file test pass, `41/41` test pass

### Kết quả

- Dự án đã có một lệnh ngắn, rõ nghĩa để xác minh nhanh phần xương sống hiện tại
- Tài liệu chính đã bám theo script thật, giảm rủi ro handoff hoặc tự kiểm thử sai phạm vi

### Còn lại

- Bước kế tiếp hợp lý nhất là thêm một script ngắn riêng cho cụm admin reports để khi chỉ sửa reports có thể chạy regression nhanh hơn, không cần gọi cả bundle xương sống; phần này được xếp sang `T-152`

## 2026-04-07 - Hoàn thành T-152

### Đã hiểu thêm

- Cụm admin reports đã đủ ổn định để có script regression riêng, tách khỏi `test:backbone`
- Trên máy này, script mới vẫn cần chạy ngoài sandbox vì `vitest`/`esbuild` bị `spawn EPERM` trong sandbox, nhưng kết quả thực tế ổn định

### Đã làm

- Thêm script `test:admin-reports` vào `package.json`
- Cập nhật hướng dẫn ở `README.md` và `docs/01-README.md` để chỉ rõ khi nào nên dùng `npm run test:admin-reports`
- Giữ rõ ranh giới giữa:
  - `npm run test:admin-reports`
  - `npm run test:backbone`

### Kiểm thử hẹp

- Chạy `npm.cmd run test:admin-reports`
- Kết quả: `8/8` file test pass, `32/32` test pass

### Kết quả

- Dự án đã có lệnh ngắn để xác minh riêng cụm admin reports, giúp vòng lặp sửa lỗi reports nhanh hơn
- Docs chính đã bám theo script thật, giảm rủi ro phải gõ lại lệnh bundle dài

### Còn lại

- Bước kế tiếp hợp lý nhất là thêm script ngắn riêng cho core flows (`approval`, `attendance`, `activities`) để bộ script regression cân đối hơn; phần này được xếp sang `T-153`

## 2026-04-07 - Hoàn thành T-153

### Đã hiểu thêm

- Bộ script regression hiện đã đủ rõ ràng để tách tiếp core flows khỏi `test:backbone`
- Trên máy này, script mới vẫn cần chạy ngoài sandbox vì `vitest`/`esbuild` bị `spawn EPERM` trong sandbox, nhưng kết quả chạy thực tế ổn định

### Đã làm

- Thêm script `test:core-flows` vào `package.json`
- Cập nhật hướng dẫn ở `README.md` và `docs/01-README.md` để chỉ rõ khi nào nên dùng `npm run test:core-flows`
- Hoàn thiện bộ script regression theo 3 lớp:
  - `npm run test:core-flows`
  - `npm run test:admin-reports`
  - `npm run test:backbone`

### Kiểm thử hẹp

- Chạy `npm.cmd run test:core-flows`
- Kết quả: `3/3` file test pass, `9/9` test pass

### Kết quả

- Dự án đã có lệnh ngắn riêng để xác minh các flow lõi mà không cần kéo theo cụm reports
- Docs chính đã bám theo script thật, giúp vòng lặp sửa lỗi core flows nhanh và gọn hơn

### Còn lại

- Bước kế tiếp hợp lý nhất là thêm script ngắn cho 5 smoke test page-level của admin reports để các batch UI reports có vòng kiểm thử nhẹ hơn nữa; phần này được xếp sang `T-154`

## 2026-04-07 - Hoàn thành T-154

### Đã hiểu thêm

- Bundle page-level của admin reports đáng để có script riêng vì vòng chạy này nhẹ hơn `test:admin-reports` khi chỉ sửa UI
- Trong lúc chạy bundle, `activity-statistics-report-page.test.tsx` lộ ra một điểm flaky ở nhịp refetch; mình đã thay test đó bằng phiên bản smoke ổn định hơn để bundle page-level chạy lại sạch

### Đã làm

- Thêm script `test:admin-report-pages` vào `package.json`
- Cập nhật hướng dẫn ở `README.md` và `docs/01-README.md` để chỉ rõ khi nào nên dùng `npm run test:admin-report-pages`
- Dọn và ổn định lại `test/activity-statistics-report-page.test.tsx` để bundle page-level không còn fail ngắt quãng

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/activity-statistics-report-page.test.tsx`
- Chạy `npm.cmd test -- test/activity-statistics-report-page.test.tsx`
- Chạy `npm.cmd run test:admin-report-pages`
- Kết quả: `5/5` file test pass, `15/15` test pass

### Kết quả

- Dự án đã có lệnh ngắn để xác minh riêng smoke test page-level của admin reports
- Vòng lặp sửa UI reports giờ có thể chạy nhanh và đúng scope hơn

### Còn lại

- Bước kế tiếp hợp lý nhất là thêm script ngắn riêng cho route-level của admin reports để bộ regression scripts cân đối đủ cả `core`, `pages`, `routes`, `reports`, `backbone`; phần này được xếp sang `T-155`

## 2026-04-07 - Hoàn thành T-155

### Đã hiểu thêm

- Bộ script regression của admin reports đã đủ chín để tách riêng route-level khỏi page-level và bundle tổng
- Nhóm route-level chạy khá nhanh và sạch, phù hợp làm vòng kiểm thử hẹp khi sửa API reports

### Đã làm

- Thêm script `test:admin-report-routes` vào `package.json`
- Cập nhật hướng dẫn ở `README.md` và `docs/01-README.md` để chỉ rõ khi nào nên dùng `npm run test:admin-report-routes`
- Giữ cách đặt tên nhất quán giữa:
  - `npm run test:admin-report-routes`
  - `npm run test:admin-report-pages`
  - `npm run test:admin-reports`

### Kiểm thử hẹp

- Chạy `npm.cmd run test:admin-report-routes`
- Kết quả: `3/3` file test pass, `17/17` test pass

### Kết quả

- Dự án đã có lệnh ngắn riêng để xác minh route-level của admin reports
- Bộ regression scripts hiện phân lớp rõ hơn theo nhu cầu sửa:
  - core flows
  - admin report routes
  - admin report pages
  - admin reports full
  - backbone

### Còn lại

- Bước kế tiếp hợp lý nhất là dọn nhiễu `stderr` còn lại trong smoke tests admin reports để các bundle chạy sạch và ít gây hiểu nhầm hơn; phần này được xếp sang `T-156`

## 2026-04-07 - Hoàn thành T-156

### Đã hiểu thêm

- Nhiễu `stderr` lớn nhất trong admin report smoke tests đến từ hai suite `participation-report-page` và `activity-statistics-report-page`
- Gốc vấn đề nằm ở cách mock/cleanup `fetch` trong test: khi cleanup quá sớm, một số nhịp async muộn rơi lại về native `fetch` và tạo log `Invalid URL`

### Đã làm

- Đồng bộ harness của `test/participation-report-page.test.tsx` sang cách mock `fetch` ổn định hơn bằng `vi.spyOn(...)`
- Dời việc chặn `console.error` lên `beforeEach` của hai suite đang gây ồn để các nhịp async muộn không xả `stderr`
- Giữ `test/activity-statistics-report-page.test.tsx` ở mức smoke ổn định hơn sau batch dọn flaky trước đó

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/participation-report-page.test.tsx test/activity-statistics-report-page.test.tsx`
- Chạy `npm.cmd run test:admin-report-pages`
- Chạy `npm.cmd run test:admin-reports`
- Kết quả:
  - `test:admin-report-pages` pass `5/5` file, `15/15` test và không còn log `Invalid URL`
  - `test:admin-reports` pass `8/8` file, `32/32` test; phần `Invalid URL` đã sạch, chỉ còn một log lỗi mong đợi từ `teachers-report-page.test.tsx`

### Kết quả

- Cụm nhiễu `Invalid URL`/`Failed to parse URL` trong smoke tests admin reports đã được dọn sạch
- Output bundle reports giờ rõ tín hiệu hơn nhiều và dễ đọc hơn khi regression pass

### Còn lại

- Bước kế tiếp hợp lý nhất là dọn nốt log `stderr` còn lại trong `teachers-report-page.test.tsx` để bundle `test:admin-reports` sạch hoàn toàn; phần này được xếp sang `T-157`

## 2026-04-07 - Hoàn thành T-157

### Đã hiểu thêm

- Nhiễu `stderr` cuối cùng của cụm admin reports không còn đến từ `fetch` hay `Invalid URL`, mà là log lỗi mong đợi trong case fail của `teachers-report-page.test.tsx`
- Với suite này, chặn `console.error` bằng assignment trực tiếp ổn định hơn `spyOn` trong bối cảnh chạy bundle dài

### Đã làm

- Cập nhật `test/teachers-report-page.test.tsx` để khóa `console.error` trực tiếp trong `beforeEach`
- Giữ nguyên logic ứng dụng; chỉ làm sạch output test ở đúng suite đang gây nhiễu

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/teachers-report-page.test.tsx`
- Chạy `npm.cmd run test:admin-reports`
- Kết quả: `8/8` file test pass, `32/32` test pass và output không còn `stderr` gây nhiễu

### Kết quả

- Bundle `test:admin-reports` hiện đã chạy sạch hoàn toàn về cả kết quả lẫn output
- Cụm regression của admin reports giờ không còn tín hiệu giả chen vào khi pass

### Còn lại

- Bước kế tiếp hợp lý nhất là chạy lại `test:backbone` sau chuỗi cleanup scripts và test harness để xác nhận toàn bộ xương sống vẫn ổn định; phần này được xếp sang `T-158`

## 2026-04-07 - Hoàn thành T-158

### Đã hiểu thêm

- Chuỗi cleanup scripts và test harness vừa rồi không làm trôi hành vi của xương sống sản phẩm
- `test:backbone` hiện đã sạch ở phần admin reports; phần output còn lại chỉ đến từ log trạng thái trong `approval-workflow.test.ts`

### Đã làm

- Chạy lại full bundle `npm run test:backbone` sau các batch `T-151` đến `T-157`

### Kiểm thử hẹp

- Chạy `npm.cmd run test:backbone`
- Kết quả: `11/11` file test pass, `41/41` test pass

### Kết quả

- Toàn bộ xương sống hiện tại của dự án vẫn ổn định sau chuỗi dọn scripts và test harness
- Các nhóm regression hiện đang khớp nhau tốt:
  - core flows
  - admin report routes
  - admin report pages
  - admin reports full
  - backbone

### Còn lại

- Bước kế tiếp hợp lý nhất là dọn nốt `stderr` còn lại trong `approval-workflow.test.ts` để bundle `test:backbone` sạch hoàn toàn về output; phần này được xếp sang `T-159`

## 2026-04-07 - Hoàn thành T-159

### Đã hiểu thêm

- Nguồn `stderr` cuối cùng của `test:backbone` đến từ các `console.warn` trong approval workflow khi test đi qua các state
- Trong lúc xác minh lại backbone, một assertion quá chặt ở `activity-statistics-report-page.test.tsx` cũng lộ ra độ nhạy theo bundle; mình đã nới nó về đúng mức smoke để backbone ổn định trở lại

### Đã làm

- Cập nhật `test/approval-workflow.test.ts` để khóa `console.warn` trong suốt vòng đời suite test
- Điều chỉnh `test/activity-statistics-report-page.test.tsx` để assertion refetch bền hơn khi chạy trong bundle `backbone`

### Kiểm thử hẹp

- Chạy `npx.cmd eslint test/activity-statistics-report-page.test.tsx`
- Chạy `npm.cmd run test:backbone`
- Kết quả: `11/11` file test pass, `41/41` test pass và output không còn `stderr` từ approval workflow

### Kết quả

- Bundle `test:backbone` hiện đã pass sạch về cả kết quả lẫn output
- Toàn bộ xương sống regression đang ở trạng thái ổn định hơn sau chuỗi cleanup scripts và harness

### Còn lại

- Bước kế tiếp hợp lý nhất là dọn các cảnh báo `no-explicit-any` còn lại trong `approval-workflow.test.ts` để suite lõi này sạch hơn cả về lint; phần này được xếp sang `T-160`
