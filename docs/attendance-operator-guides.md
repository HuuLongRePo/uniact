# HUONG DANH DIEM DANH QR + KHUON MAT (A-Z)

Ngay cap nhat: 2026-04-24
Pham vi: huong dan van hanh thuc te cho giang vien, hoc vien va QA theo luong backbone attendance.

## 1) Diem danh bang ma QR

### Muc tieu luong dung

- Giang vien la nguoi tao/mo phien QR.
- Hoc vien la nguoi quet QR.
- QR hien tai van co the mo link `/student/check-in?s=<sessionId>&t=<token>`, nhung link chi dung de vao dung trang va kiem tra dang nhap.
- He thong chi ghi nhan diem danh sau khi hoc vien bat camera web trong trang check-in va quet lai QR.

### Luong A-Z cho giang vien

1. Dang nhap tai khoan giang vien.
2. Vao `Mo QR diem danh` hoac nut `Diem danh`/`Chieu QR toan man hinh` trong quan ly hoat dong.
3. Chon dung hoat dong.
4. Tao phien QR, chon TTL va gioi han luot quet neu can.
5. Chieu QR tren man hinh lop hoc. Co the bat `Chieu QR toan man hinh`.
6. Theo doi luot quet, lich su quet, thong ke theo lop trong trang QR.
7. Khi ket thuc, dong phien hoac doi ma moi neu can.

### Luong A-Z cho hoc vien

1. Dang nhap dung tai khoan hoc vien co quyen tham gia hoat dong.
2. Vao `Quet QR diem danh`.
3. Bat camera web trong trang va quet QR do giang vien dang chieu.
4. Neu mo bang link QR va chua dang nhap, he thong dua ve `login?next=...`; dang nhap xong quay lai trang check-in.
5. Sau khi dang nhap, hoc vien van phai bat camera web va quet lai QR moi duoc ghi nhan diem danh.
6. Nhan thong bao/thong tin thanh cong tren trang check-in.

### Fallback khi camera web khong dung duoc

- Tren LAN `http://10.x`/`http://192.168.x.x`, trinh duyet se chan `getUserMedia` do khong phai secure context.
- Khong co fallback diem danh bang upload anh hoac nhap tay payload.
- Cach dung dung quy trinh:
  - mo he thong bang `https://` (hoac `http://localhost` khi test tren may local),
  - dang nhap hoc vien,
  - bat camera web trong trang va quet lai QR tai lop.

## 2) Diem danh bang nhan dien khuon mat

### Trang thai hien tai cua he thong

- Luong hien tai la `face attendance pilot / QA flow`, khong phai kiosk production da dong hoan toan.
- Runtime dang di theo lo trinh fail-closed trong `docs/face-runtime-implementation-slice-plan.md`.
- Trang giang vien hien tai la man hinh `candidate preview` va `submit face attendance`, phu hop QA/pilot hon la van hanh dai tra.

### Luong A-Z hien tai

1. Dang nhap tai khoan co quyen thao tac face attendance.
2. Vao `/teacher/attendance/face`.
3. Chon `activity_id`, `student_id`, camera/device, candidate embedding hoac lay candidate tu camera.
4. Tao `candidate preview`.
5. Gui `face attendance`.
6. He thong kiem tra:
   - hoat dong co du dieu kien pilot hay khong,
   - confidence co dat nguong hay khong,
   - hoc vien co participation hop le hay khong,
   - da co ban ghi attendance truoc do hay chua.
7. Neu dat dieu kien, participation duoc doi sang `attended` va tao `attendance_record`.

### Co diem danh duoc nhieu khuon mat cung luc khong?

- Chua.
- Hien tai runtime dang dung `detectSingleEmbedding(...)`.
- Neu phat hien nhieu khuon mat, he thong tra loi theo huong loi `MULTIPLE_FACES_DETECTED`.
- Day la rang buoc hien tai, can them batch rieng neu muon ho tro multi-face attendance.

## 3) Sau mot luot diem danh, co hien ngay danh sach hoc vien chua diem danh khong?

- Voi QR:
  - Co du lieu luot quet va thong ke theo lop tren trang giang vien QR.
  - Chua co man hinh chuyen biet toi uu cho `danh sach chua diem danh theo lop` ngay trong trang QR projector.
- Voi Face attendance:
  - Chua co roster realtime ngay tren trang `/teacher/attendance/face`.
  - Tuy nhien he thong da co API participants theo hoat dong (`/api/activities/[id]/participants`) tra ve `class_name` va `attendance_status`, nen co the xay batch UI de hien ngay danh sach `registered/chua diem danh` theo lop.

## 4) Cau tra loi van hanh hien tai

- Neu can doc ten nhung hoc vien chua duoc nhan dien sau mot luot face:
  - Hien tai chua co man hinh toi uu ngay tai trang face pilot.
  - Co the dua vao danh sach participants cua hoat dong de loc `attendance_status = registered` va nhom theo `class_name`.
  - Day la task uu tien tiep theo de dong luong backbone attendance.

## 5) Khoang trong can dong tiep

- Audit va chuan hoa toan bo time/date theo mui gio Viet Nam (`Asia/Ho_Chi_Minh`).
- Viet roster realtime `chua diem danh` theo lop sau moi luot QR/Face.
- Bo sung huong dan UI trong app, khong chi docs.
- Nghien cuu batch rieng cho `multi-face attendance` neu Product muon mo rong.
