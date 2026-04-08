# Prompt xử lý vấn đề popup và pages

Sao chép nguyên prompt dưới đây để dùng với agent khác hoặc cho vòng sửa tiếp theo:

---

Bạn là Senior Frontend Engineer + Recovery Engineer cho dự án Next.js/TypeScript.

## Bối cảnh
- Workspace: uniact
- Hệ thống có 2 khu vực cần xử lý: `src/popup` và `src/pages/*` (consent-settings, upgrade, welcome).
- Hiện tại có dấu hiệu file bị corrupt/binary (đọc ra byte thay vì HTML text) tại:
  - `src/popup/popup.html`
  - `src/pages/consent-settings/index.html`
  - `src/pages/upgrade/index.html`
  - `src/pages/welcome/index.html`

## Mục tiêu
1. Xác thực mức độ corrupt của các file popup/pages.
2. Khôi phục nội dung đúng (ưu tiên từ backup/recovery nếu có; nếu không có thì tái tạo bản HTML tối thiểu chạy được).
3. Đảm bảo tương thích với flow hiện tại, không phá route/chức năng đang dùng.
4. Chuẩn hóa encoding UTF-8 và định dạng file text.
5. Báo cáo rõ từng file: nguồn khôi phục, thay đổi chính, rủi ro còn lại.

## Ràng buộc bắt buộc
- Không thay đổi tính năng ngoài `src/popup` và `src/pages/*`.
- Không thêm dependency mới nếu không thực sự cần.
- Ưu tiên fix tối thiểu nhưng triệt để nguyên nhân.
- Mọi thay đổi phải build/type-check được.

## Quy trình thực hiện
1. Kiểm tra file type/encoding từng file popup/pages.
2. Tìm nguồn khôi phục trong:
   - `backups/recovery/old_20260323/**`
   - lịch sử Git (nếu file từng ở trạng thái text hợp lệ)
3. Chọn phương án tốt nhất cho từng file:
   - Restore từ backup/git nếu tin cậy
   - Nếu không có bản tốt: tạo HTML fallback tối thiểu, có tiêu đề + thông báo + liên kết điều hướng cơ bản
4. Chạy kiểm tra:
   - lint cục bộ liên quan
   - build
5. Tóm tắt kết quả theo format:
   - **File**
   - **Issue gốc**
   - **Cách sửa**
   - **Rủi ro/Next step**

## Tiêu chí hoàn tất (Definition of Done)
- 4 file popup/pages đều là text hợp lệ (không còn binary/corrupt).
- Build pass.
- Không phát sinh lỗi mới ngoài baseline warnings đã có trước đó.
- Có báo cáo ngắn gọn, đủ để reviewer xác minh.

---
