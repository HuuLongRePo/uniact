# PHẦN I: THÔNG TIN CHUNG

Phần này được chuẩn hóa theo hướng dẫn trình bày công trình dự thi UniTECH.

## I.1. Tên đề tài

Hệ Thống Quản Lý Hoạt Động Ngoại Khóa & Phong Trào Thanh Niên.

## I.2. Tên phần mềm/sản phẩm công nghệ

UniAct (có thể trùng hoặc khác tên đề tài; dùng tên thống nhất trong toàn bộ báo cáo).

## I.3. Nhóm tác giả, lớp

- Nhóm tác giả: [Tên sinh viên 1] - [Tên sinh viên 2] (nếu có)
- Lớp: [Tên lớp]

## I.4. Đơn vị hướng dẫn (nếu có)

[Tên GVHD/Đơn vị]

## I.5. Đơn vị thụ hưởng

[Trường/Khoa/Phòng/Ban] (đơn vị trực tiếp vận hành/tiếp nhận sản phẩm).

---

## I.6. Lý do thực hiện đề tài

### 1.1.1. Bối cảnh thực tiễn

Trong xu thế hội nhập và phát triển của giáo dục đại học hiện nay, các hoạt động ngoại khóa và phong trào thanh niên đóng vai trò quan trọng trong việc rèn luyện kỹ năng, phát triển toàn diện nhân cách sinh viên. Tại các đơn vị đào tạo có quy mô lớn, mỗi năm phát sinh nhiều hoạt động thuộc đa dạng loại hình như học thuật, thể thao, văn nghệ, thiện nguyện, kỹ năng...

Tuy nhiên, công tác quản lý hoạt động ngoại khóa hiện nay đang gặp nhiều khó khăn:

**Vấn đề 1: Quản lý thủ công, thiếu đồng bộ**
- Mỗi khoa, mỗi phòng ban sử dụng các file Excel, Word riêng lẻ
- Khó khăn trong việc theo dõi trạng thái phê duyệt
- Lưu trữ hồ sơ không đồng bộ, dễ thất lạc
- **Hậu quả:** Mất thời gian, dễ sai sót, thiếu minh bạch

**Vấn đề 2: Điểm danh thiếu chính xác**
- Công tác điểm danh chủ yếu dựa vào danh sách giấy
- Tình trạng "điểm danh hộ" xảy ra phổ biến
- Không phản ánh đúng số lượng sinh viên tham gia thực tế
- **Hậu quả:** Dữ liệu không chính xác, khó đánh giá hiệu quả

**Vấn đề 3: Tính điểm thi đua phức tạp**
- Công thức thủ công: `Điểm = Điểm cơ bản × Hệ số + Thưởng - Phạt`
- Mỗi khoa áp dụng thang điểm khác nhau
- Tính toán mất nhiều thời gian, dễ nhầm lẫn
- **Hậu quả:** Thiếu công bằng, không minh bạch

**Vấn đề 4: Khen thưởng chậm trễ**
- Đề xuất và xét duyệt qua nhiều bước thủ công
- Thời gian xử lý kéo dài
- **Hậu quả:** Giảm động lực, hiệu quả khen thưởng thấp

**Vấn đề 5: Thiếu cảnh báo kịp thời**
- Không phát hiện sớm sinh viên ít tham gia hoạt động
- Giảng viên chủ nhiệm không nắm bắt tình hình
- **Hậu quả:** Không can thiệp kịp thời

### 1.1.2. Yêu cầu đặc thù về bảo mật

Do đặc thù của ngành An Ninh, Trường Đại học An Ninh Nhân dân có yêu cầu bảo mật thông tin rất cao:
- Ưu tiên triển khai trong mạng nội bộ; hạn chế kết nối Internet theo quy định của đơn vị.
- Dữ liệu sinh viên, giảng viên cần được bảo vệ theo chính sách bảo mật.
- Hạn chế phụ thuộc dịch vụ cloud/API bên ngoài nếu không được phép.

