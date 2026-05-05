# QR Attendance Manual Checklist (Camera-Required Flow)

Muc tieu: xac nhan he thong khong auto diem danh qua link, va chi ghi nhan sau khi hoc vien quet QR bang camera web trong trang check-in.

## Dieu kien truoc khi test

1. He thong dang chay va truy cap duoc tu nhieu thiet bi.
2. Giang vien tao duoc 1 phien QR dang active cho hoat dong da approved + published.
3. Hoc vien co tai khoan hop le va co quyen tham gia hoat dong.

## Checklist nghiep vu

1. Chua dang nhap, mo deep-link QR (`/student/check-in?s=...&t=...`):
   - Ky vong: bi chuyen sang `/login?next=...`.
   - Ky vong: khong tao attendance record.

2. Da dang nhap hoc vien, mo deep-link QR:
   - Ky vong: vao trang `/student/check-in` va hien thong diep phai quet lai QR.
   - Ky vong: khong auto diem danh.

3. Trong trang `/student/check-in`, hoc vien bat camera web va quet QR:
   - Ky vong: hien thong bao thanh cong.
   - Ky vong: tao dung 1 attendance record.

4. Quet lai cung ma QR voi cung hoc vien:
   - Ky vong: he thong idempotent (khong tao them ban ghi moi).

5. Chua cung mang lop hoc (anti-cheat network lock):
   - Ky vong: bi chan, khong ghi attendance.
   - Ky vong: thong bao loi mang khong trung mang lop.

## Checklist UI

1. Trang hoc vien co thong diep ro:
   - "Truy cap link truc tiep khong tu dong diem danh."
   - "Bat camera va quet lai QR."

2. Trang giang vien QR co canh bao ro:
   - Link QR chi de mo trang check-in/dang nhap.
   - Diem danh chi duoc ghi nhan sau khi quet camera web.

3. Neu insecure context (`http://ip-lan`):
   - Ky vong: hien huong dan secure context (`https://` hoac `http://localhost`).

