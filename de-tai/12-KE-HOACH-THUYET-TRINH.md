# KẾ HOẠCH THUYẾT TRÌNH CÔNG TRÌNH (UNITECH 2025–2026)

> Mục tiêu: giúp nhóm trình bày đúng trọng tâm, demo trơn tru, và trả lời Q&A theo đúng phạm vi **thiết kế** của hệ thống UniAct.

---

## 1) Thời lượng & cấu trúc đề xuất (15–20 phút)

- 0:00–0:45 — Mở đầu: đề tài, bối cảnh, vấn đề thực tế
- 0:45–2:30 — Mục tiêu, đối tượng sử dụng, phạm vi triển khai (LAN/offline)
- 2:30–6:30 — Giải pháp: kiến trúc, dữ liệu, bảo mật/phân quyền
- 6:30–13:30 — Demo luồng chính (3 vai trò)
- 13:30–16:30 — Kết quả/đánh giá + kiểm thử + khả năng ứng dụng
- 16:30–20:00 — Kết luận + hướng phát triển + Q&A

---

## 2) Outline slide (10–12 slide)

1. **Tiêu đề công trình**
   - Tên đề tài, tên sản phẩm (UniAct), nhóm tác giả, đơn vị

2. **Bối cảnh & bài toán**
   - Quản lý hoạt động/điểm danh/thi đua/khen thưởng thủ công
   - Nhu cầu: minh bạch, truy vết, giảm sai sót, chạy offline

3. **Mục tiêu & phạm vi**
   - 3 vai trò: Admin/Teacher/Student
   - Offline trên LAN; không phụ thuộc Internet

4. **Giải pháp tổng quan**
   - Các module dự kiến: Activities, Approvals, Attendance/QR, Scoring, Bonus, Awards, Reports/Export, Alerts/Notifications, Audit logs

5. **Kiến trúc kỹ thuật**
   - Next.js App Router (tích hợp API routes trong cùng dự án)
   - SQLite

6. **Bảo mật & phân quyền**
   - JWT cookie HTTP-only + RBAC
   - Audit logs cho hành động quan trọng
   - (Tùy chọn) Xác thực nâng cao theo nhu cầu triển khai

7. **Mô hình dữ liệu (tóm tắt)**
   - Users/Classes/Activities/Participations
   - Attendance + QR sessions
   - Scores + Bonus + Awards

8. **Demo 1 — Teacher**
   - Tạo hoạt động → gửi duyệt → tạo QR session

9. **Demo 2 — Student**
   - Đăng ký hoạt động → quét QR điểm danh → xem lịch sử/điểm

10. **Demo 3 — Admin**
   - Duyệt hoạt động
   - Duyệt bonus/award (nếu bật) + xem audit logs
   - Xuất báo cáo (CSV/XLSX/PDF tuỳ luồng)

11. **Kiểm thử & chất lượng**
   - Kế hoạch kiểm thử cho các luồng chính: attendance/approval/bonus/export/health…

12. **Kết luận & hướng phát triển**
   - Những gì đã đạt
   - Các hướng mở rộng (không cam kết): chuẩn hoá response API, tăng tải, tối ưu DB, mở rộng tích hợp

---

## 3) Kịch bản demo (khuyến nghị)

### 3.1 Chuẩn bị trước khi demo
- Chuẩn bị dữ liệu demo (khởi tạo CSDL + dữ liệu mẫu)
- Đảm bảo có sẵn 3 tài khoản demo: admin/teacher/student
- Mở sẵn 3 cửa sổ trình duyệt (hoặc 1 cửa sổ + 2 profile):
  - Admin
  - Teacher
  - Student

### 3.2 Luồng demo ngắn gọn (đúng trọng tâm UniAct)
1) Teacher đăng nhập → tạo hoạt động (draft) → gửi duyệt
2) Admin đăng nhập → duyệt hoạt động
3) Teacher → tạo QR session cho hoạt động đã duyệt
4) Student → quét QR/điểm danh
5) Admin/Teacher → xem danh sách tham gia/điểm danh → xuất báo cáo

### 3.3 Demo mở rộng (chỉ khi còn thời gian)
- Bonus module: tạo đề xuất/duyệt cộng điểm, xem báo cáo bonus
- Awards: gợi ý/duyệt khen thưởng, xem lịch sử
- Xác thực nâng cao (nếu đơn vị triển khai có yêu cầu)

---

## 4) Bộ câu hỏi Q&A và hướng trả lời (gợi ý)

- **Tại sao chọn SQLite?**
  - Phù hợp triển khai LAN/offline, đơn giản vận hành, dễ backup; có thể nâng cấp DB khi mở rộng.

- **Chống gian lận điểm danh QR thế nào?**
  - QR theo phiên (session token) có hạn dùng/giới hạn lượt quét; ghi nhận lịch sử; ràng buộc theo vai trò.

- **Tính điểm và cộng điểm có minh bạch không?**
  - Có công thức/logic tính điểm, có lịch sử và audit logs; có luồng duyệt (tuỳ cấu hình).

- **Nếu nhiều người dùng cùng lúc?**
  - Thiết kế theo web app + SQLite; hướng phát triển: đo tải, tối ưu query/index, tách DB khi cần.

---

## 5) Checklist nộp bài (nhắc nhanh)

- Đã điền đúng thông tin bìa/lời cam đoan
- Mục lục và thứ tự đóng cuốn đúng hướng dẫn
- Phần III nêu rõ triển khai offline, bảo mật, kiểm thử
- Tài liệu tham khảo có ngày truy cập
- Phụ lục có hình ảnh minh họa (ảnh chụp màn hình, sơ đồ)
