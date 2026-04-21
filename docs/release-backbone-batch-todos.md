# RELEASE BACKBONE TODOS (BATCH PLAN)

Ngay cap nhat: 2026-04-21
Muc tieu: Release he thong theo duong xuong song, sua loi va mo rong tinh nang theo tung batch nho, tranh qua tai context.

## 1) Nguyen tac van hanh (bat buoc)
- [ ] Plan first, code later: moi batch phai audit pham vi file va root cause truoc khi code.
- [ ] Commit nho, lien tuc: ket thuc moi batch va test pass thi tao 1 commit rieng.
- [ ] Gioi han output: chi review patch/hunk va ham thay doi, khong dump toan bo file dai.
- [ ] Chia thread theo domain doc lap (FaceID, Realtime, Scoring) de tranh tran context.
- [ ] Uu tien xuong song: Auth -> Activity workflow -> Registration -> Attendance -> Scoring -> Notification.
- [ ] Tinh nang da co: uu tien fix loi, go diem nghen, toi uu hieu nang.
- [ ] Tinh nang moi: chi lam sau khi batch truoc da xanh test.

## 2) Rule tam dung khi can quyet dinh nghiep vu
- [ ] Neu gap quyet dinh logic nghiep vu (mo rong quyen, doi contract API, doi state machine), DUNG implement.
- [ ] Tao "Decision Gate" trong issue/PR voi:
  - context
  - 2-4 phuong an
  - tac dong cua moi phuong an
  - khuyen nghi de chot nhanh
- [ ] Chi tiep tuc code sau khi Product Owner xac nhan lua chon.

## 3) Backbone release gates (P0)
- [ ] Gate A - Auth/session on dinh
  - login/logout/me + middleware + role guard
  - khong loop redirect, khong mat session ngau nhien
  - [x] Hardening UI theme toan he thong: token hoa mau + map light/dark + support system mode + giam FOUC (bat dau tu login va mo rong cho surface dung chung)
  - [x] Login test panel: them search nguoi dung toan he thong theo ten/email, click 1 lan de quick login, dong bo token light/dark cho input/button/card.
  - [x] UI interaction + contrast hardening:
    - [x] khoi phuc cursor pointer tren tat ca vung click duoc (button/card/link/action surface), tranh mat dau hieu tuong tac khi hover.
    - [x] enforce contrast ratio toi thieu WCAG AA (>= 4.5:1 cho text thuong) khi doi mau chu/nen button va text tren cac surface.
    - [x] chot bo mau chuan he thong dua tren design tokens (light/dark/system), bao dam icon, border, text, button states (default/hover/active/focus/disabled) deu doc ro.

### Prompt bo sung (copy de chay ngay - UI interaction/contrast)
```text
Ban dong vai Senior Frontend Developer + UI/UX Engineer. Hay harden toan he thong theo 3 muc tieu:
1) Interaction affordance:
- Khoi phuc cursor pointer cho tat ca vung click duoc (button, card role=button, link, action surface).
- Dam bao disabled state hien cursor not-allowed.
2) Accessibility contrast:
- Kiem tra va chinh lai text/background cho button, input, badge, helper text de dat toi thieu WCAG AA (>=4.5:1 cho text thuong) o light/dark.
- Khong hardcode mau trong component; chi dung token.
3) Design token standardization:
- Chot bo token mau chuan he thong cho light/dark/system (surface, text, border, action primary/secondary, focus).
- Map token cua quick-login panel vao bo token he thong de tranh lech mau.
Yeu cau thi hanh:
- Audit file truoc, patch nho, khong dump full file.
- Chay test cum login/theme lien quan va bao cao PASS/FAIL ro rang.
- Cap nhat checklist trong docs/release-backbone-batch-todos.md ngay sau khi xong.
```
- [ ] Gate B - Activity workflow on dinh
  - draft -> requested -> approved/rejected -> published
  - teacher submit + admin approve/reject + audit log
