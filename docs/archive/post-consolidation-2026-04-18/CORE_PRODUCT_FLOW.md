# CORE PRODUCT FLOW - Xương sống sản phẩm

Ngày xác định: 2026-04-06
Mục tiêu: Chỉ rõ phần nào phải cứu trước để sản phẩm dùng được thật

## P0 - Luồng sống còn phải ưu tiên trước

### 1. Xác thực và vào đúng không gian vai trò

- Mục đích: user đăng nhập xong phải vào đúng khu vực `admin`, `teacher`, `student`.
- Thành phần liên quan:
  - `src/app/login/page.tsx`
  - `src/contexts/AuthContext.tsx`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/middleware.ts`
- Tiêu chí sống: không redirect sai, không treo loading, không mất session ngẫu nhiên.

### 2. Giáo viên tạo hoạt động và gửi duyệt

- Mục đích: giáo viên tạo được draft, chỉnh sửa được, gửi duyệt được.
- Thành phần liên quan:
  - `src/app/teacher/activities/page.tsx`
  - `src/components/ActivityDialog.tsx`
  - `src/app/api/activities/route.ts`
  - `src/app/api/activities/[id]/route.ts`
  - `src/app/api/activities/[id]/submit-approval/route.ts`
  - `src/infrastructure/db/db-queries.ts`
- Tiêu chí sống: status/approval_status phải nhất quán từ DB tới UI.

### 3. Admin duyệt hoặc từ chối hoạt động

- Mục đích: admin nhìn thấy đúng danh sách chờ duyệt và ra quyết định thành công.
- Thành phần liên quan:
  - `src/app/api/admin/activities/[id]/approval/route.ts`
  - `src/app/api/admin/activities/pending/route.ts`
  - `src/lib/activity-workflow.ts`
  - `src/infrastructure/db/db-queries.ts`
- Tiêu chí sống: approved -> `published`, rejected -> `draft/rejected`, log đầy đủ.

### 4. Sinh viên xem hoạt động và đăng ký

- Mục đích: sinh viên thấy được hoạt động mở, lọc/tìm được, đăng ký/hủy đăng ký được.
- Thành phần liên quan:
  - `src/app/student/activities/page.tsx`
  - `src/app/student/activities/[id]/page.tsx`
  - `src/app/student/my-activities/page.tsx`
  - `src/app/api/activities/route.ts`
  - `src/app/api/activities/[id]/register/route.ts`
  - `src/app/api/activities/my-registrations/route.ts`
- Tiêu chí sống: không bị rỗng giả do contract mismatch.

### 5. Điểm danh QR và điểm danh thủ công

- Mục đích: giáo viên mở phiên QR, sinh viên check-in, hệ thống chống trùng và cập nhật tham gia.
- Thành phần liên quan:
  - `src/app/api/qr-sessions/route.ts`
  - `src/app/api/attendance/validate/route.ts`
  - `src/app/api/attendance/manual/route.ts`
  - `src/app/teacher/qr/page.tsx`
- Tiêu chí sống: TTL đúng, quota đúng, duplicate safe, transaction an toàn.

## P1 - Luồng nghiệp vụ hỗ trợ nhưng vẫn quan trọng

### 6. Tính điểm, bảng điểm, xếp hạng

- Trục chính:
  - `student_scores`
  - `point_calculations`
  - scoreboard/ranking/report routes
- Mục tiêu: số liệu không sai do dùng cột cũ.

### 7. Thông báo, cảnh báo, dashboard

- Mục tiêu: hiển thị đúng số liệu, không trả số 0 giả, không trộn tiếng Anh/Tiếng Việt.

## Những phần chưa nên ưu tiên trước

- Sinh trắc học nâng cao
- Popup/demo routes
- Tinh chỉnh giao diện sâu không liên quan luồng chính
- Tái cấu trúc thư mục diện rộng khi contract lõi còn đang lệch

## Quy tắc cứu dự án

1. Làm cho user đi hết được 5 luồng P0 trước
2. Sau đó mới sửa thống kê, báo cáo, i18n và cleanup sâu
3. Không refactor lớn khi contract lõi chưa ổn định

