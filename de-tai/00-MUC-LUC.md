# MỤC LỤC CÔNG TRÌNH DỰ THI UNITECH

> **Cuộc thi:** Sinh viên nghiên cứu khoa học - UniTECH, năm học **2025 - 2026**  
> **Đề tài:** Hệ Thống Quản Lý Hoạt Động Ngoại Khóa & Phong Trào Thanh Niên  
> **Tên phần mềm/sản phẩm công nghệ:** UniAct (có thể đổi theo tên chính thức của nhóm)  
> **Nhóm tác giả:** [Tên sinh viên 1] - [Tên sinh viên 2] (nếu có)  
> **Lớp:** [Tên lớp]  
> **Đơn vị hướng dẫn (nếu có):** [Tên GVHD/Đơn vị]  
> **Đơn vị thụ hưởng:** [Trường/Khoa/Phòng/Ban]

---

## THỨ TỰ ĐÓNG CUỐN (THEO HƯỚNG DẪN)

1) Bìa chính, bìa lót, lời cam đoan; mục lục  
2) **Phần I. Thông tin chung**  
3) **Phần II. Thông tin về thiết kế, xây dựng Phần mềm/sản phẩm công nghệ**  
4) **Phần III. Thông tin về triển khai ứng dụng Phần mềm/sản phẩm công nghệ**  
5) **Phần IV. Hướng dẫn sử dụng Phần mềm/sản phẩm công nghệ**  
6) Danh mục Tài liệu tham khảo  
7) Phụ lục (Hình ảnh giao diện, đoạn mã minh họa, sơ đồ…)

Lưu ý: bộ file trong thư mục `de-tai/` được viết dạng Markdown để thuận tiện chuyển sang Word/PDF; khi đóng cuốn cần sắp xếp theo thứ tự trên.

---

## CẤU TRÚC TÀI LIỆU

### PHẦN 1: NỘI DUNG CHÍNH (CHUYỂN SANG WORD/PDF)

| STT | File | Nội dung | Trang |
|-----|------|----------|-------|
| 1 | `01-TRANG-BIA.md` | Bìa chính, bìa lót, lời cam đoan | 2 |
| 2 | `02-TOM-TAT.md` | Tóm tắt công trình | 2 |
| 3 | `03-MO-DAU.md` | **Phần I**: Thông tin chung | 6 |
| 4 | `04-CO-SO-LY-THUYET.md` | **Phần II**: Tổng quan giải pháp, kiến trúc, công nghệ (nền tảng) | 18 |
| 5 | `05-PHAN-TICH-HE-THONG.md` | **Phần II**: Phân tích yêu cầu, use cases | 25 |
| 6 | `06-THIET-KE-HE-THONG.md` | **Phần II**: Thiết kế CSDL, module, API | 30 |
| 7 | `07-CONG-NGHE-THUC-HIEN.md` | **Phần III**: Cài đặt & triển khai, bảo mật (kỹ thuật) | 22 |
| 8 | `08-KET-QUA-DANH-GIA.md` | **Phần III**: Kết quả kiểm thử/đánh giá, khả năng ứng dụng | 15 |
| 9 | `HUONG-DAN-SU-DUNG.md` | **Phần IV**: Hướng dẫn sử dụng phần mềm/sản phẩm | 12 |
| 10 | `09-KET-LUAN.md` | Kết luận, hướng phát triển | 5 |
| 11 | `10-TAI-LIEU-THAM-KHAO.md` | Tài liệu tham khảo | 3 |
| 12 | `11-PHU-LUC.md` | Phụ lục (minh họa, trích đoạn) | 10 |

Lưu ý: số trang chỉ ước lượng và sẽ thay đổi theo cách dàn trang khi chuyển sang Word/PDF.

---

### PHẦN 2: TÀI LIỆU BỔ TRỢ

| STT | File | Nội dung | Mục đích |
|-----|------|----------|----------|
| 1 | `README.md` | Tổng quan bộ tài liệu | Định hướng viết và rà soát |
| 2 | `HUONG-DAN-CHUYEN-DOI.md` | Hướng dẫn chuyển đổi | Chuyển Markdown → Word/PPT |
| 3 | `NHAT-KY-THUC-HIEN.md` | Nhật ký thực hiện | Tiến độ phát triển |
| 4 | `12-KE-HOACH-THUYET-TRINH.md` | Kế hoạch thuyết trình | Outline slide + demo + Q&A |

---

### PHẦN 3: HÌNH ẢNH & BIỂU ĐỒ (KHUYẾN NGHỊ)

Khi hoàn thiện bản nộp Word/PDF, nên bổ sung phụ lục hình ảnh (ảnh giao diện, sơ đồ kiến trúc/ERD, luồng nghiệp vụ…) và đánh số theo quy định của đơn vị.

---

## HƯỚNG DẪN SỬ DỤNG

### Bước 1: Đọc tất cả tệp Markdown

Tất cả tệp trong thư mục `de-tai/` là bộ nội dung để chuyển sang Word/PDF.

### Bước 2: Chuyển Sang Word

**Cách 1: Sử dụng Pandoc (khuyến nghị)**
```bash
# Cài đặt Pandoc
# https://pandoc.org/installing.html

# Chuyển 1 tệp
pandoc 03-MO-DAU.md -o 03-MO-DAU.docx

# Chuyển tất cả tệp trong thư mục
for file in *.md; do
  pandoc "$file" -o "${file%.md}.docx"
done
```