- [ ] Gate C - Student registration on dinh
  - discover/register/cancel, policy + conflict + capacity race-safe
- [ ] Gate D - Attendance on dinh
  - QR session, validate, duplicate-safe, thong bao check-in
- [ ] Gate E - Scoring/bonus/report on dinh
  - complete activity, point persistence, score ledger, rankings/reports

---

## 4) Batch 1 - System Audit + UI text refactor + bug Organization Level
### Muc tieu
- Chuan hoa ngon ngu he thong va tim root cause loi lap "Cap do to chuc".

### Viec can lam
- [x] Audit text UI:
  - dich text Anh con sot sang Viet
  - bo sung dau tieng Viet
  - doi "hoc sinh" -> "hoc vien"
  - doi "giao vien/giao vien sai chinh ta" -> "giang vien"
- [x] Quet pham vi:
  - components/pages/constants/templates/test snapshots lien quan
- [x] Debug bug Organization Level:
  - check query/join duplicate
  - check seed/migration duplicate insert
  - check frontend render/map duplicate
- [x] Chot root cause + de xuat patch nho.
- [x] Chi code sau khi root cause da duoc duyet.
- [x] Don tiep cac thong diep API tieng Anh con sot (uu tien endpoint user-facing).

### Definition of Done
- [x] Co danh sach file thay doi ro rang.
- [x] Co root cause chinh xac cho bug duplicate.
- [x] Co test/regression test bao ve bug fix.

---

## 5) Batch 2 - Realtime notification infrastructure
### Muc tieu
- Dung khung thong bao realtime cho Admin/Giang vien/Hoc vien.

### Viec can lam
- [x] Chon transport phu hop stack hien tai (uu tien SSE neu don gian va on dinh voi Next route handlers).
- [x] Dinh nghia event model:
  - event_type, actor_id, target_user_ids, priority, ttl_seconds, action_buttons
- [x] Tao endpoint stream/push va auth guard.
- [x] Bo sung tab "Thong bao" cho 3 role (history + pagination + read/unread).
- [x] Tao Toast component:
  - hien 5-10 giay theo priority
  - ho tro action button: "Xem chi tiet", "Bo qua", "Tham gia"
  - fallback polling neu stream mat ket noi
- [x] Them observability:
  - metric delivery success/fail
  - reconnect log

### Definition of Done
- [x] Realtime event di qua end-to-end trong moi role (them test stream/bridge cho student + teacher + admin).
- [x] Toast hien dung TTL + action callback.
- [x] Test route + UI component pass.

### Decision Gates (neu can)
- [ ] Can chot 1 trong 2: SSE-only hay Socket hybrid.
- [ ] Can chot chinh sach retry/backoff va rate-limit push.

---

## 6) Batch 3 - Notification scope + class participation flexibility
### Muc tieu
- Nang cap filter thong bao cua giang vien va co che tham gia tu nguyen.
- Chuan hoa logic giang vien chu nhiem va nhan dien pham vi quan ly tren UI.

### Viec can lam
- [x] UI danh dau "hoc vien chu nhiem" trong danh sach.
- [x] Cap nhat data model giang vien - lop:
  - moi giang vien phai chu nhiem it nhat 1 lop trong seed/init data
  - bo sung rule validation/deployment check de tranh teacher khong co lop chu nhiem
- [x] Quyen co ban theo lop chu nhiem:
  - giang vien co toan quyen thao tac du lieu lop minh chu nhiem (view/edit/report)
  - voi lop khac thi ap dung role scope hien co (chi xem hoac bi chan theo policy)
- [x] Form thong bao giang vien:
  - filter theo lop
  - gui theo lop hoac chon nhieu hoc vien lien lop
- [x] Cap nhat schema/logic tham gia:
  - co is_mandatory
  - is_mandatory=false -> hoc vien duoc tu dang ky
- [x] Cap nhat API contract + validation + migration.
- [x] Dam bao backward compatibility du lieu cu.

