# ACTIVITY SCOPE SELECTION BATCH PROMPT

Muc tieu cua batch nay:
- Nang cap form tao hoat dong de giao vien co the thao tac scope linh hoat hon cho:
  - lop bat buoc,
  - lop duoc dang ky,
  - hoc vien bat buoc chon truc tiep,
  - hoc vien duoc dang ky chon truc tiep,
  - truong hop khong chon scope nao thi mac dinh mo cho tat ca hoc vien.
- Uu tien release safety:
  - giu nguyen contract API hien co,
  - khong lam sai logic `mandatory > voluntary`,
  - khong mo rong quyen teacher xem tat ca lop/hoc vien neu backend scope chua duoc chot.

Source tham khao:
- `docs/release-backbone-batch-todos.md`
- `docs/teacher-activity-scope-and-ux-next-batches.md`
- `docs/teacher-activity-form-followup-tasks.md`
- `docs/activity-business-reanalysis-and-actor-crud-impact-matrix.md`

Yeu cau thuc hien:
1. Audit form tao hoat dong hien tai:
- xac dinh dau diem ma nguoi dung dang bi mac voi multi-select kieu desktop,
- xac dinh payload nao dang gui xuong API cho class/student scope.
2. Safe UX batch:
- khong bat buoc phai chon lop; neu de trong toan bo scope thi submit voi `applies_to_all_students = true`,
- giu cho nguoi dung van co the bat checkbox "mo cho tat ca" de clear nhanh toan bo scope,
- bo sung thao tac nhanh de chon hoc vien theo danh sach loc va theo nhom lop da chon,
- uu tien UI doc duoc tren mobile/laptop, khong phu thuoc Ctrl/Cmd multi-select cho hoc vien.
3. Regression:
- test create form khi khong chon scope nao van tao duoc activity mo cho tat ca,
- test create form khi loc hoc vien va chon nhanh vao nhom bat buoc.

Decision gate dang mo, CHUA implement trong batch nay:
- Co mo quyen de teacher thay tat ca lop/tat ca hoc vien hay khong.
Khuyen nghi hien tai:
- chi cai tien UX tren tap du lieu ma backend teacher da duoc cap,
- neu can mo rong quyen/route contract thi tach thanh decision gate rieng.
