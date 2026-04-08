# PHẦN III (TIẾP): KẾT QUẢ KIỂM THỬ, ĐÁNH GIÁ VÀ KHẢ NĂNG ỨNG DỤNG

---

## III.3. Đánh giá về kết quả kiểm thử

Phần này mô tả kế hoạch triển khai, phạm vi demo và tiêu chí đánh giá khi bước sang giai đoạn triển khai.

### III.3.1. Phạm vi triển khai (dự kiến)

### 6.1.1. Tổng quan hệ thống

Hệ thống dự kiến triển khai các nhóm chức năng chính theo 3 vai trò (Quản trị viên/Giáo viên/Sinh viên), đáp ứng quy trình quản lý hoạt động ngoại khóa và phong trào thanh niên trong phạm vi công trình.

### 6.1.2. Danh sách tính năng dự kiến hoàn thành

**Quản trị viên:**
- Quản lý người dùng/lớp
- Duyệt hoạt động, theo dõi lịch sử phê duyệt; quản lý luồng duyệt (theo module approval workflow)
- Quản lý/cấu hình dữ liệu danh mục: loại hoạt động, cấp tổ chức, loại khen thưởng, cấu hình hệ thống…
- Quản lý khen thưởng: loại khen thưởng, đề xuất khen thưởng, duyệt/từ chối, lịch sử cấp
- Quản lý cộng điểm/thi đua: duyệt đề xuất cộng điểm (bonus approval), báo cáo cộng điểm theo kỳ/lớp
- Audit logs / error logs / cảnh báo-thông báo (alerts/notifications) và xuất dữ liệu (CSV/XLSX)

**Giáo viên:**
- Tạo/chỉnh sửa hoạt động, gửi duyệt
- Điểm danh QR và thao tác hỗ trợ theo nghiệp vụ
- Quản lý lớp, theo dõi sinh viên
- Báo cáo theo lớp/hoạt động và xuất dữ liệu phục vụ tổng hợp
- Thực hiện/đề xuất nghiệp vụ liên quan khen thưởng/cộng điểm (tùy quy trình đơn vị)

**Sinh viên:**
- Xem/đăng ký hoạt động
- Điểm danh và xem lịch sử
- Theo dõi điểm/khen thưởng; theo dõi xếp hạng (nếu bật theo cấu hình)

---

### III.3.2. Demo hệ thống (minh họa)

### 6.2.1. Screenshots

**1. Trang đăng nhập:**
```
┌─────────────────────────────────────────┐
│                                         │
│              UNIACT                     │
│    Hệ thống Quản lý Hoạt động           │
│                                         │
│  Email:    [________________]          │
│  Mật khẩu: [________________]          │
│                                         │
│         [ Đăng nhập ]                   │
│                                         │
└─────────────────────────────────────────┘
```
*Minh họa giao diện đăng nhập.*

**2. Màn hình tổng quan (Quản trị viên):**
```
┌────────────────────────────────────────────────┐
│ Tổng quan                        Quản trị ▼    │
├────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│ │ Người   │ │ Hoạt    │ │ Điểm    │ │ Điểm  ││
│ │ dùng    │ │ động    │ │ danh    │ │ số    ││
│ │   ...   │ │   ...   │ │   ...   │ │  ...   ││
│ └─────────┘ └─────────┘ └─────────┘ └────────┘│
│                                                │
│ (Các thông tin tổng quan/báo cáo hiển thị      │
│  tùy theo dữ liệu và phạm vi triển khai)       │
└────────────────────────────────────────────────┘
```
*Minh họa màn hình tổng quan.*

**3. Giáo viên - Tạo hoạt động:**
```
┌────────────────────────────────────────────────┐
│ Tạo Hoạt Động Mới                     Teacher │
├────────────────────────────────────────────────┤
│ Tiêu đề *                                      │
│ [Hội thảo Khoa học Máy tính 2024           ]  │
│                                                │
│ Mô tả                                          │
│ [Hội thảo giới thiệu các xu hướng mới...   ]  │
│                                                │
│ Ngày & Giờ *                                   │
│ [15/11/2024] [14:00]                          │
│                                                │
│ Địa điểm *                                     │
│ [Hội trường A, Tòa nhà C                    ]  │
│                                                │
│ Loại hoạt động *                               │
│ [Học thuật ▼]                                  │
│                                                │
│ Cấp tổ chức *                                  │
│ [Trường ▼]                                     │
│                                                │
│ Số lượng tối đa                                │
│ [100]                                          │
│                                                │
│ Lớp được tham gia                              │
│ ☑ AT18A  ☑ AT18B  ☐ AT18C  ☐ Tất cả           │
│                                                │
│ [ Hủy ]  [ Lưu ]  [ Gửi phê duyệt ]           │
└────────────────────────────────────────────────┘
```
*Minh họa form tạo hoạt động.*

