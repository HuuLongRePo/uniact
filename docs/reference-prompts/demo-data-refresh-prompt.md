# Demo Data Refresh Prompt

Mục tiêu: làm mới dữ liệu demo/QA đủ lớn, sạch, và sát backbone web release-closeout để test tay đáng tin cậy.

## Nguyên tắc
- Web-first, critical-flow-first
- Không tạo dữ liệu đẹp giả nhưng không đi qua semantic hiện tại
- Ưu tiên ANND canonical accounts, class, teacher, student hiện có
- Dữ liệu demo phải đủ lớn để nhìn thấy pagination, filters, notifications, audit, attendance, awards, scoring
- Không overclaim biometric runtime production-ready, chỉ seed readiness/runtime surfaces trung thực
- Nếu có dữ liệu demo xấu, trùng, drift mạnh khỏi canonical seed direction thì dọn nó theo hướng pragmatic, không phá dữ liệu hệ thống lõi ngoài phạm vi demo/QA

## Backbone cần phản ánh trong dataset
1. teacher create activity
2. submit approval
3. admin approve/reject -> publish
4. student discover/register/cancel
5. attendance manual / QR / face
6. scoring persistence + visibility
7. notifications cho admin/teacher/student sau các action chính
8. audit trail đủ để truy vết
9. teacher notify students / scoped broadcast
10. biometric readiness/runtime groundwork fail-closed, honest

## Kỳ vọng dataset sau refresh
- 1 admin canonical
- 10+ teachers, gồm cả homeroom/class managers
- 200+ students chia nhiều lớp, canonical ANND emails
- lớp có manager rõ ràng, class-teacher mapping hợp lệ
- 20+ activities với mix trạng thái: draft, requested, approved/published, rejected, cancelled, completed
- mix class scope: mandatory, voluntary, open scope
- participations đủ dày để test register/cancel, capacity, discover, reporting
- attendance records có mix manual/qr/face nhưng face chỉ ở semantic pilot/honest
- point/scoring data đủ để test leaderboard, warning alerts, reports
- notifications có volume đủ để test history/filter/unread
- audit logs có coverage cho backbone actions
- award suggestions + approved/rejected awards đủ để test admin/student surfaces
- scheduled/broadcast notification fixtures đủ để test teacher history/export

## Checklist chất lượng
- canonical login accounts vẫn dùng được:
  - admin@annd.edu.vn / Admin@2025
  - gvcn.nguyenvanmanh@annd.edu.vn / teacher123
  - sv31a001@annd.edu.vn / student123
- quick login/demo accounts endpoint trả về account thật đang tồn tại
- không còn dữ liệu demo xấu dễ gây hiểu nhầm manual QA
- không để orphan records rõ ràng ở participations, notifications, awards, alerts
- không để activity dates quá khứ toàn bộ khiến backbone khó test tay
- có cả happy path lẫn edge path vừa đủ

## Cách thực thi ưu tiên
1. Audit script seed hiện tại và canonical account/test helper assumptions
2. Chỉnh seed script thay vì patch tay DB nếu có thể
3. Nếu DB hiện tại có drift/xấu, dùng seed reset/qa hoặc cleanup có kiểm soát
4. Verify lại counts và sample flows sau refresh
5. Chỉ commit các thay đổi thực sự phục vụ dataset/seed/prompt này

## Output mong muốn khi hoàn thành
- script/seed path rõ ràng để human rerun
- dataset demo sạch hơn và lớn hơn
- note ngắn về account canonical + những flow có thể test tay ngay