Điều này đặt ra thách thức lớn trong việc xây dựng hệ thống quản lý hoạt động hiện đại nhưng vẫn đảm bảo tính bảo mật cao.

### 1.1.3. Nhu cầu cấp thiết

Từ những vấn đề trên, nhà trường cần một **Hệ thống Quản lý Hoạt động Ngoại Khóa & Phong Trào Thanh Niên** có khả năng:
- Quản lý hoạt động tập trung theo vai trò.
- Hỗ trợ điểm danh QR theo quy trình nghiệp vụ.
- Tổng hợp điểm/thi đua theo quy tắc cấu hình (nếu áp dụng).
- Hỗ trợ quy trình khen thưởng và phê duyệt (nếu có).
- Hỗ trợ cảnh báo và theo dõi tiến độ (nếu có).

---

## I.7. Mục tiêu, phạm vi ứng dụng

### 1.2.1. Mục tiêu chung

Xây dựng **Hệ thống Quản lý Hoạt động Ngoại Khóa & Phong Trào Thanh Niên** hoạt động trong mạng nội bộ, số hóa quy trình từ tạo hoạt động, điểm danh, tổng hợp điểm thi đua đến quản lý khen thưởng, nhằm nâng cao hiệu quả công tác quản lý hoạt động ngoại khóa.

### 1.2.2. Mục tiêu cụ thể

**1. Về tính năng:**
- Quản lý hoạt động ngoại khóa và phong trào theo cấu hình thực tế
- Hệ thống điểm danh QR với thời gian hiệu lực theo cấu hình
- Tổng hợp điểm/thi đua theo quy tắc cấu hình
- Đề xuất khen thưởng theo tiêu chí (nếu áp dụng)
- Cảnh báo và theo dõi theo ngưỡng cấu hình (nếu có)
- Phân quyền chi tiết (Admin, Teacher, Student)
- Nhật ký thao tác cho các hành động quan trọng (nếu có)
- Xuất báo cáo (ví dụ CSV) tùy theo phạm vi triển khai

**2. Về hiệu quả:**
- Giảm phụ thuộc thao tác thủ công, tăng minh bạch và khả năng theo dõi
- Hỗ trợ tổng hợp báo cáo nhanh hơn so với quy trình giấy tờ/Excel rời rạc

**3. Về kỹ thuật:**
- Hệ thống web-based với kiến trúc 3 tầng
- Database được thiết kế theo mô hình quan hệ, có chỉ mục và ràng buộc phù hợp
- Hiệu năng được đánh giá theo điều kiện triển khai thực tế (khuyến nghị bổ sung kiểm thử tải)
- Bảo mật cao với JWT, RBAC, audit logs
- Triển khai ưu tiên trong mạng nội bộ theo điều kiện hạ tầng

---

### I.7.1. Đối tượng và phạm vi

### 1.3.1. Đối tượng nghiên cứu

**Hệ thống quản lý hoạt động ngoại khóa** tại Trường Đại học An Ninh Nhân dân, bao gồm:

**1. Người dùng hệ thống:**
- **Admin** (cán bộ quản trị/điều phối)
- **Teacher** (giảng viên)
- **Student** (sinh viên)

**2. Nghiệp vụ quản lý:**
- Quản lý hoạt động (tạo, phê duyệt, thực hiện)
- Điểm danh sinh viên (QR Code + thủ công)
- Tính điểm thi đua tự động
- Quản lý khen thưởng (đề xuất, phê duyệt)
- Hệ thống cảnh báo (sinh viên yếu, deadline)
- Báo cáo thống kê (attendance, scoring, awards)

**3. Dữ liệu:**
- Thông tin sinh viên, giảng viên
- Danh sách lớp học
- Hoạt động ngoại khóa
- Lịch sử tham gia
- Điểm thi đua, khen thưởng

