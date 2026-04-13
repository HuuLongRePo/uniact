# BUGS & BOTTLENECKS

Ngày tổng hợp: 2026-04-06
Trạng thái: Đã xác minh bằng đọc code và kiểm thử hẹp

## Mức độ nghiêm trọng

### P0-1. Trang sinh viên có nguy cơ không hiển thị hoạt động mở

- Vấn đề:
  - `src/app/student/activities/page.tsx` lọc theo `activity.activity_status === 'published'`
  - `GET /api/activities` hiện trả field `status`, không trả `activity_status`
- Ảnh hưởng:
  - Sinh viên có thể thấy danh sách hoạt động trống dù DB có dữ liệu
- Nguyên nhân khả dĩ:
  - UI cũ đang bám contract cũ
- Hướng xử lý:
  - Chuẩn hóa contract ở API hoặc adapter UI, không để dùng song song `status` và `activity_status`
- Ưu tiên: P0

### P0-2. Trang chi tiết hoạt động của sinh viên đang đòi dữ liệu mà API không cung cấp

- Vấn đề:
  - `src/app/student/activities/[id]/page.tsx` cần các field:
    - `activity_status`
    - `teacher_name`
    - `activity_type`
    - `organization_level`
    - `is_registered`
    - `can_cancel`
    - `base_score`
  - `GET /api/activities/[id]` hiện chủ yếu trả raw activity + `class_ids/class_names`
- Ảnh hưởng:
  - Badge, CTA đăng ký, thống kê nhanh và status rất dễ sai hoặc `undefined`
- Hướng xử lý:
  - Tạo response shape rõ cho student detail
- Ưu tiên: P0

### P0-3. Teacher workflow dùng `pending` trong UI, nhưng approval flow lõi dùng `requested`

- Vấn đề:
  - `src/app/teacher/activities/page.tsx` khai báo status có `pending`
  - Workflow helper và DB đang dùng `approval_status='requested'`
  - `GET /api/activities` cho teacher không map `requested -> pending`
- Ảnh hưởng:
  - Filter/badge/trạng thái chờ duyệt có thể hiển thị sai hoặc không bao giờ khớp
- Hướng xử lý:
  - Chuẩn hóa status hiển thị ở một nơi duy nhất
- Ưu tiên: P0

### P0-4. Student statistics đang query cột không tồn tại

- Vấn đề:
  - `src/app/api/student/statistics/route.ts` dùng `a.start_time`
  - Schema lõi dùng `a.date_time`
  - Lỗi bị nuốt trong `try/catch`, kết quả có thể trả `pendingActivities = 0` giả
- Ảnh hưởng:
  - Dashboard sinh viên sai số liệu mà khó phát hiện
- Hướng xử lý:
  - Thay toàn bộ truy vấn sang `date_time` hoặc thêm adapter chuẩn
- Ưu tiên: P0

### P0-5. Dialog tạo hoạt động không nạp được cấp tổ chức

- Vấn đề:
  - `src/components/ActivityDialog.tsx` đọc `data.levels`
  - `GET /api/organization-levels` trả `organization_levels`
- Ảnh hưởng:
  - Combobox cấp tổ chức rỗng
  - Tạo/chỉnh sửa hoạt động thiếu metadata quan trọng
- Hướng xử lý:
  - Chuẩn hóa response shape hoặc sửa consumer
- Ưu tiên: P0

### P1-1. Bộ lọc loại hoạt động của sinh viên không nhận dữ liệu đúng shape

- Vấn đề:
  - `src/app/student/activities/page.tsx` đọc `data.types`
  - `GET /api/activity-types` trả `activityTypes`
  - UI còn hiển thị `type.base_score` trong khi schema dùng `base_points`
- Ảnh hưởng:
  - Bộ lọc loại hoạt động trống hoặc hiển thị sai điểm
- Ưu tiên: P1

### P1-2. Drift `start_time` còn lan rộng trong repo

- Vấn đề:
  - Còn `37` tham chiếu `start_time` trong `src`
- Vùng ảnh hưởng:
  - student dashboard/history/points
  - cron reminders
  - recommendations
  - admin reports/activity statistics/rankings
- Ảnh hưởng:
  - Sai số liệu, empty list, query lỗi, fallback im lặng
- Ưu tiên: P1

### P1-3. Admin dashboard vừa còn tiếng Anh vừa có số liệu chưa đáng tin

- Vấn đề:
  - `src/features/dashboard/DashboardAdminPage.tsx` còn nhiều text tiếng Anh
  - `src/app/api/admin/system-health/route.ts` hard-code `new_attendances_24h = 0`
  - Comment trong route còn nói “No separate attendance_records table” dù schema có bảng này
- Ảnh hưởng:
  - Dashboard không đủ tin cậy để điều hành
  - Không đạt yêu cầu Việt hóa UI
- Ưu tiên: P1

### P1-4. Test regression cho activities đã lệch code hiện tại

- Bằng chứng:
  - Chạy `test/approval-workflow`, `test/attendance`, `test/activities`
  - `test/activities.test.ts` fail vì mock `@/lib/guards` không còn theo exports hiện tại
- Ảnh hưởng:
  - Lưới an toàn cho route activities yếu đi
- Hướng xử lý:
  - Cập nhật test mock trước khi tin tưởng regression suite
- Ưu tiên: P1

### P2-1. UX xác nhận thao tác đang phụ thuộc nặng vào `window.confirm`

- Bằng chứng:
  - Có `41` nơi dùng `confirm()`
- Ảnh hưởng:
  - UX thiếu nhất quán
  - Khó kiểm thử
  - Không phù hợp mục tiêu giao diện sạch, dễ dùng
- Ưu tiên: P2

### P2-2. Việt hóa UI chưa hoàn tất

- Bằng chứng:
  - Có ít nhất `54` vị trí text tiếng Anh trong nhóm màn hình/dashboard đã rà nhanh
  - Ví dụ:
    - `Admin Dashboard`
    - `Teacher Dashboard`
    - `Student Dashboard`
    - `Database Size`
    - `Refresh`
    - `Historical Analytics`
    - `Time left to register`
- Ưu tiên: P2

### P2-3. Tài liệu bị phân mảnh và tự mâu thuẫn

- Vấn đề:
  - `docs/01-README.md` nói chỉ còn 8 file chuẩn và `docs/` đã bị xoá
  - Repo thực tế vẫn có `docs/` với nhiều báo cáo cũ/mới lẫn nhau
- Ảnh hưởng:
  - Người tiếp quản dễ bị dẫn sai
- Ưu tiên: P2

### P2-4. Script và package command chưa thân thiện Windows

- Bằng chứng:
  - `package.json` có `bash`, `curl | jq`, `journalctl`, `lscpu`, `free -h`
  - Máy hiện tại là Windows
- Ảnh hưởng:
  - Khó vận hành cục bộ
  - Tăng ma sát test/smoke trên máy người dùng
- Ưu tiên: P2

