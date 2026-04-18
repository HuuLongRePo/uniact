# PROJECT AUDIT - UniAct

Ngày khảo sát: 2026-04-06
Trạng thái: Khảo sát sâu, chưa thực thi sửa lớn

## 1. Ảnh chụp hiện trạng

- Stack chính: Next.js 15 App Router, React 19, TypeScript 5, SQLite, Vitest, Playwright, Tailwind 4.
- Quy mô repo hiện tại:
  - `133` trang `page.tsx`
  - `240` API routes `route.ts`
  - `65` test files
  - `44` file tài liệu `.md`
  - `59` script/migration/tool files
- CSDL local hiện diện tại `uniact.db`.
- Repo đang có thay đổi local chưa commit:
  - `package.json` đã sửa
  - `cleanup.js` chưa tracked
  - `CLEANUP_GUIDE.md` chưa tracked

## 2. Kiến trúc thực tế đang thấy

### Frontend

- App Router tại `src/app`.
- Điều hướng theo 3 vai trò:
  - `admin`
  - `teacher`
  - `student`
- Bao layout/auth tại:
  - `src/app/layout.tsx`
  - `src/contexts/AuthContext.tsx`
  - `src/components/AuthContent.tsx`
  - `src/components/Sidebar.tsx`

### Backend

- API tập trung trong `src/app/api`.
- Tầng DB đã được tách nhưng vẫn giữ facade tương thích ngược:
  - `src/lib/database.ts`
  - `src/lib/db-core.ts`
  - `src/lib/db-queries.ts`
  - `src/infrastructure/db/*`
- Auth/JWT/cookie:
  - `src/lib/auth.ts`
  - `src/lib/session-cookie.ts`
  - `src/lib/guards.ts`

### Dữ liệu

- Schema lớn, gom nhiều domain vào cùng SQLite:
  - users, classes, activities, participations, qr_sessions, attendance_records
  - approvals, scoring, awards, notifications, alerts
  - biometrics, devices, reports, logs
- Base schema nằm trong `migrations/000_base_schema.ts`.

## 3. Xương sống sản phẩm đã xác định

Các luồng quyết định giá trị thật của sản phẩm hiện tại:

1. Đăng nhập và phân vai người dùng
2. Giáo viên tạo hoạt động, chỉnh sửa, gửi phê duyệt
3. Admin duyệt hoặc từ chối hoạt động
4. Sinh viên xem hoạt động, đăng ký, hủy đăng ký
5. Giáo viên tạo phiên QR, sinh viên điểm danh QR, giáo viên điểm danh thủ công/bulk
6. Tính điểm, xếp hạng, khen thưởng, thông báo
7. Dashboard và báo cáo để theo dõi vận hành

## 4. Tín hiệu khỏe/yếu của codebase

### Tín hiệu tốt

- Có test unit/integration/UAT, không phải repo trống test.
- Workflow approval và attendance đã có tầng helper tương đối rõ.
- DB facade đã có bước tách lớp, cho thấy dự án từng được nắn kiến trúc.
- Có cache, rate limit, audit log, notifications, health endpoints.

### Tín hiệu rủi ro cao

- Hợp đồng UI/API lệch ở nhiều luồng lõi.
- Tên cột/schema chưa thống nhất giữa `date_time` và `start_time`.
- Trạng thái workflow bị trộn giữa `status`, `approval_status`, `pending`, `requested`.
- Tài liệu tự mâu thuẫn: có file nói `docs/` đã xoá nhưng repo hiện vẫn có `docs/`.
- Test có dấu hiệu không còn bám code hiện tại.
- Việt hóa UI chưa hoàn tất; nhiều text hiển thị vẫn là tiếng Anh.
- Nhiều script/package command không tương thích Windows dù máy hiện tại là Windows.

## 5. Rủi ro kỹ thuật quan trọng

### Rủi ro A - Contract drift giữa UI và API

- Rất nhiều trang đang kỳ vọng field không còn được API trả ra.
- Đây là rủi ro phá luồng trực tiếp với user, không chỉ là nợ kỹ thuật.

### Rủi ro B - Schema drift `start_time` vs `date_time`

- Repo còn `37` tham chiếu `start_time`.
- Schema lõi đang dùng `activities.date_time`.
- Nhiều route/report/dashboard có nguy cơ trả sai dữ liệu hoặc rơi vào fallback im lặng.

### Rủi ro C - Workflow approval lệch semantic

- Workflow chuẩn dùng `approval_status='requested'`.
- Một số UI và filter vẫn dùng khái niệm `pending` như trạng thái chính của activity.

### Rủi ro D - Regression net suy yếu

- Nhóm test core vừa chạy cho thấy:
  - `approval-workflow` và `attendance` pass
  - `activities.test.ts` fail do mock guards lỗi thời, không còn khớp exports mới

## 6. Kết quả kiểm thử hẹp đã chạy

Lệnh đã chạy:

`npm.cmd test -- test/approval-workflow.test.ts test/attendance.test.ts test/activities.test.ts`

Kết quả:

- `2` file test pass
- `1` file test fail
- `4` test fail trong `test/activities.test.ts`

Nguyên nhân fail đã xác nhận:

- Mock `@/lib/guards` trong test không còn cung cấp `requireApiRole` và `requireApiAuth` như route hiện đang dùng.
- Đây là lỗi regression test drift, chưa đủ bằng chứng cho thấy runtime route hỏng theo đúng lỗi test đó.

## 7. Kết luận audit

- Dự án không ở trạng thái “đổ vỡ toàn bộ”, nhưng luồng lõi đang có nhiều điểm lệch contract và lệch schema.
- Ưu tiên đúng phải là:
  1. Chuẩn hóa contract cho các luồng lõi
  2. Sửa workflow activities/approval/student discovery
  3. Dọn các chỗ `start_time` còn sót
  4. Sau đó mới Việt hóa diện rộng, polish UI, và dọn kiến trúc sâu hơn

