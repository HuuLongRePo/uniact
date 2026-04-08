# UniAct Business Decisions

_Status: working source-of-truth for confirmed business decisions_

## Purpose

File này chỉ ghi:
- các **business decisions đã chốt**
- và danh sách **câu hỏi còn mở** để chốt ở phiên sau

Không dùng file này để brainstorm lan man. Đây là bản tóm tắt gọn, có thể dùng làm chuẩn để triển khai code, DB, UI và test.

---

# A. CONFIRMED DECISIONS

## D1. Teacher scope / phạm vi quản lý

### Decision
Chọn **phương án C**.

### Rule
Teacher được tạo hoạt động cho:
1. lớp mình phụ trách trực tiếp
2. lớp được phân quyền / phân công bổ sung

### Additional rule
- Teacher có **toàn quyền CRUD học viên** trong lớp mình phụ trách
- Teacher có thể **truy cập một phần thông tin** học viên thuộc lớp khác để phục vụ:
  - tổ chức hoạt động
  - điểm danh
  - đánh giá
  - các quyền nghiệp vụ liên quan

### Practical model
Phân thành 3 tầng quyền:
- **Managed classes** → full quyền quản lý lớp/học viên
- **Activity-related access** → quyền giới hạn để attendance/evaluation/operations
- **Other classes** → không có quyền hoặc rất hạn chế

---

## D2. Activity approval workflow

### Decision
Chọn **A + C**.

### Rule hiện tại
- Tất cả hoạt động đều phải qua admin phê duyệt trước khi publish

### Architectural note
- Thiết kế hệ thống không khóa chết, để sau này có thể mở rộng cấu hình theo loại activity / quyền / policy

### Current default flow
`draft -> requested -> approved -> published`

---

## D3. Registration conflict rule

### Decision
Chọn **C**.

### Rule hiện tại
- Chỉ chặn khi **trùng giờ bắt đầu hoạt động**
- Không chặn chỉ vì cùng ngày

### Future expansion required
Phần cấu hình sau này cần mở rộng được sang:
- trùng **time slot**
- trùng **khoảng thời gian**
- trùng **khung buổi**

---

## D4. Attendance override policy

### Decision
Chọn **C**.

### Rule
- **Admin luôn có toàn quyền override**
- **Teacher chỉ được override nếu activity đó cho phép**

### Recommended activity-level settings
- `allow_teacher_override`
- `attendance_open_minutes_before`
- về sau có thể thêm:
  - `attendance_mode`
  - `conflict_policy`
  - `fallback_mode`

### QR / fallback direction
- QR vẫn là phương án cần xem xét triển khai
- Nếu QR gây quá tải hoặc không giải quyết ổn:
  - ưu tiên fallback / song song sang **manual attendance**
  - và **face attendance**

---

## D5. Scoring timing

### Decision
Chọn **C**.

### Rule
- Attendance chỉ xác nhận tham gia
- Điểm chính thức chỉ được chốt sau bước đánh giá/xác nhận cuối

### Product direction
- Thiết kế sẵn bộ khung evaluation + scoring cơ bản
- Sau này chi tiết rule sẽ cập nhật theo quy định / thông tư của nhà trường
- Hiện tại ưu tiên hoàn thiện bản đơn giản trước

---

## D6. Teacher override scope

### Decision
Chọn **C**.

### Rule
Khi activity bật `allow_teacher_override`, teacher được override:
- attendance
- registration
- evaluation adjustments

### Constraints
- chỉ trong activity có quyền
- phải có audit log
- nên để mở khả năng tách nhỏ quyền override về sau

---

## D7. Teacher ↔ class / organization model

### Decision
Chọn **C (mở rộng)**.

### Rule
Một lớp có:
- giảng viên phụ trách chính
- có thể có thêm giảng viên hỗ trợ / phối hợp

Đồng thời teacher có thể tham gia / tổ chức hoạt động ở các scope khác:
- Đoàn Thanh niên
- khoa
- phòng ban
- cấp tổ chức khác

### Meaning
Teacher là actor đa phạm vi, không chỉ gắn cứng với 1 lớp.

---

## D8. Post-publish change management

