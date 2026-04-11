# TASK QUEUE

Ngày tạo: 2026-04-06
Quy ước trạng thái: TODO / DOING / BLOCKED / DONE

## Đã hoàn thành trong pha khảo sát

### T-000 - Khảo sát repo và dựng bản đồ hệ thống

- Trạng thái: DONE
- Mục tiêu: hiểu stack, cấu trúc, flow lõi, rủi ro chính
- Phạm vi: toàn repo
- Kiểm thử: đọc code + chạy nhóm test hẹp
- Tiêu chí hoàn thành: có audit, plan, queue

## Hàng đợi thực thi đề xuất

### T-101 - Chuẩn hóa contract danh sách hoạt động sinh viên

- Trạng thái: DONE
- Mục tiêu: để `student/activities` hiển thị dữ liệu thật
- Phạm vi file:
  - `src/app/student/activities/page.tsx`
  - `src/app/api/activities/route.ts`
  - `src/infrastructure/db/db-queries.ts`
- Lý do cần làm: đang lệch `status` và `activity_status`
- Rủi ro: thấp
- Cách kiểm thử: mở list, lọc upcoming/all, thử đăng ký
- Tiêu chí hoàn thành: sinh viên thấy đúng hoạt động published

### T-102 - Chuẩn hóa contract chi tiết hoạt động sinh viên

- Trạng thái: DONE
- Mục tiêu: để `student/activities/[id]` có đủ dữ liệu cho CTA và thông tin phụ
- Phạm vi file:
  - `src/app/student/activities/[id]/page.tsx`
  - `src/app/api/activities/[id]/route.ts`
- Lý do cần làm: trang detail đang cần nhiều field chưa được API trả
- Rủi ro: trung bình
- Cách kiểm thử: mở detail, kiểm tra badge/register/cancel/countdown
- Tiêu chí hoàn thành: detail page không còn `undefined` logic

### T-103 - Đồng bộ approval workflow teacher/admin

- Trạng thái: DONE
- Mục tiêu: thống nhất `pending` hiển thị với `requested` trong DB/workflow
- Phạm vi file:
  - `src/app/teacher/activities/page.tsx`
  - `src/app/api/activities/route.ts`
  - `src/lib/activity-workflow.ts`
  - `src/components/ActivityDialog.tsx`
  - `src/app/api/admin/activities/pending/route.ts`
- Lý do cần làm: flow gửi duyệt là xương sống
- Rủi ro: trung bình
- Cách kiểm thử: tạo draft -> submit -> pending list -> approve/reject
- Tiêu chí hoàn thành: status và badge đúng xuyên suốt

### T-104 - Sửa metadata fetch cho ActivityDialog

- Trạng thái: DONE
- Mục tiêu: nạp đúng activity types và organization levels
- Phạm vi file:
  - `src/components/ActivityDialog.tsx`
  - `src/app/api/activity-types/route.ts`
  - `src/app/api/organization-levels/route.ts`
- Lý do cần làm: dialog tạo hoạt động đang thiếu dữ liệu đầu vào
- Rủi ro: thấp
- Cách kiểm thử: mở dialog create/edit
- Tiêu chí hoàn thành: dropdown hiển thị đúng dữ liệu

### T-105 - Quét và sửa cluster `start_time -> date_time` cho student module

- Trạng thái: DONE
- Mục tiêu: sửa các route/page student bị lệch schema rõ nhất
- Phạm vi file:
  - `src/app/api/student/statistics/route.ts`
  - `src/app/api/student/recommendations/route.ts`
  - `src/app/api/student/history/route.ts`
  - `src/app/api/student/points-breakdown/route.ts`
  - các page student liên quan
- Lý do cần làm: đang có 37 refs lệch schema
- Rủi ro: trung bình
- Cách kiểm thử: dashboard/history/points/recommendations
- Tiêu chí hoàn thành: không query cột cũ ở cluster student

### T-106 - Ổn định dashboard/admin system health

- Trạng thái: DONE
- Mục tiêu: dashboard phản ánh đúng số liệu và bỏ text tiếng Anh nổi bật
- Phạm vi file:
  - `src/features/dashboard/DashboardAdminPage.tsx`
  - `src/app/api/admin/system-health/route.ts`
  - `src/app/api/reports/dashboard/route.ts`
- Lý do cần làm: dashboard là mặt điều hành chính
- Rủi ro: trung bình
- Cách kiểm thử: so số liệu với DB và UI
- Tiêu chí hoàn thành: số liệu hợp lý, text chính được Việt hóa

### T-107 - Cập nhật regression tests cho activities

- Trạng thái: DONE
- Mục tiêu: sửa `test/activities.test.ts` để khớp guards hiện tại
- Phạm vi file:
  - `test/activities.test.ts`
- Lý do cần làm: test đang fail vì mock drift, làm yếu regression net
- Rủi ro: thấp
- Cách kiểm thử: chạy lại nhóm test hẹp
- Tiêu chí hoàn thành: bộ test lõi pass

### T-108 - Việt hóa sidebar và các text English nổi bật

- Trạng thái: DONE
- Mục tiêu: loại các text English hiển thị rõ trong UI
- Phạm vi file:
  - `src/components/Sidebar.tsx`
  - `src/features/dashboard/DashboardAdminPage.tsx`
  - `src/components/Countdown.tsx`
- Lý do cần làm: yêu cầu sản phẩm phải Việt hóa thống nhất
- Rủi ro: thấp
- Cách kiểm thử: rà UI và text snapshot
- Tiêu chí hoàn thành: không còn English ở các màn hình lõi đã chọn

### T-109 - Thay `confirm()` ở luồng lõi bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` ở flow teacher/student quan trọng nhất trước
- Phạm vi file:
  - `src/app/teacher/activities/page.tsx`
  - `src/app/student/my-activities/page.tsx`
  - các dialog dùng chung
- Lý do cần làm: hiện có 41 `confirm()` trong repo
- Rủi ro: thấp
- Cách kiểm thử: hành vi xóa/hủy/gửi duyệt
- Tiêu chí hoàn thành: flow lõi không còn `confirm()` trình duyệt

### T-110 - Hợp nhất tài liệu canonical

- Trạng thái: DONE
- Mục tiêu: xác định bộ tài liệu nguồn sự thật tối thiểu
- Phạm vi:
  - `README.md`
  - `docs/*`
  - `de-tai/*`
  - tài liệu root rời rạc
- Lý do cần làm: docs hiện tự mâu thuẫn
- Rủi ro: trung bình
- Cách kiểm thử: người tiếp quản đọc 1-2 nguồn là đủ hiểu
- Tiêu chí hoàn thành: có danh sách canonical docs rõ ràng

### T-111 - Chuẩn hóa student alerts theo `date_time` và `registration_deadline`

