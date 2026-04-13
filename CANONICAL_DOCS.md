# TÀI LIỆU CANONICAL - UNIACT

Ngày cập nhật: 2026-04-12
Trạng thái: nguồn điều hướng tài liệu hiện tại

## 1. Mục đích

File này là bản đồ tài liệu chuẩn để giảm tình trạng:

- nhiều README nói khác nhau
- tài liệu kế hoạch, audit và docs lịch sử bị trộn lẫn
- người tiếp quản không biết nên đọc file nào trước

Nếu có mâu thuẫn giữa các tài liệu, ưu tiên thứ tự ở mục 2.

## 2. Thứ tự ưu tiên tài liệu

### Nhóm A - Nguồn sự thật hiện tại cho tiếp quản và thực thi

Đây là nhóm phải ưu tiên đọc trước khi sửa code hoặc đánh giá trạng thái dự án:

1. `PROJECT_AUDIT.md`
2. `CORE_PRODUCT_FLOW.md`
3. `BUSINESS_DECISIONS.md`
4. `TASK_QUEUE.md`
5. `docs/RELEASE_CANDIDATE_CHECKLIST.md`
6. `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`
7. `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`
8. `docs/archive/root-legacy/MASTER_PLAN.md` (tham khảo chiến lược cũ nếu còn cần)
9. `docs/archive/root-legacy/CHANGELOG_PROGRESS.md` (tham khảo tiến độ lịch sử nếu còn cần)
10. `docs/archive/root-legacy/BUGS_BOTTLENECKS.md` (tham khảo backlog drift cũ nếu còn cần)

Vai trò từng file:

- `PROJECT_AUDIT.md`: ảnh chụp hiện trạng repo, rủi ro và tín hiệu sức khỏe codebase
- `CORE_PRODUCT_FLOW.md`: định nghĩa xương sống sản phẩm và các luồng sống còn
- `BUSINESS_DECISIONS.md`: nguồn sự thật cho quyết định nghiệp vụ đã chốt
- `TASK_QUEUE.md`: hàng đợi công việc đang hoạt động, dùng để quyết định làm gì tiếp theo
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`: baseline release/internal RC đang còn active
- `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`: kế hoạch smoke runtime đang còn active
- `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`: snapshot milestone internal RC gần nhất
- các file trong `docs/archive/root-legacy/`: chỉ còn giá trị lịch sử/tham khảo

### Nhóm B - Tài liệu cài đặt và vận hành gần với repo hiện tại

- `README.md`
- `.env.example`
- `package.json`
- `docs/03-DEVELOPMENT_GUIDE.md`
- `docs/04-DEPLOYMENT.md`

Quy tắc:

- `README.md` là điểm vào tổng quan/cài đặt ngắn gọn ưu tiên
- khi lệnh trong tài liệu khác với script thật, ưu tiên `package.json`
- `INSTALL.md` cũ nếu còn cần chỉ được xem là tài liệu historical sau cleanup

### Nhóm C - Tài liệu tổng quan và tham khảo kỹ thuật

- `README.md`
- `docs/SYSTEM_FLOWS_DIAGRAM.md`
- `docs/03-DEVELOPMENT_GUIDE.md`
- `docs/04-DEPLOYMENT.md`

Quy tắc:

- nhóm này dùng để hiểu bối cảnh, kiến trúc, định hướng và tài liệu tham khảo
- không dùng nhóm này làm nguồn sự thật duy nhất cho trạng thái task hoặc mức độ hoàn thành hiện tại

### Nhóm D - Tài liệu học thuật và báo cáo đề tài

- `de-tai/README.md`
- toàn bộ `de-tai/00-*` đến `de-tai/12-*`
- các file nghiệp vụ/thuyết minh trong thư mục `de-tai/`

Quy tắc:

- đây là nhánh tài liệu học thuật, thuyết minh và báo cáo đề tài
- hữu ích để hiểu domain, nghiệp vụ, cấu trúc phân tích, nhưng không phản ánh chắc chắn trạng thái code mới nhất

### Nhóm E - Tài liệu lịch sử, snapshot, báo cáo theo đợt

- phần lớn các file còn lại trong `docs/`
- các file historical/report đã được gom về `docs/archive/root-legacy/`, ví dụ `AUDIT_REPORT_SECURITY_UX_v1.0.md`, `MANUAL_TEST_CHECKLIST_v1.0.md`, `UX_FIXES_IMPLEMENTATION_GUIDE.md`

Quy tắc:

- dùng để tra cứu lịch sử, quyết định cũ, hoặc chứng cứ kiểm thử từng giai đoạn
- không xem là canonical mặc định

## 3. Các tài liệu hiện có nhưng không còn nên coi là “nguồn sự thật duy nhất”

### `README.md`

- còn hữu ích như tài liệu giới thiệu dự án và bối cảnh sản phẩm
- có nội dung mang tính đề tài/nghiên cứu nhiều hơn là onboarding thực thi hiện tại

### `docs/01-README.md`

- là snapshot tài liệu cũ
- hiện chứa khẳng định không còn đúng hoàn toàn, ví dụ nói chỉ còn “8 file chuẩn” và `docs/` đã được gộp/xóa
- chỉ dùng làm tài liệu lịch sử/tham khảo

### `de-tai/README.md`

- là index cho nhánh tài liệu học thuật
- không nên dùng để suy ra task queue, script hiện hành hoặc trạng thái sửa lỗi mới nhất

## 4. Luồng đọc đề xuất cho người tiếp quản

### Nếu mục tiêu là tiếp quản và sửa dự án

Đọc theo thứ tự:

1. `CANONICAL_DOCS.md`
2. `PROJECT_AUDIT.md`
3. `CORE_PRODUCT_FLOW.md`
4. `TASK_QUEUE.md`
5. `CHANGELOG_PROGRESS.md`
6. `BUGS_BOTTLENECKS.md`
7. `INSTALL.md`

### Nếu mục tiêu là hiểu nghiệp vụ và bài toán sản phẩm

Đọc theo thứ tự:

1. `README.md`
2. `CORE_PRODUCT_FLOW.md`
3. `docs/SYSTEM_FLOWS_DIAGRAM.md`
4. `de-tai/README.md`
5. các file trọng yếu trong `de-tai/`

### Nếu mục tiêu là nghiên cứu, báo cáo hoặc bảo vệ đề tài

Đọc theo thứ tự:

1. `de-tai/README.md`
2. `de-tai/00-MUC-LUC.md`
3. chuỗi `de-tai/01-*` đến `de-tai/12-*`

## 5. Quy tắc cập nhật tài liệu từ nay

- Khi thay đổi task hoặc trạng thái thực thi, cập nhật `TASK_QUEUE.md` và/hoặc nhóm docs RC/smoke đang active nếu liên quan release gate
- Khi phát hiện rủi ro mới hoặc contract drift mới, cập nhật `PROJECT_AUDIT.md` và tài liệu nghiệp vụ/liên quan nếu cần
- Không tự tạo thêm README/index mới nếu nội dung chỉ lặp lại file canonical đã có
- Nếu buộc phải tạo tài liệu snapshot theo đợt, ghi rõ đó là `historical` hoặc `report`, không gắn nhãn canonical
- Tài liệu historical/report ở root nên được chuyển vào `docs/archive/root-legacy/` để giữ root gọn và tránh nhầm với tài liệu active

## 6. Kết luận

Nguồn sự thật hiện tại của repo này không nằm ở một README cũ duy nhất, mà nằm ở bộ tài liệu điều hành ở root repo. File này tồn tại để chốt lại điều đó và giúp người tiếp quản vào đúng tài liệu ngay từ đầu.
