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

## D31. Voluntary activity absence request after registration

### Decision
Chọn **B (refined)**.

### Rule
Với activity tự nguyện:
- nếu student đã đăng ký và muốn xin vắng có lý do
- thì phải **gửi yêu cầu để phê duyệt**
- và yêu cầu này phải được gửi **trước cutoff**

### Exception
Sau cutoff:
- student không còn tự xử lý theo luồng thường
- chỉ admin hoặc người có quyền mới có thể can thiệp cập nhật ngoại lệ

---

## D32. No-show behavior for voluntary activities

### Decision
Chọn **C**.

### Rule
Nếu student đã đăng ký activity tự nguyện nhưng:
- không tham gia
- và không có yêu cầu vắng được duyệt trước cutoff

thì được ghi nhận là **`no-show`**:
- ảnh hưởng tới uy tín / lịch sử tham gia / thống kê hành vi
- nhưng chưa tự động là vi phạm kỷ luật

---

## D33. Penalty threshold for repeated no-show

### Decision
Chọn **C**.

### Rule
Nếu student:
- `no-show` **3 lần**
- hoặc `no-show` **2 lần liên tiếp**

thì bị **1 lần phạt trừ điểm**.

---

## D34. No-show counter reset policy

### Decision
Chọn **D**.

### Rule
Việc xử lý bộ đếm `no-show` sau khi đã áp phạt:
- phụ thuộc rule theo kỳ / năm / cấu hình hệ thống

---

## D35. Visibility of no-show count and thresholds

### Decision
Chọn **C**.

### Rule
Hệ thống minh bạch hiển thị cho học viên:
- số lần `no-show` hiện tại
- ngưỡng dẫn tới xử phạt
- họ còn cách ngưỡng bao xa

---

## D36. Positive recovery after negative history

### Decision
Chọn **D**.

### Rule
- không xóa lịch sử `no-show` / tín hiệu xấu cũ
- nhưng nếu học viên có hành vi tích cực sau đó, hệ thống phải ghi nhận cải thiện
- có thể cộng điểm tích cực / phục hồi theo rule

---

## D37. Improvement/recovery points model

### Decision
Chọn **C + D**.

### Rule
- trước mắt: điểm cải thiện / phục hồi có thể được cộng vào tổng điểm chung
- nhưng phải ghi rõ là **điểm cải thiện / phục hồi**
- về lâu dài: kiến trúc mở để tách thành thành phần điểm riêng nếu cần

---

## D38. Generation of improvement/recovery points

### Decision
Chọn **B + C**.

### Rule
- hệ thống có khả năng tự động tính / gợi ý điểm cải thiện
- admin/teacher vẫn có lớp xác nhận hoặc điều chỉnh khi cần

---

## D39. Automation policy for system-generated suggestions and rules

### Decision
Chọn **B + C + D**.

### Rule
Tùy theo từng loại rule / quyết định:
- có loại chỉ là gợi ý
- có loại có thể có hiệu lực ngay
- có loại cần con người xác nhận

=> hệ thống phải có policy theo từng loại rule, không áp một cơ chế chung cho tất cả.

---

## D40. Rule automation configuration model

### Decision
Chọn **C + D**.

### Rule
- về đích: hệ thống nên có bảng/cấu hình mức tự động hóa theo từng loại rule
- trước mắt: có thể hard-code một phần để đi nhanh
- nhưng phải thiết kế dễ chuyển sang cấu hình nghiệp vụ chuẩn

---

## D41. Audit/versioning of business rule configuration changes

### Decision
Chọn **D**.

### Rule
Khi thay đổi rule/cấu hình nghiệp vụ, hệ thống phải lưu:
- ai thay đổi
- lúc nào
- từ giá trị nào → sang giá trị nào
- phạm vi áp dụng
- versioning / rollback nếu cần

---

## D42. Effective date model for rules/configuration

### Decision
Chọn **D**.

### Rule
Tùy theo loại rule:
- có thể áp ngay
- có thể áp từ thời điểm xác định
- có thể áp từ mốc tương lai

---

## D43. Rule changes are not retroactive

### Decision
Chọn **B**.

### Rule
Khi rule mới có hiệu lực:
- **không hồi tố**
- chỉ áp cho dữ liệu phát sinh sau thời điểm hiệu lực

---

## D44. Recalculation of old data under new rules

### Decision
Chọn **A**.

### Rule
- hệ thống **không cần** có cơ chế recalculate dữ liệu cũ theo rule mới như một chức năng chuẩn

---

## D45. Decision propagation to implementation

