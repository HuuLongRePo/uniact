# CLEANUP & REFACTOR PLAN

Ngày lập: 2026-04-06
Trạng thái: Mới ở mức đề xuất, chưa thực thi

## 1. Mục tiêu cleanup

- Giảm phân mảnh tài liệu
- Giảm contract drift giữa UI/API
- Giảm drift schema `start_time/date_time`
- Giảm script trùng và script không phù hợp Windows
- Chuẩn hóa UX xác nhận thao tác

## 2. Nhóm cleanup ưu tiên

### Nhóm A - Canonical docs

- Vấn đề:
  - `docs/01-README.md` tuyên bố `docs/` đã bị gộp/xóa nhưng repo thực tế vẫn còn nhiều file trong `docs/`
- Hướng làm:
  - Chốt 1 bộ tài liệu chuẩn tối thiểu
  - Chuyển các file audit/report cũ sang nhóm historical hoặc archived

### Nhóm B - DB layer và compatibility facade

- Hiện trạng:
  - `src/lib/database.ts`, `src/lib/db-core.ts`, `src/lib/db-queries.ts` đang re-export từ `src/infrastructure/db/*`
- Hướng làm:
  - Giữ facade để tránh breaking change ngắn hạn
  - Chỉ refactor import path khi contract lõi đã ổn

### Nhóm C - Legacy/old files

- Dấu hiệu đã thấy:
  - `src/app/teacher/dashboard/page_old.tsx`
  - nhiều log/report root mang tính snapshot
  - script trùng giữa `scripts/` và `scripts/maintenance/`
- Hướng làm:
  - đánh dấu rõ file canonical và file lịch sử
  - không xóa hàng loạt trước khi check tham chiếu

### Nhóm D - Cross-platform scripts

- Vấn đề:
  - `package.json` có command phụ thuộc bash/jq/journalctl/lscpu/free
- Hướng làm:
  - tách script Windows-safe
  - giữ script Linux-only nhưng gắn nhãn rõ

### Nhóm E - UX cleanup

- Vấn đề:
  - `41` chỗ dùng `confirm()`
- Hướng làm:
  - thay dần bằng `ConfirmDialog`
  - bắt đầu ở flow activities, registrations, approvals

## 3. Những thứ chưa nên cleanup ngay

- Không đổi cấu trúc thư mục lớn khi activity flow còn lệch contract
- Không đụng sâu biometrics trước khi flow lõi ổn
- Không archive/xóa docs hàng loạt khi chưa chốt canonical list

## 4. Kết quả cleanup mong muốn

- Người mới vào repo biết ngay:
  - tài liệu nào là nguồn sự thật
  - luồng lõi ở đâu
  - API nào là chuẩn hiện hành
  - script nào chạy được trên máy Windows hiện tại