### Decision tổng quát
Chọn **C** cho chỉnh sửa sau publish, với các rule cụ thể dưới đây.

### D8A. Khi activity đang chờ duyệt
Chọn **C**, đồng thời có **tính năng thu hồi hồ sơ trước khi phê duyệt để chỉnh sửa**.

#### Practical default
- Flow nghiệp vụ chuẩn nên là: **thu hồi rồi sửa**
- Có thể sau này cho phép sửa trực tiếp một số trường nhẹ, nhưng current safe workflow là thu hồi trước

### D8B. Khi activity đã publish
- **Cả 3 nhóm thay đổi** (nhẹ / trung bình / nặng) đều phải qua **kính trình chỉnh sửa / duyệt lại**

### D8C. Nếu activity đã publish và có người đăng ký
- teacher có thể gửi yêu cầu sửa
- hệ thống phải thông báo cho người đăng ký
- người đăng ký có quyền hủy đăng ký nếu là **activity không bắt buộc**
- tính bắt buộc phải được cấu hình khi tạo activity

### D8D. Nếu thay đổi sau publish được duyệt
Chọn **C + D**:
- gửi thông báo
- đánh dấu activity có thay đổi quan trọng
- với thay đổi lớn, cho phép hủy đăng ký ngoài cutoff bình thường

### D8E. Change history
Chọn **C**:
- cần có **version snapshot trước/sau thay đổi**

---

## D9. Participation model: mandatory vs voluntary

### Decision
Chọn **C (bản mở rộng)**.

### Rule
Hệ thống phải hỗ trợ đồng thời:
- **các lớp bắt buộc**
- **các học viên bắt buộc**
- **các lớp tự nguyện / có thể đăng ký**

### Important UI rule
- Không dùng checkbox `Bắt buộc`
- Dùng cơ chế đánh dấu trên danh sách chọn lớp và học viên
- Bao gồm cả danh sách các lớp có thể đăng ký tự nguyện

### Participation privilege model
- **Bắt buộc** → không cần tự đăng ký, không được tự hủy
- **Tự nguyện** → được đăng ký, được hủy theo rule, có nhiều quyền chủ động hơn

---

## D10. Target scope model for activity assignment

### Decision
Chọn **D**.

### Rule
Phạm vi chỉ định tham gia phải hỗ trợ:
- theo lớp
- theo từng học viên
- theo nhóm tổ chức khác

### UX requirement
UI phải:
- thông minh
- sáng tạo
- tránh chồng chéo
- dễ dùng
- nhanh
- ít sai sót

### Fetch/data-loading requirement
- fetch phải tối ưu
- tránh quá tải
- không load thừa
- nên có chiến lược scope-first, lazy loading, search/filter hợp lý

---

## D11. Conflict precedence between mandatory and voluntary targets

### Decision
Chọn **D**.

### Rule
Nếu một học viên rơi vào nhiều nhóm trong cùng một activity:
- hệ thống tự động ưu tiên **bắt buộc > tự nguyện**
- đồng thời hiển thị cảnh báo cho người tạo biết

---

## D12. Participation preview

### Decision
Chọn **C**, theo cách hiển thị có nút mở preview.

### Rule
Hệ thống phải có preview danh sách participation cuối cùng:
- ai là bắt buộc
- ai là tự nguyện
- ai có xung đột và đã được ưu tiên

### UX rule
- không auto bung preview
- có nút `Xem danh sách` / `Xem preview`
- chỉ khi người dùng bấm mới hiện ra

---

## D13. Preview detail level

### Decision
Chọn **D**.

### Rule
Preview hiển thị:
- mặc định theo nhóm
- có thể mở rộng xem chi tiết từng học viên

### Additional UX expectations
- trực quan
- dễ quan sát
- dễ thao tác
- mượt mà
- nhẹ nhàng
- có hướng dẫn chỉnh sửa rõ ràng

---

## D14. Mandatory activity participation creation timing

### Decision
Chọn **A**.

### Rule
Với activity bắt buộc:
- participation được tạo **ngay khi activity được duyệt**
- áp dụng cho toàn bộ đối tượng bắt buộc đã chọn