**Cách 2: Copy/Paste thủ công**
1. Mở file `.md` bằng VS Code
2. Copy nội dung
3. Paste vào Word
4. Format lại (font, spacing, page break)

**Cách 3: Markdown Preview Enhanced (VS Code)**
1. Cài extension: Markdown Preview Enhanced
2. Nhấp chuột phải file `.md` → Preview
3. Nhấp chuột phải trong preview → Export → Word

### Bước 3: Tạo PowerPoint (nếu cần)

**Cách: Thủ công (khuyến nghị)**
1. Tạo bài thuyết trình theo template/bố cục của trường
2. Tóm tắt nội dung chính theo từng phần (bối cảnh, mục tiêu, kiến trúc, demo, kết luận)
3. Thêm hình ảnh minh họa từ thư mục `images/` (nếu có)

### Bước 4: Tạo Biểu Đồ

**Tools gợi ý:**
- **draw.io** (https://app.diagrams.net/) - Vẽ sơ đồ kiến trúc
- **dbdiagram.io** (https://dbdiagram.io/) - Vẽ ERD cơ sở dữ liệu
- **Figma** (https://figma.com/) - Phác thảo giao diện
- **Excel** - Biểu đồ thống kê

### Bước 5: Chụp ảnh minh họa giao diện

**Danh sách ảnh minh họa cần có:**
- [ ] Đăng nhập
- [ ] Danh sách hoạt động
- [ ] Tạo hoạt động (Giáo viên)
- [ ] Tạo mã QR điểm danh (Giáo viên)
- [ ] Xác nhận điểm danh (Sinh viên)
- [ ] Tổng hợp điểm/khen thưởng (nếu có)
- [ ] Quản trị người dùng (Quản trị viên)

---

## DANH SÁCH KIỂM TRA HOÀN THÀNH

### Tài Liệu Word/PDF (Nội dung chính)

- [ ] Bìa chính + bìa lót + lời cam đoan + mục lục
- [ ] Phần I: Thông tin chung
- [ ] Phần II: Thiết kế, xây dựng phần mềm/sản phẩm
- [ ] Phần III: Triển khai ứng dụng + bảo mật + kiểm thử/đánh giá
- [ ] Phần IV: Hướng dẫn sử dụng
- [ ] Tài liệu tham khảo
- [ ] Phụ lục

### Tài Liệu Bổ Trợ

- [ ] Hướng dẫn sử dụng
- [ ] Hướng dẫn chuyển đổi
- [ ] Nhật ký thực hiện

### Hình Ảnh & Biểu Đồ

- [ ] Sơ đồ kiến trúc hệ thống
- [ ] Sơ đồ CSDL (ERD)
- [ ] Sơ đồ luồng API / luồng nghiệp vụ
- [ ] Sơ đồ triển khai
- [ ] Ảnh minh họa giao diện (nếu có)
- [ ] Biểu đồ/thống kê minh họa (nếu có)
- [ ] Phác thảo giao diện (nếu cần)

---

## CHUẨN BỊ BẢO VỆ

### Phân bổ thời lượng bảo vệ (20 phút)

| Thời Gian | Nội Dung |
|-----------|----------|
| 0-2 phút | Giới thiệu đề tài, mục tiêu |
| 2-5 phút | Bối cảnh, bài toán thực tế |
| 5-8 phút | Giải pháp, kiến trúc |
| 8-13 phút | Demo tính năng chính |
| 13-16 phút | Kết quả, đánh giá |
| 16-18 phút | Kết luận, hướng phát triển |
| 18-20 phút | Hỏi đáp |

### Câu Hỏi Thường Gặp

**1. Tại sao chọn SQLite thay vì MySQL/PostgreSQL?**
- Hệ thống mạng LAN nội bộ, không cần server riêng
- SQLite file-based, dễ backup/restore
- Dễ triển khai, phù hợp phạm vi công trình và môi trường nội bộ

**2. QR Code chống gian lận như thế nào?**
- Mã QR có thông tin xác thực và thời hạn sử dụng.
- Có kiểm tra điều kiện hợp lệ theo nghiệp vụ (ví dụ: lớp/đối tượng được tham gia).
- Có thể ghi nhận lịch sử thao tác/điểm danh để phục vụ truy vết.

**3. Tính điểm tự động hoạt động ra sao?**
- Dữ liệu điểm được tổng hợp từ quá trình tham gia/điểm danh theo mô hình dữ liệu hiện có.
- Công thức và cách tính phụ thuộc cấu hình và mã nguồn của dự án.
- Hệ thống có cơ chế tạo cảnh báo theo quy tắc (nếu áp dụng) dựa trên dữ liệu tổng hợp.

**4. Hệ thống có đáp ứng quy mô sử dụng lớn không?**
- Ở phạm vi công trình, hệ thống ưu tiên chạy ổn định trong mạng nội bộ
- Khi cần mở rộng, có thể kiểm thử tải và tối ưu thêm truy vấn / chỉ mục theo số liệu đo thực tế

**5. Bảo mật như thế nào?**
- JWT authentication với HTTP-only cookies
- RBAC phân quyền chi tiết
- Nhật ký/audit logs phục vụ truy vết (nếu bật/áp dụng theo phạm vi)
- Dữ liệu hoàn toàn nội bộ, không ra Internet

---

## HỖ TRỢ

Nếu cần hỗ trợ thêm:
1. Đọc `../01-README.md` - Tổng quan dự án
2. Đọc `../03-DEVELOPMENT_GUIDE.md` - Hướng dẫn phát triển
3. Xem thư mục `../docs/` - Danh sách kiểm thử và UAT

---