### Decision
Chọn **C + D**.

### Rule
Các business decisions đã chốt phải được phản ánh vào:
- tài liệu
- code
- test
- UI text / help text
- và cấu hình quản trị nếu phù hợp

---

## D46. Multiple mandatory participation reasons are all visible

### Decision
Chọn **B + C**.

### Rule
Nếu một học viên thuộc nhiều nguồn bắt buộc cùng lúc:
- hệ thống phải **hiển thị tất cả các lý do**
- mỗi lý do được trình bày thành **một mục riêng / một dòng riêng**
- không gộp mơ hồ thành một nhãn chung

---

## D47. Display model for mandatory participation reasons

### Decision
Chọn **D**.

### Rule
Cách hiển thị lý do tham gia bắt buộc phụ thuộc vào ngữ cảnh UI:
- ở card/list ngắn → hiển thị gọn
- ở trang chi tiết / phần mở rộng → hiển thị đầy đủ hơn

---

## D48. Student-facing visibility of who directly assigned them

### Decision
Chọn **A**.

### Rule
Nếu học viên được chọn đích danh vào activity bắt buộc:
- student chỉ cần thấy mình **được chỉ định tham gia**
- không cần hiển thị ai là người chỉ định
- thông tin người chỉ định vẫn có thể được lưu ở audit/internal log

---

## D49. Default eligibility of class-based mandatory participants

### Decision
Chọn **B + C + D**, refined.

### Rule
Với activity bắt buộc áp dụng theo lớp:
- mặc định chỉ sinh participation cho học viên **active / hợp lệ**
- hệ thống vẫn phải nhận diện được các học viên không hợp lệ để phục vụ vận hành
- kiến trúc cần mở để có thể cấu hình theo loại trạng thái hoặc loại activity về sau

---

## D50. Operational visibility of excluded non-active students

### Decision
Chọn **D**, refined by later decisions.

### Rule
Các học viên không active bị loại khỏi participation bắt buộc:
- phải được hiển thị trong preview / cảnh báo cho người có quyền
- không bị im lặng bỏ qua ở lớp vận hành
- nhưng không được coi là participant thật của activity

---

## D51. Non-active students are not participants

### Decision
Refined from earlier options.

### Rule
Nếu học viên không active thì:
- không tham gia activity
- không cần tạo participation record
- không cần tạo exception chỉ để đưa vào flow tham gia bình thường

---

## D52. Snapshot model for class-based mandatory participation

### Decision
Chọn **D1**.

### Rule
Với activity áp dụng theo lớp:
- danh sách participation được chốt theo **snapshot tại thời điểm activity được duyệt**
- hệ thống không tự động đồng bộ theo biến động lớp về sau
- admin/teacher có thể chủ động bấm **đồng bộ lại danh sách từ lớp** khi cần

---

## D53. Manual re-sync behavior for class roster changes

### Decision
Chọn **C + D**.

### Rule
Khi admin/teacher đồng bộ lại danh sách từ lớp:
- hệ thống cho phép chọn kiểu đồng bộ
- nhưng mặc định an toàn là **chỉ thêm người mới**
- không tự động xóa người cũ nếu người vận hành chưa chọn chế độ mạnh hơn

---

## D54. Do not remove participants who already have activity data

### Decision
Chọn **B**.

### Rule
Nếu một học viên không còn thuộc lớp nhưng đã có dữ liệu phát sinh trong activity như:
- attendance
- evaluation
- hoặc lịch sử nghiệp vụ liên quan

thì **không cho xóa khỏi participation**.

---

## D55. Remove participants with no activity data after re-sync

### Decision
Chọn **B**.

### Rule
Nếu học viên không còn thuộc lớp và **chưa có dữ liệu phát sinh gì** trong activity:
- có thể loại bỏ khỏi participation khi sync lại danh sách lớp

---

## D56. Removal must be soft-delete with history

### Decision
Chọn **D**.

### Rule
Khi participation bị loại bỏ do sync lớp trong trường hợp hợp lệ:
- không xóa hẳn hoàn toàn
- phải **soft delete / đánh dấu removed**
- đồng thời lưu lịch sử thay đổi và lý do bị loại

---

## D57. Only admin may bring back a removed participant

### Decision
Chọn **C**.

### Rule
Khi một participation đã bị removed do sync lớp:
- chỉ **admin** mới có quyền khôi phục / đưa học viên quay lại flow tham gia

---

## D58. Bringing a removed student back creates a new participation

### Decision
Refined from discussion.

