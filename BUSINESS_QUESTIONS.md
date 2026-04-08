# UniAct Business Questions

_Status: v1 - backbone-focused decision list_

## Purpose

Tài liệu này gom các câu hỏi nghiệp vụ cần chốt để đảm bảo:
- logic hệ thống đúng thực tế vận hành
- mối quan hệ thực thể nhất quán
- quyền hạn giữa các vai trò rõ ràng
- code / DB / UI / test không phát triển lệch nhau

Mỗi mục gồm:
- **Câu hỏi**
- **Vì sao cần chốt**
- **Các lựa chọn hợp lệ**
- **Khuyến nghị mặc định**
- **Ảnh hưởng kỹ thuật**

---

## 1. Quyền hạn & phạm vi quản lý

### Q1. Giảng viên có được tạo hoạt động cho lớp không do mình trực tiếp quản lý không?
**Vì sao cần chốt:** ảnh hưởng create activity, approval, attendance, teacher/classes, rule ownership.

**Các lựa chọn:**
- A. Chỉ được tạo cho lớp mình phụ trách
- B. Được tạo cho mọi lớp, nhưng phải qua phê duyệt chặt hơn
- C. Được tạo cho lớp mình phụ trách chính + lớp được phân quyền bổ sung

**Khuyến nghị mặc định:**
- **C** nếu hệ thống có khái niệm phân quyền linh hoạt
- **A** nếu muốn an toàn và đơn giản ở giai đoạn đầu

**Ảnh hưởng kỹ thuật:**
- `/api/activities`
- class picker trong UI tạo hoạt động
- teacher class APIs
- UAT teacher flow

---

### Q2. Giảng viên có được quản lý/đánh giá học viên thuộc nhiều lớp trong cùng một hoạt động không?
**Vì sao cần chốt:** hiện activity có thể gắn nhiều class; attendance/evaluation sẽ đụng học viên đa lớp.

**Các lựa chọn:**
- A. Có, nếu giảng viên là owner activity
- B. Chỉ nếu tất cả lớp đó đều thuộc giảng viên
- C. Cần thêm đồng giảng viên / phụ trách lớp phụ

**Khuyến nghị mặc định:**
- **A** cho luồng hoạt động là đơn vị nghiệp vụ chính

**Ảnh hưởng kỹ thuật:**
- attendance GET/POST
- participants/evaluation
- reports theo teacher

---

### Q3. Admin có được override toàn bộ workflow không?
**Vì sao cần chốt:** ảnh hưởng approve/reject, publish trực tiếp, attendance correction, user/class override.

**Các lựa chọn:**
- A. Có toàn quyền
- B. Có quyền override nhưng phải để lại audit log bắt buộc
- C. Chỉ override một số flow nhạy cảm

**Khuyến nghị mặc định:**
- **B**

**Ảnh hưởng kỹ thuật:**
- guards
- audit_logs
- admin UI actions

---

## 2. Quan hệ thực thể

### Q4. Quan hệ teacher ↔ class là 1-n hay n-n?
**Vì sao cần chốt:** hiện có dấu hiệu dùng `class_teachers`, nghĩa là n-n.

**Các lựa chọn:**
- A. Một lớp chỉ có một giảng viên chính
- B. Một lớp có thể có nhiều giảng viên
- C. Một giảng viên chính + nhiều giảng viên hỗ trợ

**Khuyến nghị mặc định:**
- **C** nếu muốn vừa thực tế vừa dễ quản lý

**Ảnh hưởng kỹ thuật:**
- class UI
- permission checks
- attendance ownership
- reports

---

### Q5. Quan hệ student ↔ class là 1-1 hay 1-n?
**Vì sao cần chốt:** student hiện có `class_id`, nhưng một số mô hình thực tế có thể cho phép nhóm/ban/CLB chồng lớp.

**Các lựa chọn:**
- A. 1-1 (mỗi học viên một lớp chính)
- B. 1-n (một lớp chính, nhiều nhóm phụ)
- C. n-n hoàn toàn

**Khuyến nghị mặc định:**
- **A + nhóm phụ tách bảng riêng**

**Ảnh hưởng kỹ thuật:**
- student discovery
- reports
- eligibility activity

---

### Q6. Activity ↔ class có phải luôn n-n không?
**Vì sao cần chốt:** backbone hiện đang dựa trên activity áp cho nhiều lớp.

**Các lựa chọn:**
- A. Có, nhiều lớp là first-class
- B. Chỉ 1 lớp, nhiều lớp chỉ là giai đoạn sau
- C. 1 hoạt động có scope theo khoa/trường thay vì class cụ thể