- Trạng thái: DONE
- Mục tiêu: sửa route cảnh báo học viên còn sót schema drift để nhắc nhở đúng hoạt động sắp diễn ra hoặc sắp hết hạn đăng ký
- Phạm vi file:
  - `src/app/api/student/alerts/route.ts`
  - `src/app/student/alerts/page.tsx`
- Lý do cần làm: `student/alerts` vẫn đang dùng `start_date` và `status='approved'`, không khớp schema/workflow hiện tại
- Rủi ro: thấp
- Cách kiểm thử: mở trang cảnh báo học viên, đối chiếu dữ liệu route và lint hẹp
- Tiêu chí hoàn thành: route trả cảnh báo đúng theo `published`, `date_time`, `registration_deadline`

### T-112 - Dọn cluster `start_time` còn sót ở cron và admin reports

- Trạng thái: DONE
- Mục tiêu: xử lý cụm drift schema còn lại ở các route/report có ảnh hưởng vận hành và nhắc lịch
- Phạm vi file:
  - `src/app/api/cron/send-reminders/route.ts`
  - `src/app/api/admin/reports/activity-statistics/route.ts`
  - `src/app/api/admin/rankings/route.ts`
  - `src/app/admin/reports/activity-statistics/page.tsx`
- Lý do cần làm: `start_time` vẫn còn ở các route dữ liệu quan trọng ngoài cluster student đã sửa
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + rà lại `start_time` trong phạm vi batch + đối chiếu response shape với page tiêu thụ
- Tiêu chí hoàn thành: không còn query nhầm cột `start_time` ở cụm cron/admin batch này

### T-113 - Chuẩn hóa cluster `start_time` còn sót ở teacher dashboard và QR sessions

- Trạng thái: DONE
- Mục tiêu: dọn nốt các điểm tương thích cũ đang còn bám `start_time` trong teacher dashboard và màn quản lý phiên QR
- Phạm vi file:
  - `src/app/api/teacher/dashboard/route.ts`
  - `src/app/teacher/activities/[id]/qr-sessions/page.tsx`
  - `src/app/api/activities/[id]/qr-sessions/route.ts`
- Lý do cần làm: đây là cụm `start_time` nổi bật tiếp theo còn chạm trực tiếp vào flow giảng viên và điểm danh QR
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check dashboard teacher + màn QR sessions
- Tiêu chí hoàn thành: teacher flow không còn phụ thuộc nhầm `start_time` trong contract nội bộ của batch này

### T-114 - Thu gọn alias `start_time` còn sót ở compatibility layer phía student

- Trạng thái: DONE
- Mục tiêu: dọn nốt các alias/fallback `start_time` còn lại ở route và page student sau các batch chuẩn hóa trước đó
- Phạm vi file:
  - `src/app/api/student/history/route.ts`
  - `src/app/api/student/points-breakdown/route.ts`
  - `src/app/api/student/recommendations/route.ts`
  - `src/app/student/history/page.tsx`
  - `src/app/student/points/page.tsx`
  - `src/app/student/dashboard/page.tsx`
  - `src/app/student/recommendations/page.tsx`
- Lý do cần làm: sau khi teacher/admin đã sạch hơn, phần còn lại của `start_time` chủ yếu là compatibility layer ở cluster student và có thể thu gọn tiếp
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check dashboard/history/points/recommendations của student
- Tiêu chí hoàn thành: các page student trong batch này ưu tiên đọc `date_time`, chỉ giữ fallback tối thiểu khi thật sự cần

### T-115 - Chuẩn hóa compatibility `start_date` còn sót ở teacher/admin activity screens

- Trạng thái: DONE
- Mục tiêu: thu gọn lớp tương thích `start_date` ở các màn teacher/admin còn đang đọc cột ngày cũ thay vì `date_time`
- Phạm vi file:
  - `src/app/teacher/attendance/[id]/page.tsx`
  - `src/app/api/admin/activities/route.ts`
  - `src/app/api/admin/activities/pending/route.ts`
  - `src/app/api/admin/activities/[id]/route.ts`
  - các page admin tiêu thụ trực tiếp như `admin/activities`, `admin/approvals`, `admin/users/[id]/activities`
- Lý do cần làm: sau khi `start_time` gần như đã sạch, cụm ngày cũ nổi bật tiếp theo là `start_date` trong flow quản trị và điểm danh
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check teacher attendance + admin activities/approvals
- Tiêu chí hoàn thành: batch này ưu tiên đọc `date_time`, chỉ giữ alias `start_date` khi thật sự cần cho tương thích cục bộ

### T-116 - Thay `confirm()` còn sót ở admin user management bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các thao tác quản trị người dùng cốt lõi để UX quản trị nhất quán hơn và tránh phụ thuộc hộp thoại trình duyệt
- Phạm vi file:
  - `src/app/admin/users/[id]/page.tsx`
  - `src/app/admin/users/page.tsx`
  - các component dialog dùng chung nếu cần tối thiểu
- Lý do cần làm: cụm admin user management là flow vận hành quan trọng, hiện vẫn còn các xác nhận reset mật khẩu/xóa/vô hiệu hóa dùng `confirm()`
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + smoke check các action reset mật khẩu, vô hiệu hóa/kích hoạt, xóa người dùng
- Tiêu chí hoàn thành: flow quản trị người dùng trong batch này không còn `confirm()` trình duyệt

### T-117 - Thay `confirm()` ở teacher activity subflows bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các thao tác teacher activity có tần suất dùng cao như quản lý phiên QR, danh sách tham gia, đánh giá và file đính kèm
- Phạm vi file:
  - `src/app/teacher/activities/[id]/qr-sessions/page.tsx`
  - `src/app/teacher/activities/[id]/participants/page.tsx`
  - `src/app/teacher/activities/[id]/evaluate/page.tsx`
  - `src/app/teacher/activities/[id]/files/page.tsx`
- Lý do cần làm: đây là cụm thao tác giáo viên chạm trực tiếp vào điểm danh, thành phần tham gia và đánh giá, hiện vẫn còn xác nhận kiểu trình duyệt
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check các thao tác kết thúc phiên QR, thêm/xóa hàng loạt học viên, áp dụng đánh giá, xóa file
- Tiêu chí hoàn thành: flow teacher activity trong batch này dùng dialog xác nhận thống nhất, không còn `confirm()` trình duyệt

### T-118 - Thay `confirm()` ở teacher communication flows bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các luồng giao tiếp giáo viên có tần suất thao tác cao như poll, thông báo và nhắn học viên
- Phạm vi file:
  - `src/app/teacher/polls/page.tsx`
  - `src/app/teacher/polls/settings/page.tsx`
  - `src/app/teacher/notifications/broadcast/page.tsx`
  - `src/app/teacher/notifications/settings/page.tsx`
  - `src/app/teacher/notify-students/page.tsx`