### Rule
Nếu sau này cần đưa học viên quay lại activity:
- không coi là restore participation cũ
- participation cũ chỉ còn giá trị lịch sử / audit
- hệ thống phải xử lý như **một lần thêm mới**

---

## D59. New participation may keep an internal audit link to the old removed one

### Decision
Chọn **B**.

### Rule
Participation mới sau khi học viên quay lại:
- về nghiệp vụ là một participation mới
- nhưng có thể giữ liên kết kỹ thuật nội bộ tới participation cũ đã removed để phục vụ audit

---

## D60. Voluntary participation canceled when scope change makes it inapplicable

### Decision
Chọn **B**.

### Rule
Với activity tự nguyện, nếu student đã đăng ký nhưng activity không còn áp dụng cho họ do thay đổi scope hợp lệ:
- hệ thống tự động hủy participation
- và phải gửi thông báo cho student

---

## D61. Cancellation notice must include reason and guidance

### Decision
Chọn **C**.

### Rule
Thông báo hủy participation do thay đổi scope phải có:
- việc participation đã bị hủy
- lý do cụ thể
- hướng xử lý / bước tiếp theo nếu có

---

## D62. No replacement or priority compensation for scope-removed voluntary participants

### Decision
Chọn **A**.

### Rule
Nếu participation của student ở activity tự nguyện bị hủy do thay đổi scope hợp lệ:
- student chỉ cần nhận thông báo
- không cần cơ chế đề xuất activity thay thế hay ưu tiên đăng ký activity khác như một quyền mặc định

---

## D63. Mandatory participation flow is not complete until students receive notification

### Decision
Refined from user answer.

### Rule
Với participation bắt buộc được sinh tự động:
- học viên **buộc phải nhận được thông báo ngay**
- nếu notification cho nhóm bắt buộc chưa hoàn tất thì flow này chưa được coi là hoàn tất trọn vẹn

---

## D64. Notification reliability is part of the required business flow

### Decision
Chọn **A**.

### Rule
Trong các luồng nghiệp vụ phụ thuộc vào notification:
- notification failure không được xem là side-effect phụ vô hại
- nếu thông báo chưa thông suốt thì flow chưa đạt yêu cầu hoàn chỉnh

---

## D65. QR attendance allows only one session per activity

### Decision
Chọn **A**.

### Rule
Một activity chỉ có **một phiên QR attendance duy nhất** trong mô hình chuẩn hiện tại.

---

## D66. Repeated QR scans keep the first accepted scan

### Decision
Chọn **A**.

### Rule
Nếu cùng một học viên quét QR lặp nhiều lần:
- chỉ giữ lần đầu hợp lệ
- các lần sau bị bỏ qua theo rule chuẩn

---

## D67. Face attendance roadmap runs in parallel with QR first

### Decision
Chọn **D**.

### Rule
Face attendance nên được triển khai theo lộ trình:
- chạy song song với QR trước
- sau đó có thể thay QR ở một số context nếu đủ ổn định

---

## D68. Low-confidence face attendance falls back to teacher confirmation and manual methods

### Decision
Chọn **D**.

### Rule
Nếu face attendance không đủ chắc chắn:
- teacher có thể xác nhận thủ công
- và/hoặc fallback sang chọn tên / manual attendance

---

## D69. Face-attendance evidence is configurable but must fit an offline-first environment

### Decision
Chọn **D**.

### Rule
Hệ thống có thể lưu bộ dữ liệu face-attendance khá đầy đủ theo policy phù hợp, ví dụ:
- timestamp
- device context
- confidence score
- snapshot/ảnh xác minh nếu policy cho phép

### Constraint
Thiết kế phải phù hợp với bối cảnh:
- hệ thống **không kết nối Internet**
- ưu tiên local/offline-first hoặc local-network-first

---

## D70. Significant published-activity changes require notify + re-choice / reconfirmation mechanisms

### Decision
Chọn **B + C**.

### Rule
Nếu activity thay đổi sau publish và ảnh hưởng đáng kể tới người đã đăng ký:
- hệ thống phải notify người bị ảnh hưởng
- nếu activity không bắt buộc và thay đổi làm lệch kỳ vọng ban đầu, có thể cho phép hủy ngoài cutoff
- khi thay đổi đủ lớn, hệ thống có thể yêu cầu xác nhận lại việc tham gia

---

## D71. Admin may edit business rules directly in production UI

### Decision
Chọn **A**.

### Rule
Admin có thể chỉnh trực tiếp rule/cấu hình nghiệp vụ trên production UI.