### 1.3.2. Phạm vi nghiên cứu

**1. Về không gian:**
- Triển khai tại **Trường Đại học An Ninh Nhân dân**
- Hoạt động trên **mạng LAN nội bộ** của trường
- KHÔNG kết nối Internet

**2. Về thời gian:**
- Nghiên cứu, phát triển: theo kế hoạch thực hiện công trình
- Triển khai thử nghiệm và đánh giá: tùy điều kiện thực tế

**3. Về chức năng:**
- **Bao gồm:**
  * Quản lý hoạt động theo cấu hình
  * Điểm danh QR và các thao tác nghiệp vụ liên quan
  * Tổng hợp điểm/thi đua (nếu áp dụng)
  * Đề xuất/phê duyệt khen thưởng (nếu có)
  * Cảnh báo theo ngưỡng cấu hình (nếu có)
  * Xuất báo cáo (nếu có)
  
- **Không bao gồm:**
  * Theo dõi vị trí theo Wi‑Fi (giai đoạn sau)
  * Camera chống gian lận (giai đoạn sau)
  * Ứng dụng mobile (định hướng)
  * Gợi ý tự động nâng cao (định hướng)

**4. Về công nghệ:**
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** SQLite
- **Authentication:** JWT + HTTP-only cookies
- **QR Code:** JWT-based tokens

---

### I.7.2. Phương pháp thực hiện (tóm tắt)

### 1.4.1. Phương pháp khảo sát thực tế

**Đối tượng khảo sát:**
- Cán bộ phụ trách công tác sinh viên
- Giảng viên
- Sinh viên

**Nội dung khảo sát:**
- Quy trình quản lý hoạt động hiện tại
- Các vấn đề, khó khăn gặp phải
- Nhu cầu, mong muốn về hệ thống mới

**Kết quả:**
- Xác định được 5 vấn đề chính
- Thu thập các yêu cầu chức năng theo nghiệp vụ
- Đánh giá mức độ ưu tiên các tính năng

### 1.4.2. Phương pháp phân tích hệ thống

**1. Phân tích nghiệp vụ:**
- Vẽ Use Case Diagram tổng quan
- Phân tích use case chi tiết theo nghiệp vụ
- Xây dựng Activity Diagram cho quy trình chính

**2. Phân tích yêu cầu:**
- Yêu cầu chức năng
- Yêu cầu phi chức năng
  * Hiệu năng: đánh giá theo môi trường triển khai thực tế
  * Bảo mật: JWT, RBAC, nhật ký thao tác
  * Khả dụng: giao diện responsive, luồng thao tác rõ ràng
  * Độ tin cậy: xử lý lỗi và ghi log phù hợp

**3. Phân tích dữ liệu:**
- Xác định các thực thể (Users, Activities, Classes...)
- Xác định mối quan hệ giữa các thực thể
- Thiết kế ERD theo schema thiết kế

### 1.4.3. Phương pháp thiết kế hệ thống

**1. Thiết kế kiến trúc:**
- Áp dụng mô hình **3-tier Architecture**
  * Tầng trình bày: thành phần React
  * Tầng nghiệp vụ: các tuyến API
  * Tầng truy cập dữ liệu: CSDL SQLite
  
- Áp dụng **MVC Pattern**
  * Model: schema CSDL
  * View: giao diện/React components
  * Controller: các điểm cuối API

**2. Thiết kế database:**
- Chuẩn hóa đến dạng chuẩn 3NF
- Thêm indexes cho các truy vấn trọng yếu
- WAL mode cho concurrent reads

**3. Thiết kế API:**
- RESTful API design
- Thiết kế các điểm cuối theo nghiệp vụ
- Middleware xác thực JWT
- Rate limiting theo cấu hình hệ thống

**4. Thiết kế giao diện:**
- Wireframes theo các màn hình chính
- Thiết kế responsive (ưu tiên mobile)
- UI/UX nhất quán (Tailwind CSS)

