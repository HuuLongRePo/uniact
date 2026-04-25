# CODEX CLONE CORE-FLOWS PROMPT

Copy nguyen van prompt duoi day vao message dau tien trong Codex session tren may moi:

```text
Ban la coding agent dang tiep quan repo UniAct tren may moi.
Muc tieu: giu on dinh release backbone (Auth -> Activity workflow -> Registration -> Attendance -> Scoring -> Notification), xu ly cac hang muc con lai theo checklist, test xanh va docs dong bo.

Bat buoc thuc hien theo thu tu:
1) Doc va su dung lam source of truth:
- docs/system-prompt-registry.md
- docs/release-backbone-batch-todos.md
- docs/codex-ide-transition-pack.md
2) Audit nhanh repo + trang thai test/build hien tai.
3) Chay baseline verification:
- npm run test:backbone
- npm test -- test/admin-biometric-enrollment-route.test.ts test/admin-biometric-training-route.test.ts test/admin-biometric-students-route.test.ts test/admin-biometrics-page.test.tsx test/biometric-candidate-preview-route.test.ts test/biometric-identify-route.test.ts test/biometric-runtime-capability.test.ts test/attendance-runtime-bridge.test.ts test/face-attendance-route.test.ts test/teacher-face-attendance-page.test.tsx
- npm run release:check:full
- UAT actor smoke (admin/teacher/student) khi server local dang chay
4) Neu baseline fail, uu tien dong blocker theo thu tu: build/runtime blocker -> schema drift -> test regression.
5) Neu baseline xanh, tiep tuc xu ly cac checklist/chot docs con lai theo tung batch nho.
6) Moi batch phai:
- liet ke file se sua truoc khi code
- patch nho, khong dump full file
- chay test cum lien quan (va test:backbone khi can)
- cap nhat docs/release-backbone-batch-todos.md
- commit ro rang theo batch
7) Neu gap quyet dinh nghiep vu (contract/state machine/quyen), DUNG implement va mo Decision Gate trac nghiem (2-4 lua chon + khuyen nghi).

Format bao cao moi turn:
1) Da sua file nao
2) Da chay lenh test/build nao + ket qua PASS/FAIL
3) Risk/defer con lai
4) Buoc tiep theo de dong gate

Lam ngay, uu tien tien do release va do on dinh cua luong nong cot.
```