**4. Teacher - Tạo mã QR điểm danh (minh họa):**
```
┌────────────────────────────────────────────────┐
│ QR Code Điểm Danh                              │
├────────────────────────────────────────────────┤
│ Hoạt động: Hội thảo Khoa học 2024              │
│ Thời gian: 15/11/2024 14:00                    │
│                                                │
│        ┌───────────────────┐                   │
│        │                   │                   │
│        │   ████  ██  ████  │                   │
│        │   ██  ████  ██    │                   │
│        │   ████  ██  ████  │                   │
│        │                   │                   │
│        └───────────────────┘                   │
│                                                │
│ [ Tạo mã mới ]  [ Điểm danh thủ công ]        │
└────────────────────────────────────────────────┘
```
*Minh họa màn hình tạo mã QR điểm danh.*

**5. Student - Danh sách hoạt động (minh họa):**
```
┌────────────────────────────────────────────────┐
│ Hoạt Động Ngoại Khóa                Student ▼  │
├────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐  │
│ │ Hội thảo Khoa học 2024                   │  │
│ │ 15/11 14:00  - Hội trường A              │  │
│ │                      [ Đã đăng ký ]      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Giải Bóng đá Khoa                         │  │
│ │ 20/11 08:00  - Sân vận động               │  │
│ │                      [ Đăng ký ]         │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ Ngày hội văn hóa                          │  │
│ │ 25/11 13:00  - Sân trường                 │  │
│ │                      [ Đăng ký ]         │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```
*Minh họa màn hình danh sách và đăng ký hoạt động (tìm kiếm/lọc tùy phạm vi triển khai).*

**6. Student - Xác nhận điểm danh (minh họa):**
```
┌────────────────────────────────────────────────┐
│ Xác nhận điểm danh                             │
├────────────────────────────────────────────────┤
│                                                │
│ Trạng thái: Điểm danh thành công               │
│ Hoạt động: Hội thảo Khoa học 2024              │
│ Thời gian: 15/11/2024 14:01                    │
│ Ghi nhận: ...                                  │
└────────────────────────────────────────────────┘
```
*Minh họa kết quả xác nhận điểm danh.*

**7. Student - Hồ sơ & tổng hợp (minh họa):**
```
┌────────────────────────────────────────────────┐
│ Hồ Sơ Của Tôi                        Student ▼ │
├────────────────────────────────────────────────┤
│ ┌────────┐  Nguyễn Văn A                       │
│ │ Avatar │  Lớp: AT18A                         │
│ │ Avatar │  MSSV: 180123456                     │
│ └────────┘  Email: nguyenvana@annd.edu.vn      │
│                                                │
│ Tổng hợp                                       │
│ ┌──────────────────────────────────────────┐  │
│ │  Tổng điểm: ...                          │  │
│ │  Xếp hạng: ...                           │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Hoạt động đã tham gia                          │
│ • Hội thảo Khoa học 2024 - ...                 │
│ • Giải Bóng đá Khoa - ...                      │
│ • Tình nguyện mùa hè - ...                     │
│ ...                                            │
│                                                │
│ Khen thưởng                                    │
│ • ...                                          │
│ • ...                                          │
│ • ...                                          │
└────────────────────────────────────────────────┘
```
*Minh họa màn hình tổng hợp cá nhân.*

---

### III.3.3. Đánh giá (hiệu năng/khả dụng)

### 6.3.1. Đánh giá theo quy trình nghiệp vụ

Trong phạm vi công trình, hệ thống giúp giảm phụ thuộc thao tác thủ công (giấy tờ/Excel rời rạc), tăng khả năng truy vết dữ liệu và rút ngắn thời gian tổng hợp báo cáo.

### 6.3.2. Lưu ý kỹ thuật

- Ứng dụng phù hợp triển khai nội bộ; hiệu năng phụ thuộc cấu hình máy chủ và dữ liệu thực tế.
- Khuyến nghị bổ sung kiểm thử tải và giám sát khi triển khai thực tế.

---