### Governance
Việc này vẫn phải tuân theo các decision đã chốt trước đó về:
- audit log
- versioning
- lịch sử thay đổi
- effective date nếu có

---

## D72. Sensitive rule changes require a second confirmation step

### Decision
Chọn **B**.

### Rule
Với các rule nhạy cảm như điểm, penalty, threshold, override policy:
- khi thay đổi phải có **bước xác nhận lần 2** trước khi lưu có hiệu lực

---

## D73. Student dashboard should expose the full participation/rule-awareness area

### Decision
Chọn **C**.

### Rule
Student-facing dashboard nên có khu vực riêng hiển thị đầy đủ các nội dung như:
- nghĩa vụ bắt buộc
- no-show hiện tại
- warning/rule đang áp
- cơ hội cải thiện
- điểm cải thiện đã được ghi nhận

---

## D74. Teacher dashboard should expose the full operational overview

### Decision
Chọn **C**.

### Rule
Teacher-facing dashboard nên có khu vực riêng hiển thị đầy đủ:
- activity pending approval
- participation processing
- pending exemption requests
- pending change requests
- warning về sync class / removed participants
- attendance issues

---

## D75. Admin dashboard should expose the full operational overview

### Decision
Chọn **C**.

### Rule
Admin-facing dashboard nên có khu vực theo dõi đầy đủ:
- approvals
- change requests
- participation generation jobs
- rule changes
- penalty/improvement trends
- notification failures
- attendance mode health

---

## D76. Sensitive actions require confirm/reason based on action type

### Decision
Chọn **D**.

### Rule
Các action quan trọng phải được phân loại theo độ nhạy:
- action thường có thể chỉ cần confirm
- action nhạy cảm phải có confirm
- và những action đủ nhạy cảm phải bắt buộc nhập reason

---

## D77. Authorized users can see excluded non-active students with their statuses in preview

### Decision
Chọn **D**.

### Rule
Với activity bắt buộc, khi có học viên không active bị loại khỏi participation:
- người có quyền phù hợp có thể xem trong preview
- theo dạng danh sách tên kèm trạng thái học viên

---

## D78. Students see only changes that directly affect them

### Decision
Chọn **C**.

### Rule
Trong lịch sử thay đổi activity sau publish:
- student không cần thấy changelog đầy đủ
- chỉ cần thấy các thay đổi ảnh hưởng trực tiếp tới quyền/lịch/việc tham gia của mình

---

## D79. QR overload fallback supports manual switch, policy-driven mixed/manual fallback, and face roadmap

### Decision
Chọn **D**.

### Rule
Nếu QR attendance có nguy cơ quá tải:
- teacher có thể chuyển sang manual ngay tại chỗ
- activity có thể được chuyển sang mixed/manual theo rule
- và lộ trình face attendance vẫn được chuẩn bị song song

---

## D80. Implementation priority is backbone flows first, deeper participation/config later

### Decision
Chọn **D**.

### Rule
Mức ưu tiên triển khai gần nhất là:
- khóa backbone flows trước
- sau đó mới tiếp tục hoàn thiện participation model sâu hơn, config nghiệp vụ và rule engine

---
## D81. A mandatory notification is only successful when the student actually reads it

### Decision
Chọn **C**.

### Rule
Với notification thuộc nhóm **buộc phải nhận ngay**:
- chỉ tạo notification record là chưa đủ
- chỉ gửi thành công tới một kênh cũng chưa đủ
- chỉ được coi là thành công khi **student thực sự mở/xem notification**

---

## D82. Unread mandatory notifications remain pending and must escalate if needed

### Decision
Chọn **D**.

### Rule
Nếu student chưa mở/xem notification bắt buộc:
- hệ thống đánh dấu `pending_notification_read`
- cho phép resend / remind
- flow vẫn chưa được coi là hoàn tất
- sau một thời hạn phù hợp phải escalate cho teacher/admin can thiệp

---

## D83. Mandatory-notification delivery failures require retry, fallback, and escalation

### Decision
Chọn **C**.

### Rule
Khi notification bắt buộc bị fail ở tầng gửi:
- phải retry tự động
- nếu có thì fallback sang kênh nội bộ khác
- nếu vẫn fail thì tạo cảnh báo bắt buộc cho teacher/admin xử lý

---

## D84. Single QR session uses one fixed token for the whole session

### Decision
Chọn **A**.

### Rule
Với mô hình mỗi activity chỉ có một QR session:
- QR token của phiên được giữ **cố định từ đầu đến cuối phiên**
- không rotate theo chu kỳ trong mô hình chuẩn hiện tại

---

