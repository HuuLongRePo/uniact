# PROMPT - TIMEZONE VN + ATTENDANCE GUIDES + FACE ROSTER CLOSEOUT

Ban la Senior Full-Stack Release Engineer tiep tuc repo UniAct.

Muc tieu batch lon:
- Khoa chat toan bo logic thoi gian theo mui gio Viet Nam (`Asia/Ho_Chi_Minh`), khong de lech gio giua DB -> API -> UI -> `datetime-local`.
- Hoan thien huong dan van hanh attendance bang QR va face attendance theo luong A-Z.
- Dong khoang trong van hanh sau moi luot attendance: hien roster hoc vien chua diem danh, co thong tin lop de doc ten va tim nguoi.

Source of truth bat buoc:
- `docs/release-backbone-batch-todos.md`
- `docs/codex-ide-transition-pack.md`
- `docs/attendance-operator-guides.md`
- `docs/face-runtime-implementation-slice-plan.md`

Thu tu batch uu tien:

1. Batch Time P0 - Timezone VN backbone
- Audit cac diem dung `new Date(...)`, `toLocaleString('vi-VN')`, `toISOString().slice(0, 16)`, `datetime-local`, SQL `date()/datetime()` tren luong nong:
  - create/edit activity
  - registration deadline
  - QR expiry/countdown/history
  - notifications
  - attendance/face pilot pages
  - reports/export chinh
- Tao helper dung chung cho `Asia/Ho_Chi_Minh`.
- Khong hardcode xu ly tung component neu co the refactor vao helper formatter/timezone.
- Them test regression cho:
  - UTC ISO -> gio Viet Nam dung
  - `datetime-local` load tu server khong bi lech +7/-7
  - QR expiry/countdown khop gio hien thi

2. Batch Attendance Docs P0
- Neu trong app chua co huong dan ro rang, bo sung UI/doc huong dan cho:
  - giang vien mo QR
  - hoc vien quet QR
  - fallback khi camera web bi chan
  - face attendance pilot hien tai
- Phai tra loi ro:
  - co diem danh duoc nhieu khuon mat cung luc khong
  - sau mot luot diem danh co hien roster chua diem danh ngay khong
  - neu chua co, mo task va de xuat diem gan UI/API chuan

3. Batch Face/QR Roster P0
- Uu tien them roster `chua diem danh` ngay sau moi luot attendance tren luong giang vien.
- Toi thieu phai co:
  - tong so chua diem danh
  - danh sach theo lop
  - ten hoc vien + ma hoc vien + lop
  - cap nhat ngay sau QR/Face success
- Neu tai dung duoc `/api/activities/[id]/participants`, uu tien reuse. Khong mo contract moi neu chua can.

4. Batch Mo rong (chi lam sau khi P0 xanh)
- Danh gia co can ho tro `multi-face attendance` hay khong.
- Neu day la quyet dinh nghiep vu/contract lon, DUNG code va mo Decision Gate rieng.

Rule thi hanh:
- Moi batch phai audit file truoc khi sua.
- Patch nho, khong dump full file.
- Chay test cum lien quan; re-run `npm.cmd run test:backbone` khi dong xong batch hot.
- Cap nhat `docs/release-backbone-batch-todos.md`.
- Commit ro rang tung batch.
- Neu gap quyet dinh nghiep vu (multi-face, chot state/contract/quyen), DUNG implement va mo Decision Gate 2-4 lua chon + khuyen nghi.

Format bao cao moi turn:
1. Da sua file nao
2. Da chay lenh test/build nao + ket qua PASS/FAIL
3. Risk/defer con lai
4. Buoc tiep theo de dong gate

