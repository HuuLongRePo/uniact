# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG UNIACT

---

## MỤC LỤC

1. [Giới thiệu](#1-giới-thiệu)
2. [Đăng nhập](#2-đăng-nhập)
3. [Hướng dẫn Admin](#3-hướng-dẫn-admin)
4. [Hướng dẫn Giáo viên](#4-hướng-dẫn-giáo-viên)
5. [Hướng dẫn Sinh viên](#5-hướng-dẫn-sinh-viên)
6. [Câu hỏi thường gặp](#6-câu-hỏi-thường-gặp)
7. [Khắc phục sự cố](#7-khắc-phục-sự-cố)

---

## 1. GIỚI THIỆU

### 1.1. UniAct là gì?

**UniAct** là hệ thống quản lý hoạt động ngoại khóa và thi đua dành cho Trường Đại học An Ninh Nhân Dân, giúp:

- Quản lý hoạt động tập trung theo vai trò.
- Hỗ trợ điểm danh bằng QR theo quy trình nghiệp vụ.
- Tổng hợp điểm/thi đua theo quy tắc cấu hình (nếu áp dụng).
- Hỗ trợ quy trình khen thưởng và cảnh báo (nếu có trong phạm vi triển khai).

### 1.2. Yêu cầu hệ thống

**Thiết bị:**
- Máy tính: Windows 10+, macOS 11+, Ubuntu 20.04+
- Điện thoại: iOS 14+, Android 8+
- Kết nối: Mạng nội bộ (tùy mô hình triển khai)

**Trình duyệt:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 1.3. Truy cập hệ thống

**URL:** `http://<server-host>:<port>` (do đơn vị triển khai cung cấp)

**3 vai trò người dùng:**
- **Admin**: Quản trị viên hệ thống
- **Teacher**: Giáo viên/GVCN
- **Student**: Sinh viên

---

## 2. ĐĂNG NHẬP

### 2.1. Đăng nhập lần đầu

**Bước 1:** Mở trình duyệt, truy cập `http://<server-host>:<port>`

**Bước 2:** Nhập thông tin:
- **Email**: `your-email@annd.edu.vn`
- **Mật khẩu**: Mật khẩu được cung cấp bởi Admin

**Bước 3:** Click **"Đăng nhập"**

### 2.2. Đổi mật khẩu

**Lần đầu đăng nhập, bạn nên đổi mật khẩu:**

1. Click vào avatar góc phải → **"Hồ sơ"**
2. Chọn **"Đổi mật khẩu"**
3. Nhập:
   - Mật khẩu cũ
   - Mật khẩu mới (theo chính sách mật khẩu của hệ thống)
   - Xác nhận mật khẩu mới
4. Click **"Lưu"**

### 2.3. Quên mật khẩu

**Liên hệ Admin để reset mật khẩu:**
- Email: admin@annd.edu.vn
- Điện thoại: 024.xxxx.xxxx

---

## 3. HƯỚNG DẪN ADMIN

### 3.1. Dashboard

**Trang chủ Admin hiển thị:**
- Thống kê tổng quan (Users, Activities, Attendance, Scores)
- Biểu đồ xu hướng hoạt động
- Top sinh viên
- Cảnh báo cần xử lý

### 3.2. Quản lý người dùng

#### 3.2.1. Xem danh sách

1. Menu bên trái → **"Người dùng"**
2. Sử dụng filter:
   - **Vai trò**: Admin / Teacher / Student
   - **Lớp**: AT18A, AT18B...
   - **Tìm kiếm**: Tên, email

#### 3.2.2. Thêm người dùng

**Thêm thủ công:**
1. Click **"Thêm người dùng"**
2. Nhập thông tin:
   - Email (unique)
   - Tên
   - Vai trò
   - Lớp (nếu là sinh viên)
3. Click **"Lưu"**

**Import CSV:**
1. Click **"Import CSV"**
2. Tải file mẫu: `users_template.csv`
3. Điền thông tin theo format:
   ```csv
   email,name,role,class_id
   student1@annd.edu.vn,Nguyễn Văn A,student,1
   teacher1@annd.edu.vn,Trần Thị B,teacher,
   ```
4. Upload file → **"Import"**

#### 3.2.3. Sửa/Xóa người dùng

- **Sửa**: Chọn chức năng Sửa → Sửa thông tin → **"Lưu"**
- **Xóa**: Chọn chức năng Xóa → Xác nhận xóa
- **Reset password**: Chọn chức năng Reset password → Mật khẩu mới được gửi qua email

#### 3.2.4. Quản lý học viên (menu **"Học viên"**)

Trang **Học viên** tập trung vào nhóm người dùng có vai trò **Student** (lọc nhanh theo lớp, xem điểm/thống kê cơ bản, chuyển lớp, vô hiệu hóa).

**Xem danh sách & tìm kiếm:**
1. Menu bên trái → **"Học viên"**
2. Có thể lọc theo **Lớp** và tìm theo **Tên/Email/Mã học viên**

**Xem/Sửa học viên:**
- **Xem**: Click **"Xem"** để mở dialog chi tiết
- **Sửa**: Click **"Sửa"** để chỉnh các trường hồ sơ (ví dụ: SĐT, giới tính, ngày sinh, mã học viên, lớp)

**Nhập học viên từ file (CSV):**
1. Menu **"Học viên"** → Click **"📥 Nhập Từ File"**
2. Chọn file `.csv` hoặc dán nội dung CSV
3. Click **"Validate (Dry Run)"** để kiểm tra trước (khuyến nghị)
4. Click **"Import Students"** để tạo tài khoản học viên

**Format CSV gợi ý:**
```csv
email,name,class_id,student_code,username,phone,gender,date_of_birth,password
student1@annd.edu.vn,Nguyễn Văn A,1,20201234,sv20201234,0123456789,nam,2002-01-15,20201234
```

**Cột bắt buộc:**
- `email`
- `name` (hoặc `full_name`)

**Cột khuyến nghị/tùy chọn:**
- `class_id`, `student_code`, `username`, `phone`, `gender`, `date_of_birth`, `password`

**Lưu ý:**
- Dòng có `email` trùng sẽ được báo và bỏ qua (không tạo mới).
- Nên chạy Validate trước khi Import để xem lỗi theo từng dòng.

### 3.3. Quản lý lớp học

#### 3.3.1. Tạo lớp

1. Menu → **"Lớp học"** → **"Tạo lớp"**
2. Nhập:
   - Tên lớp: AT18A
   - Khóa: K18
   - GVCN: Chọn từ danh sách giáo viên
3. Click **"Lưu"**

#### 3.3.2. Chuyển sinh viên

1. Vào chi tiết lớp
2. Chọn sinh viên cần chuyển
3. Click **"Chuyển lớp"** → Chọn lớp đích

### 3.4. Phê duyệt hoạt động

#### 3.4.1. Xem đề xuất

1. Menu → **"Phê duyệt"**
2. Danh sách hoạt động **"Pending"**
3. Click vào hoạt động để xem chi tiết:
   - Tiêu đề, mô tả
   - Thời gian, địa điểm
   - Loại, cấp độ
   - Giáo viên phụ trách

#### 3.4.2. Phê duyệt/Từ chối

**Phê duyệt:**
1. Click **"Phê duyệt"**
2. (Tùy chọn) Thêm ghi chú
3. Xác nhận → Hoạt động chuyển sang **"Approved"**

**Từ chối:**
1. Click **"Từ chối"**
2. **Bắt buộc** nhập lý do từ chối
3. Xác nhận → Giáo viên nhận thông báo

#### 3.4.3. Lịch sử phê duyệt

Menu → **"Phê duyệt"** → Tab **"Lịch sử"**
- Xem tất cả quyết định phê duyệt
- Filter theo thời gian, giáo viên

### 3.5. Cấu hình hệ thống

#### 3.5.1. Loại hoạt động

1. Menu → **"Cấu hình"** → **"Loại hoạt động"**
2. Sửa điểm cơ bản:
   - Học thuật: 5 điểm
   - Văn nghệ: 3 điểm
   - ...

#### 3.5.2. Cấp tổ chức

1. Menu → **"Cấu hình"** → **"Cấp tổ chức"**
2. Sửa hệ số nhân:
   - Lớp: 1.0
   - Khoa: 1.2
   - Trường: 1.5
   - ...

#### 3.5.3. Công thức tính điểm

**Công thức:**
```
Điểm hoạt động = Điểm cơ bản × Hệ số cấp độ
Tổng điểm = Σ (Điểm các hoạt động đã tham gia)
```

**Ví dụ:**
- Hội thảo Khoa học (Học thuật) cấp Trường = 5 × 1.5 = 7.5 điểm
- Giải bóng đá (Thể thao) cấp Khoa = 3 × 1.2 = 3.6 điểm

### 3.6. Báo cáo & Thống kê

#### 3.6.1. Dashboard

Menu → **"Báo cáo"** → **"Dashboard"**
- Tổng quan hoạt động
- Biểu đồ tham gia theo tháng
- Top 10 sinh viên

#### 3.6.2. Báo cáo tham gia

1. Menu → **"Báo cáo"** → **"Tham gia"**
2. Filter:
   - Thời gian: Từ ngày → Đến ngày
   - Lớp
   - Loại hoạt động
3. Nếu có chức năng xuất báo cáo, chọn **"Export CSV"/"Xuất CSV"** để tải về

#### 3.6.3. Bảng xếp hạng

Menu → **"Báo cáo"** → **"Xếp hạng"**
- Top sinh viên theo điểm
- So sánh giữa các lớp
- Filter theo học kỳ

### 3.7. Khen thưởng

#### 3.7.1. Đề xuất tự động

1. Menu → **"Khen thưởng"** → **"Đề xuất"**
2. Click **"Chạy đề xuất tự động"**
3. Hệ thống gợi ý dựa trên:
   - Tổng điểm
   - Ngưỡng giải thưởng

#### 3.7.2. Phê duyệt khen thưởng

1. Xem danh sách đề xuất
2. Kiểm tra:
   - Sinh viên
   - Loại giải
   - Điểm đạt được
3. Click **"Phê duyệt"** hoặc **"Từ chối"**

#### 3.7.3. Tạo khen thưởng thủ công

1. Click **"Thêm khen thưởng"**
2. Nhập:
   - Sinh viên
   - Loại giải
   - Lý do
3. Click **"Lưu"**

---

## 4. HƯỚNG DẪN GIÁO VIÊN

### 4.1. Dashboard

**Trang chủ Giáo viên:**
- Hoạt động của tôi
- Lớp chủ nhiệm
- Hoạt động sắp tới
- Thống kê tham gia

### 4.2. Tạo hoạt động

#### 4.2.1. Tạo mới

1. Menu → **"Hoạt động"** → **"Tạo mới"**
2. Nhập thông tin:
   - **Tiêu đề** (bắt buộc): Hội thảo Khoa học 2024
   - **Mô tả**: Chi tiết về hoạt động
   - **Ngày & Giờ** (bắt buộc): 15/11/2024 14:00
   - **Địa điểm**: Hội trường A
   - **Loại hoạt động**: Học thuật
   - **Cấp tổ chức**: Trường
   - **Số lượng tối đa**: 100
   - **Lớp được tham gia**: Chọn lớp hoặc "Tất cả"
3. Upload file đính kèm (tùy chọn)
4. Chọn:
   - **"Lưu nháp"**: Lưu để chỉnh sửa sau
   - **"Gửi phê duyệt"**: Gửi cho Admin duyệt

#### 4.2.2. Sửa hoạt động

**Chỉ sửa được khi ở trạng thái "Draft":**
1. Menu → **"Hoạt động"** → **"Của tôi"**
2. Click vào hoạt động
3. Click **"Sửa"**
4. Chỉnh sửa → **"Lưu"**

#### 4.2.3. Clone hoạt động

**Tạo hoạt động tương tự:**
1. Vào chi tiết hoạt động
2. Click **"Clone"**
3. Sửa thông tin khác biệt (thời gian, địa điểm...)
4. **"Lưu"**

### 4.3. Điểm danh QR Code

#### 4.3.1. Tạo phiên QR

1. Vào chi tiết hoạt động **"Approved"**
2. Click **"Tạo QR điểm danh"**
3. Chọn:
   - **Thời gian hết hạn**: theo cấu hình
   - **Số lần quét tối đa**: theo cấu hình
4. Click **"Tạo"**

#### 4.3.2. Hiển thị QR Code

**Màn hình QR hiển thị:**
- Thời gian còn lại (đếm ngược)
- Mã QR Code
- Thông tin tổng hợp điểm danh (có thể cần làm mới để cập nhật)

**Cách sử dụng:**
1. Chiếu màn hình QR lên projector/TV
2. Sinh viên dùng điện thoại quét
3. Theo dõi danh sách và làm mới khi cần

#### 4.3.3. Tạo QR mới

**Khi QR hết hạn hoặc cần làm mới:**
- Click **"Tạo mã mới"** → QR cũ vô hiệu hóa

#### 4.3.4. Điểm danh thủ công

**Cho sinh viên không quét được QR:**
1. Click **"Điểm danh thủ công"**
2. Chọn hoạt động cần điểm danh
3. Tick chọn một hoặc nhiều sinh viên (có nút **"Chọn tất cả"**)
4. (Tùy chọn) Chọn mức **đánh giá** (Xuất sắc/Tốt/Tham gia) cho từng sinh viên đã chọn
5. Click **"Lưu điểm danh"** để ghi nhận hàng loạt

#### 4.3.5. Sửa/Xóa điểm danh

1. Vào tab **"Danh sách điểm danh"**
2. Chọn chức năng Sửa để đổi trạng thái:
   - Present (Có mặt)
   - Absent (Vắng)
   - Late (Muộn)
   - Excused (Có phép)
3. Chọn chức năng Xóa để xóa bản ghi

### 4.4. Quản lý lớp chủ nhiệm

#### 4.4.1. Xem danh sách lớp

1. Menu → **"Lớp của tôi"**
2. Xem:
   - Danh sách sinh viên
   - Điểm thi đua
   - Hoạt động đã tham gia

#### 4.4.2. Xem chi tiết sinh viên

1. Click vào sinh viên
2. Xem:
   - Thông tin cá nhân
   - Tổng điểm
   - Lịch sử hoạt động
   - Giải thưởng
   - Cảnh báo (nếu có)

#### 4.4.3. Gửi thông báo

1. Chọn sinh viên (hoặc toàn lớp)
2. Click **"Gửi thông báo"**
3. Nhập:
   - Tiêu đề
   - Nội dung
4. Click **"Gửi"**

### 4.5. Đề xuất khen thưởng

1. Menu → **"Khen thưởng"** → **"Đề xuất"**
2. Chọn sinh viên
3. Chọn loại giải
4. Nhập lý do đề xuất
5. Click **"Gửi đề xuất"** → Chờ Admin duyệt

### 4.6. Báo cáo

#### 4.6.1. Báo cáo lớp

Menu → **"Báo cáo"** → **"Lớp của tôi"**
- Tổng quan tham gia
- Điểm trung bình
- Top sinh viên
- Sinh viên cần quan tâm

#### 4.6.2. Export dữ liệu

Nếu có chức năng xuất dữ liệu, chọn **"Export CSV"/"Xuất CSV"** để tải:
- Danh sách điểm danh
- Điểm thi đua
- Báo cáo tổng hợp

---

## 5. HƯỚNG DẪN SINH VIÊN

### 5.1. Dashboard

**Trang chủ Sinh viên:**
- Hoạt động đang mở đăng ký
- Hoạt động đã đăng ký
- Điểm thi đua của tôi
- Xếp hạng
- Thông báo

### 5.2. Đăng ký hoạt động

#### 5.2.1. Tìm hoạt động

1. Menu → **"Hoạt động"**
2. Sử dụng filter:
   - **Loại**: Học thuật, Văn nghệ, Thể thao...
   - **Thời gian**: Tuần này, Tháng này...
   - **Lớp**: Lớp của tôi, Tất cả
3. Tìm kiếm theo tên

#### 5.2.2. Xem chi tiết

Click vào hoạt động để xem:
- Mô tả chi tiết
- Thời gian, địa điểm
- Số lượng còn lại
- Điểm dự kiến/điểm thưởng (nếu có)
- Giáo viên phụ trách

#### 5.2.3. Đăng ký

1. Click **"Đăng ký"**
2. Xác nhận → Hoạt động được thêm vào **"Đã đăng ký"**
3. Nhận thông báo xác nhận

#### 5.2.4. Hủy đăng ký

**Chỉ hủy được trước thời gian hoạt động:**
1. Vào **"Hoạt động đã đăng ký"**
2. Click **"Hủy đăng ký"**
3. Xác nhận

### 5.3. Điểm danh QR Code

#### 5.3.1. Quét QR

**Khi đến hoạt động:**
1. Menu → **"Điểm danh QR"** hoặc Click vào hoạt động
2. Click **"Quét QR"**
3. Cho phép truy cập camera
4. Hướng camera vào mã QR trên màn hình
5. Chờ xác nhận **"Điểm danh thành công!"**

**Lưu ý:**
- Chỉ quét được trong thời gian QR còn hiệu lực
- Có thể bị giới hạn số lần quét theo phiên/điều kiện hợp lệ
- Phải đăng ký hoạt động trước

#### 5.3.2. Xem lịch sử điểm danh

1. Menu → **"Hồ sơ"** → **"Lịch sử điểm danh"**
2. Xem:
   - Hoạt động đã tham gia
   - Thời gian điểm danh
   - Trạng thái (Có mặt, Vắng...)

### 5.4. Xem điểm & Xếp hạng

#### 5.4.1. Điểm của tôi

Menu → **"Điểm thi đua"**
- Tổng điểm học kỳ này
- Biểu đồ tích lũy
- Chi tiết theo hoạt động

#### 5.4.2. Bảng xếp hạng

Menu → **"Xếp hạng"**
- Vị trí của bạn
- Top 10 toàn trường
- So với lớp

### 5.5. Giải thưởng

Menu → **"Giải thưởng"**
- Giải thưởng đã nhận
- Đang chờ phê duyệt
- Chứng chỉ (nếu có)

### 5.6. Thông báo

**Icon chuông góc phải:**
- Thông báo mới
- Phê duyệt hoạt động (nếu có)
- Khen thưởng
- Cảnh báo

---

## 6. CÂU HỎI THƯỜNG GẶP (FAQ)

### 6.1. Chung

**Q1: Làm sao để đăng nhập lần đầu?**  
A: Sử dụng email trường và mật khẩu được cung cấp bởi Admin. Liên hệ admin@annd.edu.vn nếu chưa có.

**Q2: Quên mật khẩu phải làm sao?**  
A: Liên hệ Admin qua email hoặc điện thoại để reset.

**Q3: Hệ thống có dùng được trên điện thoại không?**  
A: Có, hệ thống responsive, dùng được trên mọi thiết bị.

### 6.2. Giáo viên

**Q4: Tạo hoạt động nhưng không thấy nút "Gửi phê duyệt"?**  
A: Kiểm tra đã điền đầy đủ các trường bắt buộc chưa (Tiêu đề, Thời gian, Địa điểm).

**Q5: QR Code hết hạn phải làm sao?**  
A: Click "Tạo mã mới". Mã cũ tự động vô hiệu hóa.

**Q6: Sinh viên không quét được QR, xử lý thế nào?**  
A: Dùng chức năng "Điểm danh thủ công".

### 6.3. Sinh viên

**Q7: Đăng ký hoạt động nhưng không quét được QR?**  
A: Kiểm tra:
- Đã đăng ký chưa?
- QR còn hiệu lực không?
- Camera điện thoại hoạt động tốt không?

**Q8: Điểm danh nhầm hoạt động, hủy được không?**  
A: Không. Liên hệ giáo viên phụ trách để sửa.

**Q9: Tại sao điểm của tôi thấp hơn bạn cùng tham gia?**  
A: Điểm phụ thuộc vào:
- Loại hoạt động
- Cấp độ/tiêu chí tính điểm theo cấu hình

### 6.4. Kỹ thuật

**Q10: Không truy cập được hệ thống?**  
A: Kiểm tra:
- Có kết nối mạng LAN không?
- URL đúng chưa? (do đơn vị triển khai cung cấp)
- Liên hệ IT support nếu vẫn lỗi.

**Q11: Trang web load chậm?**  
A: Thử:
- Refresh trang (F5)
- Xóa cache trình duyệt
- Đổi trình duyệt

**Q12: Export CSV bị lỗi font tiếng Việt?**  
A: Mở file CSV bằng Excel:
1. Data → From Text/CSV
2. Chọn encoding: **UTF-8**
3. Import

---

## 7. KHẮC PHỤC SỰ CỐ

### 7.1. Lỗi đăng nhập

**Triệu chứng:** "Invalid credentials"

**Nguyên nhân:**
- Email hoặc mật khẩu sai
- Tài khoản bị khóa

**Giải pháp:**
1. Kiểm tra email, mật khẩu (phân biệt hoa thường)
2. Thử mật khẩu mặc định nếu mới tạo
3. Liên hệ Admin reset

### 7.2. Lỗi QR Code

**Triệu chứng:** "Invalid QR code"

**Nguyên nhân:**
- QR đã hết hạn
- QR đã bị vô hiệu hóa (teacher tạo mã mới)

**Giải pháp:**
1. Chờ teacher tạo mã mới
2. Quét lại
3. Nếu vẫn lỗi → điểm danh thủ công

### 7.3. Lỗi "Not registered"

**Triệu chứng:** Quét QR nhưng báo "Not registered for this activity"

**Nguyên nhân:**
- Chưa đăng ký hoạt động trước
- Đăng ký bị hủy

**Giải pháp:**
1. Vào trang hoạt động
2. Click "Đăng ký"
3. Quét lại QR

### 7.4. Lỗi "Already checked in"

**Triệu chứng:** Không quét được vì đã điểm danh

**Nguyên nhân:**
- Đã quét thành công trước đó
- Người khác quét hộ (gian lận)

**Giải pháp:**
1. Kiểm tra lịch sử điểm danh
2. Nếu không phải bạn quét → báo giáo viên ngay

### 7.5. Lỗi 500 Internal Server Error

**Triệu chứng:** Trang hiển thị "500 Internal Server Error"

**Nguyên nhân:**
- Server gặp lỗi
- Database bị lock

**Giải pháp:**
1. Refresh trang
2. Đợi 1-2 phút rồi thử lại
3. Liên hệ IT support: it-support@annd.edu.vn

### 7.6. Dữ liệu không cập nhật

**Triệu chứng:** Điểm danh xong nhưng điểm không tăng

**Nguyên nhân:**
- Cache trình duyệt
- Scoring engine đang chạy

**Giải pháp:**
1. Refresh trang (Ctrl + F5)
2. Đợi 1-2 phút (scoring tự động chạy)
3. Nếu vẫn không cập nhật → báo admin

---

## HỖ TRỢ & LIÊN HỆ

**Hỗ trợ kỹ thuật:**
- Email: it-support@annd.edu.vn
- Hotline: 024.xxxx.xxxx (8h-17h, T2-T6)

**Hỗ trợ nghiệp vụ:**
- Email: ctsv@annd.edu.vn
- Phòng: Phòng Công tác Sinh viên, Tòa nhà A

**Tài liệu & Video:**
- Tài liệu: `http://<server-host>:<port>/docs` (nếu có)
- Video hướng dẫn: (Coming soon)

---

**PHIÊN BẢN:** 1.0.0 (11/2024)  
**CẬP NHẬT LẦN CUỐI:** 14/11/2024