**Khuyến nghị mặc định:**
- **A + C cùng tồn tại**

**Ảnh hưởng kỹ thuật:**
- `activity_classes`
- registration eligibility
- reports by class/scope

---

## 3. Workflow hoạt động

### Q7. Hoạt động luôn phải qua phê duyệt trước khi publish chứ?
**Vì sao cần chốt:** hiện flow backbone đang giả định teacher submit -> admin approve.

**Các lựa chọn:**
- A. Luôn phải duyệt
- B. Một số loại activity được publish thẳng
- C. Teacher hạng cao có quyền publish thẳng

**Khuyến nghị mặc định:**
- **A** ở giai đoạn backbone đầu tiên

**Ảnh hưởng kỹ thuật:**
- workflow state machine
- create/update activity
- approval queue

---

### Q8. Sau khi bị reject, teacher được sửa và submit lại hay phải tạo mới?
**Vì sao cần chốt:** ảnh hưởng lifecycle, UX, audit history.

**Các lựa chọn:**
- A. Sửa và submit lại activity cũ
- B. Chỉ tạo bản mới
- C. Có versioning nội bộ

**Khuyến nghị mặc định:**
- **A**

**Ảnh hưởng kỹ thuật:**
- reject flow
- approval history
- teacher activities UI

---

### Q9. Activity đã published còn được sửa những gì?
**Vì sao cần chốt:** ảnh hưởng đăng ký, attendance, fairness, thông báo.

**Các lựa chọn:**
- A. Không sửa gì quan trọng nữa
- B. Chỉ sửa mô tả/địa điểm/thông báo
- C. Được sửa mọi thứ nếu chưa có đăng ký

**Khuyến nghị mặc định:**
- **B + C**

**Ảnh hưởng kỹ thuật:**
- PUT `/api/activities/[id]`
- notification on update
- registration policies

---

## 4. Đăng ký hoạt động

### Q10. Học viên có được đăng ký nhiều hoạt động cùng ngày không?
**Vì sao cần chốt:** test backbone đã đụng rule conflict cùng ngày.

**Các lựa chọn:**
- A. Chặn tuyệt đối
- B. Cảnh báo nhưng cho override
- C. Chỉ chặn nếu trùng giờ / trùng time slot

**Khuyến nghị mặc định:**
- **C** là hợp lý nhất về thực tế
- nếu chưa có time-slot rõ ràng thì tạm dùng **B**

**Ảnh hưởng kỹ thuật:**
- `/api/activities/[id]/register`
- UI confirmation flow
- UAT registration

---

### Q11. Ai được phép force register override conflict?
**Vì sao cần chốt:** API hiện gợi ý `force_register`.

**Các lựa chọn:**
- A. Chỉ học viên tự xác nhận
- B. Teacher/admin có thể force cho học viên
- C. Chỉ admin

**Khuyến nghị mặc định:**
- **A + C**

**Ảnh hưởng kỹ thuật:**
- registration API
- admin/teacher operations
- audit logs

---

### Q12. Sau khi đã đăng ký, thời điểm nào bị khóa hủy?
**Vì sao cần chốt:** hiện có rule 24h cutoff.

**Các lựa chọn:**
- A. 24h trước hoạt động
- B. theo cấu hình hệ thống
- C. tùy loại activity

**Khuyến nghị mặc định:**
- **B**

**Ảnh hưởng kỹ thuật:**
- cancel registration flow
- `system_config`

---

## 5. Attendance & participation

### Q13. Attendance có bắt buộc học viên phải đăng ký trước không?
**Vì sao cần chốt:** ảnh hưởng manual attendance, QR validation, walk-in cases.

**Các lựa chọn:**
- A. Bắt buộc đăng ký trước
- B. Teacher/admin có thể điểm danh walk-in
- C. Một số loại activity cho phép walk-in

**Khuyến nghị mặc định:**
- **A + B**

**Ảnh hưởng kỹ thuật:**
- attendance/manual
- attendance/validate
- participations lifecycle

---

### Q14. Nếu đã điểm danh thủ công rồi thì QR sau đó xử lý thế nào?
**Vì sao cần chốt:** tránh duplicate / trạng thái mâu thuẫn.

**Các lựa chọn:**
- A. QR trả already attended và không ghi thêm
- B. QR cập nhật timestamp mới nhất
- C. Ghi thêm log nhưng không đổi trạng thái chính

