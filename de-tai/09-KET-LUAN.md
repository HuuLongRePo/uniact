# KẾT LUẬN

---

## 7.1. KẾT QUẢ ĐẠT ĐƯỢC

### 7.1.1. Về mục tiêu đề tài

Đề tài **“Hệ Thống Quản Lý Hoạt Động Ngoại Khóa & Phong Trào Thanh Niên”** đề xuất và thiết kế một hệ thống web phục vụ quản lý hoạt động theo quy trình, hướng tới chuẩn hóa dữ liệu và giảm phụ thuộc vào các cách quản lý rời rạc.

Các nội dung chính trong phạm vi công trình (ở mức phân tích–thiết kế):

- Thiết kế luồng nghiệp vụ xuyên suốt cho quản lý hoạt động (tạo/lập kế hoạch, duyệt, tham gia, điểm danh, tổng hợp kết quả).
- Đề xuất mô hình quản trị người dùng và phân quyền theo vai trò.
- Định nghĩa dữ liệu và luồng xử lý phục vụ theo dõi, tổng hợp và báo cáo ở mức cơ bản.

### 7.1.2. Về yêu cầu bài toán

Thiết kế hướng tới đáp ứng các yêu cầu cốt lõi từ bài toán quản lý hoạt động ngoại khóa và phong trào trong môi trường nhà trường (trong phạm vi công trình và kế hoạch triển khai):

| Yêu cầu | Mô tả theo thiết kế |
|---|---|
| Quản lý hoạt động | Thiết kế luồng theo vai trò, hỗ trợ thao tác quản trị và theo dõi |
| Điểm danh (QR) | Thiết kế hỗ trợ QR theo nghiệp vụ hệ thống |
| Tổng hợp điểm/thi đua | Thiết kế cơ chế ghi nhận và tổng hợp dữ liệu theo mô hình đề xuất |
| Khen thưởng | Thiết kế cấu trúc dữ liệu/luồng xử lý khen thưởng |
| Báo cáo | Thiết kế các màn hình/danh sách phục vụ tổng hợp và tra cứu |
| Bảo mật & phân quyền | Thiết kế cơ chế xác thực và phân quyền theo vai trò |
| Hiệu năng | Định hướng đáp ứng vận hành nội bộ; khuyến nghị đo kiểm theo môi trường triển khai |

### 7.1.3. Về đóng góp

- **Đóng góp thực tiễn:** cung cấp một giải pháp số hóa cho quản lý hoạt động ngoại khóa/phong trào với dữ liệu tập trung và luồng xử lý rõ ràng.
- **Đóng góp kỹ thuật:** đề xuất mô hình ứng dụng web full-stack với TypeScript, tổ chức mã nguồn và dữ liệu theo hướng dễ mở rộng/bảo trì.
- **Đóng góp học thuật:** tổng hợp phân tích nghiệp vụ, thiết kế hệ thống và tài liệu triển khai/kiểm thử để tham khảo.

---

## 7.2. HẠN CHẾ CỦA ĐỀ TÀI

Trong phạm vi công trình, vẫn còn một số hạn chế cần tiếp tục hoàn thiện khi bước sang giai đoạn triển khai:

- **Đánh giá định lượng:** chưa có kiểm thử tải và bộ số liệu đo lường chuẩn trên môi trường triển khai thực tế.
- **Tính năng:** một số báo cáo/thống kê và nhu cầu xuất dữ liệu theo biểu mẫu có thể chưa bao phủ đầy đủ.
- **Vận hành:** giám sát, cảnh báo vận hành, quy trình sao lưu/khôi phục và tài liệu sử dụng có thể cần chuẩn hóa thêm.

---

## 7.3. HƯỚNG PHÁT TRIỂN

Các hướng phát triển có thể xem xét trong giai đoạn tiếp theo (tùy định hướng của nhóm và yêu cầu nhà trường):

- Hoàn thiện kiểm thử (tự động), xây dựng kịch bản kiểm thử tải và quy trình phát hành.
- Mở rộng báo cáo/thống kê và các chức năng xuất dữ liệu theo nhu cầu thực tế.
- Cải thiện trải nghiệm người dùng dựa trên phản hồi sử dụng.
- Tăng cường vận hành: giám sát, nhật ký, cảnh báo và quy trình sao lưu/khôi phục.

---

## 7.4. LỜI CẢM ƠN VÀ TÂM SỰ

### 7.4.1. Thành quả

Trong quá trình thực hiện công trình, nhóm đã hoàn thiện bộ tài liệu phân tích–thiết kế và kế hoạch triển khai/kiểm thử cho các luồng chính (nghiệp vụ, thiết kế dữ liệu, thiết kế module). Đây là nền tảng để tiếp tục hiện thực hóa và triển khai rộng hơn khi có điều kiện.

### 7.4.2. Bài học kinh nghiệm

- **Kỹ thuật:** chuẩn hóa kiểu dữ liệu và cấu trúc mã nguồn giúp giảm lỗi và dễ mở rộng.
- **Quy trình:** chia nhỏ nhiệm vụ, kiểm tra sớm và cập nhật tài liệu song song giúp hạn chế “lệch” giữa tài liệu và mã nguồn.
- **Làm việc nhóm:** thống nhất quy ước và phản hồi thường xuyên giúp tiến độ ổn định hơn.

---

## 7.5. KẾT LUẬN TỔNG QUAN

Đề xuất hệ thống **UniAct** là một hướng tiếp cận ứng dụng công nghệ thông tin vào quản lý hoạt động ngoại khóa và phong trào thanh niên theo hướng dữ liệu tập trung, quy trình rõ ràng và phân quyền theo vai trò. Trong các bước tiếp theo, việc đo kiểm định lượng và hoàn thiện vận hành sẽ là trọng tâm để nâng độ tin cậy khi triển khai thực tế.

---