- Lý do cần làm: sau cụm activity core, các thao tác giáo viên còn sót `confirm()` tập trung nhiều nhất ở nhánh giao tiếp và gửi thông báo
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check đóng/xóa poll, gửi/xóa thông báo, hủy thông báo nhắc học viên
- Tiêu chí hoàn thành: flow giao tiếp giáo viên trong batch này dùng dialog xác nhận thống nhất, không còn `confirm()` trình duyệt trong phạm vi đã chọn

### T-119 - Thay `confirm()` ở teacher student-management flows bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các thao tác giáo viên quản lý học viên, ghi chú và lớp học để UX vận hành đồng nhất hơn
- Phạm vi file:
  - `src/app/teacher/students/[id]/page.tsx`
  - `src/app/teacher/students/[id]/notes/page.tsx`
  - `src/app/teacher/students/notes/page.tsx`
  - `src/app/teacher/classes/page.tsx`
- Lý do cần làm: sau cụm giao tiếp, các `confirm()` còn sót tập trung tiếp theo ở quản lý học viên và lớp học, là luồng giáo viên dùng thường xuyên
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check xóa ghi chú, xóa sinh viên khỏi lớp và các thao tác xác nhận liên quan
- Tiêu chí hoàn thành: flow quản lý học viên của giáo viên trong batch này dùng dialog xác nhận thống nhất, không còn `confirm()` trình duyệt trong phạm vi đã chọn

### T-120 - Thay `confirm()` ở student self-service flows bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các thao tác tự phục vụ của sinh viên như quản lý thông báo và thiết bị để trải nghiệm nhất quán hơn trên các màn người dùng cuối
- Phạm vi file:
  - `src/app/student/notifications/page.tsx`
  - `src/app/student/devices/page.tsx`
  - `src/app/activities/new/page.tsx`
  - `src/app/biometric/enroll/page.tsx`
- Lý do cần làm: sau khi dọn xong teacher student-management, các `confirm()` còn sót gần người dùng cuối nhất đang nằm ở cụm self-service của sinh viên và tạo hoạt động
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check xóa thông báo, xóa thiết bị, xóa bản nháp hoạt động và xóa template sinh trắc học
- Tiêu chí hoàn thành: các thao tác tự phục vụ trong batch này dùng dialog xác nhận thống nhất, không còn `confirm()` trình duyệt trong phạm vi đã chọn

### T-121 - Thay `confirm()` ở admin catalog/config flows bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các thao tác quản trị cấu hình và danh mục nền tảng để UX admin nhất quán hơn ở các màn quản trị tần suất cao
- Phạm vi file:
  - `src/features/organization-levels/OrganizationLevelsAdminPage.tsx`
  - `src/features/award-types/AwardTypesAdminPage.tsx`
  - `src/features/activity-types/ActivityTypesAdminPage.tsx`
  - `src/app/admin/config/qr/page.tsx`
  - `src/app/admin/config/org-levels/page.tsx`
- Lý do cần làm: sau batch self-service, cụm `confirm()` còn sót ít rủi ro và gắn kết nhất nằm ở các màn cấu hình/danh mục admin
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check xóa loại hoạt động, loại khen thưởng, cấp tổ chức và khôi phục cấu hình QR
- Tiêu chí hoàn thành: các thao tác cấu hình/danh mục trong batch này dùng dialog xác nhận thống nhất, không còn `confirm()` trình duyệt trong phạm vi đã chọn

### T-122 - Thay `confirm()` ở admin operations flows bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` khỏi các thao tác vận hành/quản trị hệ thống còn lại để UX admin nhất quán hơn ở các màn có tác động lớn
- Phạm vi file:
  - `src/app/admin/activity-templates/page.tsx`
  - `src/app/admin/backup/page.tsx`
  - `src/app/admin/scores/page.tsx`
- Lý do cần làm: sau khi dọn xong catalog/config, các `confirm()` còn sót nhiều nhất và gắn kết nhất nằm ở nhóm thao tác vận hành admin như template, backup và tính điểm
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + smoke check xóa template, tạo/khôi phục/xóa backup và tính lại điểm
- Tiêu chí hoàn thành: các thao tác vận hành admin trong batch này dùng dialog xác nhận thống nhất, không còn `confirm()` trình duyệt trong phạm vi đã chọn

### T-123 - Thay `confirm()` cuối cùng ở teacher awards suggestions bằng dialog chuẩn

- Trạng thái: DONE
- Mục tiêu: loại `confirm()` còn sót cuối cùng trong repo để hoàn tất việc chuẩn hóa UX xác nhận thao tác
- Phạm vi file:
  - `src/app/teacher/awards/suggestions/page.tsx`
- Lý do cần làm: sau `T-122`, repo chỉ còn đúng 1 `confirm()` ở flow teacher awards suggestions
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + smoke check xóa đề xuất danh hiệu
- Tiêu chí hoàn thành: không còn `confirm()` trong `src/app` và `src/features`

### T-124 - Chuẩn hóa script/package command thân thiện Windows

- Trạng thái: DONE
- Mục tiêu: bỏ các lệnh Bash/Linux-only ở những npm scripts hay dùng và sửa README để người dùng Windows chạy đúng lệnh thực tế
- Phạm vi file:
  - `package.json`
  - `scripts/tests/test-activity-contract.mjs`
  - `scripts/tools/run-with-node-env.mjs`
  - `scripts/tools/health-check.mjs`
  - `scripts/tools/system-info.mjs`
  - `scripts/tools/logs.mjs`
  - `scripts/tools/benchmark.mjs`
  - `README.md`
- Lý do cần làm: repo đang còn `bash`, `curl | jq`, `journalctl`, `lscpu/free -h` và `NODE_ENV=production ...` dễ lỗi ngay trên máy Windows 8GB của người dùng
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: parse/smoke các helper script mới + rà lại `package.json`/README các lệnh đã sửa
- Tiêu chí hoàn thành: các npm scripts lõi không còn phụ thuộc shell Linux ở các lệnh đã chọn và README không còn hướng dẫn `db:init`/`db:seed` sai tên

### T-125 - Đồng bộ tài liệu vận hành chính với script hiện tại

- Trạng thái: DONE
- Mục tiêu: sửa các tài liệu setup/deploy chính đang trỏ vào script hoặc lệnh không còn tồn tại, đồng thời bổ sung ví dụ thân thiện Windows ở các bước dễ chạy nhầm
- Phạm vi file:
  - `docs/01-README.md`
  - `docs/04-DEPLOYMENT.md`
  - `docs/RECOVERY_COMPLETE.md`
- Lý do cần làm: sau `T-124`, các docs chính vẫn còn nhắc `seed-enhanced-demo.ts`, `backup-db.js`, `migrations/status.ts`, `test:coverage` và nhiều lệnh shell chỉ hợp Linux/macOS
- Rủi ro: thấp
- Cách kiểm thử: rà lại các pattern script/lệnh cũ bằng `rg`, đối chiếu với `package.json` hiện tại
- Tiêu chí hoàn thành: tài liệu vận hành chính không còn trỏ vào script sai tên trong phạm vi batch và có đường chạy rõ hơn cho Windows

