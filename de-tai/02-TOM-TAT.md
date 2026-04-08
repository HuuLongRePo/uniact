# TÓM TẮT CÔNG TRÌNH

---

## TÓM TẮT (TIẾNG VIỆT)

**Đề tài:** Hệ Thống Quản Lý Hoạt Động Ngoại Khóa & Phong Trào Thanh Niên

**Bối cảnh:** Công tác quản lý hoạt động ngoại khóa và phong trào thanh niên tại nhiều đơn vị giáo dục thường gặp khó khăn do quy trình thủ công, thiếu đồng bộ, điểm danh chưa chính xác, tổng hợp điểm thi đua phức tạp và thiếu công cụ theo dõi kịp thời. Với yêu cầu bảo mật đặc thù, hệ thống cần vận hành trong mạng nội bộ và hạn chế phụ thuộc Internet.

**Mục tiêu:** Xây dựng hệ thống web quản lý hoạt động ngoại khóa và phong trào thanh niên, tự động hóa các bước: tạo/phê duyệt hoạt động, điểm danh, tổng hợp điểm thi đua và quản lý khen thưởng, hỗ trợ theo dõi và cảnh báo kịp thời.

**Phương pháp:** Hệ thống được xây dựng bằng Next.js (App Router), React, TypeScript và SQLite. Việc đăng nhập dùng JWT lưu trong cookie HTTP-only; phân quyền theo vai trò (Admin/Teacher/Student); dữ liệu đầu vào được kiểm tra; điểm danh dùng QR theo phiên để hạn chế gian lận. Ngoài các chức năng chính, hệ thống có luồng phê duyệt, cơ chế cộng điểm theo quy tắc, nhật ký thao tác, thông báo/cảnh báo và xuất báo cáo.

**Kết quả:** 
- Quản lý hoạt động (tạo, đăng ký/tham gia, phê duyệt, theo dõi trạng thái)
- Điểm danh bằng QR Code và các hình thức hỗ trợ khác theo nghiệp vụ
- Tổng hợp điểm theo công thức và cấu hình (tự động tính điểm sau đánh giá) và ghi nhận lịch sử
- Cộng điểm theo quy tắc (bonus engine), có giới hạn (cap) và luồng duyệt/đề xuất theo cấu hình
- Quy trình đề xuất/phê duyệt khen thưởng và tra cứu lịch sử (award types, award suggestions)
- Báo cáo thống kê, dashboard/charts và xuất dữ liệu (CSV/XLSX/PDF theo từng báo cáo/luồng)
- Bảo mật bằng xác thực và phân quyền; có nhật ký thao tác (audit logs) cho các hành động quan trọng


**Ý nghĩa:** Hệ thống giúp chuẩn hóa và số hóa quy trình quản lý hoạt động ngoại khóa và phong trào thanh niên, giảm phụ thuộc thao tác thủ công, tăng minh bạch dữ liệu và khả năng theo dõi tiến độ thực hiện.

**Từ khóa:** Hoạt động ngoại khóa, Phong trào thanh niên, Phê duyệt, QR Code, Điểm danh, Thi đua, Khen thưởng, Next.js, SQLite, JWT.

---

## LƯU Ý

- Nếu trường yêu cầu Abstract tiếng Anh, nhóm có thể viết tương đương dựa trên phần tóm tắt tiếng Việt.
- Tóm tắt nên gọn (khoảng 1–2 trang), đi theo mạch: Bối cảnh → Mục tiêu → Phương pháp → Kết quả → Ý nghĩa.
- Trình bày theo quy định định dạng của đơn vị.
