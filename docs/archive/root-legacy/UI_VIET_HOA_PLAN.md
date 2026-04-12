# UI VIỆT HÓA PLAN

Ngày lập: 2026-04-06
Mục tiêu: Việt hóa đúng ngữ cảnh, không dịch máy móc, không trộn Anh - Việt trong luồng chính

## 1. Nguyên tắc

- Dùng tiếng Việt tự nhiên, ngắn, rõ, phù hợp môi trường giáo dục
- Giữ nguyên từ gốc chỉ khi là tên riêng hoặc thuật ngữ kỹ thuật cần thiết
- Một khái niệm chỉ dùng một cách gọi thống nhất

## 2. Chuẩn thuật ngữ đề xuất

- Dashboard -> Bảng điều khiển hoặc Tổng quan
- Refresh -> Làm mới
- Database Size -> Dung lượng cơ sở dữ liệu
- System Uptime -> Thời gian hoạt động
- Memory Used -> Bộ nhớ đang dùng
- Historical Analytics -> Phân tích lịch sử
- Most Popular Activities -> Hoạt động tham gia nhiều nhất
- Time left to register -> Thời gian còn lại để đăng ký

## 3. Nhóm màn hình ưu tiên

### P0

- `src/components/Sidebar.tsx`
- `src/features/dashboard/DashboardAdminPage.tsx`
- `src/components/Countdown.tsx`
- `src/app/student/activities/page.tsx`
- `src/app/student/activities/[id]/page.tsx`

### P1

- teacher dashboards/reports
- admin config/backup/system pages
- student notifications/devices/history

## 4. Các điểm cần chuẩn hóa thêm ngoài text

- Toast message
- Confirm dialog title/message/button
- Empty state
- Loading text
- Label/filter/status badge
- API error message trả ra UI

## 5. Bằng chứng khảo sát

- Có ít nhất `54` vị trí tiếng Anh nổi bật trong nhóm màn hình đã rà nhanh
- Có `41` chỗ đang dùng `confirm()` nên dễ kéo theo text chưa thống nhất

## 6. Chiến lược thực hiện

1. Việt hóa màn hình lõi trước
2. Tách hằng số text dùng lặp lại theo module
3. Không đưa i18n framework nặng ngay nếu chưa thực sự cần
4. Sau khi ổn định contract mới gom/refactor text diện rộng

