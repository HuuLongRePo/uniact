# HƯỚNG DẪN CHUYỂN ĐỔI TÀI LIỆU

> **Mục đích:** Chuyển tệp Markdown (.md) thành Word (.docx) và PowerPoint (.pptx)

---

## PHƯƠNG ÁN KHUYẾN NGHỊ

### Phương án 1: Sử dụng Pandoc

**Ưu điểm:**
- Tự động chuyển đổi format
- Giữ nguyên cấu trúc (tiêu đề, bảng, danh sách)
- Hỗ trợ trích dẫn (nếu có)
- Chuyển hàng loạt nhiều tệp

**Cài đặt:**

**Windows:**
```bash
# Tải từ https://pandoc.org/installing.html
# Hoặc dùng Chocolatey
choco install pandoc

# Kiểm tra cài đặt
pandoc --version
```

**Sử dụng:**

```bash
# Chuyển 1 file sang Word
cd "C:\Users\nhuul\OneDrive\Máy tính\uniact\do-an"
pandoc 03-MO-DAU.md -o 03-MO-DAU.docx

# Chuyển tất cả tệp
for %f in (*.md) do pandoc "%f" -o "%~nf.docx"

# Với custom template
pandoc 03-MO-DAU.md --reference-doc=template.docx -o 03-MO-DAU.docx
```

**Tạo file Word template (template.docx):**
1. Mở Word → Tạo file mới
2. Định dạng:
   - Font: Times New Roman 13
   - Line spacing: 1.5
   - Margins: Top 3cm, Bottom 2cm, Left 3cm, Right 2cm
   - Headings: Bold, kích thước lớn hơn
3. Save as `template.docx`
4. Dùng `--reference-doc=template.docx` khi chuyển đổi

---

### Phương án 2: Markdown Preview Enhanced (VS Code)

**Ưu điểm:**
- Không cần cài thêm tool
- Preview trực tiếp trong VS Code
- Export dễ dàng

**Cài đặt:**

1. Mở VS Code
2. Extensions → Tìm "Markdown Preview Enhanced"
3. Install

**Sử dụng:**

1. Mở file `.md` trong VS Code
2. `Ctrl + K, V` → Mở preview
3. Nhấp chuột phải trong preview → "Export" (Xuất)
4. Chọn định dạng: Word, PDF, HTML

---

### Phương án 3: Typora

**Ưu điểm:**
- WYSIWYG editor
- Export trực tiếp
- Xem trước chính xác

**Cài đặt:**
```bash
# Tải từ https://typora.io/
# Cài đặt bình thường
```

**Sử dụng:**
1. Mở file `.md` bằng Typora
2. File → Export → Word (.docx)
3. Chọn vị trí lưu

---

### Phương án 4: Copy/Paste thủ công (dự phòng)

**Khi nào dùng:** Khi không cài được tools trên

**Bước thực hiện:**

1. **Mở file Markdown:**
   - VS Code → Mở file `.md`
   - Hoặc xem trên GitHub

2. **Copy nội dung:**
   - `Ctrl + A` → `Ctrl + C`

3. **Paste vào Word:**
   - Mở Word → `Ctrl + V`
   - Chọn "Chỉ giữ văn bản" hoặc "Gộp định dạng"

4. **Format lại:**
   - Headings: Bold, font size lớn
   - Bảng: Insert Table → Copy dữ liệu
   - Lists: Bullets hoặc Numbering
   - Code blocks: Font Courier New, background xám

---

## CHUYỂN ĐỔI SANG POWERPOINT (NẾU CẦN)

### Phương án: Thủ công (khuyến nghị)

**Bước thực hiện:**

1. **Mở PowerPoint:**
   - Tạo presentation mới
   - Chọn template/bố cục theo yêu cầu của trường

2. **Soạn nội dung thuyết trình:**
   - Tóm tắt theo các phần: bối cảnh, mục tiêu, kiến trúc, demo, kết quả, kết luận
   - Ưu tiên nội dung ngắn gọn, đúng phạm vi chức năng của hệ thống

