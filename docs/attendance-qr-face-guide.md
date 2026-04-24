# Huong dan diem danh QR va FaceID tu A-Z

## 1) Muc tieu va vai tro

- Giang vien la nguoi mo phien diem danh, tao ma QR va dieu phoi diem danh.
- Hoc vien la nguoi quet ma QR hoac mo duong link check-in de tu diem danh.
- FaceID la kenh bo sung de giang vien diem danh tai diem, khong thay the luong QR cho toan bo lop.

## 2) Luong QR tu A-Z

### Giang vien

1. Vao `Giang vien -> Mo QR diem danh`.
2. Chon hoat dong dang dien ra hoac dung nut nhanh tu danh sach hoat dong.
3. Tao phien QR moi neu chua co phien active.
4. Co the bat trinh chieu toan man hinh de hoc vien quet tu xa.
5. Khi can, xem roster "hoc vien chua diem danh" de goi lai tung lop.

### Hoc vien

1. Mo trang `Hoc vien -> Diem danh QR` neu camera web hoat dong binh thuong.
2. Quet ma QR do giang vien dang chieu.
3. Neu trinh duyet web khong mo duoc camera:
   - Dung app camera/QR bat ky tren dien thoai.
   - Quet ma QR dang duoc giang vien chieu.
   - Mo duong link `/student/check-in?s=...&t=...`.
   - Dang nhap dung tai khoan hoc vien nam trong pham vi phien QR.
   - He thong se tu dong diem danh, khong can quet lai trong web.
4. Neu co anh chup ma QR, co the tai anh len trong scanner hoac dan nguyen du lieu/link vao o nhap thu cong.

## 3) Luong FaceID tu A-Z

1. Giang vien vao `Giang vien -> Diem danh khuon mat`.
2. Chon dung `activity_id`, mo camera va tao candidate preview.
3. Chi de **mot khuon mat** trong khung hinh cho moi luot.
4. Neu anh mo, toi, mat qua nho hoac co nhieu nguoi trong khung, he thong se tu choi va yeu cau chup lai.
5. Gui `face attendance`.
6. Xem khung `Hoc vien chua diem danh` ben duoi de tiep tuc doc ten, goi lai va diem danh bo sung.

## 4) Cac cau hoi van hanh quan trong

### Co diem danh duoc nhieu khuon mat cung luc khong?

- Hien tai: **Khong**.
- He thong dang xu ly theo mo hinh **1 khuon mat / 1 luot verify**.
- Neu phat hien nhieu nguoi trong khung hinh, luong FaceID se bao loi va yeu cau giu lai mot nguoi duy nhat.

### Sau mot luot diem danh, co hien ngay danh sach chua diem danh khong?

- **Co**.
- Man FaceID/QR cua giang vien da co roster `Hoc vien chua diem danh`.
- Danh sach nay duoc nhom theo **lop** va hien ca:
  - ten hoc vien
  - ma hoc vien
  - lop cua hoc vien

### Roster nay dung de lam gi?

- Giang vien co the doc ten theo lop.
- Neu hoc vien co mat nhung luot nhan dien truoc chua thanh cong, giang vien tim ngay duoc hoc vien dang thuoc lop nao de diem danh lai.

## 5) Xu ly su co camera

### Truong hop HTTP/LAN `http://10.x`, `http://192.168.x.x`

- Nhieu trinh duyet se chan `getUserMedia` vi day khong phai secure context.
- He thong khong the bypass chinh sach nay o phia web.
- Cach di dung:
  - Uu tien HTTPS hoac localhost neu test tren may.
  - Neu dang hoc trong LAN/noi bo, hoc vien quet QR bang app camera ngoai va mo deep link check-in.

### Truong hop trinh duyet nhung/in-app browser

- Nen mo bang Chrome, Safari hoac Edge thay vi browser nhung trong app chat/mang xa hoi.

## 6) Checklist van hanh de diem danh on dinh

- Giang vien chi mo **mot phien QR active** cho mot hoat dong tai mot thoi diem.
- Chieu ma QR du lon, uu tien che do projector/toan man hinh.
- Neu camera hoc vien loi, chuyen sang deep-link check-in ngay, khong doi sua browser qua lau.
- Khi dung FaceID, xu ly tung nguoi mot.
- Sau moi dot diem danh, xem roster chua diem danh theo lop de goi bo sung.