### T-126 - Đồng bộ tài liệu học thuật `de-tai/07` với script hiện tại

- Trạng thái: DONE
- Mục tiêu: sửa các ví dụ quick-start và sơ đồ cây thư mục trong `de-tai/07-CONG-NGHE-THUC-HIEN.md` để không còn trỏ vào script drift so với repo hiện tại
- Phạm vi file:
  - `de-tai/07-CONG-NGHE-THUC-HIEN.md`
- Lý do cần làm: sau `T-125`, còn sót một cụm nhỏ trong tài liệu học thuật nhắc `curl -s /api/health`, `seed-demo-data.ts` và `backup-db.js`
- Rủi ro: thấp
- Cách kiểm thử: `rg` hẹp trong đúng file để xác nhận các token cũ đã biến mất
- Tiêu chí hoàn thành: file học thuật này không còn trỏ vào 3 token script/lệnh cũ trong phạm vi batch

### T-127 - Sửa lệnh drift cuối trong `docs/RECOVERY_COMPLETE.md`

- Trạng thái: DONE
- Mục tiêu: loại lệnh `db:backup` không tồn tại và đồng bộ ví dụ build/start với cách gọi production script hiện tại
- Phạm vi file:
  - `docs/RECOVERY_COMPLETE.md`
- Lý do cần làm: sau `T-126`, tài liệu historical này vẫn còn đúng 1 script sai tên và một cụm ví dụ build/start lệch chuẩn vận hành mới
- Rủi ro: thấp
- Cách kiểm thử: `rg` hẹp với `db:backup`, `production:build`, `production:start`
- Tiêu chí hoàn thành: không còn `db:backup` trong file và ví dụ production bám theo script hiện tại

### T-128 - Thu gọn compatibility alias ở màn admin time-slots

- Trạng thái: DONE
- Mục tiêu: bỏ alias `start_date` không còn cần trong consumer `admin/time-slots` và dọn typing cục bộ để màn này bám đúng contract hiện tại
- Phạm vi file:
  - `src/app/admin/time-slots/page.tsx`
- Lý do cần làm: route admin activities hiện đã trả `date_time`, nhưng màn time-slots vẫn giữ normalization `start_date` cũ và còn 3 warning `any`
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp đúng file `admin/time-slots`
- Tiêu chí hoàn thành: màn này đọc trực tiếp `date_time`, không còn `any` cục bộ và lint sạch warning trong phạm vi batch

### T-129 - Chuẩn hóa consumer teacher reports theo response shape API hiện tại

- Trạng thái: DONE
- Mục tiêu: sửa các màn báo cáo giáo viên đang giả định `/api/classes`, `/api/activity-types` và các route report trả mảng trần, trong khi API hiện tại trả object bọc dữ liệu
- Phạm vi file:
  - `src/app/teacher/reports/class-stats/page.tsx`
  - `src/app/teacher/reports/participation/page.tsx`
  - `src/app/teacher/reports/attendance/page.tsx`
- Lý do cần làm: các bộ lọc lớp/loại hoạt động ở teacher reports có nguy cơ vỡ runtime vì consumer đọc sai shape, làm mảng `classes` và `activityTypes` bị set thành object
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: lint hẹp 3 file + rà lại logic parse response trong đúng các màn báo cáo teacher
- Tiêu chí hoàn thành: teacher reports đọc được cả shape `data.*` lẫn top-level legacy, tải filter đúng dữ liệu và không còn warning cục bộ trong batch

### T-130 - Rà legacy report routes còn drift schema và xác định consumer thật

- Trạng thái: DONE
- Mục tiêu: kiểm tra cụm `/api/reports/*` còn dùng cột cũ như `a.date`, `created_by`, `type_id`, `org_level_id`, xác định route nào còn consumer active và chuẩn hóa batch nhỏ tiếp theo
- Phạm vi file:
  - `src/app/api/reports/term-report/route.ts`
  - `src/app/api/reports/class-participation/route.ts`
  - `src/app/api/reports/teacher-dashboard/route.ts`
  - các page/consumer gọi trực tiếp các route này nếu còn tồn tại
- Lý do cần làm: sau khi consumer teacher reports active đã ổn định, backlog còn lại nổi bật nhất là nhóm report route legacy có nguy cơ drift schema nhưng chưa rõ còn được dùng hay không
- Rủi ro: trung bình
- Cách kiểm thử: tìm consumer thật + lint hẹp theo batch được chọn, tránh sửa route mồ côi vô ích
- Tiêu chí hoàn thành: biết rõ route nào còn active, route nào là legacy và có batch sửa tiếp theo không gây lan scope

### T-131 - Rà `/api/reports/attendance` và consumer admin report còn lại

- Trạng thái: DONE
- Mục tiêu: kiểm tra route `/api/reports/attendance` hiện không thấy consumer trong `src`, đồng thời đối chiếu các màn admin report còn đang dùng `/api/reports/participation` để tách route active khỏi route legacy
- Phạm vi file:
  - `src/app/api/reports/attendance/route.ts`
  - `src/app/api/reports/participation/route.ts`
  - `src/features/reports/ParticipationReportAdminPage.tsx`
  - consumer admin/report liên quan nếu có
- Lý do cần làm: sau `T-130`, cây `/api/reports` vẫn là mixed state, trong đó ít nhất `/api/reports/participation` còn active còn `/api/reports/attendance` chưa thấy caller thật
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: tìm consumer thật + lint hẹp theo batch được chọn
- Tiêu chí hoàn thành: xác định rõ route nào trong nhánh admin reports còn sống và batch sửa tiếp theo không đụng nhầm route đang chạy

### T-132 - Nâng cấp filter thật cho admin participation report

- Trạng thái: DONE
- Mục tiêu: thay các ô nhập tay `class_id` và `activity_type_id` ở màn admin participation report bằng dữ liệu chọn sẵn từ API hiện tại để người dùng không phải nhớ ID
- Phạm vi file:
  - `src/features/reports/ParticipationReportAdminPage.tsx`
  - nếu cần tối thiểu: `src/app/api/classes/route.ts`
  - nếu cần tối thiểu: `src/app/api/activity-types/route.ts`
- Lý do cần làm: sau `T-131`, route participation admin đã là nhánh active rõ ràng nhưng UX filter vẫn còn thô và dễ nhập sai
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + smoke check lọc theo lớp/loại hoạt động và export CSV
- Tiêu chí hoàn thành: màn admin participation report dùng select/dropdown dữ liệu thật, không còn bắt người dùng nhập ID thủ công

### T-133 - Rà admin report pages còn active sau nhánh participation