### 1.4.4. Phương pháp triển khai

**1. Lựa chọn công nghệ:**
- **Next.js:** SSR, API Routes, tối ưu hiệu năng theo cấu hình
- **React:** Component-based, Virtual DOM
- **TypeScript:** Type safety, trải nghiệm phát triển tốt
- **SQLite:** File-based, không cần DB server riêng
- **Tailwind CSS:** Utility-first, hỗ trợ triển khai giao diện nhanh

**2. Quy trình phát triển:**
- **Giai đoạn 1:** Xác thực, nền tảng dữ liệu
- **Giai đoạn 2:** Quản lý hoạt động, luồng phê duyệt
- **Giai đoạn 3:** Điểm danh QR và ghi nhận tham gia
- **Giai đoạn 4:** Tính điểm/tổng hợp và cảnh báo (nếu có)
- **Giai đoạn 5:** Khen thưởng/báo cáo (nếu có)
- **Giai đoạn 6:** Hoàn thiện, kiểm thử, tài liệu

**3. Coding standards:**
**3. Chuẩn phát triển:**
- TypeScript strict mode
- ESLint + Prettier
- Quy ước đặt tên component
- Quy ước viết commit message

### 1.4.5. Phương pháp kiểm thử

**1. Unit Testing:**
- Vitest cho business logic
- Ưu tiên test các phần nghiệp vụ quan trọng

**2. Integration Testing:**
- Kiểm thử các điểm cuối API
- Kiểm thử truy vấn CSDL

**3. Manual Testing:**
- Kiểm thử trên Chrome, Edge, Firefox
- Kiểm thử responsive (mobile, tablet, desktop)
- Kiểm thử theo vai trò (Admin/Teacher/Student)
- Kiểm thử các tình huống biên

---

## I.8. Thuật ngữ và từ viết tắt

| Thuật ngữ/Viết tắt | Diễn giải |
|---|---|
| UniAct | Tên hệ thống quản lý hoạt động ngoại khóa/phong trào |
| Activity | Hoạt động ngoại khóa/phong trào được tổ chức theo kế hoạch |
| Attendance | Điểm danh/ghi nhận tham gia hoạt động |
| QR Code | Mã QR dùng để xác nhận tham gia/điểm danh |
| API | Giao diện lập trình ứng dụng (điểm cuối trao đổi dữ liệu) |
| JWT | JSON Web Token – cơ chế token cho xác thực |
| RBAC | Role-Based Access Control – phân quyền theo vai trò |
| SSR/CSR | Render phía server / phía client |
| SQLite | Hệ quản trị CSDL dạng file, phù hợp triển khai nội bộ |
| ERD | Sơ đồ thực thể – quan hệ trong thiết kế CSDL |

---

## I.9. Bố cục công trình

Công trình được đóng cuốn theo thứ tự:

1) Bìa chính, bìa lót, lời cam đoan; mục lục
2) Phần I. Thông tin chung
3) Phần II. Thông tin về thiết kế, xây dựng Phần mềm/sản phẩm công nghệ
4) Phần III. Thông tin về triển khai ứng dụng Phần mềm/sản phẩm công nghệ
5) Phần IV. Hướng dẫn sử dụng Phần mềm/sản phẩm công nghệ
6) Danh mục Tài liệu tham khảo
7) Phụ lục (Hình ảnh giao diện, đoạn mã minh họa, sơ đồ…)

**Lưu ý trình bày (theo hướng dẫn):**
- Khổ giấy A4, in 1 mặt
- Font Times New Roman 14
- Giãn dòng 1.3 lines
- Lề: trên 3.0cm, dưới 3.0cm, trái 3.5cm, phải 2.0cm
- Số trang ở giữa phía trên; tính từ trang đầu tiên của Phần I đến hết Kết luận
