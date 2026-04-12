# Root Legacy Archive

Thư mục này chứa các tài liệu lịch sử hoặc snapshot từng đợt vốn trước đây nằm ở root repo nhưng không còn là nguồn sự thật chính cho trạng thái hệ thống hiện tại.

## Mục đích

- làm gọn cấu trúc root của repo
- giữ lại tài liệu cũ để tra cứu khi cần
- tránh nhầm lẫn giữa tài liệu điều hành đang active và báo cáo/hướng dẫn theo đợt

## Các file đã được chuyển vào đây

- `AUDIT_REPORT_SECURITY_UX_v1.0.md`
- `CLEANUP_GUIDE.md`
- `CLEANUP_REFACTOR_PLAN.md`
- `DELIVERY_ROADMAP.md`
- `FACE_ATTENDANCE_PLAN.md`
- `MANUAL_TEST_CHECKLIST_v1.0.md`
- `UI_VIET_HOA_PLAN.md`
- `UX_FIXES_IMPLEMENTATION_GUIDE.md`

## Lưu ý sử dụng

Khi cần nguồn sự thật hiện tại của repo, ưu tiên:

1. `../.. /../CANONICAL_DOCS.md` (tức `CANONICAL_DOCS.md` ở root)
2. `PROJECT_AUDIT.md`
3. `CORE_PRODUCT_FLOW.md`
4. `MASTER_PLAN.md`
5. `TASK_QUEUE.md`
6. `CHANGELOG_PROGRESS.md`

Các file trong thư mục này chỉ nên dùng để tra cứu lịch sử, đối chiếu quyết định cũ hoặc tham khảo snapshot từng giai đoạn.