- Trạng thái: DONE
- Mục tiêu: kiểm tra các màn admin report còn active như `scores`, `teachers`, `custom`, `activity-statistics` để tìm contract drift, text lỗi mã hóa hoặc UX còn thô sau khi nhánh participation đã ổn
- Phạm vi file:
  - `src/app/admin/reports/scores/page.tsx`
  - `src/app/admin/reports/teachers/page.tsx`
  - `src/app/admin/reports/custom/page.tsx`
  - `src/app/admin/reports/activity-statistics/page.tsx`
  - các route admin report tương ứng nếu thực sự cần
- Lý do cần làm: nhánh admin reports đang có giá trị sử dụng thật; sau khi participation đã được làm sạch, nên rà tiếp các màn active còn lại trước khi quay sang batch khác
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: lint hẹp theo batch được chọn + tìm consumer active tương ứng
- Tiêu chí hoàn thành: xác định rõ màn nào còn drift/text lỗi/UX yếu và có batch sửa tiếp theo đủ hẹp để triển khai an toàn

### T-134 - Chuẩn hóa luồng admin custom reports theo schema và khả năng xuất thật

- Trạng thái: DONE
- Mục tiêu: làm cho `admin/reports/custom` dùng được thật với schema hiện tại, bỏ các tùy chọn xuất giả hỗ trợ và sửa text lỗi mã hóa
- Phạm vi file:
  - `src/app/admin/reports/custom/page.tsx`
  - `src/app/api/admin/reports/custom/route.ts`
- Lý do cần làm: trong nhóm admin reports active, `custom` là cụm có rủi ro cao nhất vì vừa lỗi text, vừa dùng cột drift như `created_by`, `p.user_id`, `ps.points`
- Rủi ro: trung bình
- Cách kiểm thử: lint hẹp + kiểm tra logic preview/export CSV
- Tiêu chí hoàn thành: luồng custom report bám schema hiện tại, preview/export ổn định và UI chỉ hiển thị các khả năng thật sự được hỗ trợ

### T-135 - Việt hóa và làm sạch 3 màn admin reports còn lại

- Trạng thái: DONE
- Mục tiêu: dọn text lỗi mã hóa, tiếng Anh còn sót và typing cục bộ ở `scores`, `teachers`, `activity-statistics`
- Phạm vi file:
  - `src/app/admin/reports/scores/page.tsx`
  - `src/app/admin/reports/teachers/page.tsx`
  - `src/app/admin/reports/activity-statistics/page.tsx`
  - route tương ứng nếu cần tối thiểu
- Lý do cần làm: sau khi `custom` đã ổn định hơn, 3 màn active còn lại chủ yếu nợ Việt hóa, wording và một ít typing/contract polish
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + rà text hiển thị
- Tiêu chí hoàn thành: 3 màn admin report còn lại đọc tự nhiên, không lỗi mã hóa và không có drift cục bộ dễ thấy

### T-136 - Rà admin report routes còn thông báo tiếng Anh hiếm gặp

- Trạng thái: DONE
- Mục tiêu: dọn nốt các route admin report active còn trả message lỗi hoặc CSV header chưa thật sự nhất quán sau đợt làm sạch UI
- Phạm vi file:
  - `src/app/api/admin/reports/scores/route.ts`
  - `src/app/api/admin/reports/teachers/route.ts`
  - `src/app/api/admin/reports/activity-statistics/route.ts`
  - các route admin report active khác nếu còn lộ message tiếng Anh rõ rệt
- Lý do cần làm: sau khi ba màn admin report đã sạch hơn, lớp route là nơi cuối còn có thể lộ wording lệch hoặc response chưa đồng nhất lúc lỗi
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + rà response lỗi/CSV trong đúng scope
- Tiêu chí hoàn thành: route admin report active trong batch không còn thông báo tiếng Anh rõ rệt và giữ nguyên contract hiện tại

### T-137 - Làm sạch màn tổng quan `/admin/reports`

- Trạng thái: DONE
- Mục tiêu: Việt hóa sạch tiêu đề, mô tả và CTA trên màn tổng quan báo cáo quản trị đang còn lỗi mã hóa rõ rệt
- Phạm vi file:
  - `src/app/admin/reports/page.tsx`
- Lý do cần làm: đây là cửa vào của toàn bộ cụm admin reports nhưng vẫn còn mojibake ở title/description/card text
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + rà text hiển thị
- Tiêu chí hoàn thành: màn index admin reports đọc tự nhiên, không còn text lỗi mã hóa

### T-138 - Thêm regression test hẹp cho admin report routes active

- Trạng thái: DONE
- Mục tiêu: bổ sung kiểm thử hẹp cho các route admin report vừa được làm sạch để giảm nguy cơ trôi contract ở các batch sau
- Phạm vi file:
  - `src/app/api/admin/reports/scores/route.ts`
  - `src/app/api/admin/reports/teachers/route.ts`
  - `src/app/api/admin/reports/activity-statistics/route.ts`
  - file test mới tương ứng trong `test/`
- Lý do cần làm: sau nhiều batch làm sạch UI/route, nhánh admin reports đã ổn định hơn nhưng vẫn chưa có regression net riêng
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy đúng nhóm test mới của admin reports
- Tiêu chí hoàn thành: có test hẹp xác nhận route active trả shape chính đúng và route export không gãy cơ bản

### T-139 - Thêm regression test cho admin report legacy routes

- Trạng thái: DONE
- Mục tiêu: phủ test hẹp cho các route admin report đã chuyển sang `410 legacy` để tránh vô tình mở lại SQL cũ ở các batch sau
- Phạm vi file:
  - `src/app/api/admin/reports/_legacy.ts`
  - `src/app/api/admin/reports/student-points/route.ts`
  - `src/app/api/admin/reports/class-participation/route.ts`
  - file test mới hoặc mở rộng `test/admin-report-routes.test.ts`
- Lý do cần làm: nhánh legacy admin reports vừa được fail-fast hóa nhưng chưa có regression net xác nhận mã trạng thái và thông điệp thay thế
- Rủi ro: thấp
- Cách kiểm thử: chạy đúng file test admin reports
- Tiêu chí hoàn thành: route legacy trả `410`, mã lỗi đúng và gợi ý thay thế không bị mất

### T-140 - Thêm regression test cho route participation đang phục vụ admin reports

- Trạng thái: DONE
- Mục tiêu: khóa contract cho `/api/reports/participation` vì đây vẫn là route active đứng sau màn admin participation report
- Phạm vi file:
  - `src/app/api/reports/participation/route.ts`
  - `src/features/reports/ParticipationReportAdminPage.tsx`
  - file test mới hoặc mở rộng file test phù hợp trong `test/`
- Lý do cần làm: sau khi admin report routes nội bộ đã có regression net, endpoint participation bên nhánh `/api/reports` vẫn là mắt xích active quan trọng nhưng chưa có test riêng
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy đúng nhóm test mới của participation report
- Tiêu chí hoàn thành: route participation trả shape ổn định cho JSON/CSV và không trôi contract với màn admin report

