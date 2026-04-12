# PHẦN II (TIẾP): PHÂN TÍCH HỆ THỐNG

---

## 3.1. PHÂN TÍCH NGHIỆP VỤ HIỆN TẠI

### 3.1.1. Quy trình quản lý hoạt động

**Sơ đồ quy trình hiện tại:**

```
┌──────────────┐
│ Giảng viên   │ → Tạo kế hoạch (Word/Excel)
└──────┬───────┘
       ↓
┌──────────────┐
│ Email/Giấy   │ → Gửi đề xuất
└──────┬───────┘
       ↓
┌──────────────┐
│ Ban CTSV     │ → Duyệt thủ công (2-5 ngày)
└──────┬───────┘
       ↓
┌──────────────┐
│ Thông báo    │ → Qua lớp trưởng/group chat
└──────┬───────┘
       ↓
┌──────────────┐
│ Điểm danh    │ → Giấy (dễ gian lận)
└──────┬───────┘
       ↓
┌──────────────┐
│ Tính điểm    │ → Excel thủ công
└──────┬───────┘
       ↓
┌──────────────┐
│ Khen thưởng  │ → Đề xuất thủ công (chậm)
└──────────────┘
```

Lưu ý: thời gian xử lý phụ thuộc quy trình từng đơn vị; công trình tập trung vào việc chuẩn hóa luồng và dữ liệu để giảm thao tác thủ công.

### 3.1.2. Vấn đề cụ thể

**1. Quản lý hoạt động:**
- File Excel rời rạc theo từng đơn vị.
- Không đồng bộ, khó tổng hợp.
- Dễ thất lạc hồ sơ.
- Khó theo dõi trạng thái và lịch sử xử lý.

**2. Điểm danh:**
- Danh sách giấy dễ gian lận/điểm danh hộ.
- Khó theo dõi và tổng hợp kịp thời.
- Nhập liệu lại sau hoạt động dễ sai sót.

**3. Tính điểm:**
- Công thức khác nhau giữa các đơn vị.
- Tính thủ công dễ sai sót.
- Thiếu minh bạch và truy vết.

**4. Khen thưởng:**
- Thời gian xử lý kéo dài.
- Giấy tờ qua nhiều bộ phận.

**5. Cảnh báo:**
- Thiếu cơ chế cảnh báo tự động.
- GVCN/giáo viên khó phát hiện sinh viên ít tham gia.

---

## 3.2. YÊU CẦU CHỨC NĂNG

### 3.2.1. Yêu cầu tổng quan

Hệ thống được thiết kế theo 3 vai trò chính:

| Vai trò | Nhóm chức năng chính | Ưu tiên |
|---------|----------------------|---------|
| **Admin** | Quản trị người dùng/lớp, duyệt hoạt động, cấu hình, báo cáo | Cao |
| **Teacher** | Quản lý hoạt động, điểm danh, quản lý lớp, báo cáo | Cao |
| **Student** | Xem/đăng ký hoạt động, điểm danh, theo dõi điểm/khen thưởng | Trung bình |

### 3.2.2. Use Case tổng quan

**Use Case Diagram:**

```
                    ┌─────────────────┐
                    │  Hệ Thống       │
                    │  UniAct         │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌─────▼─────┐      ┌──────▼──────┐
   │  Admin  │         │  Teacher  │      │   Student   │
   └────┬────┘         └─────┬─────┘      └──────┬──────┘
        │                    │                    │
       • Quản trị dữ liệu    • Tạo hoạt động      • Xem hoạt động
       • Duyệt hoạt động     • Tạo QR điểm danh   • Đăng ký tham gia
       • Cấu hình hệ thống   • Điểm danh          • Điểm danh QR
       • Báo cáo/tổng hợp    • Theo dõi lớp       • Xem điểm/khen thưởng
       • Khen thưởng         • Đề xuất (nếu có)   • Xem khen thưởng
```

### 3.2.3. Yêu cầu theo vai trò

Các yêu cầu chức năng được mô tả theo nhóm (theo vai trò), tránh liệt kê danh sách tính năng chi tiết khi chưa kiểm chứng đầy đủ ở mức màn hình/API.

**Admin:**
- Quản trị người dùng, lớp và các danh mục hệ thống.
- Duyệt hoạt động, từ chối hoạt động, theo dõi lịch sử duyệt và trạng thái approval.
- Quản lý các dữ liệu cấu hình phục vụ nghiệp vụ như loại hoạt động, cấp tổ chức, loại khen thưởng và một số cấu hình hỗ trợ vận hành.
- Xem báo cáo/tổng hợp và xuất dữ liệu theo các tuyến export đã hiện thực.
- Quản lý luồng bonus/awards theo phạm vi đang có trong hệ thống.
- Tra cứu audit logs và một số dữ liệu truy vết phục vụ quản trị.

**Teacher:**
- Tạo/chỉnh sửa hoạt động của mình, gửi duyệt và gửi lại khi bị từ chối.
- Theo dõi danh sách hoạt động theo trạng thái duyệt (nháp, chờ duyệt, đã duyệt, bị từ chối).
- Tạo mã QR và thực hiện điểm danh theo nghiệp vụ.
- Quản lý lớp, danh sách tham gia, và theo dõi tình hình sinh viên trong các hoạt động thuộc phạm vi của mình.
- Xem báo cáo theo lớp/hoạt động và thực hiện các thao tác nghiệp vụ liên quan bonus/awards trong phạm vi được phép.