3. **Thêm hình ảnh:**
   - Insert → Pictures
   - Chọn từ `do-an/images/`
   - Căn chỉnh kích thước phù hợp bố cục

4. **Định dạng:**
   - Thống nhất font chữ và cỡ chữ
   - Đảm bảo dễ đọc khi trình chiếu

5. **Áp dụng theme:**
   - Design → Themes
   - Màu sắc và font chữ theo template của trường

---

## TẠO HÌNH ẢNH & BIỂU ĐỒ

### 1. Kiến trúc hệ thống

**Tool:** draw.io (https://app.diagrams.net/)

**Bước thực hiện:**
1. Mở draw.io
2. Chọn template: "Software Architecture"
3. Vẽ mô hình 3 lớp:
   - **Giao diện:** React components
   - **Xử lý nghiệp vụ:** API và xác thực
   - **Dữ liệu:** SQLite
4. Export: File → Export as → PNG (300 DPI)

**Lưu vào:** `do-an/images/architecture/system-architecture.png`

---

### 2. Sơ đồ ERD cơ sở dữ liệu

**Tool:** dbdiagram.io (https://dbdiagram.io/)

**Bước thực hiện:**
1. Mở dbdiagram.io
2. Nhập schema (tham khảo `schema-dump.json` và thư mục `migrations/`)
3. Chỉnh bố cục
4. Export: PNG (High Quality)

**Lưu vào:** `do-an/images/architecture/database-erd.png`

**Hoặc dùng SQL:**
```sql
-- Copy schema từ database.ts
-- Paste vào dbdiagram.io
-- Auto generate ERD
```

---

### 3. Ảnh minh họa demo

**Tool:** Built-in Windows (Win + Shift + S)

**Danh sách ảnh minh họa:**

- [ ] `admin-dashboard.png` - Quản trị viên tổng quan
- [ ] `teacher-create-activity.png` - Giáo viên tạo hoạt động
- [ ] `teacher-qr-session.png` - Tạo mã QR điểm danh
- [ ] `student-scan-qr.png` - Xác nhận điểm danh
- [ ] `scoring-report.png` - Tổng hợp điểm/thi đua (nếu có)
- [ ] `awards-management.png` - Quản lý khen thưởng

Lưu ý: Chỉ đưa các ảnh minh họa đúng theo chức năng hiện có của hệ thống.

**Hướng dẫn chụp:**
1. `Win + Shift + S` → Chọn vùng
2. Paste vào Paint → Crop
3. Lưu PNG (không mất dữ liệu)
4. Lưu vào `do-an/images/screenshots/`

**Lưu ý:**
- Độ phân giải: đủ rõ để đọc chữ (khuyến nghị Full HD trở lên)
- Định dạng: PNG (tránh JPG nếu chữ bị nhòe)
- Tên file: snake_case (admin_dashboard.png)

---

### 4. Biểu đồ minh họa (khuyến nghị)

Nếu cần minh họa trong báo cáo, chỉ nên dùng biểu đồ **định tính** hoặc biểu đồ dựa trên dữ liệu có thể kiểm chứng (kèm nguồn/ghi chú môi trường).

**Tool:** Excel hoặc Google Sheets

**Gợi ý dạng biểu đồ:**
1. Cột (Column Chart) để minh họa so sánh theo nhóm
2. Đường (Line Chart) để minh họa xu hướng theo thời gian

**Xuất ảnh:** Lưu PNG

**Lưu vào:** `do-an/images/charts/comparison.png` (nếu có)

---

## TỔ CHỨC TỆP SAU KHI CHUYỂN ĐỔI

```
do-an/
├── word/                          # Files Word (.docx)
│   ├── BAO-CAO-CHINH.docx        # Gộp nội dung báo cáo
│   ├── 01-TRANG-BIA.docx
│   ├── 02-TOM-TAT.docx
│   ├── 03-MO-DAU.docx
│   ├── 04-CO-SO-LY-THUYET.docx
│   ├── 05-PHAN-TICH.docx
│   ├── 06-THIET-KE.docx
│   ├── 07-THUC-HIEN.docx
│   ├── 08-KET-QUA.docx
│   └── 09-KET-LUAN.docx
│
├── powerpoint/                    # File PowerPoint (.pptx)
│   └── BAO-CAO-THUYET-TRINH.pptx # Tạo thủ công theo template
│
├── images/                        # Hình ảnh
│   ├── architecture/
│   ├── screenshots/
│   ├── charts/
│   └── mockups/
│
└── pdf/                           # Export PDF (final)
    ├── BAO-CAO-CHINH.pdf
   └── BAO-CAO-THUYET-TRINH.pdf
```

---

## DANH SÁCH KIỂM TRA HOÀN THÀNH

### Chuyển đổi Word

- [ ] Tất cả files `.md` → `.docx`
- [ ] Format đúng (font, spacing, margins)
- [ ] Thêm số trang (bắt đầu từ Mở đầu)
- [ ] Thêm header/footer
- [ ] Insert hình ảnh vào đúng vị trí
- [ ] Tạo mục lục tự động
- [ ] Kiểm tra trích dẫn/tài liệu tham khảo
- [ ] Gộp thành 1 file `BAO-CAO-CHINH.docx`

### Chuẩn bị thuyết trình (nếu cần)

- [ ] Tạo bài thuyết trình theo template/bố cục yêu cầu
- [ ] Thêm hình ảnh/biểu đồ minh họa (nếu có)
- [ ] Kiểm tra cỡ chữ và khả năng đọc khi trình chiếu
- [ ] Xuất ra PDF (nếu cần nộp)

### Tạo hình ảnh

- [ ] Sơ đồ kiến trúc hệ thống
- [ ] Sơ đồ ERD cơ sở dữ liệu
- [ ] Ảnh minh họa giao diện (nếu có)
- [ ] Biểu đồ/thống kê minh họa (nếu có)
- [ ] Phác thảo giao diện (nếu cần)

### Xuất PDF (bản cuối)

- [ ] Word → PDF (File → Save As → PDF)
- [ ] PowerPoint → PDF
- [ ] Kiểm tra chất lượng PDF
- [ ] Tạo bookmark theo từng phần/mục (nếu cần)

---

## XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi 1: Bảng bị vỡ khi convert

**Nguyên nhân:** Markdown table syntax phức tạp

**Giải pháp:**
```bash
# Dùng Pandoc với filter
pandoc input.md -o output.docx --filter pandoc-tablenos

# Hoặc copy bảng thủ công vào Word
```

### Lỗi 2: Code blocks mất format

**Nguyên nhân:** Word không hỗ trợ syntax highlighting

**Giải pháp:**
1. Copy code
2. Paste vào Word
3. Font: Courier New
4. Background: Gray (RGB 240,240,240)
5. Border: Thin

### Lỗi 3: Hình ảnh bị mờ

**Nguyên nhân:** DPI thấp

**Giải pháp:**
- Export images ở 300 DPI
- Pandoc: `--dpi=300`
- Screenshots: Full HD (1920x1080)

### Lỗi 4: PowerPoint lỗi font/format

**Nguyên nhân:** Font không đồng bộ hoặc template khác chuẩn.

**Giải pháp:**
- Dùng template chính thức của trường (mẫu trình bày)
- Nhúng font khi lưu file PowerPoint (File → Options → Save → Embed fonts)
- Tránh copy trực tiếp code block; thay bằng ảnh/code screenshot khi cần

---

## 📞 LIÊN HỆ HỖ TRỢ

Nếu gặp khó khăn:
1. Đọc lại hướng dẫn
2. Google "pandoc markdown to word"
3. Xem YouTube tutorials
4. Hỏi bạn cùng lớp/GVHD

---