### T-141 - Gia cố route/page participation cho export CSV và hiển thị lỗi

- Trạng thái: DONE
- Mục tiêu: làm route participation xuất CSV an toàn hơn với dữ liệu chứa dấu ngoặc kép hoặc dấu phẩy, đồng thời phân biệt rõ lỗi tải dữ liệu với empty state ở màn admin participation report
- Phạm vi file:
  - `src/app/api/reports/participation/route.ts`
  - `src/features/reports/ParticipationReportAdminPage.tsx`
  - `test/participation-report-route.test.ts`
- Lý do cần làm: sau khi đã có regression test cho route active, lớp hardening tiếp theo là chặn lỗi CSV hỏng cột và tránh việc UI im lặng biến lỗi tải dữ liệu thành danh sách rỗng
- Rủi ro: thấp
- Cách kiểm thử: lint hẹp + chạy lại file test participation report
- Tiêu chí hoàn thành: CSV escape đúng, page hiện lỗi rõ ràng và regression test vẫn pass

### T-142 - Thêm regression test cho dữ liệu filter options của participation report

- Trạng thái: DONE
- Mục tiêu: khóa thêm contract nạp danh sách lớp và loại hoạt động của màn admin participation report để tránh trôi shape ở `/api/classes` và `/api/activity-types`
- Phạm vi file:
  - `src/features/reports/ParticipationReportAdminPage.tsx`
  - file test phù hợp trong `test/`
- Lý do cần làm: route chính của participation report đã có regression net, nhưng nhánh filter options vẫn là phụ thuộc active chưa có test riêng
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy đúng nhóm test mới hoặc test component/hàm parse phù hợp
- Tiêu chí hoàn thành: màn participation report không bị vỡ dropdown khi `/api/classes` hoặc `/api/activity-types` đổi nhẹ response shape

### T-143 - Thêm smoke test component cho ParticipationReportAdminPage

- Trạng thái: DONE
- Mục tiêu: phủ smoke test render cho `ParticipationReportAdminPage` để khóa luôn 3 nhánh chính là tải filter options, hiển thị empty state và hiển thị report error
- Phạm vi file:
  - `src/features/reports/ParticipationReportAdminPage.tsx`
  - file test component mới trong `test/`
- Lý do cần làm: route test và parser test đã có, nhưng bản thân component vẫn chưa có regression net cho hành vi render quan trọng
- Rủi ro: trung bình
- Cách kiểm thử: chạy đúng file test component participation report
- Tiêu chí hoàn thành: component render ổn với auth admin, dropdown nạp đúng, và lỗi tải report không bị rơi nhầm về empty state

### T-144 - Thêm smoke test component cho admin custom report page

- Trạng thái: DONE
- Mục tiêu: bổ sung smoke test cho `admin/reports/custom` để khóa các trạng thái vào bước cấu hình, xem trước thành công và lỗi preview ở màn report tùy chỉnh đang còn active
- Phạm vi file:
  - `src/app/admin/reports/custom/page.tsx`
  - file test component mới trong `test/`
- Lý do cần làm: sau khi participation report đã có đủ route test, parser test và component smoke test, màn custom report là điểm active tiếp theo có nhiều trạng thái UI nhưng chưa có regression net ở mức component
- Rủi ro: trung bình
- Cách kiểm thử: chạy đúng file test component của custom report page
- Tiêu chí hoàn thành: custom report page render ổn với auth admin, vào được bước cấu hình, hiển thị preview mẫu và báo lỗi preview đúng cách khi request thất bại

### T-145 - Thêm smoke test component cho admin teachers report page

- Trạng thái: DONE
- Mục tiêu: bổ sung smoke test cho `admin/reports/teachers` để khóa các nhánh render bảng dữ liệu, empty state và lỗi tải báo cáo ở màn đang active
- Phạm vi file:
  - `src/app/admin/reports/teachers/page.tsx`
  - file test component mới trong `test/`
- Lý do cần làm: sau participation/custom report, màn teachers report là điểm active tiếp theo trong cụm admin reports đã được làm sạch UI nhưng chưa có regression net ở mức component
- Rủi ro: trung bình
- Cách kiểm thử: chạy đúng file test component của teachers report page
- Tiêu chí hoàn thành: teachers report page render ổn với auth admin, giữ được các trạng thái dữ liệu chính và không bị trôi ở các batch UI tiếp theo

### T-146 - Thêm smoke test component cho admin scores report page

- Trạng thái: DONE
- Mục tiêu: bổ sung smoke test cho `admin/reports/scores` để khóa các nhánh render dữ liệu, trạng thái rỗng và lỗi tải báo cáo ở màn đang active
- Phạm vi file:
  - `src/app/admin/reports/scores/page.tsx`
  - file test component mới trong `test/`
- Lý do cần làm: sau teachers report, màn scores report là điểm active tiếp theo trong cụm admin reports đã được làm sạch UI nhưng chưa có regression net ở mức component
- Rủi ro: trung bình
- Cách kiểm thử: chạy đúng file test component của scores report page
- Tiêu chí hoàn thành: scores report page render ổn với auth admin, hiển thị đúng dữ liệu cốt lõi và không bị trôi ở các batch UI tiếp theo

### T-147 - Thêm smoke test component cho admin activity-statistics report page

- Trạng thái: DONE
- Mục tiêu: bổ sung smoke test cho `admin/reports/activity-statistics` để khóa các nhánh render dữ liệu, filter cơ bản và trạng thái rỗng/lỗi ở màn đang active
- Phạm vi file:
  - `src/app/admin/reports/activity-statistics/page.tsx`
  - file test component mới trong `test/`
- Lý do cần làm: sau scores report, đây là màn active còn lại trong cụm admin reports đã được làm sạch UI nhưng chưa có regression net ở mức component
- Rủi ro: trung bình
- Cách kiểm thử: chạy đúng file test component của activity-statistics report page
- Tiêu chí hoàn thành: activity-statistics report page render ổn với auth admin, giữ được các trạng thái UI chính và không bị trôi ở các batch sau

### T-148 - Chạy regression bundle nhỏ cho cụm admin report pages

- Trạng thái: DONE
- Mục tiêu: gom và xác minh lại toàn bộ smoke test page-level vừa thêm cho `participation`, `custom`, `teachers`, `scores`, `activity-statistics` để khóa cụm admin reports ở mức bundle nhỏ
- Phạm vi file:
  - `test/participation-report-page.test.tsx`
  - `test/custom-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
  - `test/scores-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
- Lý do cần làm: sau nhiều batch test đơn lẻ, cần một bước xác minh gom nhóm để chắc rằng cụm admin reports vẫn ổn khi chạy theo lô nhỏ
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy đúng 5 file smoke test của admin reports trong một lệnh test hẹp
- Tiêu chí hoàn thành: bundle smoke test admin reports pass, đủ tự tin khóa cụm UI báo cáo quản trị trước khi sang nhánh khác