**Student:**
- Xem danh sách hoạt động được áp dụng cho mình, bao gồm cả phân biệt hoạt động áp dụng và không áp dụng theo phạm vi lớp.
- Đăng ký hoạt động, xử lý cảnh báo xung đột giờ bắt đầu, hủy đăng ký khi còn trong điều kiện cho phép.
- Tham gia điểm danh QR theo hướng dẫn của giáo viên.
- Theo dõi lịch sử tham gia, trạng thái đăng ký, thông báo và các dữ liệu cá nhân được phép xem.

---

## 3.3. YÊU CẦU PHI CHỨC NĂNG

### 3.3.1. Hiệu năng

- Hệ thống đáp ứng nhu cầu vận hành nội bộ; ưu tiên độ ổn định và tính đúng đắn của dữ liệu.
- Các danh sách có hỗ trợ phân trang/tìm kiếm/lọc để giảm tải truy vấn.
- Tránh thao tác tốn tài nguyên trong request đồng bộ; các tác vụ nặng (nếu có) xử lý theo cơ chế nền.

### 3.3.2. Bảo mật

- **Xác thực:** JWT (HTTP-only cookies)
- **Phân quyền:** RBAC (Admin/Teacher/Student)
- **Chống SQL Injection:** Query có tham số
- **Chống XSS:** Cơ chế escape mặc định của React
- **Giới hạn tần suất:** Theo cấu hình hệ thống
- **Nhật ký thao tác:** Ghi nhận các hành động quan trọng (nếu có)
- **Mật khẩu:** Băm mật khẩu theo chuẩn an toàn

### 3.3.3. Tính sử dụng

- **Tương thích màn hình:** Mobile, tablet, desktop
- **Dễ sử dụng:** Luồng thao tác rõ ràng, dễ tiếp cận
- **Nhất quán giao diện:** Theo hệ thống UI của dự án
- **Thông báo lỗi:** Rõ ràng, có hướng xử lý

### 3.4.1. Sơ đồ luồng (tóm tắt)

**a) Tạo hoạt động và gửi duyệt (Teacher):**
1. Teacher tạo hoạt động (mặc định trạng thái nháp).
2. Teacher gửi duyệt.
3. Admin (hoặc Teacher theo phân quyền) phê duyệt/từ chối.
4. Chỉ khi được duyệt, hoạt động mới đủ điều kiện tạo phiên QR.

**b) Điểm danh QR (Student):**
```
Student        QR Session        API               Database
  |               |              |                    |
  |--- scan ------>              |                    |
  |               |--- token --->|                    |
  |               |              |-- verify auth ---->|
  |               |              |-- load session --->|
  |               |              |-- check rules ---->|
  |               |              |-- write attendance>|
  |<-- result ----|              |                    |
```

---

## 3.5. PHÂN TÍCH DỮ LIỆU

### 3.5.1. Các thực thể chính

Lưu ý: quy mô dữ liệu phụ thuộc phạm vi triển khai; báo cáo tập trung mô tả cấu trúc dữ liệu và quan hệ giữa các thực thể.

| Thực thể | Mô tả |
|----------|-------|
| **Users** | Admin, Teacher, Student |
| **Classes** | Lớp học |
| **Activities** | Hoạt động ngoại khóa |
| **Participations** | Đăng ký tham gia |
| **Attendance** | Bản ghi điểm danh |
| **QR Sessions** | Phiên điểm danh QR |
| **Scores** | Điểm/thi đua (tính toán + tổng hợp) |
| **Bonus** | Đề xuất/duyệt cộng điểm |
| **Awards** | Đề xuất/duyệt khen thưởng |
| **Notifications** | Thông báo theo sự kiện |
| **Audit Logs** | Nhật ký thao tác |
| **Security/Audit** | Xác thực, phân quyền và nhật ký thao tác |

### 3.5.2. Mối quan hệ

```
Users (1) ──< (N) Classes (Teacher)
Users (N) ──< (1) Classes (Students)
Users (1) ──< (N) Activities (Teacher)
Users (N) ──< (N) Activities (Participations)
Activities (1) ──< (N) QR Sessions
Activities (1) ──< (N) Attendance
Users (1) ──< (N) Awards
```

---

**KẾT LUẬN (PHÂN TÍCH HỆ THỐNG):**

Phần này đã phân tích chi tiết:
- Quy trình nghiệp vụ hiện tại & vấn đề
- Yêu cầu chức năng theo vai trò
- Yêu cầu phi chức năng (Hiệu năng, Bảo mật, Tính sử dụng)
- Sơ đồ Use Case, sơ đồ hoạt động, sơ đồ trình tự
- Phân tích dữ liệu (thực thể, mối quan hệ)

Đây là cơ sở để thiết kế hệ thống ở phần thiết kế.

---

**TÀI LIỆU BỔ SUNG:**

Để có cái nhìn toàn diện về business logic và quy tắc nghiệp vụ, tham khảo:
- **[PERMISSIONS_AND_BUSINESS_RULES.md](PERMISSIONS_AND_BUSINESS_RULES.md)** - Permission matrix, Visibility rules, Conflict detection, 6 Business scenarios, 6 Edge cases (1,400+ dòng)
- **[LOGIC_MOI_QUAN_HE.md](LOGIC_MOI_QUAN_HE.md)** - Relationship logic, ERD, Query patterns (500+ dòng)