### Definition of Done
- [x] Teacher gui thong bao theo lop va theo danh sach hoc vien thanh cong.
- [x] Luong mandatory/voluntary dung trong UI + API + DB.
- [x] Test regression route/page pass.

### Decision Gates (neu can)
- [ ] Quyen gui lien lop cua giang vien: tam mo hay gioi han theo config.
- [ ] Uu tien mandatory khi trung rule voi voluntary.

### Prompt bo sung (copy de chay batch nay)
```text
Ban dong vai Senior Fullstack Developer. Hay cap nhat he thong theo logic giang vien chu nhiem:
1) Database + Seed:
- Dam bao moi giang vien (teacher) la chu nhiem it nhat 1 lop.
- Neu du lieu hien tai vi pham, bo sung seed/update script de sua.
- Them check bao ve (test hoac assert trong seed) de khong tao teacher "mo coi lop".
2) Authorization scope:
- Giang vien co quyen quan ly toan dien voi lop minh chu nhiem (xem/sua/bao cao theo policy).
- Khong mo rong quyen nay sang lop khac.
3) UI/UX:
- O man hinh danh sach lop hoc va hoc vien (goc nhin teacher), them icon nho o goc tren ben phai card de danh dau doi tuong thuoc pham vi chu nhiem.
- Icon chi hien thi khi dung pham vi teacher dang dang nhap.
Yeu cau:
- Liet ke file can sua truoc khi code.
- Code luon neu rule ro rang; neu gap decision gate, dung lai va hoi.
- Tra ve patch nho + test lien quan.
```

---

## 7) Batch 4 - QR attendance completion + realtime integration
### Muc tieu
- Sua loi refresh mat QR + thong bao realtime khi bat dau diem danh.

### Viec can lam
- [x] Frontend attendance page:
  - khi reload, goi API lay active session truoc
  - neu con hieu luc -> hien QR cu, khong tao moi
- [x] API QR session:
  - check active session conflict ro rang
  - tra ve payload de reuse session
- [x] Trigger thong bao realtime "Bat dau diem danh" cho:
  - nhom mandatory
  - nhom voluntary da dang ky
- [x] Bo sung man hinh hoc vien "Quet QR diem danh" (camera flow + permission UX).

### Definition of Done
- [x] Reload khong lam mat session QR con hieu luc.
- [x] Sinh vien nhan thong bao dung doi tuong, dung thoi diem.
- [x] E2E actor flow pass.
  - UAT pass: `test/uat/actor-teacher/04-qr-refresh-close.spec.ts` + `test/uat/actor-student/02-qr-checkin.spec.ts` (2026-04-21).

### Decision Gates (neu can)
- [ ] Session reuse policy: 1 session/activity hay nhieu session theo khung gio.
- [ ] TTL default cho QR theo nghiep vu.

---

## 8) Batch 5 - FaceID foundation + notification auto-flow recommendations
### Muc tieu
- Dung khung FaceID va de xuat day du trigger thong bao he thong.
- Phan quyen training khuon mat theo dung pham vi quan ly.

### Viec can lam
- [ ] Admin enrollment:
  - upload/camera -> tao embedding -> luu DB an toan
- [ ] Giang vien runtime scan:
  - camera stream
  - matching threshold + quality/liveness checks
- [x] Face training authorization:
  - [x] Admin duoc train/enroll khuon mat toan truong.
  - [x] Giang vien chi duoc train/enroll hoc vien thuoc cac lop chu nhiem (primary/homeroom).
  - [x] Chan thao tac voi hoc vien ngoai pham vi + tra loi 403 ro rang + co audit log.
  - [x] Bo sung route UI teacher: `/teacher/biometrics` (du lieu scope homeroom).
- [ ] Hoc vien thong bao realtime:
  - "Ban da duoc diem danh thanh cong"
