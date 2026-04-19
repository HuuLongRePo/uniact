# ACTIVITY OVERDUE AND LISTING FOLLOW-UP TASKS

Status: post teacher-visibility groundwork, pending business decision batch

## P0 - Overdue without attendance lifecycle
### Problem
Hiện hệ thống có thể auto-complete hoạt động quá giờ qua cron, nhưng chưa phân biệt rõ:
- hoạt động đã diễn ra thật,
- hoạt động không diễn ra,
- hoạt động có đăng ký nhưng không ai được điểm danh,
- hoạt động bị conflict hoặc cần lưu hồ sơ lý do không tổ chức.

### Needed canonical behavior
Khi hoạt động đã qua giờ bắt đầu mà không có ai được điểm danh:
- cần xác định có tự động xếp vào một nhóm/archive riêng hay không,
- cần lưu `reason` rõ ràng,
- cần có chỗ hiển thị gọn để teacher/admin dễ rà soát,
- không nên lẫn với `completed` thật.

### Decision candidates
1. Dùng `cancelled` + reason chuyên biệt.
2. Tạo archived outcome riêng ở tầng metadata, không thêm status DB mới.
3. Tạo outcome/status mới như `archived` hoặc `not_held` nếu chấp nhận migration lớn hơn.

## P0 - Archive / resolution hub for not-held activities
- Gom các hoạt động không diễn ra vào một nơi riêng, có lý do, có bộ lọc.
- Lý do gợi ý:
  - không có ai điểm danh,
  - trùng lịch / conflict,
  - thiếu điều kiện tổ chức,
  - hủy thủ công bởi giảng viên,
  - lỗi vận hành khác.

## P1 - Activity listing filters and prioritization
### Teacher/admin lists should support better filtering
- mới nhất trước theo mặc định,
- khu riêng `sắp diễn ra` ở phía trên,
- filter theo:
  - workflow status,
  - review status,
  - overdue unattended,
  - upcoming soon,
  - cancelled/not-held,
  - has conflicts,
  - no attendance yet.

## P1 - Conflict surfacing model
- Nếu hoạt động bị conflict, UI cần hiển thị cách hiểu thống nhất:
  - conflict lịch,
  - conflict địa điểm,
  - conflict tổ chức,
  - conflict dẫn tới không thể diễn ra.
- Nên có nhãn và reason chuẩn thay vì để người dùng tự đoán từ raw state.

## P1 - Upcoming priority section
- Teacher activities page nên có section riêng cho hoạt động sắp diễn ra.
- Sau đó mới đến danh sách còn lại.
- Có thể thêm ngưỡng ưu tiên như:
  - trong 24h,
  - trong 48h,
  - quá hạn nhưng chưa được xử lý.

## Recommended next implementation order
1. Chốt business semantics cho overdue unattended vs completed vs cancelled.
2. Thiết kế `resolution_reason` / `outcome_reason` model.
3. Cập nhật cron + list/detail consumers.
4. Thêm filter UI và archive section.
5. Thêm regression cho overdue/unattended flows.