### T-149 - Chạy regression bundle tổng hợp cho admin reports routes và pages

- Trạng thái: DONE
- Mục tiêu: gom các route test và page smoke test của admin reports thành một bộ regression hẹp nhưng bao trùm để khóa cả backend lẫn UI của cụm báo cáo quản trị
- Phạm vi file:
  - `test/admin-report-routes.test.ts`
  - `test/participation-report-route.test.ts`
  - `test/participation-report-options.test.ts`
  - `test/participation-report-page.test.tsx`
  - `test/custom-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
  - `test/scores-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
- Lý do cần làm: sau khi cả route-level và page-level của admin reports đã có regression net riêng, cần một bước xác minh hợp nhất để khóa cụm báo cáo quản trị trước khi chuyển ưu tiên sang nhánh khác
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy đúng nhóm test admin reports trong một lệnh test hẹp
- Tiêu chí hoàn thành: bundle admin reports routes + pages pass, đủ tự tin xem cụm admin reports đã được khóa regression ở mức cụm chức năng

### T-150 - Chạy regression bundle mở rộng cho core flows và admin reports

- Trạng thái: DONE
- Mục tiêu: gom các test lõi đã ổn định của `approval`, `attendance`, `activities` với bundle admin reports để xác minh lại toàn bộ xương sống hiện tại sau chuỗi batch sửa gần đây
- Phạm vi file:
  - `test/approval-workflow.test.ts`
  - `test/attendance.test.ts`
  - `test/activities.test.ts`
  - `test/admin-report-routes.test.ts`
  - `test/participation-report-route.test.ts`
  - `test/participation-report-options.test.ts`
  - `test/participation-report-page.test.tsx`
  - `test/custom-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
  - `test/scores-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
- Lý do cần làm: sau khi admin reports đã được khóa theo cụm, bước hợp lý tiếp theo là xác minh xem cụm reports còn tương thích với các flow lõi của sản phẩm hay không
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy đúng bundle regression mở rộng trong một lệnh test hẹp
- Tiêu chí hoàn thành: bundle core + admin reports pass, đủ tự tin xem phần xương sống hiện tại đang ổn định ở mức regression

### T-151 - Đưa regression bundle xương sống vào package scripts

- Trạng thái: DONE
- Mục tiêu: thêm một script npm ngắn cho bundle regression đã ổn định của core flows + admin reports để việc chạy lại sau này nhanh hơn, ít sai phạm vi hơn và dễ bàn giao hơn
- Phạm vi file:
  - `package.json`
  - `README.md`
  - `docs/01-README.md`
- Lý do cần làm: hiện bundle `T-150` đã chứng minh được độ ổn định nhưng vẫn phải gõ một lệnh dài; đóng gói thành script chuẩn sẽ giúp bảo trì, handoff và tự kiểm thử sau này nhẹ hơn
- Rủi ro: thấp
- Cách kiểm thử: chạy đúng script mới sau khi thêm và đối chiếu kết quả với bundle hiện tại
- Tiêu chí hoàn thành: có script ngắn, mô tả rõ trong docs chính và chạy ra cùng kết quả như bundle test mở rộng vừa pass

### T-152 - Đưa bundle regression admin reports vào package scripts

- Trạng thái: DONE
- Mục tiêu: thêm một script npm ngắn riêng cho cụm admin reports để khi chỉ cần xác minh reports có thể chạy nhanh hơn, không phải gọi cả bundle xương sống
- Phạm vi file:
  - `package.json`
  - `README.md`
  - `docs/01-README.md`
- Lý do cần làm: hiện `test:backbone` hữu ích cho xương sống toàn cục, nhưng cụm admin reports cũng đã có regression bundle riêng và xứng đáng có lệnh ngắn để phục vụ vòng lặp sửa lỗi nhanh hơn
- Rủi ro: thấp
- Cách kiểm thử: chạy đúng script admin reports mới và đối chiếu với bundle `T-149` đã pass
- Tiêu chí hoàn thành: có script ngắn cho admin reports, docs chính có nhắc tới và script mới chạy ổn

### T-153 - Đưa bundle regression core flows vào package scripts

- Trạng thái: DONE
- Mục tiêu: thêm một script npm ngắn riêng cho cụm `approval`, `attendance`, `activities` để khi chỉ sửa luồng lõi có thể kiểm thử nhanh hơn, không cần chạy cả reports
- Phạm vi file:
  - `package.json`
  - `README.md`
  - `docs/01-README.md`
- Lý do cần làm: sau khi đã có `test:backbone` và `test:admin-reports`, hệ script sẽ cân đối hơn nếu core flows cũng có lệnh riêng phục vụ vòng lặp sửa lỗi nhanh
- Rủi ro: thấp
- Cách kiểm thử: chạy đúng script core flows mới và đối chiếu với các file test lõi đã pass trước đó
- Tiêu chí hoàn thành: có script ngắn cho core flows, docs chính có nhắc tới và script mới chạy ổn

### T-154 - Đưa smoke test admin report pages vào package scripts

- Trạng thái: DONE
- Mục tiêu: thêm một script npm ngắn cho 5 smoke test page-level của admin reports để khi đang sửa UI reports có thể chạy vòng kiểm thử ngắn hơn `test:admin-reports`
- Phạm vi file:
  - `package.json`
  - `README.md`
  - `docs/01-README.md`
- Lý do cần làm: hiện `test:admin-reports` đã hữu ích cho cả route và page, nhưng với các batch UI thuần thì bundle page-level riêng sẽ nhẹ và nhanh hơn
- Rủi ro: thấp
- Cách kiểm thử: chạy đúng script page-level mới và đối chiếu với bundle `T-148` đã pass
- Tiêu chí hoàn thành: có script ngắn cho smoke test page-level admin reports, docs chính có nhắc tới và script mới chạy ổn

### T-155 - Đưa route-level regression admin reports vào package scripts

- Trạng thái: DONE
- Mục tiêu: thêm một script npm ngắn cho cụm route-level của admin reports để khi đang sửa API reports có thể chạy vòng kiểm thử hẹp hơn `test:admin-reports`
- Phạm vi file:
  - `package.json`
  - `README.md`
  - `docs/01-README.md`
- Lý do cần làm: sau khi đã có script riêng cho page-level, bộ regression admin reports sẽ cân đối và dùng thuận tay hơn nếu route-level cũng có lệnh riêng
- Rủi ro: thấp
- Cách kiểm thử: chạy đúng script route-level mới và đối chiếu với các bundle `T-138`, `T-139`, `T-140`, `T-142`
- Tiêu chí hoàn thành: có script ngắn cho route-level admin reports, docs chính có nhắc tới và script mới chạy ổn

### T-156 - Làm sạch stderr trong smoke tests admin reports

