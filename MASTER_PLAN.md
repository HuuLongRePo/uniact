# MASTER PLAN

Ngày lập kế hoạch: 2026-04-06
Trạng thái: Sẵn sàng chờ lệnh thực thi

## Nguyên tắc thực thi

- Ưu tiên cứu luồng sống còn trước
- Mỗi lần chỉ mở một cụm nhỏ, tránh đụng quá nhiều file
- Luôn sửa contract trước khi polish UI
- Tránh full test/full build liên tục trên máy 8GB
- Sau mỗi lô sửa phải có kiểm chứng gọn

## Pha 1 - Chuẩn hóa contract lõi

Mục tiêu:

- Đồng bộ response/data model cho các luồng:
  - teacher activities
  - student activities list
  - student activity detail
  - activity types
  - organization levels

Kết quả mong muốn:

- UI và API dùng cùng một vocabulary cho:
  - `status`
  - `approval_status`
  - `activity_status`
  - `date_time`
  - `start_time`

## Pha 2 - Khôi phục spine hoạt động

Mục tiêu:

1. Giáo viên tạo draft
2. Gửi duyệt
3. Admin duyệt/từ chối
4. Sinh viên xem được hoạt động
5. Đăng ký/hủy đăng ký hoạt động

Điều kiện hoàn thành:

- Có thể đi hết chuỗi này trên dữ liệu local mà không bị contract mismatch

## Pha 3 - Ổn định điểm danh và số liệu

Mục tiêu:

- Rà các route `qr-sessions`, `attendance`, `student/statistics`, dashboard stats
- Sửa các chỗ `start_time` làm sai số liệu
- Bỏ các fallback im lặng làm che lỗi

## Pha 4 - Việt hóa và UX cleanup

Mục tiêu:

- Dọn các text tiếng Anh còn hiển thị
- Thay các `confirm()` nổi bật bằng confirm dialog chung
- Chuẩn hóa label/button/status/empty state/toast

## Pha 5 - Regression net và smoke

Mục tiêu:

- Cập nhật test bị lệch do refactor guard/API
- Chạy lại nhóm test lõi hẹp
- Nếu ổn mới mở rộng thêm smoke theo module

## Pha 6 - Dọn rác và chuẩn hóa cấu trúc

Mục tiêu:

- Hợp nhất tài liệu nguồn sự thật
- Giảm script trùng
- Dọn file log/report không còn là canonical docs
- Chuẩn hóa đường đi và naming khi đã ổn định contract

## Những việc cần xin xác nhận trước

- Đổi cấu trúc thư mục diện rộng
- Xóa file hàng loạt
- Chỉnh dependency lớn
- Chỉnh schema/migration
- Đụng auth/bảo mật theo hướng breaking change