- [ ] Thiet ke API FaceID:
  - enroll, train, preview candidate, identify, audit
- [ ] De xuat matrix trigger thong bao:
  - Hanh dong -> Nguoi nhan -> Priority -> TTL

### Definition of Done
- [ ] FaceID co API/frame on dinh (co the pilot truoc model production).
- [ ] Notification trigger matrix duoc duyet lam chuan.
- [ ] Test runtime fallback (runtime_unavailable, low_quality, multi_faces) pass.

### Decision Gates (neu can)
- [ ] Thu vien matching/liveness chinh thuc cho production.
- [ ] Chinh sach luu tru embedding + ma hoa + retention.

### Prompt bo sung (copy de chay batch nay)
```text
Ban dong vai System Architect + Senior Fullstack Developer. Hay bo sung logic training khuon mat:
1) Role scope:
- Admin: full access train/enroll khuon mat cho toan bo hoc vien.
- Teacher: chi duoc train/enroll hoc vien thuoc lop minh chu nhiem.
2) Backend:
- Cap nhat guard tai API FaceID enroll/train.
- Tra ve loi ro rang khi teacher train sai pham vi.
- Them audit log cho hanh dong train (actor, student_id, class_scope, result).
3) UI:
- Teacher chi thay hoc vien hop le theo pham vi chu nhiem trong man train.
- Neu co thao tac vuot quyen, hien thong bao tieng Viet de hieu.
4) Verification:
- Them test role-based (admin pass, teacher in-scope pass, teacher out-of-scope fail).
Yeu cau:
- Liet ke file can sua truoc khi code.
- Code theo patch nho, khong dump full file.
- Neu can doi contract nghiep vu, dung lai va dat Decision Gate.
```

---

## 9) Test + release execution checklist
- [ ] Chay test theo batch (chi nhom lien quan), fix do den truoc khi merge.
- [ ] Chay regression bundle backbone truoc release candidate.
- [ ] Manual QA theo role:
  - Admin: approval/report/config
  - Giang vien: create/submit/attendance/evaluate/notify
  - Hoc vien: discover/register/check-in/scores/notifications
- [ ] Chot release note:
  - da xong
  - con defer
  - risk con lai
- [ ] Gan tag RC sau khi tat ca Gate A-E xanh.

## 10) Ke hoach commit de xuat
- [ ] Commit 1: Batch 1 text refactor + org-level bug fix
- [ ] Commit 2: Batch 2 realtime infra + toast UI
- [ ] Commit 3: Batch 3 notification scope + is_mandatory flow
- [ ] Commit 4: Batch 4 QR session reuse + realtime attendance trigger
- [ ] Commit 5: Batch 5 FaceID foundation + notification matrix
- [ ] Commit 6: Final regression fixes + release docs

---

## 11) Codex IDE handoff (chuyen han tu VSCode)
### Muc tieu
- Dung Codex IDE lam moi truong code chinh, giu on dinh luong release backbone.

### Tai lieu vao cua session
- [x] Da tao goi handoff: `docs/codex-ide-transition-pack.md`
- [ ] Bat dau moi session bang prompt khoi dong trong handoff pack.
- [ ] Lam viec theo workflow: Audit -> Patch nho -> Test cum -> Update docs -> Commit.

### Prompt khoi dong rut gon
```text
Tiep tuc release backbone theo docs/release-backbone-batch-todos.md.
Doc docs/codex-ide-transition-pack.md va thuc hien dung workflow batch.
Code ngay phan da ro; neu gap quyet dinh nghiep vu thi dung lai va tao Decision Gate dang trac nghiem.
```

### Checklist chuyen doi
- [ ] Xac nhan env local trong Codex IDE (`.env`, migrate, seed:qa, build/start).
- [ ] Chot branch lam viec cho batch hien tai.
- [ ] Chay test cum lien quan truoc va sau khi sua.
- [ ] Cap nhat lai checklist batch + risk/defer ngay trong file nay.
