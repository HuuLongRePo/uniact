# VIP Procedure - UniAct Execution Framework

Mục tiêu: giúp các batch lớn được thực hiện nhanh, kín, ít drift, ít tốn token.

## 1. Batch order
1. Audit ngắn nhưng đủ route + page + test liên quan
2. Khoanh batch hẹp theo cùng semantic/API surface
3. Sửa khép kín theo cặp API + UI state
4. Verify test bị chạm + test lân cận cần thiết
5. Build
6. Commit local ngay khi pass
7. Mới sang batch sau

## 2. Output discipline
- Chỉ báo 3 lúc:
  - bắt đầu batch
  - blocker quan trọng
  - kết thúc batch với verify + commit
- Tránh plan dài, tránh nhắc lại bối cảnh cũ nếu không cần

## 3. Contract discipline
- Ưu tiên canonical auth/error/response
- Giữ backward compatibility ở UI surfaces khi cần
- Tránh double-nesting với `successResponse(...)`
- Không trộn nhiều semantic khác nhau trong cùng một commit nếu không cần

## 4. Verification discipline
- Luôn verify đúng cụm bị chạm trước, rồi mới build
- Nếu test infra là blocker, sửa infra trước khi sửa logic mù
- Không claim xanh toàn bộ nếu mới xanh một phần

## 5. Release discipline
- Batch nào đủ kín thì commit local ngay
- Không push nếu chưa được yêu cầu
- Ưu tiên các flow gần release surface nhất trước
