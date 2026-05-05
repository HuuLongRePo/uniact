# Mega Batch Efficiency Prompt

```text
Tiếp tục làm việc trên repo `C:\Users\nhuul\OneDrive\Máy tính\uniact`.

Mục tiêu:
- Hoàn thiện hệ thống theo batch lớn để giảm số request.
- Ưu tiên điểm nghẽn thật của người dùng cuối.
- Mỗi lượt phải có sửa code + test + cập nhật docs batch.

Nguyên tắc bắt buộc:
1) Mỗi lượt xử lý 2-3 batch lớn, không dừng ở phân tích.
2) Không báo cáo lẻ tẻ; chỉ báo cáo theo từng batch đã hoàn thành.
3) Khi sửa component dùng chung, phải quét và vá toàn bộ test liên quan trong cùng batch.
4) Chỉ đụng phạm vi có giá trị; tránh sửa lan man.
5) Mỗi batch đều phải có verification rõ PASS/FAIL.

Ưu tiên xử lý:
- P0: lỗi chặn luồng (đăng nhập, điểm danh, điều hướng, crash màn hình, API lệch).
- P1: dark mode khó đọc, mobile responsive lỗi, text tiếng Việt lỗi mã hóa.
- P2: dọn rác, gom file, chuẩn hóa test/docs, giảm trùng lặp.

Khung thực thi cho mỗi batch:
- B1 Audit nhanh: xác định phạm vi và file đích.
- B2 Patch: sửa code dứt điểm trong phạm vi.
- B3 Verify: chạy cụm test impacted trước, rồi cụm regression mở rộng.
- B4 Sync docs: cập nhật `docs/release-backbone-batch-todos.md`.

Mẫu báo cáo sau mỗi batch:
1) Outcome người dùng nhận được.
2) Các file chính đã sửa.
3) Test đã chạy và kết quả.
4) Risk/defer còn lại (P0/P1/P2).

Bắt đầu ngay theo chu kỳ:
- Batch A: Student critical flows + regression lock.
- Batch B: UI dark/light + responsive lock cho trang vận hành chính.
- Batch C: Cleanup + test infra hardening + docs sync.

Batch bổ sung ưu tiên cao (Activity Create UX):
- Làm rõ 2 trường "Mẫu nhanh" và "Loại hoạt động" ngay tại Bước 1, gộp chung cùng một khối UI để người dùng không bị nhầm.
- Khi chọn "Mẫu nhanh", tự động điền tiêu đề/mô tả và thử map "Loại hoạt động" phù hợp nếu tìm thấy.
- "Số lượng tối đa" phải có min động theo phạm vi đã chọn:
  min = học viên từ các lớp trong phạm vi + học viên chỉ định trực tiếp (không trùng lặp).
- Nếu người dùng nhập giá trị lớn hơn min thì lưu đúng giá trị người dùng nhập.
- Nếu giá trị hiện tại nhỏ hơn min thì tự động nâng lên min trước khi lưu/gửi duyệt.
- Bắt buộc thêm regression test cho các rule trên trong cùng batch.
```