### Technical constraint
Phải triển khai theo cách:
- không gây quá tải hệ thống
- đủ nhanh, ổn định
- tránh request blocking thô bạo nếu quy mô lớn

---

## D15. Bulk participation creation strategy

### Decision
Chọn **D**.

### Rule
- quy mô nhỏ → có thể xử lý đồng bộ
- quy mô lớn → phải xử lý theo batch/chunk hoặc queue/background job

---

## D16. Partial success when creating participation in bulk

### Decision
Chọn **D**.

### Rule
- quy mô nhỏ → rollback toàn bộ nếu lỗi
- quy mô lớn → partial success + log lỗi + retry phần còn lại + trạng thái theo dõi

---

## D17. Publish completeness during participation processing

### Decision
Chọn **C**.

### Rule
Nếu participation bắt buộc còn đang xử lý dở / partial:
- activity **chưa được coi là publish hoàn toàn**
- chỉ khi participation bắt buộc tạo xong thì mới coi là fully published

---

## D18. Visibility while participation generation is still processing

### Decision
Chọn **C**.

### Rule
Khi activity đã được duyệt nhưng participation bắt buộc còn đang xử lý:
activity được nhìn thấy bởi:
- admin
- teacher tạo activity
- các giảng viên/phối hợp liên quan

Chưa phải published hoàn toàn cho participant cuối.

---

## D19. Student-facing activity visibility model

### Decision
Chọn **C + D**.

### Rule
Student-facing activity nên hiển thị theo 3 trạng thái:
1. bắt buộc với tôi
2. tôi có thể đăng ký
3. không áp dụng cho tôi

### Additional labels
Có thêm nhãn giải thích quyền:
- không cần đăng ký
- không được hủy
- được tự đăng ký
- được tự hủy

---

## D20. Activities not applicable to the student

### Decision
Chọn **C**.

### Rule
Nếu activity không áp dụng cho học viên đó:
- vẫn có thể hiển thị
- nhưng ở một **tab riêng** kiểu `Không thuộc phạm vi của bạn`

---

## D21. Student can see why an activity is mandatory for them

### Decision
Chọn **C**.

### Rule
Với activity bắt buộc, student có thể xem lý do mình thuộc activity đó, ví dụ:
- do lớp bắt buộc
- do được chọn đích danh
- do thuộc nhóm tổ chức / phạm vi áp dụng nào đó

---

## D22. Exemption / approved absence request for mandatory activities

### Decision
Chọn **B + C**.

### Rule
Với activity bắt buộc:
- student được quyền gửi yêu cầu xin miễn / vắng có lý do
- đây không phải tự hủy, mà là một yêu cầu cần được xét duyệt
- admin hoặc teacher có quyền phù hợp có thể xử lý yêu cầu đó

---

## D23. Distinguish `exempted` vs `approved_absence`

### Decision
Chọn **D**.

### Rule
Phải phân biệt rõ:
- `exempted` = được miễn khỏi việc tham gia
- `approved_absence` = vẫn thuộc activity nhưng được duyệt vắng có lý do

---

## D24. Scoring impact of exemption / approved absence

### Decision
Chọn **D** với nguyên tắc scoring cụ thể sau.

### Rule
- **Làm thì được cộng điểm**
- **Không làm thì không bị trừ điểm**
- **Chỉ vi phạm thì mới bị trừ điểm**
- Vi phạm thuộc **một nhóm quy định riêng biệt**

### Current simple model
- attended / evaluated → có thể cộng
- exempted → không cộng, không trừ
- approved_absence → không cộng, không trừ
- no participation / no attendance → không cộng, không trừ
- violation → xử lý ở rule riêng

---

## D25. Violation handling model

### Decision
Chọn **D**.

### Rule
- trước mắt: vi phạm có thể phát sinh từ activity / attendance / evaluation nhưng phải lưu thành **record vi phạm riêng**
- kiến trúc mở để sau này phát triển thành **module vi phạm/kỷ luật độc lập**

### Additional rule
Việc xử lý có thể dựa trên:
- tỷ lệ vắng mặt trong kỳ
- tỷ lệ vắng mặt trong năm
- tỷ lệ vắng mặt trong toàn khóa
- đánh giá chưa tích cực
- các vi phạm quy định khác