## D85. QR fallback can be triggered both manually and by technical thresholds

### Decision
Chọn **C**.

### Rule
Fallback từ QR sang manual/mixed có thể được kích hoạt bởi cả hai hướng:
- teacher chủ động bấm chuyển khi vận hành thực tế cần
- hệ thống vượt ngưỡng lỗi / quá tải kỹ thuật đã xác định trước

---

## D86. MVP dashboards should be balanced across all three roles

### Decision
Chọn **D**.

### Rule
Ở giai đoạn MVP dashboard:
- cần làm đủ cho cả 3 vai trò student / teacher / admin
- không dồn hẳn về một phía duy nhất
- nhưng vẫn nên ưu tiên các widget phục vụ backbone flows trong từng vai trò

---

## D87. No need to separate business-admin and technical-admin roles for rule editing at this stage

### Decision
Chọn **A**.

### Rule
Ở giai đoạn hiện tại:
- chưa cần tách riêng admin nghiệp vụ và admin kỹ thuật khi chỉnh rule trên UI
- nhóm admin được xem như một lớp quản trị chung cho nhu cầu này

---

## D88. Sensitive actions use a policy-based model, with mandatory reasons for several critical groups

### Decision
Chọn **C + D**.

### Rule
Hệ thống cần có policy phân loại action theo độ nhạy.
Trong đó, các nhóm action quan trọng như sau nên bắt buộc nhập reason:
- rule change
- override quan trọng
- remove / restore participation
- exemption approve / reject
- manual attendance override ở mức nhạy cảm

---

## D89. Student-facing changelog includes any change that directly impacts participation rights, schedule, attendance, or scoring

### Decision
Chọn **C**.

### Rule
“Thay đổi ảnh hưởng trực tiếp tới student” bao gồm:
- thay đổi quyền tham gia
- thay đổi lịch / thời gian / địa điểm khi làm ảnh hưởng việc tham gia
- thay đổi attendance / cutoff / yêu cầu bắt buộc
- thay đổi scoring / evaluation nếu ảnh hưởng tới student đó

---
# B. OPEN QUESTIONS (to continue next session)

Các câu hỏi dưới đây **chưa chốt** hoặc cần đào sâu thêm ở phiên sau:

1. Với activity đã publish, nhóm trường nào là “trường nhẹ” có thể chỉnh trực tiếp nếu sau này cần nới rule?
2. Với activity bắt buộc, preview danh sách cuối cùng nên hỗ trợ export / download ở mức nào?
3. Với exemption / approved absence, ai có quyền ra quyết định cuối cùng trong từng scope (teacher vs admin vs delegated approver)?
4. Với attendance mode (`qr`, `manual`, `face`, `mixed`), mode mặc định theo loại activity nên là gì?
5. QR attendance nếu có nguy cơ quá tải thì **ngưỡng kỹ thuật cụ thể** nào sẽ kích hoạt fallback sang manual/mixed?
6. Vi phạm / penalty rule đầu tiên nên được triển khai theo tiêu chí nào trước: vắng không phép, gian lận, hay hành vi khác?
7. Improvement workflow ở giai đoạn đầu nên gồm những loại nhiệm vụ xây dựng nào?
8. Với student-facing rule transparency, phạm vi chi tiết nào nên hiển thị cho student, phạm vi nào chỉ admin/teacher thấy?
9. Có cần phân biệt soft warning / hard warning / disciplinary status ở giao diện student không?
10. Với voluntary activity, `no-show` status nên ảnh hưởng cụ thể ra sao tới ưu tiên đăng ký activity tương lai ngoài rule phạt điểm đã chốt?
11. Với improvement/recovery points, những tín hiệu tích cực nào sẽ là input đầu tiên của hệ thống?
12. Với notification bắt buộc phải được đọc, SLA/escalation sau bao lâu thì teacher/admin phải can thiệp?
13. Với retry/fallback notification bắt buộc, thứ tự kênh, số lần retry, và điều kiện coi là fail cuối cùng nên được cấu hình thế nào?
14. Với QR token cố định trong suốt phiên, cơ chế chống chia sẻ/gian lận nên bổ sung ở mức nào?
15. Trong mô hình dashboard MVP cân bằng cho cả 3 vai trò, widget nào là nhóm bắt buộc phải làm trước?
16. Trong policy action nhạy cảm, action nào bắt buộc nhập reason và action nào chỉ cần confirm là đủ?
17. “Thay đổi ảnh hưởng trực tiếp tới student” trong changelog activity nên map thành các field/event cụ thể nào trong hệ thống?

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