### III.3.4. So sánh với giải pháp khác

### 6.4.1. Bảng so sánh

| Tiêu chí | Excel | Google Forms | UniAct |
|----------|-------|--------------|-------|
| **Quản lý hoạt động** | Thủ công | Rời rạc | Tập trung theo hệ thống |
| **Phê duyệt** | Email/Giấy | Không có | Hỗ trợ theo luồng nghiệp vụ (nếu áp dụng) |
| **Điểm danh** | Giấy | Form | Hỗ trợ QR theo nghiệp vụ |
| **Tổng hợp dữ liệu** | Công thức/thủ công | Thủ công | Tự động hóa ở mức phù hợp phạm vi |
| **Khen thưởng** | Đề xuất giấy | Không có | Hỗ trợ quản lý/đề xuất theo mô hình hiện có |
| **Báo cáo** | Pivot/Table | Cơ bản | Danh sách/tổng hợp theo hệ thống |
| **Bảo mật & phân quyền** | File riêng lẻ | Phụ thuộc nền tảng | Phân quyền theo vai trò |
| **Chi phí** | Thấp | Thấp | Tùy hạ tầng triển khai |
| **Đào tạo** | Khó | Dễ | Trung bình |

### 6.4.2. Ưu điểm UniAct

- Tập trung dữ liệu và luồng thao tác trong một hệ thống.
- Hỗ trợ quy trình quản lý hoạt động và điểm danh QR theo nghiệp vụ.
- Phân quyền theo vai trò, thuận lợi cho quản trị và vận hành nội bộ.
- Mã nguồn và cấu trúc dự án phù hợp để tiếp tục mở rộng theo nhu cầu.

---

### III.3.5. Khảo sát người dùng (nếu có)

### 6.5.1. Phương pháp

- Khảo sát người dùng có thể thực hiện theo 2 nhóm: (1) định lượng (phiếu khảo sát), (2) định tính (phỏng vấn ngắn).
- Công cụ có thể sử dụng: Google Forms và phỏng vấn trực tiếp/online.
- Tiêu chí gợi ý: mức độ dễ sử dụng, mức độ hữu ích, mức độ hài lòng.

Lưu ý: Trong phạm vi báo cáo này, không đưa ra các số liệu khảo sát định lượng nếu chưa được đo/thu thập thực tế.

### 6.5.2. Kết quả

Có thể tổng hợp phản hồi người dùng theo 2 nhóm nội dung:

- **Điểm tích cực thường gặp:** luồng thao tác rõ ràng, dữ liệu tập trung, giảm thao tác nhập liệu lặp lại.
- **Điểm cần cải thiện:** hướng dẫn cho người dùng mới, mở rộng báo cáo/xuất dữ liệu theo biểu mẫu, tối ưu trải nghiệm trên màn hình nhỏ.

---

---

## III.4. Khả năng ứng dụng và phát triển

### III.4.1. Khả năng triển khai trong nhà trường

Hệ thống phù hợp triển khai nội bộ theo mô hình web app, dữ liệu tập trung và phân quyền theo vai trò.

### III.4.2. Khả năng mở rộng, nâng cấp

- Chuẩn hóa response API và bổ sung kiểm thử tự động khi mở rộng quy mô.
- Mở rộng báo cáo/biểu mẫu xuất dữ liệu theo nhu cầu thực tế.

### III.4.3. Định hướng phát triển

- Cải thiện trải nghiệm người dùng dựa trên phản hồi.
- Bổ sung đo kiểm tải, giám sát vận hành khi triển khai thực tế.

---

**KẾT LUẬN PHẦN III:**

Hệ thống đáp ứng các nhóm chức năng cốt lõi trong phạm vi công trình và phù hợp triển khai nội bộ. Để hoàn thiện cho vận hành thực tế, cần bổ sung đo kiểm định lượng (hiệu năng/tải), khảo sát người dùng theo mẫu thống nhất và cải tiến theo phản hồi.

---

**TÀI LIỆU BỔ SUNG:**

Kết quả testing chi tiết và timeline thực tế triển khai:
- **[NHAT-KY-THUC-HIEN.md](NHAT-KY-THUC-HIEN.md)** - Timeline 6 phases, 8 implementation waves, Test coverage (347/347 passing), Feature completion matrix (500+ dòng)
- **Phụ lục A-F trong [11-PHU-LUC.md](11-PHU-LUC.md)** - Test scenarios, Screenshots, Technical appendixes