Các quy định này phải có **cơ cấu linh hoạt**.

---

## D26. Violation threshold configuration model

### Decision
Chọn **D**.

### Rule
Ngưỡng/tỷ lệ xử lý vi phạm phải hỗ trợ nhiều tầng cấu hình:
1. toàn cục
2. theo loại activity / nhóm activity
3. override đặc biệt khi cần

---

## D27. Rule transparency to users

### Decision
Chọn **D**.

### Rule
Khi activity / trường hợp đang dùng rule đặc biệt / override:
- tất cả user liên quan đều có thể thấy rule nào đang áp dụng
- bao gồm cả student

### Product philosophy
Mục tiêu là:
- khuyến khích học viên chủ động cải thiện thái độ
- có biện pháp mang tính xây dựng
- ghi nhận thay đổi tích cực
- tạo cơ hội vươn lên

---

## D28. Improvement guidance and constructive remedies

### Decision
Chọn **D**, refined with constructive orientation.

### Rule
Nếu học viên bị cảnh báo hoặc chịu quy định đặc biệt, hệ thống phải hiển thị:
- gợi ý cụ thể theo rule đang áp dụng
- cơ hội cải thiện / khắc phục

### Important refinement
- Không đi theo hướng “xin lỗi hình thức”
- Ưu tiên **biện pháp mang tính xây dựng trong các hoạt động sắp tới**

---

## D29. Improvement workflow complexity

### Decision
Chọn **D**.

### Rule
- trước mắt: workflow cải thiện đơn giản
- về sau: kiến trúc mở để phát triển thành workflow theo dõi tiến trình đầy đủ

---

## D30. Improvement tied to activity or standalone program

### Decision
Chọn **D**.

### Rule
- trước mắt: biện pháp cải thiện có thể gắn với activity hoặc nhiệm vụ cải thiện riêng
- về sau: có thể phát triển thành module improvement / recovery riêng

---

# B. OPEN QUESTIONS (to continue next session)

Các câu hỏi dưới đây **chưa chốt** hoặc cần đào sâu thêm ở phiên sau:

1. Với activity đã publish, nhóm trường nào là “trường nhẹ” có thể chỉnh trực tiếp nếu sau này cần nới rule?
2. Với activity bắt buộc, preview danh sách cuối cùng nên hỗ trợ export / download ở mức nào?
3. Với exemption / approved absence, ai có quyền ra quyết định cuối cùng trong từng scope (teacher vs admin vs delegated approver)?
4. Với attendance mode (`qr`, `manual`, `face`, `mixed`), mode mặc định theo loại activity nên là gì?
5. QR attendance nếu có nguy cơ quá tải thì policy chuyển fallback sang manual/face sẽ được kích hoạt theo rule nào?
6. Face attendance roadmap: song song QR hay có thể thay QR ở một số loại activity?
7. Vi phạm / penalty rule đầu tiên nên được triển khai theo tiêu chí nào trước: vắng không phép, gian lận, hay hành vi khác?
8. Improvement workflow ở giai đoạn đầu nên gồm những loại nhiệm vụ xây dựng nào?
9. Với student-facing rule transparency, phạm vi chi tiết nào nên hiển thị cho student, phạm vi nào chỉ admin/teacher thấy?
10. Có cần phân biệt soft warning / hard warning / disciplinary status ở giao diện student không?

---

# C. IMPLEMENTATION NOTES

## Near-term implementation priorities affected by these decisions

1. Refactor registration conflict rule from “same day” to “same start time”, with future configurability.
2. Introduce activity-level policy fields such as:
   - `allow_teacher_override`
   - `attendance_open_minutes_before`
   - participation model fields for required/optional scopes
3. Support participation source/types:
   - mandatory / assigned
   - voluntary / self-registered
4. Introduce change-request workflow for published activities.
5. Add history/version snapshot model for activity changes.
6. Design student UI states for:
   - mandatory
   - can register
   - not applicable
7. Prepare violation / improvement model as separate record/workflow lines.
8. Ensure all important actions are audit-logged.
