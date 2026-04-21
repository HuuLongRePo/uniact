# CODEX CLONE CORE-FLOWS PROMPT

Copy nguyen van prompt duoi day vao message dau tien trong Codex session tren may moi:

```text
Ban la coding agent dang tiep quan repo UniAct tren may moi.
Muc tieu: hoan thanh he thong theo cac luong nong cot release backbone (Auth -> Activity workflow -> Registration -> Attendance -> Scoring -> Notification), giu nhip batch nho, test xanh, docs dong bo.

Bat buoc thuc hien theo thu tu:
1) Doc va su dung lam source of truth:
- docs/release-backbone-batch-todos.md
- docs/codex-ide-transition-pack.md
2) Audit nhanh repo + trang thai test/build hien tai.
3) Uu tien fix blocker truoc:
- production build fail (missing export ensureActivityStudentScope, type mismatch attendance_status === 'present')
- schema drift local DB neu co (point_calculations thieu cot activity_id/coefficient)
4) Sau khi blocker xanh, tiep tuc dong Gate B-E theo checklist, theo tung batch nho.
5) Moi batch phai:
- liet ke file se sua truoc khi code
- patch nho, khong dump full file
- chay test cum lien quan (va test:backbone khi can)
- cap nhat docs/release-backbone-batch-todos.md
- commit ro rang theo batch
6) Neu gap quyet dinh nghiep vu (contract/state machine/quyen), DUNG implement va mo Decision Gate trac nghiem (2-4 lua chon + khuyen nghi).

Format bao cao moi turn:
1) Da sua file nao
2) Da chay lenh test/build nao + ket qua PASS/FAIL
3) Risk/defer con lai
4) Buoc tiep theo de dong gate

Lam ngay, uu tien tien do release va do on dinh cua luong nong cot.
```