**Khuyến nghị mặc định:**
- **A + audit log**

**Ảnh hưởng kỹ thuật:**
- `attendance_records`
- duplicate handling

---

### Q15. Có phân biệt check-in và hoàn thành activity không?
**Vì sao cần chốt:** hiện attendance và evaluation đang gần nhau nhưng chưa chắc cùng nghĩa.

**Các lựa chọn:**
- A. Chỉ có attended / not attended
- B. Có check-in rồi mới tới completed/evaluated
- C. Mỗi loại activity dùng khác nhau

**Khuyến nghị mặc định:**
- **B** nếu hệ thống cần chấm điểm nghiêm túc

**Ảnh hưởng kỹ thuật:**
- `attendance_status`
- evaluation flow
- scoring trigger

---

## 6. Đánh giá & điểm số

### Q16. Điểm được chốt lúc điểm danh hay lúc đánh giá?
**Vì sao cần chốt:** hiện manual attendance có thể trigger auto scoring khi có achievement.

**Các lựa chọn:**
- A. Chốt ngay khi attendance
- B. Chốt sau evaluation
- C. Attendance chỉ là điều kiện, evaluation mới quyết định điểm

**Khuyến nghị mặc định:**
- **C**

**Ảnh hưởng kỹ thuật:**
- attendance POST
- evaluate page
- scoring service

---

### Q17. Achievement level có bắt buộc cho mọi học viên attended không?
**Vì sao cần chốt:** ảnh hưởng UX teacher và consistency score.

**Các lựa chọn:**
- A. Bắt buộc
- B. Mặc định `participated`
- C. Có thể null, chốt sau

**Khuyến nghị mặc định:**
- **B**

**Ảnh hưởng kỹ thuật:**
- manual attendance
- evaluation bulk UI
- auto scoring

---

### Q18. Award/bonus có cộng dồn với base points không?
**Vì sao cần chốt:** ảnh hưởng scoreboard, fairness, reports.

**Các lựa chọn:**
- A. Có cộng dồn
- B. Award chỉ mang tính danh hiệu, không cộng điểm
- C. Mỗi loại award có công thức riêng

**Khuyến nghị mặc định:**
- **C** nếu muốn chuẩn; **A** nếu cần đơn giản trước

**Ảnh hưởng kỹ thuật:**
- `student_scores`
- `point_calculations`
- reports/leaderboard

---

## 7. Override, audit, vận hành

### Q19. Những hành động nào bắt buộc phải có audit log?
**Vì sao cần chốt:** hiện repo đã log nhiều action, nhưng cần danh sách chuẩn.

**Khuyến nghị mặc định:**
Bắt buộc log:
- create/update/delete activity
- submit/approve/reject
- manual attendance override
- force register
- user role/class changes
- score/award adjustments

---

### Q20. Những quy tắc nào nên là cảnh báo chứ không phải chặn cứng?
**Vì sao cần chốt:** để hệ thống linh hoạt, tránh block vận hành thực tế.

**Gợi ý:**
- conflict cùng ngày
- thiếu achievement ngay lúc attendance
- chỉnh sửa nhẹ sau publish
- student notifications failure

**Nên chặn cứng:**
- sai quyền
- approve/reject sai trạng thái
- duplicate attendance không hợp lệ
- publish activity không hợp lệ

---

## 8. Các quyết định cần ưu tiên chốt sớm nhất

### Nhóm ưu tiên P0
1. Giảng viên được tạo activity cho lớp nào?
2. Hoạt động có luôn phải duyệt không?
3. Conflict cùng ngày: chặn cứng, cảnh báo, hay theo time-slot?
4. Attendance có bắt buộc đăng ký trước không?
5. Điểm được chốt lúc attendance hay evaluation?
6. Teacher/admin có quyền override những gì?

### Nhóm ưu tiên P1
7. Mô hình teacher-class là 1-n hay n-n?
8. Award/bonus cộng điểm thế nào?
9. Student có thể thuộc nhiều nhóm/lớp phụ không?
10. Published activity được sửa đến mức nào?

---

## 9. Gợi ý cách review

Khi review tài liệu này, mỗi câu nên được chốt thành:
- **Decision**
- **Reason**
- **Scope affected**
- **Follow-up implementation/test**

Ví dụ:
- Decision: conflict cùng ngày chỉ cảnh báo, không chặn cứng nếu khác time slot
- Scope affected: register API, student UI, UAT registration, system config
- Follow-up: thêm time-slot rule + confirm modal + regression test override