- Trạng thái: DONE
- Mục tiêu: dọn nhiễu `stderr` còn xuất hiện khi chạy các smoke test admin reports để bundle page-level và bundle reports tổng hợp chạy sạch hơn, ít gây hiểu nhầm hơn
- Phạm vi file:
  - `test/participation-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
  - các helper/mock liên quan nếu cần tối thiểu
- Lý do cần làm: các bundle test hiện đã pass nhưng vẫn còn log lỗi `Invalid URL` do một số nhịp fetch rơi sang native implementation, làm output khó đọc và che khuất tín hiệu thật
- Rủi ro: thấp đến trung bình
- Cách kiểm thử: chạy lại `npm run test:admin-report-pages` và nếu phù hợp thì `npm run test:admin-reports`
- Tiêu chí hoàn thành: bundle page-level pass và không còn log `Invalid URL`/`Failed to parse URL` ngoài ý muốn trong output thông thường

### T-157 - Làm sạch stderr còn lại trong teachers report smoke test

- Trạng thái: DONE
- Mục tiêu: dọn nốt log `stderr` còn lại trong `teachers-report-page.test.tsx` để bundle `test:admin-reports` chạy sạch hoàn toàn trong các case lỗi chủ động
- Phạm vi file:
  - `test/teachers-report-page.test.tsx`
  - nếu cần tối thiểu: helper/mock cục bộ trong file test này
- Lý do cần làm: sau `T-156`, cụm `Invalid URL` đã sạch; phần nhiễu còn lại chỉ còn log lỗi mong đợi của teacher report, phù hợp để dọn nốt cho output test gọn hơn
- Rủi ro: thấp
- Cách kiểm thử: chạy lại `npm run test:admin-reports`
- Tiêu chí hoàn thành: bundle `test:admin-reports` pass và không còn `stderr` gây nhiễu từ `teachers-report-page.test.tsx`

### T-158 - Chạy lại backbone regression sau chuỗi cleanup test harness

- Trạng thái: DONE
- Mục tiêu: chạy lại `test:backbone` sau các batch dọn scripts và test harness để xác nhận toàn bộ xương sống vẫn ổn định ở trạng thái mới nhất
- Phạm vi file:
  - `package.json`
  - `test/participation-report-page.test.tsx`
  - `test/activity-statistics-report-page.test.tsx`
  - `test/teachers-report-page.test.tsx`
- Lý do cần làm: sau khi tinh chỉnh các test harness và thêm nhiều script regression mới, nên có một mốc xác minh lại `backbone` để khóa toàn bộ core flows + admin reports
- Rủi ro: thấp
- Cách kiểm thử: chạy `npm run test:backbone`
- Tiêu chí hoàn thành: `test:backbone` pass ở trạng thái hiện tại, đủ tự tin xem chuỗi cleanup test vừa rồi không làm trôi hành vi

### T-159 - Làm sạch stderr còn lại trong approval workflow regression

- Trạng thái: DONE
- Mục tiêu: dọn nốt `stderr` còn lại trong `approval-workflow.test.ts` để bundle `test:backbone` sạch hoàn toàn về output
- Phạm vi file:
  - `test/approval-workflow.test.ts`
  - nếu cần tối thiểu: helper/log mock cục bộ trong file test này
- Lý do cần làm: sau `T-158`, backbone regression đã pass hoàn toàn nhưng vẫn còn log trạng thái từ approval workflow chen vào output, làm bundle chưa thật sự gọn
- Rủi ro: thấp
- Cách kiểm thử: chạy lại `npm run test:core-flows` hoặc `npm run test:backbone`
- Tiêu chí hoàn thành: `test:backbone` pass và không còn `stderr` gây nhiễu từ `approval-workflow.test.ts`

### T-160 - Làm sạch cảnh báo eslint trong approval workflow test

### T-161 - Nối teacher flow vào attendance policy / face-pilot

- Trạng thái: DONE
- Mục tiêu: biến attendance policy từ route/panel rời rạc thành flow teacher có thể truy cập rõ ràng trong vận hành
- Phạm vi file:
  - `src/components/Sidebar.tsx`
  - `src/app/teacher/dashboard/page.tsx`
  - `src/app/teacher/attendance/page.tsx`
  - `src/app/teacher/attendance/policy/page.tsx`
- Lý do cần làm: route policy đã có nhưng teacher chưa có đường vào rõ ràng từ flow điểm danh hiện tại
- Rủi ro: thấp
- Cách kiểm thử: build + smoke truy cập từ dashboard/sidebar/manual attendance
- Tiêu chí hoàn thành: teacher nhìn thấy và mở được policy page từ các flow chính

### T-162 - Thêm UAT cho attendance policy / face-pilot

- Trạng thái: DONE
- Mục tiêu: khóa flow policy/fallback ở mức UAT thay vì chỉ có route/unit regression
- Phạm vi file:
  - `test/uat/actor-teacher/06-attendance-policy-face-pilot.spec.ts`
  - `test/uat/helpers/teacher.helper.ts`
- Lý do cần làm: batch face-pilot đã qua build + route test nhưng chưa có bằng chứng UAT ở môi trường dev server thật
- Rủi ro: trung bình
- Cách kiểm thử: chạy focused playwright spec cho policy/fallback và rerun bundle teacher attendance liên quan
- Tiêu chí hoàn thành: spec mới pass và không làm gãy manual attendance / QR teacher backbone

### T-163 - Thêm UAT API-level cho face attendance route

- Trạng thái: DONE
- Mục tiêu: khóa `POST /api/attendance/face` ở mức UAT thực tế qua auth + DB + activity flow, thay vì chỉ route-level regression
- Phạm vi file:
  - `test/uat/actor-teacher/07-face-attendance-route.spec.ts`
- Lý do cần làm: sau khi policy/fallback đã có UAT, nhánh face attendance trực tiếp vẫn còn thiếu bằng chứng dev-server end-to-end
- Rủi ro: trung bình
- Cách kiểm thử: chạy focused playwright spec cho face route, rồi rerun bundle teacher attendance liên quan
- Tiêu chí hoàn thành: low-confidence fallback, success path, duplicate-safe path đều pass trong UAT

- Trạng thái: TODO
- Mục tiêu: dọn các warning `no-explicit-any` còn lại trong `approval-workflow.test.ts` để suite lõi này sạch hơn cả về runtime lẫn lint
- Phạm vi file:
  - `test/approval-workflow.test.ts`
- Lý do cần làm: sau khi output của backbone đã sạch, điểm nợ kỹ thuật gần nhất còn thấy rõ là cảnh báo lint dày đặc trong suite approval workflow
- Rủi ro: thấp
- Cách kiểm thử: chạy `npx.cmd eslint test/approval-workflow.test.ts` và nếu cần thì `npm run test:core-flows`
- Tiêu chí hoàn thành: giảm rõ rệt hoặc loại bỏ cảnh báo `no-explicit-any` trong file test này mà không làm đổi hành vi test
