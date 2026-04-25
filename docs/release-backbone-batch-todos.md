# RELEASE BACKBONE TODOS (BATCH PLAN)

Ngay cap nhat: 2026-04-23
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

- [x] Gate A - Auth/session on dinh
  - login/logout/me + middleware + role guard
  - khong loop redirect, khong mat session ngau nhien
  - [x] Regression Gate A: `8 files / 33 tests` pass (2026-04-21)
  - [x] Hardening UI theme toan he thong: token hoa mau + map light/dark + support system mode + giam FOUC (bat dau tu login va mo rong cho surface dung chung)
  - [x] Login test panel: them search nguoi dung toan he thong theo ten/email, click 1 lan de quick login, dong bo token light/dark cho input/button/card.
  - [x] UI interaction + contrast hardening:
    - [x] khoi phuc cursor pointer tren tat ca vung click duoc (button/card/link/action surface), tranh mat dau hieu tuong tac khi hover.
    - [x] enforce contrast ratio toi thieu WCAG AA (>= 4.5:1 cho text thuong) khi doi mau chu/nen button va text tren cac surface.
    - [x] chot bo mau chuan he thong dua tren design tokens (light/dark/system), bao dam icon, border, text, button states (default/hover/active/focus/disabled) deu doc ro.
  - [x] Dark-mode accessibility hardening follow-up (2026-04-21):
    - [x] Dua "Thong bao" len som nhat co the trong dieu huong admin/giang vien/hoc vien.
    - [x] Mo rong token mapping cho `bg-*`, `text-*`, `border-*`, hover, divide va form controls khi Windows/system dark mode dang bat.
    - [x] Harden rieng inbox thong bao de khong bi chim noi dung tren surface nhat mau.

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

### Prompt bo sung (copy de chay ngay - dark mode/doc duoc)

```text
Ban dong vai Senior Frontend Accessibility Engineer. Uu tien xu ly dark mode truoc:
1) Dieu huong:
- Dua "Thong bao" len dau hoac rat som trong menu cua moi role.
- Giu badge unread doc duoc tren nen toi.
2) Windows dark mode compatibility:
- Xem app nhu dang chay voi `prefers-color-scheme: dark`.
- Ra soat utility class mau pho bien (`bg-*`, `text-*`, `border-*`, hover, divide, input/select/textarea`) va map ve token dark on dinh.
- Uu tien sua bang global tokens/overrides de giam sua tung page.
3) Verification:
- Chay lint/test/build cum lien quan.
- Bao cao ro file da sua, lenh da chay, risk con lai.
Yeu cau:
- Patch lon vua phai, co gia tri release, tranh chia qua nho.
- Khong dump full file.
- Cap nhat docs/release-backbone-batch-todos.md sau khi xong.
```

- [x] Gate B - Activity workflow on dinh
  - draft -> requested -> approved/rejected -> published
  - teacher submit + admin approve/reject + audit log
  - [x] Dong bo approval history presentation voi state machine canonical (`pending_approval`) va giu backward compatibility cho du lieu cu (`requested`) (2026-04-21)
  - [x] Dong bo admin approval queue page voi canonical `successResponse` va preserve workflow API errors tren `/api/activity-approvals` (2026-04-21)
  - [x] Dong bo admin approval queue action toast voi API message va reset approval dialog state giua cac lan mo dong (2026-04-21)
  - [x] Regression Gate B: `12 files / 53 tests` pass (2026-04-21)
- [x] Gate C - Student registration on dinh
  - discover/register/cancel, policy + conflict + capacity race-safe
  - [x] Dong bo trang `student/my-activities` voi canonical `successResponse` cua `/api/activities/my-registrations` va bo sung regression UI (2026-04-21)
  - [x] Regression Gate C: `9 files / 17 tests` pass (2026-04-21)
- [x] Gate D - Attendance on dinh
  - QR session, validate, duplicate-safe, thong bao check-in
  - [x] Regression Gate D: `5 files / 19 tests` pass (2026-04-21)
- [x] Gate E - Scoring/bonus/report on dinh
  - complete activity, point persistence, score ledger, rankings/reports
  - [x] Dong bo fallback tong diem cho admin leaderboard/rankings khi score ledger chua tra du record, giu backward compatibility voi aggregate report hien tai (2026-04-21)
  - [x] Regression Gate E: `10 files / 38 tests` pass (2026-04-21)

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

- [x] Can chot 1 trong 2: SSE-only hay Socket hybrid.
  - [x] Chot SSE-only cho release backbone hien tai (khong mo socket hybrid trong batch nay).
- [x] Can chot chinh sach retry/backoff va rate-limit push.
  - [x] Chot policy: rate-limit push theo IP + retry nhe 1 lan cho nhom fail, sau do tra ket qua fail cuoi.

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

- [x] Quyen gui lien lop cua giang vien: tam mo hay gioi han theo config.
  - [x] Chot theo role-boundary hien tai: teacher duoc gui theo `managed_activities` (activity-scoped) hoac `homeroom_classes`, khong mo quyen global cross-class.
- [x] Uu tien mandatory khi trung rule voi voluntary.
  - [x] Chot theo D11: `mandatory > voluntary` (class scope + direct student scope).

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

- [x] Session reuse policy: 1 session/activity hay nhieu session theo khung gio.
  - [x] Chot theo D65: 1 session QR active / activity, neu con hieu luc thi reuse.
- [x] TTL default cho QR theo nghiep vu.
  - [x] Chot mac dinh 10 phut cho tao session QR moi (co the override 1-60 phut).

---

## 8) Batch 5 - FaceID foundation + notification auto-flow recommendations

### Muc tieu

- Dung khung FaceID va de xuat day du trigger thong bao he thong.
- Phan quyen training khuon mat theo dung pham vi quan ly.

### Viec can lam

- [x] Admin enrollment:
  - [x] candidate preview tu upload/camera (`/api/biometric/candidate-preview`)
  - [x] luu embedding ma hoa qua training route (`/api/admin/biometrics/students/[id]/training`)
- [x] Giang vien runtime scan:
  - [x] camera stream (`/teacher/attendance/face`)
  - [x] matching threshold + quality/liveness checks (candidate preview + runtime bridge)
- [x] Face training authorization:
  - [x] Admin duoc train/enroll khuon mat toan truong.
  - [x] Giang vien chi duoc train/enroll hoc vien thuoc cac lop chu nhiem (primary/homeroom).
  - [x] Chan thao tac voi hoc vien ngoai pham vi + tra loi 403 ro rang + co audit log.
  - [x] Bo sung route UI teacher: `/teacher/biometrics` (du lieu scope homeroom).
- [x] Hoc vien thong bao realtime:
  - [x] "Ban da duoc diem danh thanh cong" qua `sendDatabaseNotification` trong `/api/attendance/face`
- [x] Thiet ke API FaceID:
  - [x] enroll (`/api/biometric/enroll`)
  - [x] train (`/api/admin/biometrics/students/[id]/training`)
  - [x] preview candidate (`/api/biometric/candidate-preview`)
  - [x] identify (`/api/biometric/identify`)
  - [x] audit trail cho luong train/enroll/identify
- [x] De xuat matrix trigger thong bao:
  - [x] Hanh dong -> Nguoi nhan -> Priority -> TTL
  - [x] De xuat v1 da bo sung o bang "Notification trigger matrix (v1)"

### Definition of Done

- [x] FaceID co API/frame on dinh (co the pilot truoc model production).
  - [x] Regression batch 5: `10 files / 41 tests` pass (2026-04-21)
- [x] Notification trigger matrix duoc duyet lam chuan.
  - [x] Dung matrix v1 lam baseline van hanh release backbone.
- [x] Test runtime fallback (runtime_unavailable, low_quality, multi_faces) pass.
  - [x] `test/face-attendance-route.test.ts`
  - [x] `test/teacher-face-attendance-page.test.tsx`

### Decision Gates (neu can)

- [x] Thu vien matching/liveness chinh thuc cho production.
  - [x] Chot baseline release: `cosine_distance_local_v1` + `candidate_preview_signal_v1` (offline-first, khong them cloud dependency trong backbone release).
- [x] Chinh sach luu tru embedding + ma hoa + retention.
  - [x] Chot policy: luu duy nhat embedding da ma hoa (`aes-256-gcm-pbkdf2`), retention mac dinh 365 ngay, co cron cleanup purge embedding het han.

### Notification trigger matrix (v1)

| Hanh dong                                                     | Event key                         | Nguoi nhan                                | Priority | TTL (giay) | Action button de xuat               |
| ------------------------------------------------------------- | --------------------------------- | ----------------------------------------- | -------- | ---------- | ----------------------------------- |
| Bat dau diem danh QR                                          | `attendance_qr_started`           | Hoc vien mandatory + voluntary da dang ky | high     | 600        | `Xem chi tiet` (den trang check-in) |
| Face attendance thanh cong                                    | `face_attendance_recorded`        | Hoc vien vua duoc ghi nhan                | high     | 300        | `Xem hoat dong`                     |
| Face attendance fallback manual (runtime/quality/multi-faces) | `face_attendance_manual_fallback` | Giang vien dang thao tac                  | normal   | 120        | `Mo giao dien manual`               |
| Biometric enrollment cap nhat thanh cong                      | `biometric_enrollment_update`     | Hoc vien + giang vien chu nhiem           | normal   | 3600       | `Xem trang khuon mat`               |
| Biometric training hoan tat                                   | `biometric_training_update`       | Hoc vien + giang vien chu nhiem           | normal   | 3600       | `Xem trang khuon mat`               |
| Biometric identify no-match lap lai > N lan / 5 phut          | `biometric_identify_anomaly`      | Admin van hanh                            | high     | 900        | `Xem audit`                         |

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

- [x] Chay test theo batch (chi nhom lien quan), fix do den truoc khi merge.
  - [x] Batch 5 FaceID regression: `10 files / 41 tests` pass (2026-04-21)
- [x] Chay regression bundle backbone truoc release candidate.
  - [x] `npm run test:backbone` -> `11 files / 47 tests` pass (2026-04-21)
  - [x] `npm run test:backbone` -> `11 files / 47 tests` pass (2026-04-22)
- [x] Manual QA theo role:
  - [x] Admin: actor UAT `test/uat/actor-admin/02-activity-approval.spec.ts` pass (2026-04-21)
  - [x] Giang vien: actor UAT `test/uat/actor-teacher/04-qr-refresh-close.spec.ts` pass (2026-04-21)
  - [x] Hoc vien: actor UAT `test/uat/actor-student/02-qr-checkin.spec.ts` pass (2026-04-21)
  - [x] Re-run actor smoke bundle: `test/uat/actor-admin/02-activity-approval.spec.ts` + `test/uat/actor-teacher/04-qr-refresh-close.spec.ts` + `test/uat/actor-student/02-qr-checkin.spec.ts` pass (2026-04-22)
- [x] Chot release note:
  - [x] da xong: Batch 5 FaceID foundation (scope guard + identify API + runtime fallback test + notification matrix v1)
  - [x] da dong defer production policy (2026-04-22): matching/liveness engine + embedding retention policy da duoc chot va thi hanh trong batch 9.7
  - [x] risk con lai: runtime model unavailable se fallback manual; can tiep tuc monitor audit no-match anomaly
  - [x] da fix blocker build (2026-04-21): re-export `ensureActivityStudentScope`, dong bo type admin participants voi contract `present/absent/not_participated`
  - [x] da harden schema drift (2026-04-21): tu bo sung cot `activity_id`/`coefficient` cho `point_calculations` trong scoring + seed
  - [x] Internal RC summary cap nhat: `docs/INTERNAL_RC_SUMMARY_2026-04-21.md`
  - [x] Full release check pass (2026-04-21): `npm.cmd run release:check:full`
  - [x] Re-run full release check pass (2026-04-22): `npm.cmd run release:check:full` (4/4 checks)
- [x] Tat ca Gate A-E da xanh (2026-04-21), da re-verify regression release (2026-04-22).
- [x] Gan tag RC noi bo `internal-rc-2026-04-21` sau khi xac nhan build + backbone regression + docs release (2026-04-21).

## 9.1) Batch uu tien nong sau RC - QR / Notification action / Mobile camera

### Muc tieu

- Sua dung muc dich tab QR cho hoc vien, dua hoc vien vao luong check-in truc tiep.
- Cho phep notification inbox va push toast co nut hanh dong de vao ngay man hinh can xu ly.
- Giam loi camera tren mobile cho FaceID/QR bang fallback `getUserMedia` thuc dung hon.
- Chan thong bao day bi lap lai va bo sung CTA `Diem danh` ngay tren trang quan ly hoat dong khi QR session dang mo.

### Viec can lam

- [x] Doi tab `Quet QR` cua hoc vien sang `/student/check-in` thay vi dan ve danh sach hoat dong.
- [x] Tao trang `/student/check-in` dung scanner chung, cho phep nhan `activityId` va parse QR token/session linh hoat.
- [x] Redirect route cu `/student/activities/[id]/check-in` ve luong check-in moi de giu backward compatibility.
- [x] Cap nhat notification QR-started de action button di thang toi trang check-in moi.
- [x] Mo rong `/api/notifications` de tra ve `action_buttons` cho inbox.
- [x] Bo sung action button trong inbox thong bao va toast realtime.
- [x] Dedupe push toast theo `notification.id` / `event_id` de tranh cung 1 thong bao lap lai nhieu lan.
- [x] Them helper camera fallback dung chung cho QR scanner + FaceID login/attendance.
- [x] Trang quan ly hoat dong cua giang vien hien CTA `Diem danh` neu activity dang co active QR session.
- [x] Chay lai cum test/build/lint cho batch uu tien nong va commit rieng.
  - [x] Test/build tiep dien sau loat uu tien nong + shell modernization da pass (2026-04-22).
  - [x] Commits lien quan: `3d16b1c` (QR/notification/camera) + `4c54435` (navbar shell/check-in/dark-mode).

### Prompt bo sung (copy de chay batch nay)

```text
Ban dong vai Senior Fullstack Release Engineer. Day batch uu tien nong len lam truoc:
1) Student check-in:
- Tab `Quet QR` cua hoc vien phai mo dung man hinh check-in, khong dan ve danh sach tong hop.
- Duy tri backward compatibility cho route cu neu notification/link cu van tro toi.
2) Notification action:
- Ca inbox thong bao va push toast deu phai co nut hanh dong neu event co `action_buttons`.
- Vi du notification mo diem danh thi hoc vien bam 1 nut la vao thang luong diem danh.
- Chan duplicate push toast cho cung 1 notification.
3) Mobile camera:
- Nghien cuu va harden `getUserMedia` de mobile browser de xin camera de hon, uu tien attendance va login bang khuon mat.
- Tra thong diep loi tieng Viet de debug nhanh.
4) Teacher activity management:
- Neu activity dang co active QR session thi hien nut `Diem danh` ngay tren card de teacher vao nhanh.
Yeu cau:
- Liet ke file can sua truoc khi code.
- Patch nho nhung co gia tri release.
- Chay test/lint/build cum lien quan.
- Cap nhat docs/release-backbone-batch-todos.md va commit rieng theo batch.
```

## 9.2) Batch uu tien nong sau RC - Navbar audit + dai trung tu UI shell

### Muc tieu

- Audit toan bo navbar theo tung actor de dam bao moi link dan dung chuc nang, khong trung nghia, khong thieu luong quan trong.
- Dai trung tu lop UI shell theo huong hien dai hon nhung khong doi nghiep vu: theme light/dark/system, responsive, typography, contrast, mat do thong tin va tinh de doc.
- Chuan hoa nhan tieng Viet co dau o lop giao dien chung; loai bo text tieng Anh, text khong dau va cac nhom muc lap y.

### Viec can lam

- [x] Audit navbar admin/giang vien/hoc vien doi chieu voi route thuc te trong repo.
  - [x] Script doi chieu `href` trong `Sidebar` voi route thuc te: `69/69` hop le.
- [x] Bo sung muc con thieu neu route/chuc nang da ton tai va can truy cap truc tiep trong vai tro do.
  - [x] Teacher: bo sung quick-link `notifications/history`, `notifications/settings`.
  - [x] Student: bo sung quick-link `alerts`.
  - [x] Admin: bo sung quick-link `audit-logs`.
- [x] Loai bo hoac gop cac muc lap nghia, dat ten ngan gon, dung nghiep vu.
- [x] Refactor `Sidebar` thanh shell dieu huong co style thong nhat, contrast tot, mobile-first va dark mode doc ro.
- [x] Nang cap `AuthContent` va global shell background/spacing de cac trang trong app dong bo hon ma khong pha layout hien co.
- [x] Chot typography stack offline-friendly, hien dai hon va bo sung rule xu ly noi dung dai, bang rong, text wrap.
- [x] Tiep tuc quet nhanh nhan UI chung co text tieng Anh/khong dau o lop shell, toolbar, button va heading de doi sang tieng Viet co dau.
- [x] Uu tien sua cac trang bao cao giang vien co mojibake/khong dau o heading, filter, badge va bang du lieu.
- [x] Chuan hoa thong diep save/submit user-facing o `ActivityDialog` de khong con loi ma hoa.
- [x] Dong bo cum notification UI theo shell moi (inbox, teacher history/settings/broadcast) va loai bo text mojibake.
- [x] Tang do doc dark mode cho cum notification qua token hoa card/filter/table/action states.
- [x] Chay test navbar/shell lien quan + build va commit rieng.
  - [x] `npm.cmd test -- test/sidebar-teacher-links.test.tsx test/teacher-attendance-page.test.tsx test/teacher-participation-page.test.tsx test/notification-inbox.test.tsx`
  - [x] `npm.cmd run build`
  - [x] `npm.cmd test -- test/notification-inbox.test.tsx test/student-notifications-page.test.tsx test/teacher-notification-settings-page.test.tsx test/teacher-notification-routes.test.ts test/teacher-notification-history-route.test.ts test/teacher-notification-history-export-route.test.ts test/notification-realtime-routes.test.ts test/realtime-notification-bridge.test.tsx`
  - [x] `npm.cmd run build` (recheck sau batch notification shell)

### Prompt bo sung (copy de chay batch nay)

```text
Ban dong vai Principal Product Designer + Senior Frontend Engineer. Muc tieu la dai trung tu UI shell va navbar cua UniAct, NHUNG khong duoc lam sai chuc nang, khong duoc cat bo tien ich dang co, chi duoc cai tien.
1) Navbar audit theo actor:
- Kiem tra admin / giang vien / hoc vien.
- Moi muc trong navbar phai dan den route/chuc nang dung muc dich.
- Doi chieu voi route hien co trong repo de xem actor do con thieu chuc nang nao dang ton tai ma chua duoc dua len navbar.
- Loai bo cac muc lap y nghia, dat lai nhan ro rang, tieng Viet co dau, ngan gon.
2) UI shell modernization:
- Dai trung tu shell chung (sidebar, background, spacing, header shell, badge, section title, card feel, responsive).
- Ho tro light/dark/system va uu tien Windows dark mode van doc ro.
- Typography hien dai, offline-friendly, khong phu thuoc internet; uu tien stack dep tren Windows/macOS.
- Kiem soat noi dung dai: wrap text, table overflow, card spacing, title/subtitle, action groups.
3) Content polish:
- Doi text tieng Anh hoac khong dau trong lop UI chung sang tieng Viet co dau.
- Ra soat noi dung trung lap, nhom chuc nang gan nhau, doi ten de de hieu hon.
4) Safety:
- Khong doi API contract.
- Khong doi nghiep vu.
- Khong xoa tinh nang dang co.
- Chinh o lop giao dien, navigation, token va text shell; thay doi o page rieng chi khi can thiet de khop shell moi.
Yeu cau thi hanh:
- Liet ke file can sua truoc khi code.
- Patch lon vua phai, co gia tri release, tranh sua lan man.
- Chay test navbar/shell lien quan va `npm run build`.
- Cap nhat docs/release-backbone-batch-todos.md sau khi xong.
```

## 9.3) Batch lon uu tien nong - Teacher QR shell + Notify students shell

### Muc tieu

- Refactor man hinh `teacher/qr` va `teacher/notify-students` theo `page-shell/page-surface/content-card`.
- Chuan hoa copy tieng Viet co dau, bo text mojibake tren 2 man hinh uu tien nong.
- Giu nguyen contract API va luong nghiep vu tao QR / gui thong bao / len lich.

### Viec can lam

- [x] Refactor UI `src/app/teacher/qr/page.tsx`:
  - [x] shell moi + tabs ro rang cho create/history/bulk/analytics.
  - [x] the hien thong tin session QR, export CSV, bang du lieu quet va thong ke.
  - [x] sua toan bo message/toast sang tieng Viet co dau.
- [x] Refactor UI `src/app/teacher/notify-students/page.tsx`:
  - [x] shell moi + dashboard card + tabs send/scheduled/history.
  - [x] bo loc hoc vien theo lop + preview noi dung + len lich gui.
  - [x] bang lich su/len lich contrast tot trong light/dark.
- [x] Cap nhat regression tests text payload:
  - [x] `test/teacher-notify-students-page.test.tsx`.
  - [x] giu `test/teacher-qr-page.test.tsx` xanh voi flow canonical.
- [x] Chay test/build cum lien quan va xac nhan PASS:
  - [x] `npm.cmd test -- test/teacher-qr-page.test.tsx test/teacher-notify-students-page.test.tsx`
  - [x] `npm.cmd test -- test/qr-session-reuse-route.test.ts test/notification-realtime-routes.test.ts test/realtime-notification-bridge.test.tsx`
  - [x] `npm.cmd run build`

## 9.4) Batch lon uu tien nong - Notification cluster shell + dark mode readability

### Muc tieu

- Hoan tat dai trung tu UI cum notification con lai cho teacher/student.
- Chuan hoa copy tieng Viet co dau va loai bo text mojibake trong notification surfaces.
- Tang do doc light/dark cho inbox, history, broadcast, settings ma khong doi API contract.

### Viec can lam

- [x] Refactor `NotificationInbox` de dong bo copy/interaction:
  - [x] labels, actions, pagination, modal settings, delete confirm.
  - [x] giu action button runtime (`action_buttons`) va hanh vi mark-read/delete.
- [x] Chuan hoa wrapper page:
  - [x] `student/notifications`
  - [x] `teacher/notifications`
- [x] Refactor shell va copy cho:
  - [x] `teacher/notifications/history`
  - [x] `teacher/notifications/broadcast`
  - [x] `teacher/notifications/settings`
- [x] Bo sung regression page tests:
  - [x] `test/teacher-notification-history-page.test.tsx`
  - [x] `test/teacher-notification-broadcast-page.test.tsx`
- [x] Chay regression + build:
  - [x] `npm.cmd test -- test/notification-inbox.test.tsx test/student-notifications-page.test.tsx test/teacher-notification-settings-page.test.tsx test/teacher-notification-history-page.test.tsx test/teacher-notification-broadcast-page.test.tsx test/teacher-notification-routes.test.ts test/teacher-notification-history-route.test.ts test/teacher-notification-history-export-route.test.ts test/notification-realtime-routes.test.ts test/realtime-notification-bridge.test.tsx`
  - [x] `npm.cmd run build`
  - [x] `npm.cmd run test:backbone` -> `11 files / 47 tests` pass (2026-04-22)

## 9.5) Batch lon uu tien nong - Navbar actor audit + bo sung quick links

### Muc tieu

- Audit dieu huong theo actor (admin/giang vien/hoc vien), dam bao route menu hop le 100%.
- Bo sung nhanh cac quick-link con thieu cho cac man hinh da co route va thuong xuyen thao tac.
- Giu nguyen nghiep vu/contract, chi cai tien navigation va kha nang truy cap nhanh.

### Viec can lam

- [x] Audit route:
  - [x] doi chieu toan bo `href` trong `Sidebar` voi `src/app/**/page.tsx`: khong co route sai.
  - [x] quet route ton tai nhung chua co link de chon danh sach bo sung.
- [x] Bo sung quick-link:
  - [x] Admin: `reports/activity-statistics`, `reports/scores`, `reports/teachers`.
  - [x] Teacher: `notifications/broadcast`, `reports/class-stats`, `students/notes`.
  - [x] Student: `awards/history`, `awards/upcoming`.
- [x] Cap nhat regression test sidebar:
  - [x] mo rong assertions route moi trong `test/sidebar-teacher-links.test.tsx`.
- [x] Verification:
  - [x] `npm.cmd test -- test/sidebar-teacher-links.test.tsx test/teacher-attendance-page.test.tsx test/teacher-participation-page.test.tsx`
  - [x] `npm.cmd run build`

## 9.6) Batch lon uu tien nong - Decision policy hardening (Notification + QR defaults)

### Muc tieu

- Dong cac decision gate con mo cua luong thong bao/QR theo huong khuyen nghi da chot.
- Chuyen policy thanh behavior thuc thi de release backbone on dinh hon.

### Viec can lam

- [x] Push notification:
  - [x] them rate-limit route `POST /api/notifications/push` (20 req/phut/IP).
  - [x] them retry nhe 1 lan cho danh sach user fail o lan gui dau.
  - [x] bo sung metadata ket qua `retry_once`, `retry_recovered`, `failed`.
- [x] Notification delivery helper:
  - [x] `sendBulkDatabaseNotifications` tra ve `failedUserIds` de route co the retry muc tieu.
- [x] QR policy:
  - [x] dong bo TTL mac dinh tao QR session = 10 phut tai API + validation schema + teacher QR UI.
  - [x] giu reuse policy 1 session active/activity.
- [x] Regression tests:
  - [x] bo sung test retry/rate-limit cho `notifications/push`.
  - [x] bo sung test default TTL 10 phut cho `qr-sessions`.

### Verification

- [x] `npm.cmd test -- test/notification-realtime-routes.test.ts test/realtime-notification-bridge.test.tsx test/qr-session-reuse-route.test.ts test/teacher-qr-page.test.tsx` -> PASS (4 files / 19 tests)
- [x] `npm.cmd test -- test/teacher-notification-routes.test.ts` -> PASS (1 file / 7 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.7) Batch lon uu tien nong - Face production policy closeout (matching/liveness + retention)

### Muc tieu

- Dong decision gate Face production bang policy ro rang, khong doi nghiep vu backbone.
- Chuan hoa nguong matching/liveness theo policy tap trung.
- Them co che retention cleanup cho biometric embedding.

### Viec can lam

- [x] Tao policy module `production-policy` cho Face:
  - [x] matching engine: `cosine_distance_local_v1`
  - [x] liveness engine: `candidate_preview_signal_v1`
  - [x] distance threshold + retention days co the override qua env
  - [x] encryption scheme: `aes-256-gcm-pbkdf2`
- [x] Dong bo consume policy:
  - [x] `attendance-runtime-bridge` dung threshold tu policy (bo hardcode)
  - [x] `biometric/identify` dung threshold/policy metadata trong response + audit
  - [x] readiness route expose production policy fields
- [x] Them cron route cleanup retention:
  - [x] `GET /api/cron/cleanup-biometric` (auth `CRON_SECRET`)
  - [x] purge embedding qua han, rollback status `ready/trained` ve `captured/pending`
- [x] Bo sung/duy tri regression tests:
  - [x] policy util + cleanup cron route
  - [x] readiness/runtime/identify/bridge tests

### Verification

- [x] `npm.cmd test -- test/biometric-production-policy.test.ts test/biometric-cleanup-cron-route.test.ts test/admin-biometric-readiness-route.test.ts test/biometric-runtime-capability.test.ts test/attendance-runtime-bridge.test.ts test/biometric-identify-route.test.ts test/admin-system-health-page.test.tsx` -> PASS (7 files / 19 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.8) Batch hardening - Activity workflow lint/type cleanup

### Muc tieu

- Giam warning lint o cum Activity workflow (detail/admin edit/pending approvals) de giam no ky thuat truoc khi chot backbone.
- Khong doi nghiep vu, chi harden hooks deps + typing form diff.

### Viec can lam

- [x] `activities/[id]/page.tsx`:
  - [x] dong bo `useEffect` voi `fetchActivity` callback dependency de khong warning `react-hooks/exhaustive-deps`.
- [x] `admin/activities/[id]/edit/page.tsx`:
  - [x] bo `any` o state `changes` + `handleFieldChange`.
  - [x] chuan hoa diff builder theo typed fields, tranh type error khi build production.
- [x] `admin/activities/pending/page.tsx`:
  - [x] dong bo `fetchActivities` bang `useCallback` + deps dung cho `useEffect`.
  - [x] bo unused `catch (error)` vars.
  - [x] refresh list sau approve/reject theo `await fetchActivities()`.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/activities/[id]/page.tsx" --file "src/app/admin/activities/[id]/edit/page.tsx" --file "src/app/admin/activities/pending/page.tsx"` -> PASS (0 warnings)
- [x] `npm.cmd test -- test/admin-approvals-page.test.tsx test/activities.test.ts test/admin-pending-activities-route.test.ts` -> PASS (3 files / 12 tests)
- [x] `npm.cmd run build` -> PASS

## 9.9) Batch hardening - Admin approvals lint/type cleanup

### Muc tieu

- Giam tiep warning lint o cum duyet hoat dong admin de on dinh nhanh luong `pending -> approve/reject`.
- Chuan hoa typing du lieu submit dialog, error handling va badge icon type.

### Viec can lam

- [x] `admin/approvals/page.tsx`:
  - [x] dong bo `fetchPendingActivities` voi `useCallback` + `useEffect` deps dung.
  - [x] bo `any` trong `catch` va payload submit approve/reject.
  - [x] refresh danh sach sau action bang `await fetchPendingActivities()`.
- [x] `admin/approvals/ApprovalDialog.tsx` + `admin/approvals/types.ts`:
  - [x] them type `ApprovalSubmission`, bo `onSubmit: (data: any)`.
- [x] `admin/approvals/ApprovalList.tsx`:
  - [x] bo tham so su kien khong dung (`no-unused-vars`).
- [x] `admin/activities/ActivityTable.tsx`:
  - [x] thay `icon: any` bang `LucideIcon | null`.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/admin/approvals/page.tsx" --file "src/app/admin/approvals/ApprovalDialog.tsx" --file "src/app/admin/approvals/ApprovalList.tsx" --file "src/app/admin/activities/ActivityTable.tsx"` -> PASS (0 warnings)
- [x] `npm.cmd test -- test/admin-approvals-page.test.tsx test/admin-activities-page.test.tsx test/admin-pending-activities-route.test.ts` -> PASS (3 files / 8 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.10) Batch hardening - Admin alerts/audit lint cleanup

### Muc tieu

- Giam tiep warning lint o cum quan tri alerts + audit logs de bao toan do on dinh gate A-E.
- Khong doi contract nghiep vu; chi harden hooks deps va bo prop/param du thua.

### Viec can lam

- [x] `admin/alerts/page.tsx`:
  - [x] dong bo `fetchAlerts` bang `useCallback` + deps dung.
  - [x] refresh sau `markRead` bang `await fetchAlerts(...)`.
- [x] `admin/audit/page.tsx`:
  - [x] dong bo `fetchLogs` bang `useCallback` + deps dung.
  - [x] bo goi async khong await trong nut `Ap dung`.
- [x] `admin/audit-logs/page.tsx`:
  - [x] dong bo `fetchLogs` bang `useCallback`, effect phu thuoc callback.
  - [x] bo truyen prop `loading` khong can thiet cho table.
- [x] `admin/audit-logs/AuditTable.tsx`:
  - [x] bo prop `loading` khong su dung.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/admin/alerts/page.tsx" --file "src/app/admin/audit/page.tsx" --file "src/app/admin/audit-logs/page.tsx" --file "src/app/admin/audit-logs/AuditTable.tsx"` -> PASS (0 warnings)
- [x] `npm.cmd test -- test/alerts.test.ts test/audit.test.ts test/approval-audit.unit.test.ts` -> PASS (3 files / 12 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.11) Batch hardening - Admin users lint/type cleanup

### Muc tieu

- Don canh bao lint/type o cum quan tri nguoi dung de on dinh nhanh luong CRUD user.
- Khong doi nghiep vu/contract, chi harden typing + hook deps + error handling.

### Viec can lam

- [x] `admin/users/UserDialog.tsx`:
  - [x] bo `any` cho payload/dialog state va class options.
  - [x] bo state reset password khong su dung.
- [x] `admin/users/[id]/activities/page.tsx`:
  - [x] bo `any` o params/catch.
  - [x] dong bo `load` callback va effect dependencies.
- [x] `admin/users/[id]/edit/page.tsx`:
  - [x] bo `any` o user/class/form change/catch.
  - [x] chuan hoa fetch callbacks + class list typing.
- [x] `admin/users/[id]/page.tsx`:
  - [x] bo `any` o recent activities/awards/color map.
  - [x] harden `fetchUserData` typing + map fallback arrays.
- [x] `admin/users/import/page.tsx`:
  - [x] bo `any` trong parser CSV, dung typed parsed user object.
- [x] `admin/users/page.tsx`:
  - [x] dong bo `fetchUsers/fetchTotalCounts` voi `useCallback`.
  - [x] bo param/catch khong dung, chuan hoa goi refresh `void fetchUsers()`.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/admin/users/UserDialog.tsx" --file "src/app/admin/users/[id]/activities/page.tsx" --file "src/app/admin/users/[id]/edit/page.tsx" --file "src/app/admin/users/[id]/page.tsx" --file "src/app/admin/users/import/page.tsx" --file "src/app/admin/users/page.tsx"` -> PASS (0 warnings)
- [x] `npm.cmd test -- test/admin-users-route.test.ts` -> PASS (1 file / 2 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.12) Batch hardening - Admin classes lint/type cleanup

### Muc tieu

- Don warning lint o cum quan tri lop hoc (list/detail/edit/students/new class).
- Khong doi nghiep vu/contract; chi harden typing + effect dependencies.

### Viec can lam

- [x] `admin/classes/page.tsx`:
  - [x] bo `any` khi parse danh sach teacher.
  - [x] giu flow fetch classes va bo warning effect dependency.
- [x] `admin/classes/new/page.tsx`:
  - [x] bo `any` khi parse danh sach teacher.
- [x] `admin/classes/[id]/page.tsx`:
  - [x] bo `any` cho class/student state.
  - [x] chuan hoa params typing va export roster row field.
- [x] `admin/classes/[id]/edit/page.tsx`:
  - [x] bo `any` khi parse teacher list.
  - [x] harden params typing + class payload fallback.
- [x] `admin/classes/[id]/students/page.tsx`:
  - [x] bo state `summary` khong su dung.
  - [x] bo warning effect dependency.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/admin/classes/page.tsx" --file "src/app/admin/classes/new/page.tsx" --file "src/app/admin/classes/[id]/page.tsx" --file "src/app/admin/classes/[id]/edit/page.tsx" --file "src/app/admin/classes/[id]/students/page.tsx"` -> PASS (0 warnings)
- [x] `npm.cmd test -- test/admin-classes-route.test.ts test/admin-class-detail-route.test.ts` -> PASS (2 files / 5 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.13) Batch hardening - Admin awards/bonus/reports/scores lint cleanup

### Muc tieu

- Don warning lint o cum admin awards + bonus + reports + scores de on dinh nhanh gate E.
- Khong doi nghiep vu/contract; chi harden typing, hook dependencies va error handling.

### Viec can lam

- [x] `admin/awards/page.tsx`:
  - [x] bo `any` trong `catch`, them helper `getErrorMessage`.
  - [x] dong bo `fetchSuggestions` voi `useCallback` + deps dung cho `useEffect`.
- [x] `admin/bonus-approval/page.tsx`:
  - [x] bo import/state khong su dung (`Filter`, `setSortOrder`).
  - [x] `applyFiltersAndSort` dung `useCallback` + effect dependency callback.
  - [x] bo cast `as any` trong filter/sort select.
- [x] `admin/bonus-reports/page.tsx`:
  - [x] dong bo `fetchReport` bang `useCallback`, effect phu thuoc callback.
- [x] `admin/scores/[id]/adjust/page.tsx`:
  - [x] bo `any` cho `student` state va `catch`.
  - [x] them helper `getErrorMessage`, dong bo `fetchStudent` callback dependency.
- [x] `admin/scores/export/page.tsx`:
  - [x] bo `classes: any[]`, thay bang typed `ClassOption[]`.
  - [x] dong bo `fetchClasses/fetchScores` bang `useCallback` + effect dependency callback.
- [x] `admin/leaderboard/page.tsx`:
  - [x] dong bo `fetchLeaderboard` bang `useCallback` + deps dung.
- [x] `admin/reports/activity-statistics/page.tsx`:
  - [x] dong bo `fetchData` bang `useCallback`, effect phu thuoc callback.

### Verification

- [x] `npm.cmd run lint -- --file src/app/admin/awards/page.tsx --file src/app/admin/bonus-approval/page.tsx --file src/app/admin/bonus-reports/page.tsx --file src/app/admin/scores/[id]/adjust/page.tsx --file src/app/admin/scores/export/page.tsx --file src/app/admin/leaderboard/page.tsx --file src/app/admin/reports/activity-statistics/page.tsx` -> PASS (0 warnings)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, build passed trong pipeline)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.14) Batch hardening - Admin scoring/scoring-config lint/type cleanup

### Muc tieu

- Don warning lint o cum admin scoring + scoring-config de on dinh Gate E.
- Khong doi nghiep vu/contract; chi harden typing, callback dependencies va error handling.

### Viec can lam

- [x] Tao type module dung chung:
  - [x] `admin/scoring-config/types.ts` cho config entities + update payload.
- [x] `admin/scoring-config/*Tab.tsx`:
  - [x] bo `any` cho props/state/edit handlers (`AchievementsTab`, `ActivityTypeManager`, `AwardsTab`, `LevelMultiplierManager`, `ScoringRulesTab`).
  - [x] dong bo payload update typed theo route contract.
- [x] `admin/scoring-config/formula-editor/page.tsx`:
  - [x] bo `Record<string, any>` trong formula variables payload.
  - [x] bo `catch (error: any)` bang `unknown` + helper message.
- [x] `admin/scoring-config/page.tsx`:
  - [x] bo `any` trong `ScoringConfig` state va `handleUpdate`.
  - [x] dong bo `fetchConfig` bang `useCallback`, goi `void fetchConfig()` trong effect.
  - [x] bo `catch (error: any)` bang `unknown` + helper message.
- [x] `admin/scoring/page.tsx`:
  - [x] thay `editingItem: any` bang typed config item.
  - [x] chuyen nhom fetch API sang `useCallback` + dong bo `useEffect` dependency.
  - [x] bo `openEditModal(item: any)`.

### Verification

- [x] `npm.cmd run lint -- --file src/app/admin/scoring-config/AchievementsTab.tsx --file src/app/admin/scoring-config/ActivityTypeManager.tsx --file src/app/admin/scoring-config/AwardsTab.tsx --file src/app/admin/scoring-config/LevelMultiplierManager.tsx --file src/app/admin/scoring-config/ScoringRulesTab.tsx --file src/app/admin/scoring-config/formula-editor/page.tsx --file src/app/admin/scoring-config/page.tsx --file src/app/admin/scoring/page.tsx` -> PASS (0 warnings)
- [x] `npm.cmd test -- test/scoring.test.ts test/admin-scores-route.test.ts test/admin-reports-scores-route.test.ts test/admin-leaderboard-route.test.ts` -> PASS (4 files / 11 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.15) Batch uu tien nong - Dark mode landing + camera QR mobile + notification action role + QR fullscreen

### Muc tieu

- Xu ly gap giao dien landing o dark mode/system dark de dam bao contrast doc duoc.
- Dong bo dung vai tro diem danh: giang vien tao/chien QR, hoc vien la nguoi quet QR.
- Rasoat va sua fallback logic action button thong bao day/inbox theo actor.
- Giam push toast bi lap lai va bo sung che do chieu ma QR toan man hinh cho giang vien.

### Viec can lam

- [x] Landing page:
  - [x] thay theme shell + cards token-based de dark mode doc ro.
  - [x] cap nhat copy UI cho dung role/flow QR.
- [x] Student QR scanner:
  - [x] bo sung auto decode qua `BarcodeDetector` khi trinh duyet ho tro.
  - [x] giu fallback nhap tay va thong diep loi camera ro nguyen nhan (HTTPS/quyen/in-app browser).
- [x] Camera helper:
  - [x] harden `requestPreferredCameraStream` cho secure context + unsupported browser message.
  - [x] bo sung mapping loi `NotSupportedError`/security context.
- [x] Notification action logic:
  - [x] `resolveNotificationActionButtons` role-aware (`student`/`teacher`/`admin`) cho attendance/activity/participation.
  - [x] `NotificationInbox` truyen role theo pathname de fallback action dung actor.
  - [x] `RealtimeNotificationBridge` truyen role cho fallback action + them content dedupe window de chan toast lap.
- [x] Teacher QR + activity management:
  - [x] them nut "Chieu ma QR toan man hinh" va overlay projector.
  - [x] dong bo query canonical `activity_id/session_id` tu trang teacher activities -> teacher qr.
  - [x] bo sung nut diem danh cho card hoat dong "sap dien ra" neu dang co active QR session.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/page.tsx" --file "src/lib/camera-stream.ts" --file "src/components/StudentQRScanner.tsx" --file "src/app/student/check-in/page.tsx" --file "src/lib/notification-actions.ts" --file "src/components/notifications/NotificationInbox.tsx" --file "src/components/realtime/RealtimeNotificationBridge.tsx" --file "src/app/teacher/qr/page.tsx" --file "src/app/teacher/activities/page.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/teacher-qr-page.test.tsx test/teacher-activities-page.test.tsx test/realtime-notification-bridge.test.tsx test/notification-inbox.test.tsx test/notification-actions.test.ts test/qr-session-reuse-route.test.ts test/notification-realtime-routes.test.ts` -> PASS (7 files / 29 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.16) Batch tiep theo - Face attendance camera error harmonization

### Muc tieu

- Dong bo luong `teacher/attendance/face` voi camera error helper moi de giam false-negative "trinh duyet khong ho tro camera".
- Bo sung regression test cho secure-context camera failure UX.

### Viec can lam

- [x] `teacher/attendance/face/page.tsx`:
  - [x] dung `getCameraAccessErrorMessage` de map loi camera theo ngu canh HTTPS/quyen/device.
  - [x] bo guard `navigator.mediaDevices` hardcode, dung luon helper `requestPreferredCameraStream`.
  - [x] harden typing cho `preview`/`submitResult`, bo `any`.
- [x] `test/teacher-face-attendance-page.test.tsx`:
  - [x] mock `camera-stream` va them test regression cho secure-context error message.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/teacher/attendance/face/page.tsx" --file "src/lib/camera-stream.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/teacher-face-attendance-page.test.tsx test/attendance-runtime-bridge.test.ts test/face-attendance-route.test.ts` -> PASS (3 files / 22 tests)

## 9.17) Batch uu tien nong - Dark contrast rescue + notification projector CTA + navbar integrity

### Muc tieu

- Khac phuc triet de tinh trang noi dung kho doc trong dark mode/system dark, dac biet voi utility mau co opacity (`bg-white/80`, `bg-white/75`...).
- Dong bo luong hanh dong thong bao attendance cho giang vien theo huong "mo QR + chieu toan man hinh" ngay tu CTA.
- Tang do on dinh mobile camera fallback voi huong dan ro khi nguoi dung mo app bang trinh duyet nhung.
- Them regression test xac nhan navbar actor co "Thong bao" o vung uu tien va tat ca link sidebar deu map dung route hien co.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Principal Frontend + QA Engineer. Hay uu tien hotfix release theo thu tu:
1) Dark/system mode contrast rescue:
- Sửa các utility màu có opacity gây lệch tương phản (bg-white/80, bg-white/75, bg-gray-50/70...) bằng token dark ổn định.
- Landing page dùng trực tiếp token text/surface, không phụ thuộc map utility mong manh.
2) Notification action flow:
- Với thông báo attendance cho giảng viên, CTA phải mở trang QR theo activity và tự bật chế độ chiếu toàn màn hình.
3) Mobile camera support message:
- Khi phát hiện in-app browser/webview, trả message hướng dẫn mở bằng Chrome/Safari/Edge rõ ràng.
4) Navbar integrity:
- Viết regression test đảm bảo Thông báo xuất hiện sớm cho từng actor và các link sidebar đều trỏ tới route thật trong src/app.
Yêu cầu:
- Liệt kê file trước khi sửa, patch nhỏ, chạy lint/test/build liên quan, cập nhật docs batch và commit rõ ràng.
```

### Viec can lam

- [x] Landing/UI token:
  - [x] doi `src/app/page.tsx` sang token text/surface/accent style de khong bi xung dot dark mode.
  - [x] bo utility mau opacity rui ro tren landing (`bg-white/80`, `bg-white/75`), thay bang style token.
- [x] Global dark-mode hardening:
  - [x] bo sung map dark cho utility opacity `bg-white/*`, `bg-gray-50/70`, `bg-gray-100/80`.
  - [x] bo sung fallback `forced-colors: active` de dam bao do tuong phan tren Windows high-contrast.
- [x] Notification CTA + QR projector:
  - [x] `resolveNotificationActionButtons` teacher attendance -> `/teacher/qr?activity_id=<id>&projector=1`.
  - [x] `teacher/qr` auto open projector mode khi co query `projector=1|fullscreen=1` va da co session.
- [x] Camera helper:
  - [x] detect in-app browser/webview va tra thong diep huong dan mo trinh duyet he thong.
  - [x] dong bo mapping `NotAllowedError` / `NotSupportedError` de thong diep ro nguyen nhan.
- [x] Regression tests:
  - [x] update test action button notification.
  - [x] bo sung test auto projector query mode.
  - [x] bo sung test navbar integrity theo actor + route resolvable.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/page.tsx" --file "src/lib/camera-stream.ts" --file "src/lib/notification-actions.ts" --file "src/app/teacher/qr/page.tsx" --file "test/notification-actions.test.ts" --file "test/teacher-qr-page.test.tsx" --file "test/sidebar-teacher-links.test.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/notification-actions.test.ts test/teacher-qr-page.test.tsx test/sidebar-teacher-links.test.tsx` -> PASS (3 files / 11 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, sau khi format lai `src/app/page.tsx`, `src/app/teacher/qr/page.tsx`, `src/lib/camera-stream.ts`)

## 9.18) Batch lon UI teacher activities - modern surface + clean copy + responsive actions

### Muc tieu

- Trùng tu UI trang `teacher/activities` theo huong hien dai hon nhung giu nguyen nghiep vu va API contract.
- Don noi dung trung lap/y nghia giong nhau, loai bo emoji trong nhan thao tac de giao dien sach va nhat quan.
- Tang kha nang doc trong light/dark mode bang `page-surface` + `content-card`, toi uu mobile/desktop responsiveness.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Senior Frontend Refactor Engineer. Uu tien trùng tu UI trang teacher activities:
1) Khong doi nghiep vu:
- Giu nguyen logic status/phan trang/submit/reject/cancel/clone/delete/QR attendance shortcut.
2) Nang cap giao dien:
- Doi shell sang page-surface + content-card.
- Chuan hoa button/action style (bo emoji, dung icon Lucide + label tieng Viet ro rang).
- Toi uu responsive: card thong tin 1 cot tren mobile, 2-4 cot tren man hinh rong.
3) Noi dung:
- Giu copy tieng Viet co dau, bo cac nhan lap/y nghia trung.
4) Verification:
- Chay lint + test page + build, cap nhat docs va commit theo batch.
```

### Viec can lam

- [x] `src/app/teacher/activities/page.tsx`:
  - [x] doi layout sang `page-shell` + `page-surface` + `content-card`.
  - [x] bo emoji trong labels/nut (`Xem chi tiet`, `Diem danh`, `Huy hoat dong`...), thay icon Lucide.
  - [x] chuan hoa action buttons va khu stats card de responsive hon.
  - [x] giu nguyen logic activity grouping (upcoming/archived/remaining), QR shortcut, confirm dialogs.
- [x] `test/teacher-activities-page.test.tsx`:
  - [x] bo `any` o mock props de pass lint clean, khong doi assertion nghiep vu.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/teacher/activities/page.tsx" --file "test/teacher-activities-page.test.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/teacher-activities-page.test.tsx` -> PASS (1 file / 4 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.19) Batch uu tien nong tiep theo - landing contrast rescue v2 + scanner/inbox polish

### Muc tieu

- Dam bao landing page doc ro trong Windows dark mode/system dark ngay ca khi trinh duyet ho tro CSS `color-mix` khong day du.
- Lam ro thong diep loi camera tren mobile/in-app browser de giam false-negative "trinh duyet khong ho tro camera".
- Nang cap giao dien inbox thong bao va giu CTA hanh dong (diem danh/mo chi tiet) de hoc vien/giang vien thao tac nhanh.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Principal Frontend + Release Engineer. Uu tien lam 3 viec:
1) Landing contrast rescue:
- Bo phu thuoc mong manh vao color-mix o cac surface quan trong.
- Them fallback CSS khi color-mix khong duoc ho tro.
- Dam bao text/background tren landing dat tuong phan doc duoc o light/dark/system.
2) Camera mobile hardening:
- Cung co helper camera de thong diep HTTPS, webview/in-app browser, iOS Safari ro nguyen nhan va huong xu ly.
- Giu logic quet QR cua hoc vien khong doi nghiep vu.
3) Notification inbox polish:
- Chuan hoa icon/CTA thong bao, bo nhan trang tri gay nhieu.
- Giu fallback action button theo role, khong doi contract API.
Yeu cau:
- Liet ke file truoc khi sua, patch nho, chay lint/test/build/release-check lien quan.
- Cap nhat docs batch va commit ro rang.
```

### Viec can lam

- [x] `src/app/globals.css`:
  - [x] them fallback `@supports not (color: color-mix(...))` cho `page-surface`/`content-card`.
  - [x] them bo class `landing-*` co contrast on dinh cho light/dark.
- [x] `src/app/page.tsx`:
  - [x] lam moi landing shell theo class `landing-*`, bo phu thuoc style inline `color-mix`.
  - [x] dong bo copy role QR dung nghiep vu: giang vien mo QR, hoc vien quet.
- [x] `src/lib/camera-stream.ts`:
  - [x] bo sung thong diep secure-context ro host/protocol.
  - [x] bo sung nhan dien iOS + in-app browser cho thong diep hoi phuc camera.
- [x] `src/components/StudentQRScanner.tsx`:
  - [x] giu luong scan cu, bo sung khung huong dan xu ly nhanh khi loi camera.
- [x] `src/components/notifications/NotificationInbox.tsx`:
  - [x] thay icon emoji bang icon Lucide de giao dien hien dai va nhat quan.
  - [x] giu nguyen logic mark read/delete/filter/pagination/action buttons theo role.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/page.tsx" --file "src/lib/camera-stream.ts" --file "src/components/StudentQRScanner.tsx" --file "src/components/notifications/NotificationInbox.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/notification-inbox.test.tsx test/realtime-notification-bridge.test.tsx test/notification-actions.test.ts test/teacher-face-attendance-page.test.tsx` -> PASS (4 files / 21 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.20) Batch tiep theo - biometric pages camera helper alignment + regression tests

### Muc tieu

- Dong bo hai trang `biometric/auth` va `biometric/enroll` vao helper camera dung chung de tranh loi thong diep camera khong nhat quan.
- Giam `any` tren state/error handling o biometric auth page.
- Bo sung regression tests xac nhan biometric pages su dung helper camera va hien thong diep loi tu helper.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Senior Frontend Reliability Engineer. Uu tien:
1) Dong bo camera stack:
- Trang biometric/auth va biometric/enroll khong duoc goi navigator.mediaDevices truc tiep.
- Bat buoc su dung requestPreferredCameraStream + getCameraAccessErrorMessage.
2) Hardening typing:
- Bo state any con sot o match details/error path neu co.
3) Regression test:
- Them test cho biometric pages de xac nhan helper camera duoc goi dung tham so va thong diep loi helper duoc render.
Yeu cau:
- Patch nho, khong doi nghiep vu release policy (face auth/enroll van co the bi tam tat).
- Chay lint/test/build/test:backbone/release-check va cap nhat docs sau khi pass.
```

### Viec can lam

- [x] `src/app/biometric/auth/page.tsx`:
  - [x] thay `navigator.mediaDevices.getUserMedia` bang `requestPreferredCameraStream`.
  - [x] dung `getCameraAccessErrorMessage` cho camera error path.
  - [x] bo `matchDetails: any`, thay typed object + helper resolve error message.
- [x] `src/app/biometric/enroll/page.tsx`:
  - [x] thay `navigator.mediaDevices.getUserMedia` bang `requestPreferredCameraStream`.
  - [x] dong bo camera error message qua `getCameraAccessErrorMessage`.
  - [x] giu nguyen release policy (nut dang ky van disabled, khong mo rong nghiep vu).
- [x] `test/biometric-auth-page.test.tsx`:
  - [x] them test helper camera reject -> render thong diep loi helper.
- [x] `test/biometric-enroll-page.test.tsx`:
  - [x] them test effect bootstrap camera goi helper dung tham so + show helper error.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/biometric/auth/page.tsx" --file "src/app/biometric/enroll/page.tsx" --file "test/biometric-auth-page.test.tsx" --file "test/biometric-enroll-page.test.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/biometric-auth-page.test.tsx test/biometric-enroll-page.test.tsx test/teacher-face-attendance-page.test.tsx test/biometric-runtime-capability.test.ts` -> PASS (4 files / 15 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, sau khi format lai biometric pages)

## 9.21) Batch lon uu tien - navbar actor integrity + notification dedupe hardening + landing dark contrast rescue v3

### Muc tieu

- Dong bo duong dan actor tren cac diem vao nhanh, tranh lech namespace (`/notifications` vs `/student/notifications`).
- Giam triet de toast thong bao day lap noi dung khi stream/polling den sat nhau.
- Cuu contrast landing page trong dark/system mode de khong con tinh trang chu chim nen.
- Bo sung regression test de khoa chan drift trong cac lan refactor tiep theo.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Principal Frontend Reliability Engineer. Uu tien 4 viec:
1) Actor navigation integrity:
- Quet cac link nhanh cua student/teacher/admin, fix ngay cac route khong namespace dung actor.
2) Notification dedupe:
- Harden toast dedupe de khong lap thong bao cung noi dung khi event den tu SSE va polling gan nhau.
- Khong pha logic action buttons theo role.
3) Landing dark/system rescue:
- Ra soat contrast landing trong dark + system mode (Windows dark), dam bao heading/body/card doc ro.
- Khong doi nghiep vu login/redirect.
4) Regression:
- Them test bao ve route notification dung namespace actor va test dedupe cross event type.
Yeu cau:
- Patch nho, test lien quan + build + backbone + release check, cap nhat docs va commit theo batch.
```

### Viec can lam

- [x] `src/app/student/dashboard/page.tsx`:
  - [x] sua 2 link thong bao tu `/notifications` sang `/student/notifications`.
- [x] `src/components/realtime/RealtimeNotificationBridge.tsx`:
  - [x] tang dedupe window noi dung de giam lap toast.
  - [x] chuan hoa content dedupe key (bo phu thuoc `event_type`) de gom SSE/polling cung thong diep.
- [x] `src/app/page.tsx`:
  - [x] doi text color classes landing ve token classes (`landing-text-*`, `landing-link`).
  - [x] bo sung `landing-hero` surface de tang contrast khu hero.
- [x] `src/app/globals.css`:
  - [x] them token classes/hero/panel-outline/skeleton cho landing.
  - [x] bo sung dark style cho `landing-hero` + `prefers-color-scheme: dark` fallback khi chay che do system.
  - [x] bo sung forced-colors coverage cho landing surfaces.
- [x] `test/realtime-notification-bridge.test.tsx`:
  - [x] them regression test dedupe cross `attendance_qr_started` va `notification.polling`.
  - [x] bo `any` cast khi mock EventSource.
- [x] `test/student-dashboard-links.test.ts`:
  - [x] them regression test xac nhan dashboard student khong con link `/notifications` bare.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/page.tsx" --file "src/app/student/dashboard/page.tsx" --file "src/components/realtime/RealtimeNotificationBridge.tsx" --file "test/realtime-notification-bridge.test.tsx" --file "test/student-dashboard-links.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/realtime-notification-bridge.test.tsx test/student-dashboard-links.test.ts test/sidebar-teacher-links.test.tsx` -> PASS (3 files / 13 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, sau khi format lai `src/app/page.tsx`)

## 9.22) Batch tiep theo - server-side notification dedupe guard cho push route

### Muc tieu

- Chan duplicate notification ngay tai server cho luong `/api/notifications/push`, giam tinh trang cung mot thong diep bi tao nhieu lan lien tiep.
- Giu nguyen luong notification nghiep vu khac (attendance/approval/awards...) bang cach scope dedupe cho push route.
- Bo sung regression tests cho helper va route de khoa chan loi lap lai.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Senior Backend Reliability Engineer.
Muc tieu: giam thong bao push bi lap.
1) Server dedupe:
- Them dedupe window cho sendDatabaseNotification/sendBulkDatabaseNotifications.
- Scope dedupe chi ap dung khi route push bat option dedupeWithinSeconds.
2) API push:
- /api/notifications/push phai bat dedupe window mac dinh, tra them so lieu skipped.
3) Regression:
- Them unit test helper dedupe (skip duplicate trong window).
- Cap nhat test route push de assert dedupe option duoc truyen.
Yeu cau:
- Khong doi contract nghiep vu core flows.
- Chay lint + test route/helper + build + backbone.
```

### Viec can lam

- [x] `src/lib/notifications.ts`:
  - [x] them `dedupeWithinSeconds` cho `sendDatabaseNotification`.
  - [x] dedupe query theo `user_id + type + title + message + related_table + related_id` trong window.
  - [x] `sendBulkDatabaseNotifications` ghi nhan `skipped` khi gap duplicate.
- [x] `src/app/api/notifications/push/route.ts`:
  - [x] bat `PUSH_DEDUPE_WINDOW_SECONDS = 45`.
  - [x] truyen `dedupeWithinSeconds` vao `sendBulkDatabaseNotifications`.
  - [x] bo sung `delivery.skipped` trong response.
- [x] `test/notification-realtime-routes.test.ts`:
  - [x] assert route push truyen `dedupeWithinSeconds`.
  - [x] assert response co `delivery.skipped`.
  - [x] bo cac `as any` de lint clean.
- [x] `test/notification-dedupe.unit.test.ts`:
  - [x] them test `sendDatabaseNotification` skip duplicate trong dedupe window.
  - [x] them test `sendBulkDatabaseNotifications` report `created/skipped` dung.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/api/notifications/push/route.ts" --file "test/notification-realtime-routes.test.ts" --file "test/notification-dedupe.unit.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/notification-realtime-routes.test.ts test/notification-dedupe.unit.test.ts` -> PASS (2 files / 10 tests)
- [x] `npm.cmd test -- test/notification-realtime-routes.test.ts test/notification-dedupe.unit.test.ts test/realtime-notification-bridge.test.tsx` -> PASS (3 files / 17 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.23) Batch lon uu tien - attendance notification action hardening + QR projector shortcut + camera/mobile reliability + landing dark contrast v4

### Muc tieu

- Dong bo nghiep vu diem danh: giang vien mo/chien QR, hoc vien quet QR.
- Bao dam thong bao attendance luon co CTA hop role (student check-in, teacher QR/projector, admin activity).
- Giam nham lan loi camera mobile "browser khong ho tro camera" bang thong diep huong dan ro nguyen nhan.
- Tang contrast landing page cho dark/system mode de tranh text chim nen.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Principal Fullstack Reliability Engineer.
Uu tien release:
1) Attendance notification action integrity:
- Neu notification attendance den ma payload action_buttons khong du CTA dung role, bo sung fallback canonical ngay tai resolver.
- Teacher phai co 2 nut: "Mo diem danh" va "Chieu QR".
- Student phai co nut "Diem danh" vao /student/check-in.
2) Teacher activity quick actions:
- Neu activity dang co QR session active, hien them nut "Chieu QR" (projector=1) ngay tren card.
3) Camera mobile hardening:
- Nang cap camera helper thong diep loi cho insecure context, in-app browser/webview, iOS va browser khong expose Camera API.
- Khong doi contract API diem danh.
4) Landing dark/system contrast:
- Refine token-based landing styles de heading/body/card doc ro hon trong dark/system.
- Tranh hardcode inline style mau de giam drift.
Yeu cau:
- Patch nho/co gia tri release, them regression test, chay lint/test/build/test:backbone/release-check.
- Cap nhat docs batch ngay sau khi xanh.
```

### Viec can lam

- [x] `src/lib/notification-actions.ts`:
  - [x] attendance resolver bo sung canonical CTA theo role ngay ca khi payload co direct action_buttons nhung thieu CTA attendance dung muc dich.
  - [x] teacher attendance fallback co 2 nut: `/teacher/qr?activity_id=...` va `/teacher/qr?activity_id=...&projector=1`.
- [x] `src/app/teacher/activities/page.tsx`:
  - [x] them nut `Chieu QR` ben canh nut `Diem danh` khi co active QR session.
- [x] `src/lib/camera-stream.ts`:
  - [x] cap nhat camera helper cho 4 nhom loi: insecure context, embedded/in-app browser, unsupported camera API, runtime camera conflict.
  - [x] bo sung thong diep hoi phuc ro cho test mobile tren LAN/http.
- [x] `src/app/page.tsx` + `src/app/globals.css`:
  - [x] bo inline color-mix style tren landing badge.
  - [x] bo sung class token `landing-badge`, `landing-action-primary`, `landing-heading-emphasis`.
  - [x] refine landing light/dark gradients + contrast + prefers-contrast fallback.
- [x] `test/notification-actions.test.ts`:
  - [x] assert teacher attendance fallback co 2 CTA (`Mo diem danh`, `Chieu QR`).
  - [x] assert direct action attendance van duoc bo sung check-in CTA cho student neu thieu.
- [x] `test/teacher-activities-page.test.tsx`:
  - [x] them regression assert link projector `&projector=1`.
- [x] `test/camera-stream.test.ts`:
  - [x] them unit test cho permission error, embedded NotSupported, missing Camera API, insecure context.

### Verification

- [x] `npm.cmd run lint -- --file "src/lib/notification-actions.ts" --file "src/app/teacher/activities/page.tsx" --file "src/lib/camera-stream.ts" --file "src/app/page.tsx" --file "test/notification-actions.test.ts" --file "test/teacher-activities-page.test.tsx" --file "test/camera-stream.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/notification-actions.test.ts test/teacher-activities-page.test.tsx test/camera-stream.test.ts test/realtime-notification-bridge.test.tsx test/teacher-qr-page.test.tsx` -> PASS (5 files / 22 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks)

## 9.24) Batch lon uu tien tiep theo - notification CTA role integrity + landing dark contrast rescue v5 + camera troubleshooting hints

### Muc tieu

- Dam bao thong bao push/toast/inbox khong bo sot CTA diem danh canonical theo role, ke ca khi payload co custom action_buttons.
- Dong bo copy "Chieu QR toan man hinh" de giang vien co thao tac trinh chieu ro rang tu notification va quick actions.
- Cuu contrast landing dark/system bang token-level variables de tranh tinh trang chu sang tren nen sang khi doi theme.
- Tang huong dan xu ly loi camera mobile/in-app browser ngay tren man quet QR hoc vien.

### Prompt batch lon (copy de tiep tuc)

```text
Ban dong vai Principal Fullstack Reliability Engineer.
Uu tien:
1) Notification CTA role integrity:
- Inbox/toast khong duoc dung action_buttons tho truc tiep neu la attendance.
- Bat buoc di qua resolver de bo sung CTA canonical theo role (student check-in, teacher mo diem danh + chieu QR toan man hinh).
2) Landing dark/system rescue:
- Token hoa landing surfaces theo bien mau, giam hardcode light/dark theo selector rieng.
- Dam bao Windows dark/system mode van doc ro heading/body/card.
3) Camera troubleshooting:
- Bo sung helper tra ve checklist xu ly camera theo nguyen nhan (insecure context, embedded browser, permission, iOS).
- Render checklist nay trong Student QR scanner.
Yeu cau:
- Patch nho, co test hoi quy cho CTA va camera helper.
- Chay lint + test cum lien quan + build + test:backbone + release:check:full.
```

### Viec can lam

- [x] `src/components/notifications/NotificationInbox.tsx`:
  - [x] bo luong uu tien `action_buttons` tho.
  - [x] bat buoc resolve CTA qua `resolveNotificationActionButtons` de giu dung role attendance.
- [x] `src/components/realtime/RealtimeNotificationBridge.tsx`:
  - [x] dong bo toast action resolver cho ca direct payload.
  - [x] giu nut `Bo qua` va them CTA canonical attendance khi can.
- [x] `src/lib/notification-actions.ts`:
  - [x] cap nhat label projector CTA thanh `Chieu QR toan man hinh`.
- [x] `src/app/teacher/activities/page.tsx`:
  - [x] cap nhat nhan nut projector tren card hoat dong dang diem danh thanh `Chieu QR toan man hinh`.
- [x] `src/lib/camera-stream.ts`:
  - [x] them `getCameraTroubleshootingSteps(error?)` de tra checklist xu ly camera theo context.
  - [x] harden thong diep secure-context cho truong hop localhost/https van bi browser chan.
- [x] `src/components/StudentQRScanner.tsx`:
  - [x] render checklist troubleshooting dong theo helper camera.
- [x] `src/app/globals.css` + `src/app/page.tsx`:
  - [x] token hoa landing dark/light qua bien `--landing-*`, giam selector drift.
  - [x] dong bo icon/link style theo landing token de tang contrast.
- [x] Tests:
  - [x] `test/notification-inbox.test.tsx`: assert attendance custom actions van co nut `Diem danh`.
  - [x] `test/realtime-notification-bridge.test.tsx`: assert toast attendance custom actions van co CTA canonical + `Bo qua`.
  - [x] `test/notification-actions.test.ts`: assert label teacher projector CTA moi.
  - [x] `test/camera-stream.test.ts`: assert troubleshooting tips cho insecure embedded browser + denied permission.

### Verification

- [x] `npm.cmd run lint -- --file "src/components/notifications/NotificationInbox.tsx" --file "src/components/realtime/RealtimeNotificationBridge.tsx" --file "src/lib/notification-actions.ts" --file "src/lib/camera-stream.ts" --file "src/components/StudentQRScanner.tsx" --file "src/app/page.tsx" --file "src/app/teacher/activities/page.tsx" --file "test/notification-actions.test.ts" --file "test/notification-inbox.test.tsx" --file "test/realtime-notification-bridge.test.tsx" --file "test/camera-stream.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/notification-actions.test.ts test/notification-inbox.test.tsx test/realtime-notification-bridge.test.tsx test/camera-stream.test.ts test/teacher-activities-page.test.tsx` -> PASS (5 files / 25 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.25) Batch tiep theo - actor route namespace integrity hardening

### Muc tieu

- Khoa chan drift route namespace o cac trang actor (admin/student/teacher), tranh deep-link sai namespace sau cac dot refactor UI lon.
- Sua cac redirect generic va static link lech actor namespace trong teacher pages.
- Bo sung regression test route integrity cho toan bo actor de phat hien som route sai/khong ton tai.

### Viec can lam

- [x] Teacher route hotfix:
  - [x] sua redirect `router.push('/dashboard')` sang `/teacher/dashboard` tren cac trang teacher detail/report/notification.
  - [x] sua link quay lai participants page tu `/activities` thanh `/teacher/activities`.
- [x] Regression test route integrity:
  - [x] tao test quet `src/app/{admin,student,teacher}` de chan `router.push('/dashboard')` generic.
  - [x] assert moi static `href="/..."` trong actor pages dung namespace actor va tro toi route co that.
- [x] Verification:
  - [x] test route integrity luc dau phat hien loi namespace `/activities` trong teacher participants page.
  - [x] sau khi fix, test/build/backbone/release-check deu xanh.

### Verification

- [x] `npm.cmd test -- test/teacher-route-integrity.test.ts test/sidebar-teacher-links.test.tsx test/student-dashboard-links.test.ts` -> PASS (3 files / 12 tests)
- [x] `npm.cmd run lint -- --file "test/teacher-route-integrity.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.26) Batch uu tien nong - dark mode button-link contrast guard (landing + system-wide)

### Muc tieu

- Sua loi UI 2 nut dang nhap tren landing dark mode bi mau chu giong trang thai disabled (do rule global dark-mode ghi de mau link).
- Quet va chan tri de loi hien thi tuong tu tren toan he thong voi cac `Link`/`a` duoc style nhu button.
- Them regression guard de tranh tai phat khi refactor theme.

### Viec can lam

- [x] Root-cause:
  - [x] xac nhan global rule `:root[data-theme='dark'] a { color: var(--app-link); }` dang ghi de mau chu cua link-button.
  - [x] xac nhan 2 nut tren landing (`Dang nhap`, `Dang nhap he thong`) bi anh huong truc tiep.
- [x] Theme fix:
  - [x] scope lai dark-link rule chi cho anchor khong co class (`a:not([class])`, `a[class='']`).
  - [x] bo sung mau chu explicit cho `.landing-action-primary` va hover (`var(--app-action-primary-text) !important`).
- [x] Scan toan he thong:
  - [x] quet nhanh `Link/a` co class nen (`bg-*`) de danh gia nhom co nguy co bi ghi de mau.
  - [x] chot fix o global theme rule de bao toan ca nhom link da duoc style rieng.
- [x] Regression:
  - [x] them `test/theme-link-contrast-guard.test.ts` de chan rule dark-link blanket va giu explicit contrast cho landing action.
- [x] Pipeline:
  - [x] fix blocker format check (format lai `teacher/activities/[id]/attendance/history/page.tsx`) de khoi phuc `release:check:full` xanh.

### Verification

- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts test/teacher-route-integrity.test.ts` -> PASS (2 files / 8 tests)
- [x] `npm.cmd run lint -- --file "test/theme-link-contrast-guard.test.ts" --file "src/app/page.tsx"` -> PASS (0 warning)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.27) Batch uu tien nong - dark mode action button readability guard v2

### Muc tieu

- Sua dut diem loi 2 nut dang nhap tren landing dark mode (van bi nhin giong disabled o mot so moi truong).
- Quet pattern tuong tu tren toan he thong cho link/button co nen mau + `text-white`.
- Bo sung guard de khong tai phat khi refactor theme hoac bo sung rule global cho `a`.

### Viec can lam

- [x] `src/app/globals.css`:
  - [x] giu dark-link rule chi ap dung cho anchor khong class.
  - [x] them guard explicit cho `.landing-action-primary` tren day du state (`visited/hover/active/focus-visible`).
  - [x] them guard system-wide cho `a/button/[role='button']` co class `bg-*` + `text-white` trong dark mode.
- [x] Quet nhanh hien thi:
  - [x] quet `src/app`, `src/components` de xac nhan nhieu button su dung pattern `bg-* text-white` va duoc cover boi guard moi.
- [x] `test/theme-link-contrast-guard.test.ts`:
  - [x] them regression assert cho guard moi (landing states + button-like pattern).

### Verification

- [x] `npm.cmd run lint -- --file "test/theme-link-contrast-guard.test.ts" --file "src/app/page.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts` -> PASS (1 file / 3 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.28) Batch tiep noi - teacher attendance history/bulk hardening

### Muc tieu

- Chot o dinh cho 2 trang diem danh giang vien dang sua do:
  - `teacher/activities/[id]/attendance/history`
  - `teacher/activities/[id]/attendance/bulk`
- Dong bo type-safety, bo dead code, va dung hoa normalize trang thai diem danh tu payload.
- Dam bao khong rot trang thai `late/excused` khi load danh sach diem danh bulk.

### Viec can lam

- [x] `src/app/teacher/activities/[id]/attendance/bulk/page.tsx`:
  - [x] bo import/state/flow du thua (`Link`, `CheckSquare`, `Square`, `classes` + fetch classes khong dung).
  - [x] bo `any`, them `ParticipantPayload` va type-safe parse payload participants.
  - [x] them `normalizeAttendanceStatus(...)` cover du `present/attended/absent/late/excused`.
  - [x] dung helper normalize cho map danh sach va prefill attendance data.
  - [x] bo cast `as any` trong `filterStatus` handler.
- [x] `src/app/teacher/activities/[id]/attendance/history/page.tsx`:
  - [x] bo import du thua (`Link`), dung `useCallback` cho fetch.
  - [x] bo `any` trong sort/filter controls, dung guard union cho `filterStatus/sortBy/sortOrder`.
  - [x] gom go nhanh logic sort cho type `string | number`.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/teacher/activities/[id]/attendance/history/page.tsx" --file "src/app/teacher/activities/[id]/attendance/bulk/page.tsx"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/teacher-attendance-page.test.tsx test/teacher-attendance-bulk-route.test.ts test/teacher-route-integrity.test.ts` -> PASS (3 files / 10 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)

## 9.29) Batch uu tien truoc - browser camera fallback cho QR scan

### Muc tieu

- Dua vao TODO uu tien xu ly truong hop trinh duyet khong su dung duoc camera khi hoc vien quet QR.
- Khoi phuc camera access do server header dang chan `camera` toan cuc.
- Them fallback scan bang anh QR (khong can mo camera) de giam fail tren mobile/in-app browser.

### Viec can lam

- [x] `src/lib/security-headers.ts`:
  - [x] doi `Permissions-Policy` tu `camera=()` sang `camera=(self)` de camera duoc cap cho origin noi bo.
- [x] `src/lib/camera-stream.ts`:
  - [x] them detect `Permissions-Policy` block (`document.permissionsPolicy`/`featurePolicy`).
  - [x] tra message/tips rieng cho loi policy-controlled camera.
  - [x] chan som trong `requestPreferredCameraStream` neu policy dang block camera.
- [x] `src/components/StudentQRScanner.tsx`:
  - [x] them fallback `Tai anh QR` (input image/*) + decode bang `BarcodeDetector`.
  - [x] giu fallback nhap QR thu cong nhu kenh cuu sinh cuoi.
- [x] Tests:
  - [x] `test/camera-stream.test.ts`: bo sung case permissions policy block + policy-controlled error messaging.
  - [x] `test/security-headers.test.ts`: regression guard cho header `camera=(self)`.

### Verification

- [x] `npm.cmd run lint -- --file "src/components/StudentQRScanner.tsx" --file "src/lib/camera-stream.ts" --file "src/lib/security-headers.ts" --file "test/camera-stream.test.ts" --file "test/security-headers.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/camera-stream.test.ts test/security-headers.test.ts` -> PASS (2 files / 9 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.30) Batch uu tien nong - UAT login rate-limit unblock + dark button text-white guard v3

### Muc tieu

- Go blocker UAT login bi khoa sau nhieu lan test local, khong phu thuoc env startup dev server.
- Chan triet de loi chu nut bi mo/xanh trong dark mode voi pattern `text-white` tren button/link.
- Dong bo regression test cho auth-route UAT bypass va helper login UAT headers.

### Viec can lam

- [x] `src/app/api/auth/login/route.ts`:
  - [x] bo sung UAT bypass qua request headers `x-uat-e2e` / `x-playwright-test`.
  - [x] gioi han bypass chi trong non-production (`NODE_ENV !== 'production'`) de khong mo rong rui ro runtime production.
- [x] `test/uat/helpers/login.helper.ts`:
  - [x] login API request them headers UAT (`x-uat-e2e`, `x-playwright-test`) de chay on dinh khi server dev khong set env.
- [x] `test/auth-routes.test.ts`:
  - [x] them regression: bypass rate-limit khi non-production + UAT header.
  - [x] them regression: production van giu rate-limit du co UAT header.
- [x] `test/login-helper-routes.test.ts`:
  - [x] assert helper login gui headers UAT dung contract.
- [x] `src/app/globals.css`:
  - [x] nang dark guard tu `bg-* + text-white` len tat ca `a/button/[role='button']` co class `text-white`.
- [x] `test/theme-link-contrast-guard.test.ts`:
  - [x] cap nhat regression theo guard `text-white` tong quat.
- [x] UAT smoke replay:
  - [x] chay lai bo test tung bi fail do lockout: admin approval + teacher QR + student QR.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/api/auth/login/route.ts" --file "test/uat/helpers/login.helper.ts" --file "test/auth-routes.test.ts" --file "test/login-helper-routes.test.ts" --file "test/theme-link-contrast-guard.test.ts"` -> PASS (co warnings `any` legacy, khong block)
- [x] `npm.cmd test -- test/auth-routes.test.ts test/login-helper-routes.test.ts test/theme-link-contrast-guard.test.ts` -> PASS (3 files / 12 tests)
- [x] `npx.cmd playwright test test/uat/actor-admin/02-activity-approval.spec.ts test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-student/02-qr-checkin.spec.ts --reporter=dot` -> PASS (3 tests / 3.1m)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.31) Batch uu tien nong - QR decoder fallback cross-browser (BarcodeDetector -> jsQR)

### Muc tieu

- Giam phu thuoc vao `BarcodeDetector` (khong on dinh tren mot so browser mobile/in-app).
- Dam bao hoc vien van quet duoc QR tu camera va tu anh upload khi browser khong expose `BarcodeDetector`.
- Bo sung regression test cho QR decoder pipeline de chan tai phat.

### Viec can lam

- [x] `package.json` + `package-lock.json`:
  - [x] them dependency runtime `jsqr` cho fallback decode QR.
- [x] `src/lib/qr-scan-decoder.ts` (moi):
  - [x] helper tao `BarcodeDetector` neu co.
  - [x] helper load `jsQR` (cache import) va decode fallback tu `ImageData`.
  - [x] resolver `decodeQrValueFromSource(...)` uu tien detector, fallback jsQR khi detector khong co/that bai/tra rong.
- [x] `src/components/StudentQRScanner.tsx`:
  - [x] refactor scanner sang pipeline decoder moi (camera frame + image upload deu dung chung).
  - [x] giu nguyen nghiep vu diem danh, giu fallback nhap QR thu cong.
  - [x] auto-scan support tinh theo ca `BarcodeDetector` hoac `jsQR`.
- [x] `test/qr-scan-decoder.test.ts` (moi):
  - [x] assert uu tien BarcodeDetector.
  - [x] assert fallback jsQR khi detector rong/throw.
  - [x] assert null khi khong decoder nao decode duoc.

### Verification

- [x] `npm.cmd run lint -- --file "src/lib/qr-scan-decoder.ts" --file "src/components/StudentQRScanner.tsx" --file "test/qr-scan-decoder.test.ts"` -> PASS (0 warning)
- [x] `npm.cmd test -- test/qr-scan-decoder.test.ts` -> PASS (1 file / 4 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.32) Batch uu tien nong - dark button contrast hardening + teacher QR fullscreen fallback

### Muc tieu

- Sua dut diem hien thi mo/nhu disabled cua 2 nut dang nhap tren landing dark mode va chan tai phat tren he thong.
- Hoan tat luong "bấm la chieu QR toan man hinh" cho giang vien, co fallback khi trinh duyet chan auto fullscreen.
- Giu uu tien camera cross-browser da dong o 9.29-9.31 (khong lui task), tiep tuc track nhu mot gate on dinh.

### Viec can lam

- [x] `src/app/globals.css`:
  - [x] bo sung guard dark mode cho interactive `text-white` o trang thai non-disabled.
  - [x] them `-webkit-text-fill-color` + `text-shadow` cho action button de dam bao do tuong phan tren mot so browser/OS.
  - [x] khoa rieng `landing-action-primary` de khong bi mo chu o cac state (`visited/hover/active/focus`).
- [x] `src/app/teacher/qr/page.tsx`:
  - [x] bo sung helper fullscreen cross-browser (`requestFullscreen`/`webkitRequestFullscreen`, `exitFullscreen`/`webkitExitFullscreen`).
  - [x] giu overlay projector khi auto fullscreen fail, khong dong nham view.
  - [x] them CTA `Bat toan man hinh` + thong diep huong dan khi browser chan auto fullscreen.
- [x] Tests:
  - [x] `test/theme-link-contrast-guard.test.ts` cap nhat regression theo guard moi.
  - [x] `test/teacher-qr-page.test.tsx` them case fullscreen bi chan van hien projector + CTA thu cong.

### Verification

- [x] `npm.cmd run lint -- --file "src/app/teacher/qr/page.tsx" --file "test/teacher-qr-page.test.tsx" --file "test/theme-link-contrast-guard.test.ts"` -> PASS
- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts test/teacher-qr-page.test.tsx` -> PASS (2 files / 7 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.33) Batch uu tien nong - dedupe push notification xuyen reconnect/mount

### Muc tieu

- Sua loi cung 1 thong bao day co the lap lai nhieu lan khi SSE reconnect hoac user doi trang (component remount).
- Giu logic dedupe hien tai trong phien runtime, bo sung dedupe persist theo user de khong toast lai notification/event da hien.
- Bao toan contract action button notification va khong anh huong flow Attendance -> Notification.

### Viec can lam

- [x] `src/components/realtime/RealtimeNotificationBridge.tsx`:
  - [x] persist `last_event_id` theo user trong `sessionStorage` va tai lai khi connect stream.
  - [x] persist dedupe key toast (`notification:<id>` / `event:<id>`) theo user, co TTL 6h va prune.
  - [x] tiep tuc dedupe content window 45s nhu cu, ket hop dedupe persist de chan replay backlog.
- [x] `test/realtime-notification-bridge.test.tsx`:
  - [x] them regression assert stream reconnect dung cursor tu `sessionStorage`.
  - [x] them regression assert khong toast lai notification da duoc ghi nhan trong dedupe store.

### Verification

- [x] `npm.cmd run lint -- --file "src/components/realtime/RealtimeNotificationBridge.tsx" --file "test/realtime-notification-bridge.test.tsx"` -> PASS
- [x] `npm.cmd test -- test/realtime-notification-bridge.test.tsx` -> PASS (1 file / 10 tests)
- [x] `npm.cmd test -- test/notification-inbox.test.tsx test/notification-actions.test.ts test/realtime-notification-bridge.test.tsx` -> PASS (3 files / 17 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.34) Batch uu tien nong - UAT awards/notification stability hardening

### Muc tieu

- Sua flaky test UAT hoc vien nhan khen thuong/thong bao (`Request context disposed` khi request API sat timeout 30s).
- Tang do on dinh actor smoke teacher QR + student awards-notifications de khong fail ngau nhien tren moi truong dev.
- Giu nguyen contract nghiep vu, chi harden test strategy (timeout/polling) va bo sung verify release.

### Viec can lam

- [x] `test/uat/actor-student/04-awards-notifications.spec.ts`:
  - [x] bo sung helper poll API co timeout/request-timeout ro rang de cho eventual consistency.
  - [x] them timeout test 120s cho flow UAT awards/notification.
  - [x] doi cac check thong bao/awards/history sang `waitForApiMatch(...)` de tranh fail race/disposed context.
  - [x] them timeout cho cac API call core (`auth/me`, `award-types`, `awards/create`) de fail nhanh neu co su co.
- [x] Verification:
  - [x] re-run cum UAT tung fail: teacher QR + student awards-notifications.
  - [x] chay lai build/backbone/full release checks de khoa xanh gate.

### Verification

- [x] `npm.cmd run lint -- --file "test/uat/actor-student/04-awards-notifications.spec.ts"` -> PASS (co warnings `any` legacy, khong block)
- [x] `npx.cmd playwright test test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-student/04-awards-notifications.spec.ts --reporter=dot` -> PASS (2 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.35) Batch uu tien nong - system dark mode button-link contrast guard

### Muc tieu

- Fix triet de truong hop Windows/system dark mode (prefers-color-scheme) lam mo chu tren `Link` style nhu button khi `data-theme` chua kip gan (FOUC/hydration gap).
- Quet va bao ve nhom `a/button/[role='button']` co `text-white` de khong bi nham thanh "disabled" o dark mode.
- Giup landing va cac CTA quan trong luon doc duoc, khong phu thuoc vao state theme preference.

### Viec can lam

- [x] `src/app/globals.css`:
  - [x] bo sung guard tuong duong cho `@media (prefers-color-scheme: dark)` + `:root:not([data-theme='light'])` (landing-action-primary + pattern `text-white`).
- [x] `test/theme-link-contrast-guard.test.ts`:
  - [x] them regression assert cho prefer-color-scheme dark guard.

### Verification

- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts` -> PASS (1 file / 4 tests)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)

## 9.36) Batch uu tien nong - admin activities attendance shortcut + attendance UI vi

### Muc tieu

- Trong trang quan ly hoat dong (admin), neu hoat dong dang co phien QR active thi hien nut vao diem danh ngay.
- Trang admin quan ly diem danh co the deep-link theo `activityId` va dong bo ngon ngu Viet de de thao tac nhanh.

### Viec can lam

- [x] `src/app/admin/activities/page.tsx`:
  - [x] fetch tom tat phien QR active cho mot nhom hoat dong published/approved (cap 30 theo do gan hien tai) va pass xuong table.
- [x] `src/app/admin/activities/ActivityTable.tsx`:
  - [x] neu co session active thi them CTA `Diem danh` dan den `/admin/attendance?activityId=<id>`.
- [x] `src/app/admin/attendance/page.tsx`:
  - [x] ho tro filter theo `activityId` query param.
  - [x] Viet hoa/ngon ngu UI Viet (header/stats/table/actions) + mapping trang thai (Co mat/Vang/Muon).
- [x] `test/admin-activities-page.test.tsx`:
  - [x] mock them `/api/qr-sessions/active` va them regression assert CTA `Diem danh` xuat hien khi session active.
  - [x] harden expectation so lan fetch `/api/admin/activities` (khong dem fetch active sessions).

### Verification

- [x] `npm.cmd test -- test/admin-activities-page.test.tsx` -> PASS (1 file / 5 tests)
- [x] `npm.cmd run build` -> PASS
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests)
- [x] `npm.cmd run release:check:full` -> PASS (4/4 checks, lint warnings legacy scope khong block)
- [x] `npx.cmd playwright test test/uat/actor-admin/02-activity-approval.spec.ts test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-student/02-qr-checkin.spec.ts --reporter=dot` -> PASS (3 tests)

## 9.37) Batch uu tien nong - landing CTA contrast + gray disabled mapping (dark/system)

### Muc tieu

- Fix truong hop 2 nut CTA "Dang nhap" tren landing bi mo/nham mau trong dark/system dark (dac biet tren Windows) do xung dot `-webkit-text-fill-color`/specificity.
- Quet nhanh va bo sung mapping dark mode cho nhom `bg-gray-300/400/500` + `hover:bg-gray-*` + `disabled:bg-gray-*` de tranh chu bi chim (xuat hien nhieu trong nut secondary/disabled).

### Viec can lam

- [x] `src/app/globals.css`:
  - [x] harden `landing-action-primary` text fill (add `!important` + pin `opacity: 1`).
  - [x] mo rong mapping dark cho `bg-gray-300/400/500`, `hover:bg-gray-300/400/500`, `disabled:bg-gray-100/200/300/400/500`.

### Verification

- [x] `npm.cmd run build` -> PASS (2026-04-23)
- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts` -> PASS (1 file / 4 tests, 2026-04-23)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-23)

### P0 Todo tiep theo (uu tien truoc cac batch UI lon)

- [x] Camera/QR cross-browser re-verify tren dien thoai:
  - [x] Neu trinh duyet/OS khong cap quyen camera hoac khong ho tro, phai hien thong diep ro rang + huong dan (cap quyen, doi trinh duyet) va fallback (upload anh QR / nhap ma / quet bang app khac mo link).

## 9.38) Batch uu tien nong - sidebar clarity (QR vs scan, notify labels)

### Muc tieu

- Lam ro vai tro QR:
  - Giang vien: mo/tao QR diem danh.
  - Hoc vien: quet QR diem danh.
- Tranh nham lan giua 2 flow gui thong bao cua giang vien (chon hoc vien vs theo lop/khoi).

### Viec can lam

- [x] `src/components/Sidebar.tsx`:
  - [x] doi label `Diem danh QR` -> `Mo QR diem danh` (teacher).
  - [x] doi label `Gui thong bao`/`Broadcast thong bao` -> `Gui theo hoc vien`/`Gui theo lop/khoi`.

### Verification

- [x] `npm.cmd test -- test/sidebar-teacher-links.test.tsx` -> PASS (1 file / 5 tests, 2026-04-23)

## 9.39) Batch uu tien nong - camera mobile autoplay/gesture fallback (student QR)

### Muc tieu

- Fix truong hop tren dien thoai (dac biet iOS/Safari hoac embedded WebView) chặn `video.play()` tu dong -> camera den/man hinh den du da cap quyen.
- Sua message Permissions-Policy bi loi ma hoa trong `camera-stream` (hien thong diep ro rang neu bi chan boi policy).

### Viec can lam

- [x] `src/lib/camera-stream.ts`: sua `getPermissionsPolicyCameraHint()` ve tieng Viet dung.
- [x] `src/components/StudentQRScanner.tsx`:
  - [x] neu `video.play()` bi block, hien overlay + nut `Bat camera` de nguoi dung tap 1 lan.
  - [x] giu nguyen fallback: tai anh QR / nhap thu cong.
- [x] `test/student-qr-scanner-playback-gesture.test.tsx`: them regression cho overlay `Bat camera`.

### Verification

- [x] `npm.cmd test -- test/student-qr-scanner-playback-gesture.test.tsx` -> PASS (1 file / 1 test, 2026-04-23)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-23)

## 9.40) Batch uu tien nong - notification CTA + dedupe attendance/QR pushes

### Muc tieu

- Tranh nham lan: thong bao "Diem danh thanh cong" khong duoc goi y nut "Diem danh" nua.
- Giam tinh trang thong bao day lap (QR started / attendance success) khi request retry / reconnect.

### Viec can lam

- [x] `src/lib/notification-actions.ts`: bo `success` khoi nhom attendance-CTA.
- [x] Add `dedupeWithinSeconds: 45` cho:
  - [x] `src/app/api/qr-sessions/route.ts` (attendance_qr_started).
  - [x] `src/app/api/attendance/validate/route.ts` (QR success -> type `success`).
  - [x] `src/app/api/attendance/manual/route.ts` (manual success).
  - [x] `src/app/api/attendance/face/route.ts` (face success).
- [x] `test/notification-actions.test.ts`: them regression `success` khong tao check-in CTA.

### Verification

- [x] `npm.cmd test -- test/notification-actions.test.ts` -> PASS (1 file / 5 tests, 2026-04-23)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-23)

## 9.41) Batch uu tien nong - QR deep link check-in (khong can camera web) + harden doc QR tu anh + login redirect

### Muc tieu

- Giam phu thuoc camera `getUserMedia` khi test tren LAN `http://10.x` (insecure context) hoac trinh duyet khong cap quyen camera:
  - Giang vien chi QR theo dang DUONG LINK `/student/check-in?s=...&t=...` de hoc vien co the quet bang app camera bat ky, mo link va diem danh.
  - Trang hoc vien tu dong diem danh khi mo dung link (sau khi dang nhap).
- Tang do ben doc QR tu anh (jsQR inversion attempts), giam false-negative "Khong doc duoc ma QR tu anh".
- Login ton trong `?next=` de bao toan deep-link flow.

### Viec can lam

- [x] `src/app/teacher/qr/page.tsx`:
  - [x] QR payload = link `/student/check-in?s=<sessionId>&t=<token>` (thay cho JSON thuan).
  - [x] Them dem nguoc het han cho phien QR (mm:ss) + phong to QR projector ~95% vmin.
- [x] `src/app/student/check-in/page.tsx`:
  - [x] Parse duoc URL QR + tu dong goi `/api/attendance/validate` neu co `s/t` tren query.
- [x] `src/app/login/page.tsx`:
  - [x] Neu co `next`, redirect ve `next` sau khi dang nhap (chi chap nhan path bat dau bang `/`).
- [x] `src/lib/qr-scan-decoder.ts`:
  - [x] jsQR fallback inversion `attemptBoth` neu `dontInvert` fail.

### Verification

- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.42) Batch uu tien nong - timezone VN backbone hotfix

### Muc tieu

- Chuan hoa mui gio Viet Nam (`Asia/Ho_Chi_Minh`) cho luong nong: create/edit activity, QR expiry/history, thong bao, attendance display.
- Chan bug lech gio do:
  - `new Date(...).toISOString().slice(0, 16)` khi load vao `datetime-local`
  - `new Date(...).toLocaleString('vi-VN')` rải rác khong co timezone source of truth
  - chuoi datetime khong timezone bi dien giai theo locale may khach.

### Viec can lam

- [x] Tao helper timezone dung chung:
  - [x] `src/lib/timezone.ts`
  - [x] `src/lib/formatters.ts` chuyen sang formatter theo VN timezone.
- [x] Hotfix luong nong:
  - [x] `src/components/ActivityDialog.tsx` load `datetime-local` theo gio Viet Nam, khong dung `toISOString().slice(0,16)`.
  - [x] `src/app/admin/activities/[id]/edit/page.tsx` load/sosanh `datetime-local` theo gio Viet Nam.
  - [x] `src/app/teacher/qr/page.tsx` hien thi lich su/scan time qua formatter chung.
  - [x] `src/lib/notifications.ts` thong bao dang ky dung formatter chung.
- [ ] Audit mo rong toan he thong cac diem `new Date(...).toLocaleString('vi-VN')` con lai.

### Verification

- [x] `npm.cmd test -- test/formatters-timezone.test.ts` -> PASS (1 file / 3 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.43) Batch uu tien nong - attendance operator guides + scope clarification

### Muc tieu

- Co tai lieu A-Z cho QR attendance va face attendance.
- Tra loi ro rang cho van hanh:
  - co ho tro multi-face attendance khong
  - sau moi luot diem danh co roster chua diem danh ngay khong
  - fallback nao dung duoc khi camera web bi chan.

### Viec can lam

- [x] Them docs:
  - [x] `docs/attendance-operator-guides.md`
  - [x] `docs/attendance-timezone-face-closeout-prompt.md`
- [x] Chot ro hien trang:
  - [x] QR deep link fallback la kenh uu tien khi camera web bi chan.
  - [x] Face attendance hien tai la pilot/QA flow, chua ho tro nhieu khuon mat cung luc.
  - [x] Face page hien tai chua hien roster realtime `chua diem danh` ngay tren cung man hinh.

### Verification

- [x] Review tai lieu + doi chieu code hien tai (2026-04-24)

## 9.44) Batch uu tien nong - roster chua diem danh theo lop sau QR/Face

### Muc tieu

- Sau moi luot QR/Face success, giang vien thay ngay danh sach hoc vien chua diem danh, co `class_name` de doc ten va tim nguoi.

### Viec can lam

- [x] Tai dung `GET /api/activities/[id]/participants` de loc `attendance_status = registered`.
- [x] Hien tong so chua diem danh + nhom theo lop + ten hoc vien + ma hoc vien.
- [x] Trigger refresh sau QR scan thanh cong va face attendance thanh cong.
- [x] Tach component roster dung chung cho QR/Face:
  - [x] `src/components/attendance/PendingAttendanceRoster.tsx`
  - [x] `src/app/teacher/qr/page.tsx`
  - [x] `src/app/teacher/attendance/face/page.tsx`
  - [x] `test/teacher-qr-page.test.tsx`
  - [x] `test/teacher-face-attendance-page.test.tsx`

### Risk / defer

- [x] Luong face hien tai van la pilot/QA page; tam gan roster truc tiep len page hien tai de dong nhu cau release, defer viec hop nhat thanh teacher attendance workspace sau backbone.

### Verification

- [x] `npm.cmd test -- test/teacher-qr-page.test.tsx test/teacher-face-attendance-page.test.tsx` -> PASS (2 files / 14 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.45) Batch uu tien nong - persist explicit student scope khi tao hoat dong

### Muc tieu

- Sua loi tao hoat dong co `mandatory_student_ids` / `voluntary_student_ids` nhung API create khong truyen scope xuong DB helper, lam mat hoc vien chi dinh ngay tu luc tao.

### Viec can lam

- [x] `src/app/api/activities/route.ts`:
  - [x] POST create phai truyen day du `mandatory_student_ids`, `voluntary_student_ids`, `applies_to_all_students` vao `dbHelpers.createActivity(...)`.
- [x] `test/activities-create-route.test.ts`:
  - [x] them regression assert explicit student scopes duoc persist khi tao activity.

### Verification

- [x] `npm.cmd test -- test/activities-create-route.test.ts` -> PASS (1 file / 1 test, 2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.46) Batch uu tien nong - tao hoat dong: scope lop/hoc vien linh hoat hon

### Muc tieu

- Giam phu thuoc vao multi-select kieu desktop khi giao vien chon hoc vien truc tiep.
- Cho phep de trong toan bo scope va he thong tu hieu la mo cho tat ca hoc vien.
- Them thao tac nhanh de chon hoc vien theo bo loc va theo nhom lop da chon.

### Source tham khao

- [x] `docs/activity-scope-selection-batch-prompt.md`
- [x] `docs/teacher-activity-scope-and-ux-next-batches.md`
- [x] `docs/teacher-activity-form-followup-tasks.md`
- [x] `docs/activity-business-reanalysis-and-actor-crud-impact-matrix.md`

### Viec can lam

- [x] `src/app/teacher/activities/new/page.tsx`:
  - [x] bo validation chan submit khi khong chon lop/hoc vien; map thanh `applies_to_all_students = true`.
  - [x] giu checkbox clear nhanh "mo cho tat ca hoc vien".
  - [x] bo sung thao tac nhanh cho hoc vien truc tiep:
    - [x] chon tat ca hoc vien dang loc vao nhom bat buoc / duoc dang ky.
    - [x] lay hoc vien tu nhom lop bat buoc / lop duoc dang ky.
    - [x] xoa nhanh tung nhom hoc vien truc tiep.
- [x] `test/teacher-create-activity-page.test.tsx`:
  - [x] them regression cho empty scope -> open for all.
  - [x] them regression cho bulk-pick hoc vien truc tiep vao nhom bat buoc.

### Decision gate / defer

- [ ] Mo rong quyen de teacher thay tat ca lop/tat ca hoc vien hay chi tap du lieu backend hien cho phep.
  - Khuyen nghi hien tai: giu nguyen backend scope, chi cai tien UX create form trong batch nay.

### Verification

- [x] `npm.cmd test -- test/teacher-create-activity-page.test.tsx test/teacher-create-activity-preview.test.tsx` -> PASS (2 files / 4 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.47) Batch uu tien nong - timezone VN audit hot surfaces (teacher/student/inbox)

### Muc tieu

- Giam cac diem user-facing con parse/format ngay gio theo mui gio may khach.
- Chuan hoa cac so sanh va hien thi thoi gian tren surface backbone teacher/student/notification ve helper `Asia/Ho_Chi_Minh`.

### Viec can lam

- [x] `src/lib/timezone.ts`:
  - [x] export helper parse/format co timezone Vietnam de tai su dung cho logic va UI.
- [x] `src/shared/utils/index.ts`:
  - [x] bo `new Date(...).toLocale*('vi-VN')` truc tiep, chuyen qua helper dung chung.
- [x] Audit hot surfaces:
  - [x] `src/app/activities/[id]/page.tsx`
  - [x] `src/components/notifications/NotificationInbox.tsx`
  - [x] `src/components/activity/StudentActivityCard.tsx`
  - [x] `src/app/teacher/activities/page.tsx`
  - [x] `src/app/teacher/activities/[id]/page.tsx`
  - [x] `src/app/teacher/activities/[id]/participants/page.tsx`
  - [x] `src/app/teacher/activities/[id]/attendance/history/page.tsx`
  - [x] `src/app/student/my-activities/page.tsx`
  - [x] `src/app/student/history/page.tsx`
  - [x] `src/app/student/activities/[id]/page.tsx`
- [x] `test/formatters-timezone.test.ts`:
  - [x] bo sung regression cho parse naive datetime + formatter option helper.

### Risk / defer

- [ ] Van con nhieu diem `toLocaleString('vi-VN')` ngoai hot surfaces backbone; tiep tuc audit theo cum admin/report/export o batch sau.

### Verification

- [x] `npm.cmd test -- test/formatters-timezone.test.ts test/notification-inbox.test.tsx test/student-activity-detail-page.test.tsx test/student-my-activities-page.test.tsx test/student-history-page.test.tsx test/teacher-activities-page.test.tsx` -> PASS (6 files / 19 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.48) Batch uu tien nong - timezone VN admin/report/export cluster

### Muc tieu

- Chuan hoa tiep ngay gio user-facing va export/report o cum admin + alert/export routes.
- Loai bo tiep cac diem le thuoc vao timezone may khach trong CSV, lich su phat thong bao va trang admin hoat dong.

### Viec can lam

- [x] API/export routes:
  - [x] `src/app/api/export/activity-participation/route.ts`
  - [x] `src/app/api/classes/[id]/export/route.ts`
  - [x] `src/app/api/teacher/notifications/history/export/route.ts`
  - [x] `src/app/api/admin/reports/activity-statistics/route.ts`
  - [x] `src/app/api/student/alerts/route.ts`
- [x] Admin surfaces:
  - [x] `src/app/admin/activities/[id]/page.tsx`
  - [x] `src/app/admin/activities/pending/page.tsx`
  - [x] `src/app/admin/reports/activity-statistics/page.tsx`
  - [x] `src/app/admin/approvals/ApprovalList.tsx`
- [x] Dong bo ten file export theo ngay Viet Nam cho cac luong vua sua.

### Risk / defer

- [ ] Van con nhieu diem `toLocaleString('vi-VN')` o cac module admin/teacher/student ngoai cum release nay; tiep tuc audit theo trang ho so, ghi chu, thong bao, diem va backup o batch sau.

### Verification

- [x] `npm.cmd test -- test/export.test.ts test/teacher-notification-history-export-route.test.ts test/admin-report-routes.test.ts test/alerts.test.ts test/admin-activity-statistics-page.test.tsx` -> PASS (5 files / 22 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.49) Batch uu tien nong - timezone VN student score/award/device + teacher dashboard/attendance

### Muc tieu

- Don tiep cac surface hoc vien/giang vien su dung thuong xuyen van hien ngay gio theo timezone may khach.
- Dong bo CSV ten file va cac timestamp user-facing trong score/award/device/alert/dashboard/attendance ve helper Vietnam timezone.

### Viec can lam

- [x] Student surfaces:
  - [x] `src/app/student/scores/page.tsx`
  - [x] `src/app/student/points/page.tsx`
  - [x] `src/app/student/awards/page.tsx`
  - [x] `src/app/student/devices/page.tsx`
  - [x] `src/app/student/alerts/page.tsx`
- [x] Teacher surfaces:
  - [x] `src/app/teacher/dashboard/page.tsx`
  - [x] `src/app/teacher/attendance/page.tsx`
- [x] Dong bo filename export bang diem theo ngay Viet Nam.

### Risk / defer

- [ ] Con cum `teacher students/notes`, `polls/notifications`, `admin backup/system-health`, `search/audit/users/students` chua duoc audit timezone.

### Verification

- [x] `npm.cmd test -- test/student-scores-page.test.tsx test/student-points-page.test.tsx test/teacher-attendance-page.test.tsx` -> PASS (3 files / 5 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.50) Batch uu tien nong - timezone VN teacher student-profile/notes + admin backup/system-health

### Muc tieu

- Don tiep cac surface giao vien/admin van hien thi ngay gio theo timezone may khach o ho so hoc vien, ghi chu va trang van hanh he thong.
- Chuyen cac bo loc "hom nay/7 ngay" o trang ghi chu giao vien sang moc Vietnam timezone de tranh lech ngay quanh moc 00:00.
- Sua nhe mot loi UI co san trong timeline ho so hoc vien: className icon dang bi render nhu chuoi thuong thay vi noi suy.

### Viec can lam

- [x] Teacher student profile/notes:
  - [x] `src/app/teacher/students/[id]/page.tsx`
  - [x] `src/app/teacher/students/[id]/notes/page.tsx`
  - [x] `src/app/teacher/students/notes/page.tsx`
- [x] Admin system surfaces:
  - [x] `src/app/admin/backup/page.tsx`
  - [x] `src/app/admin/system-health/page.tsx`
- [x] Dong bo format ngay gio ve helper `src/lib/timezone.ts` cho cac diem vua audit.

### Risk / defer

- [ ] Con cum `admin search/audit/users/students`, `polls`, `bonus/awards`, `classes export filenames` va mot so surface phu van chua audit het timezone VN.
- [ ] Van con text mojibake/cu phap cu o vai trang teacher/admin; batch nay chi sua formatter va mot bug className o timeline, chua dot pha sua toan bo text/UI.

### Verification

- [x] `npm.cmd test -- test/teacher-student-profile-page.test.tsx test/admin-system-health-page.test.tsx` -> PASS (2 files / 2 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.51) Batch uu tien nong - timezone VN admin search/audit/users/students cluster

### Muc tieu

- Don tiep cum admin con lai van hien ngay gio theo timezone may khach trong search, audit logs, users va students.
- Dong bo filename export audit/users theo ngay Viet Nam.
- Giu batch an toan: khong doi logic CRUD, chi sua formatter va recovery 5 file bi hu trong luc thay the co hoc roi patch lai dung helper.

### Viec can lam

- [x] Search / audit:
  - [x] `src/app/admin/search/page.tsx`
  - [x] `src/app/admin/audit/page.tsx`
  - [x] `src/app/admin/audit-logs/AuditTable.tsx`
  - [x] `src/app/admin/audit-logs/DetailModal.tsx`
- [x] Users / students:
  - [x] `src/app/admin/users/page.tsx`
  - [x] `src/app/admin/users/UserTable.tsx`
  - [x] `src/app/admin/users/[id]/activities/page.tsx`
  - [x] `src/app/admin/students/StudentTable.tsx`
  - [x] `src/app/admin/students/[id]/page.tsx`
- [x] Recovery an toan 5 file bi token corruption trong luc thay the co hoc, sau do re-apply patch bang cach thu cong.

### Risk / defer

- [ ] Con cum `admin awards/bonus`, `classes`, `polls`, `search savedAt/localStorage` va mot so export filename ngoai backbone chua audit het timezone VN.
- [ ] Van con mot so trang cu co mojibake/noi dung chua duoc chuan hoa text; batch nay uu tien on dinh formatter va build xanh.

### Verification

- [x] `npm.cmd test -- test/audit.test.ts test/admin-users-route.test.ts` -> PASS (2 files / 5 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.52) Batch uu tien nong - timezone VN admin awards/bonus/classes + poll surfaces

### Muc tieu

- Dong bo timezone VN cho cum con lai: khen thuong, duyet cong diem, classes export va poll pages (teacher/student).
- Dong bo ten file export CSV theo ngay Viet Nam cho bonus/classes/polls.
- Hardening bo loc thoi gian poll responses de so sanh theo moc parse Vietnam timezone thay vi local timezone may khach.

### Viec can lam

- [x] Admin awards/bonus:
  - [x] `src/app/admin/awards/page.tsx`
  - [x] `src/app/admin/bonus-approval/page.tsx`
- [x] Admin classes:
  - [x] `src/app/admin/classes/page.tsx`
  - [x] `src/app/admin/classes/ClassTable.tsx`
  - [x] `src/app/admin/classes/ClassViewDialog.tsx`
  - [x] `src/app/admin/classes/[id]/page.tsx`
  - [x] `src/app/admin/classes/[id]/students/page.tsx`
- [x] Poll surfaces:
  - [x] `src/app/teacher/polls/page.tsx`
  - [x] `src/app/student/polls/page.tsx`
  - [x] `src/app/teacher/polls/[id]/page.tsx`
  - [x] `src/app/teacher/polls/responses/page.tsx`

### Risk / defer

- [ ] Con cum timezone chua audit het o `admin leaderboard/scoreboard/scores/export/custom/time-slots` va mot so export filename phu.
- [ ] Trang `bonus-reports` con dung `new Date().getFullYear()` cho filter nam; can quyet dinh neu muon neo theo nam hoc hoac nam lich VN timezone.

### Verification

- [x] `npm.cmd test -- test/admin-classes-route.test.ts test/admin-pending-activities-route.test.ts` -> PASS (2 files / 4 tests, 2026-04-24)
- [x] `npm.cmd test -- test/admin-class-detail-route.test.ts test/admin-classes-route.test.ts test/award-and-alert-notifications.test.ts` -> PASS (3 files / 7 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.53) Batch uu tien nong - timezone VN admin scoreboard/leaderboard/scores/reports/time-slots

### Muc tieu

- Dong bo cac diem con sot o cum admin van su dung UTC `toISOString().split('T')[0]` cho ten file export.
- Chuyen hiển thị moc `calculated_at` o admin scores sang helper timezone VN.
- Chuan hoa convert ngay hoat dong -> `input[type="date"]` o time-slots theo timezone VN de tranh lech ngay.

### Viec can lam

- [x] Scoreboard / leaderboard:
  - [x] `src/app/admin/scoreboard/page.tsx`
  - [x] `src/app/admin/leaderboard/page.tsx`
- [x] Scores / export:
  - [x] `src/app/admin/scores/page.tsx`
  - [x] `src/app/admin/scores/export/page.tsx`
- [x] Custom reports + time slots:
  - [x] `src/app/admin/reports/custom/page.tsx`
  - [x] `src/app/admin/time-slots/page.tsx`
- [x] Dong bo filename export ve `toVietnamDatetimeLocalValue(new Date()).slice(0, 10)` cho toan bo file vua sua.

### Risk / defer

- [ ] Van con `new Date()/toLocale...` ngoai cum backbone o cac trang khac (khong nam trong gate release nong) chua audit het.
- [ ] Build pass nhung chua bo sung test UI component-level cho `time-slots` date binding; hien tai duoc bao phu gian tiep boi `build` va route tests.

### Verification

- [x] `npm.cmd test -- test/admin-scores-route.test.ts test/admin-reports-scores-route.test.ts test/admin-rankings-route.test.ts test/admin-leaderboard-route.test.ts` -> PASS (4 files / 8 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.54) Batch uu tien nong - camera fallback QR + dark CTA contrast guard

### Muc tieu

- Giam loi "khong dung duoc camera" tren HTTP LAN bang fallback thao tac ro rang de hoc vien van diem danh duoc.
- Tang ty le decode QR tu anh upload (khi camera bi chan/khong ho tro) bang aggressive decode passes.
- Khoa lai contrast CTA landing dark mode de tranh trang thai chu mo/xam tren nen xanh.

### Viec can lam

- [x] QR decoder hardening:
  - [x] `src/lib/qr-scan-decoder.ts`:
    - Them option `aggressive` cho decode pass.
    - Bo sung pass high-contrast + upscale cho anh kho decode.
- [x] Student scanner UX/fallback:
  - [x] `src/components/StudentQRScanner.tsx`:
    - Ho tro decode anh ca khi trinh duyet khong co `createImageBitmap`.
    - Bat `aggressive` mode cho upload anh QR.
    - Bo sung canh bao insecure-context + huong dan deep-link `/student/check-in?s=...&t=...`.
    - Cap nhat label/placeholder nhap thu cong: chap nhan ca raw payload va full link.
- [x] Camera troubleshooting guidance:
  - [x] `src/lib/camera-stream.ts`: them tip fallback deep-link trong insecure context.
- [x] Landing dark CTA contrast:
  - [x] `src/app/globals.css`: harden `.landing-action-primary` cho visited/active/focus-visible + border contrast.
- [x] Test cap nhat:
  - [x] `test/qr-scan-decoder.test.ts`
  - [x] `test/camera-stream.test.ts`

### Risk / defer

- [ ] Gioi han trinh duyet: camera tren origin HTTP (khong phai localhost) van bi browser chan theo secure-context policy; batch nay bo sung fallback de van diem danh duoc, khong the bypass policy.
- [ ] Chua bo sung e2e test upload anh QR that trong browser that; hien tai moi co unit/integration decoder + scanner playback fallback.

### Verification

- [x] `npm.cmd test -- test/camera-stream.test.ts test/qr-scan-decoder.test.ts test/student-qr-scanner-playback-gesture.test.tsx` -> PASS (3 files / 14 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.55) Batch uu tien nong - timezone VN teacher/student attendance + notifications surfaces

### Muc tieu

- Dong bo timezone VN cho cum giang vien/hoc vien gan diem danh va thong bao (nhom user-facing cao tan suat).
- Chuan hoa ten file export CSV/XLSX theo ngay Viet Nam.
- Chuan hoa bo loc ngay schedule thong bao tranh lech ngay theo UTC tren may client.

### Viec can lam

- [x] Student history:
  - [x] `src/app/student/history/page.tsx`
- [x] Teacher classes + attendance surfaces:
  - [x] `src/app/teacher/classes/page.tsx`
  - [x] `src/app/teacher/attendance/[id]/page.tsx`
  - [x] `src/app/teacher/attendance/[id]/manual/page.tsx`
  - [x] `src/app/teacher/activities/[id]/qr-sessions/page.tsx`
  - [x] `src/app/teacher/activities/[id]/attendance/bulk/page.tsx`
- [x] Teacher notifications surfaces:
  - [x] `src/app/teacher/notify-students/page.tsx`
  - [x] `src/app/teacher/notifications/history/page.tsx`
  - [x] `src/app/teacher/notifications/broadcast/page.tsx`
  - [x] `src/app/teacher/notifications/settings/page.tsx`
- [x] Chuyen cac diem `toLocaleDateString/toLocaleString('vi-VN')` va `toISOString().split('T')[0]` trong cum tren sang helper `formatVietnamDateTime` / `toVietnamDatetimeLocalValue`.

### Risk / defer

- [ ] Van con nhieu diem timezone chua audit het o cac module ngoai cum nong nay (templates, mot so API export/phu tro, page cu).
- [ ] `teacher/attendance/[id]/manual/page.tsx` va mot so trang legacy con text mojibake; batch nay uu tien dung formatter timezone, chua lam sach toan bo text.

### Verification

- [x] `npm.cmd test -- test/student-history-page.test.tsx test/teacher-notify-students-page.test.tsx test/teacher-notification-settings-page.test.tsx test/teacher-notification-history-page.test.tsx test/teacher-notification-broadcast-page.test.tsx test/teacher-attendance-page.test.tsx test/teacher-face-attendance-page.test.tsx` -> PASS (7 files / 19 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.56) Batch uu tien nong - dark mode button contrast guard + timezone VN residual surfaces

### Muc tieu

- Sua loi UI 2 nut `Dang nhap` tren landing bi mo/nhat mau o dark mode va chot guard tong quat cho nhom nut primary xanh co `text-white`.
- Quet va fix tiep cum timezone VN con dang do theo may client trong teacher/student surfaces dang trong vong su dung nong.

### Viec can lam

- [x] Dark mode contrast guard:
  - [x] `src/app/globals.css`
    - Tang selector uu tien cho `.landing-action-primary` (them `:link`, giu `:visited/:hover/:active/:focus-visible`) va khoa `opacity: 1 !important`.
    - Them guard cho nhom `a/button/[role='button']` co class `bg-blue-*` + `text-white` de chu nut khong bi chim trong dark mode.
    - Mirror day du cho ca 2 che do: `data-theme='dark'` va `prefers-color-scheme: dark` khi user de `system`.
  - [x] `test/theme-link-contrast-guard.test.ts`
    - Cap nhat assertion theo selector guard moi (`:link` + `bg-blue-* text-white`).
- [x] Timezone VN residual teacher/student:
  - [x] `src/app/teacher/approvals/page.tsx`
  - [x] `src/app/teacher/awards/suggestions/page.tsx`
  - [x] `src/app/teacher/reports/participation/page.tsx`
  - [x] `src/app/teacher/activities/[id]/files/page.tsx`
  - [x] `src/app/teacher/reports/attendance/page.tsx`
  - [x] `src/app/teacher/attendance/[id]/evaluate/page.tsx`
  - [x] `src/app/teacher/activities/new/page.tsx`
  - [x] `src/app/student/profile/page.tsx`
  - [x] `src/app/student/recommendations/page.tsx`
  - [x] Chuyen cac diem `new Date(...).toLocale*('vi-VN')` va compare/filter date local sang helper `formatVietnamDateTime` / `parseVietnamDate`.

### Risk / defer

- [ ] Van con mot so surface cu co mojibake/noi dung Viet chua sach va can dot refactor rieng de tranh va cham logic release.
- [ ] Van con cum timezone phu tro ngoai backbone (mot so tools page, exports/page cu) chua audit het.
- [ ] Camera tren HTTP LAN (khong localhost/HTTPS) van bi browser chan theo secure-context policy; he thong da co fallback upload/link, khong the bypass bang code frontend.

### Verification

- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts test/teacher-approvals-page.test.tsx test/teacher-participation-page.test.tsx test/teacher-attendance-report-page.test.tsx test/teacher-create-activity-page.test.tsx test/teacher-create-activity-preview.test.tsx test/student-history-page.test.tsx` -> PASS (7 files / 15 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.57) Batch uu tien nong - dong bo tao/sua hoat dong ve wizard day du (bo dialog cu)

### Muc tieu

- Xu ly nghen luong tao hoat dong tu trang danh sach giao vien: dialog cu khong day du tuy chon `lop bat buoc/lop duoc dang ky/hoc vien`.
- Giam loi dark mode readability tren dialog cu bang cach dua luong chinh ve wizard create/edit da co token/theme va scope selection day du.

### Viec can lam

- [x] `src/app/teacher/activities/page.tsx`
  - [x] bo import + state mo `ActivityDialog` tren surface danh sach giao vien.
  - [x] nut `Tao hoat dong moi` chuyen thanh `Link` den `/teacher/activities/new`.
  - [x] hanh dong `Chinh sua` (card + menu) chuyen thanh `Link` den `/teacher/activities/[id]/edit`.
  - [x] giu nguyen cac luong xuong song khac (submit duyet, huy, clone, delete, diem danh/QR) khong doi contract.
- [x] Khong doi API/create contract o batch nay; tan dung luong wizard create/edit da co cho mandatory/voluntary class+student.

### Risk / defer

- [ ] `ActivityDialog` cu van ton tai trong repo de tranh phat sinh side-effect ngoai scope batch; hien tai khong con duoc goi tu teacher activities list.
- [ ] Can tiep tuc clean-up mojibake/noi dung cu trong mot so man legacy/doc cu o batch rieng.

### Verification

- [x] `npm.cmd test -- test/teacher-activities-page.test.tsx` -> PASS (1 file / 4 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.58) Batch uu tien nong - QR image decode hardening + projector 95% fullscreen

### Muc tieu

- Giam tiep truong hop hoc vien bao loi `Khong doc duoc ma QR tu anh` khi camera khong dung duoc.
- Dieu chinh man hinh chieu QR toan man hinh cho giao vien de ma QR chiem ~95% viewport nhu yeu cau van hanh lop hoc.

### Viec can lam

- [x] `src/lib/qr-scan-decoder.ts`
  - [x] bo sung aggressive candidate generation co xoay anh 90/180/270 do va bien the contrast + upscale.
  - [x] giu thu tu fallback an toan: BarcodeDetector -> jsQR direct -> jsQR attemptBoth -> aggressive passes.
- [x] `test/qr-scan-decoder.test.ts`
  - [x] cap nhat regression cho aggressive mode va bo sung case xac nhan decoder co thu candidate xoay.
- [x] `src/app/teacher/qr/page.tsx`
  - [x] man projector doi sang container `95vw x 95vh`, QR fit full trong khung, tang kha nang doc tu xa.

### Risk / defer

- [ ] Camera tren HTTP LAN (khong localhost/HTTPS) van bi browser chan theo secure-context policy, batch nay khong the bypass policy.
- [ ] Truong hop anh qua mo/loa/chup cheo qua muc van co the fail decode; da bo sung xoay+contrast+upscale nhung khong dam bao 100%.

### Verification

- [x] `npm.cmd test -- test/qr-scan-decoder.test.ts test/teacher-qr-page.test.tsx test/student-qr-scanner-playback-gesture.test.tsx test/camera-stream.test.ts` -> PASS (4 files / 19 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.59) Batch uu tien nong - dark button contrast guard v5 (fix 2 landing CTA + white-alpha variants)

### Muc tieu

- Xu ly tiep loi 2 nut CTA landing van bi mo/nhat mau tren dark mode mot so may test.
- Quet va khoa them nhom button/link dung `text-white/..` (alpha variant) de tranh mat chu tren nen primary.

### Viec can lam

- [x] `src/app/globals.css`
  - [x] doi dark-mode text guard sang gia tri mau co dinh `#f8fafc` cho nhom CTA/primary action.
  - [x] them bao phu cho selector `text-white/` tren `a/button/[role='button']`.
  - [x] them `filter: none` + `mix-blend-mode: normal` de tranh case text bi extension/auto-dark lam mo.
- [x] `test/theme-link-contrast-guard.test.ts`
  - [x] cap nhat assertion cho `text-white/` va guard styling moi.

### Risk / defer

- [ ] Neu may nguoi dung bat extension dark-mode can thiep manh, van co kha nang bi override CSS ngoai app; batch nay da tang do uu tien de giam toi da.
- [ ] Chua co visual regression e2e screenshot cho tat ca actor pages; hien tai dang dung CSS guard + unit regression.

### Verification

- [x] `npm.cmd test -- test/theme-link-contrast-guard.test.ts` -> PASS (1 file / 4 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.60) Batch uu tien nong - deep-link check-in auth gate (401 redirect, 403 dung loop)

### Muc tieu

- Dam bao luong hoc vien quet QR bang app ngoai -> mo link check-in -> dang nhap -> tu diem danh chay on dinh.
- Loai bo vong lap redirect login khi da dang nhap nhung sai tai khoan duoc phep diem danh.

### Viec can lam

- [x] `src/app/student/check-in/page.tsx`
  - [x] bo sung `AttendanceValidationError` co `status` tu API `/api/attendance/validate`.
  - [x] xu ly ro 401: redirect `/login?next=...` de dang nhap roi quay lai auto-checkin.
  - [x] xu ly ro 403: hien loi "sai tai khoan/khong du quyen" va KHONG redirect tiep.
- [x] `test/student-check-in-page.test.tsx` (moi)
  - [x] regression case auto-checkin deep-link thanh cong.
  - [x] regression case 401 redirect login voi `next` canonical.
  - [x] regression case 403 hien loi va khong redirect loop.

### Risk / defer

- [ ] Camera tren HTTP LAN (khong localhost/HTTPS) van bi secure-context policy chan, batch nay chi bao dam fallback link/login hoat dong on dinh.
- [ ] Chua co e2e thuc te tren dien thoai cho scenario app camera ngoai -> browser mobile -> login -> auto check-in.

### Verification

- [x] `npm.cmd test -- test/student-check-in-page.test.tsx test/student-qr-scanner-playback-gesture.test.tsx test/camera-stream.test.ts` -> PASS (3 files / 12 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.61) Batch uu tien nong - notification CTA diem danh deep-link vao session QR

### Muc tieu

- Khi hoc vien bam nut hanh dong tu thong bao "bat dau diem danh", he thong mo dung link session QR dang hoat dong de auto-checkin ngay.
- Giam buoc thao tac trung gian (vao trang check-in roi quet lai) trong tinh huong camera bi chan/khong dung duoc.

### Viec can lam

- [x] `src/app/api/qr-sessions/route.ts`
  - [x] action button `open_checkin` doi sang href co du `s` + `t` + `activityId`.
  - [x] metadata thong bao tiep tuc ghi nhan `qr_session_id` canonical.
- [x] `test/qr-session-reuse-route.test.ts`
  - [x] them regression check `actionButtons[0].href` dung mau deep-link `/student/check-in?s=...&t=...&activityId=...`.

### Risk / defer

- [ ] Token QR xuat hien trong link hanh dong thong bao (duoc gioi han theo TTL session + validation API), can tiep tuc theo doi UX khi thong bao het han.
- [ ] Chua them e2e mobile push flow end-to-end cho notification tap -> login -> auto-checkin.

### Verification

- [x] `npm.cmd test -- test/qr-session-reuse-route.test.ts test/student-check-in-page.test.tsx test/notification-actions.test.ts test/realtime-notification-bridge.test.tsx` -> PASS (4 files / 22 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.62) Batch uu tien nong - timezone VN hardening cho export/date surfaces

### Muc tieu

- Giam lech ngay tren file export/issued date do `toISOString().split('T')[0]` (UTC) khong trung ngay VN.
- Dong bo mot so surface hien thi ngay gio con dung local browser/server ve helper timezone Viet Nam.

### Viec can lam

- [x] `src/lib/timezone.ts`
  - [x] them helper `toVietnamDateStamp(...)`.
- [x] API export/date routes:
  - [x] `src/app/api/export/users/route.ts`
  - [x] `src/app/api/export/scoreboard/route.ts`
  - [x] `src/app/api/export/class-summary/route.ts`
  - [x] `src/app/api/reports/participation/route.ts`
  - [x] `src/app/api/users/export/route.ts`
  - [x] `src/app/api/admin/awards/create/route.ts`
  - [x] `src/app/api/admin/system-stats/route.ts`
  - [x] `src/lib/bonus-reports.ts`
  - [x] doi ten file/issued date/last backup sang helper timezone VN.
- [x] UI date surfaces:
  - [x] `src/components/AttachmentUploader.tsx`
  - [x] `src/components/TimeSlotPicker.tsx`
  - [x] doi render date sang `formatVietnamDateTime` / `formatVietnamWithOptions`.

### Risk / defer

- [ ] Van con mot so route/tool legacy ngoai backbone hot-flow chua duoc thay toan bo (se tiep tuc quet theo batch sau).
- [ ] Build pass, chua co visual e2e cho toan bo man hinh legacy co date formatting.

### Verification

- [x] `npm.cmd test -- test/bonus-reports.test.ts test/export.test.ts test/participation-report-route.test.ts test/admin-database-ops-routes.test.ts` -> PASS (4 files / 49 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.63) Batch uu tien nong - teacher QR quick actions cho deep-link diem danh

### Muc tieu

- Giam thao tac tay cua giang vien khi kiem tra link check-in tren dien thoai/may khac.
- Chot nhanh bo action tai cho: chieu QR, sao chep link, mo link check-in truc tiep.

### Viec can lam

- [x] `src/app/teacher/qr/page.tsx`
  - [x] bo sung quick actions `copy` va `open` ben canh nut chieu QR.
  - [x] giu nguyen deep-link student check-in dang duoc embed trong ma QR.
- [x] `test/teacher-qr-page.test.tsx`
  - [x] them regression test cho copy clipboard va mo tab moi bang deep-link check-in.

### Risk / defer

- [ ] Chua them e2e mobile cross-device cho thao tac teacher copy/open -> student login -> auto-checkin.
- [ ] Van con batch lon pending cho camera HTTP fallback UX, wizard chon lop/hoc vien bat buoc, va audit timezone toan he thong.

### Verification

- [x] `npm.cmd test -- test/teacher-qr-page.test.tsx` -> PASS (1 file / 5 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.64) Batch uu tien nong - checklist scope tao hoat dong cho lop/hoc vien

### Muc tieu

- Bo multi-select kieu desktop trong wizard tao hoat dong de giao vien khong can giu `Ctrl/Cmd`.
- Giu nguyen contract `mandatory_class_ids`, `voluntary_class_ids`, `mandatory_student_ids`, `voluntary_student_ids`, `applies_to_all_students`.
- Bao toan logic "khong chon scope nao = mo cho tat ca" va preview participation chi load khi can.

### Viec can lam

- [x] `src/app/teacher/activities/new/page.tsx`
  - [x] them class filter + checklist cho nhom lop bat buoc / duoc dang ky.
  - [x] them thao tac nhanh "chon tat ca dang loc" va "xoa chon" cho scope lop.
  - [x] giu nguyen quick actions cho scope hoc vien truc tiep va participation preview.
- [x] `test/teacher-create-activity-page.test.tsx`
  - [x] cap nhat regression create page theo checklist UI moi.
  - [x] them case loc lop + quick-pick vao nhom bat buoc.
- [x] `test/teacher-create-activity-preview.test.tsx`
  - [x] cap nhat regression preview theo checklist UI moi.

### Risk / defer

- [ ] Chua dua cung mot checklist scope sang trang `teacher/activities/[id]/edit`; create flow da xanh truoc, edit parity se dong batch tiep theo.
- [ ] Markup select legacy trong create page da duoc vo hieu hoa o UI, can tiep tuc cleanup source khi tiep batch edit parity de giam code du thua.
- [ ] Chua audit lai man dialog tao hoat dong legacy phia admin neu con route nao khac su dung.

### Verification

- [x] `npm.cmd test -- test/teacher-create-activity-page.test.tsx` -> PASS (1 file / 4 tests, 2026-04-24)
- [x] `npm.cmd test -- test/teacher-create-activity-preview.test.tsx` -> PASS (1 file / 1 test, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.65) Batch uu tien nong - parity checklist scope cho man sua hoat dong

### Muc tieu

- Dong parity create/edit cho wizard chon scope lop va hoc vien.
- Cho phep man sua hoat dong doc + luu day du `mandatory_student_ids`, `voluntary_student_ids`, `applies_to_all_students`.
- Loai bo diem gay compile do UI select cu van goi handler da duoc thay bang checklist.

### Viec can lam

- [x] `src/app/teacher/activities/[id]/edit/page.tsx`
  - [x] bo sung checklist component + class filter cho scope lop bat buoc / duoc dang ky.
  - [x] hydrate va submit du lieu hoc vien scope truc tiep khi sua hoat dong.
  - [x] thay UI multi-select hoc vien bang checklist + thao tac nhanh theo lop scope.
  - [x] mo rong preview/validation de cho phep chi chon hoc vien truc tiep ma van hop le.
- [x] `test/teacher-edit-activity-page.test.tsx`
  - [x] regression hien tai van xanh voi wizard edit sau khi thay scope UI.
- [x] `test/teacher-edit-activity-preview.test.tsx`
  - [x] regression preview edit van xanh voi payload scope hien tai.

### Risk / defer

- [ ] Markup select legacy trong man sua van dang bi an (`hidden`) de giam rui ro batch; can cleanup source khi tiep tuc batch refactor scope.
- [ ] Chua dua parity scope moi sang cac man dialog/admin route khac neu con reuse form cu.
- [ ] Van con batch lon pending cho camera HTTP fallback UX, audit timezone, huong dan QR/FaceID va dark mode dialog tao hoat dong.

### Verification

- [x] `npm.cmd test -- test/teacher-edit-activity-page.test.tsx test/teacher-edit-activity-preview.test.tsx` -> PASS (2 files / 2 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.66) Batch uu tien nong - cleanup scope legacy create/edit

### Muc tieu

- Xoa cac multi-select scope cu dang bi `hidden` trong wizard tao/sua hoat dong.
- Giam code du thua va tranh viec source con giu 2 luong UI scope song song.
- Xac nhan create/edit checklist van on dinh sau khi cat bo markup legacy.

### Viec can lam

- [x] `src/app/teacher/activities/new/page.tsx`
  - [x] xoa khoi multi-select scope lop legacy da bi vo hieu hoa truoc do.
- [x] `src/app/teacher/activities/[id]/edit/page.tsx`
  - [x] xoa khoi multi-select scope lop legacy da bi an.
- [x] Regression create/edit wizard
  - [x] xac nhan create + preview + edit + preview van xanh sau cleanup.

### Risk / defer

- [ ] Chua cleanup cac dialog/admin route khac neu con reuse select scope cu.
- [ ] Van con batch lon pending cho camera HTTP fallback UX, audit timezone, huong dan QR/FaceID va dark mode dialog tao hoat dong.

### Verification

- [x] `npm.cmd test -- test/teacher-create-activity-page.test.tsx test/teacher-create-activity-preview.test.tsx test/teacher-edit-activity-page.test.tsx test/teacher-edit-activity-preview.test.tsx` -> PASS (4 files / 7 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.67) Batch uu tien nong - camera HTTP fallback UX + huong dan QR/FaceID + timezone residuals

### Muc tieu

- Lam ro ngay tren UI hoc vien cach diem danh khi camera web bi chan tren HTTP/LAN.
- Bo sung huong dan QR/FaceID tu A-Z, tra loi ro gioi han "1 khuon mat / 1 luot" va roster chua diem danh theo lop.
- Don mot phan timezone residuals/user-facing filename o surface thong bao va lich su QR.

### Viec can lam

- [x] `src/components/StudentQRScanner.tsx`
  - [x] them khung huong dan deep-link check-in ro hon cho insecure context.
  - [x] lam ro scanner chap nhan ca QR data hoac nguyen duong link check-in.
- [x] `src/app/student/check-in/page.tsx`
  - [x] bo sung mo ta auto check-in khi hoc vien mo deep link dung tai khoan.
- [x] `src/app/teacher/attendance/face/page.tsx`
  - [x] them note van hanh ve gioi han mot khuon mat moi luot va roster chua diem danh.
- [x] `src/app/teacher/activities/[id]/qr-sessions/page.tsx`
  - [x] chuyen hien thi bat dau/ket thuc sang helper timezone VN.
- [x] `src/app/teacher/notifications/history/page.tsx`
  - [x] doi ten file export tren client sang timestamp Viet Nam.
- [x] `src/app/api/teacher/notifications/history/export/route.ts`
  - [x] doi `Content-Disposition` sang timestamp Viet Nam.
- [x] `src/lib/timezone.ts`
  - [x] bo sung helper file timestamp theo Viet Nam.
- [x] `docs/attendance-qr-face-guide.md`
  - [x] tao huong dan QR/FaceID A-Z va FAQ van hanh.

### Risk / defer

- [ ] Van con nhieu file export/filename user-facing ngoai cum nay dang dung `Date.now()`; can audit tiep theo batch timezone residuals lon hon.
- [ ] Huong dan da co trong docs va inline UI, nhung chua co link entrypoint tu navbar/help center.
- [ ] Chua co E2E that tren dien thoai cho scenario app camera ngoai -> mo deep link -> login -> auto check-in.

### Verification

- [x] `npm.cmd test -- test/student-qr-scanner-playback-gesture.test.tsx test/student-check-in-page.test.tsx` -> PASS (2 files / 5 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.68) Batch uu tien nong - timezone VN teacher report export filenames

### Muc tieu

- Don tiep cum filename export user-facing o cac bao cao giang vien dang dung `Date.now()`.
- Dong bo ten file tai ca client va API route ve timestamp Viet Nam de khong lech ngay quanh moc 00:00.

### Viec can lam

- [x] `src/app/teacher/reports/attendance/page.tsx`
- [x] `src/app/teacher/reports/participation/page.tsx`
- [x] `src/app/teacher/reports/class-stats/page.tsx`
- [x] `src/app/api/teacher/reports/attendance/export/route.ts`
- [x] `src/app/api/teacher/reports/participation/export/route.ts`
- [x] `src/app/api/teacher/reports/class-stats/export/route.ts`
  - [x] doi ten file export sang `toVietnamFileTimestamp(new Date())`.

### Risk / defer

- [ ] Van con residual filename/export khac ngoai cum bao cao giang vien, dac biet o participants/history va mot so admin route.
- [ ] Batch nay chi chot naming/timestamp, chua audit sau noi dung ngay gio trong tung file xuat.

### Verification

- [x] `npm.cmd test -- test/teacher-attendance-report-page.test.tsx test/teacher-participation-page.test.tsx test/teacher-class-stats-page.test.tsx test/participation-report-page.test.tsx` -> PASS (4 files / 8 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.69) Batch uu tien nong - timezone VN residual export filenames (participants/history/admin)

### Muc tieu

- Xu ly tiep residual export filename user-facing con dung `Date.now()` hoac ngay UTC.
- Dong bo moc ngay/ten file theo helper timezone VN cho cum participants/history/admin CSV export.
- Bo sung regression test cho `Content-Disposition` de chan tai phat drift timezone filename.

### Viec can lam

- [x] `src/app/api/admin/scores/route.ts`
- [x] `src/app/api/admin/reports/activity-statistics/route.ts`
- [x] `src/app/api/export/attendance/route.ts`
- [x] `src/app/api/activities/[id]/participants/export/route.ts`
- [x] `src/app/api/qr-sessions/[id]/scans/export/route.ts`
- [x] `src/app/api/teacher/reports/participation/export/route.ts`
  - [x] doi filename export sang `toVietnamFileTimestamp(new Date())`/`toVietnamDateStamp(...)` theo tung route.
- [x] Test hardening:
  - [x] `test/admin-scores-route.test.ts`
  - [x] `test/admin-report-routes.test.ts`
  - [x] `test/export.test.ts`
  - [x] `test/teacher-participation-export-route.test.ts`
  - [x] `test/timezone-export-filenames-route.test.ts` (moi)

### Risk / defer

- [ ] Van con mot so filename noi bo (backup/upload temp) dung `Date.now()` de unique key; khong thuoc scope user-facing export batch nay.
- [ ] Chua audit toan bo custom export filename ngoai backbone flow (se tiep tuc o timezone residual batch sau).

### Verification

- [x] `npm.cmd test -- test/admin-scores-route.test.ts test/admin-report-routes.test.ts test/export.test.ts test/teacher-participation-export-route.test.ts test/timezone-export-filenames-route.test.ts` -> PASS (5 files / 23 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)
- [x] `npm.cmd run test:backbone` -> PASS (11 files / 47 tests, 2026-04-24)

## 9.70) Batch nghien cuu uu tien - chan trung gio theo lop khi teacher tao/sua hoat dong

### Muc tieu

- Khi teacher chon lop cho activity, neu lop do da co activity khac trung khung gio thi he thong phai canh bao ro va chan submit.
- Dong bo logic conflict giua UI preview, API check-conflicts va API create/update de tranh lech nghiep vu.
- Chot ro policy conflict theo status hoat dong de khong xung dot voi workflow duyet/publish hien tai.

### Nghiep vu can lam ro truoc khi code

- [x] Pham vi conflict:
  - [x] Chi tinh tren class scope (`mandatory_class_ids` + `voluntary_class_ids` + union `class_ids`), khong tinh direct-student scope.
  - [x] Conflict tinh theo class (khong tinh theo tung hoc vien trong class).
- [x] Moc thoi gian overlap:
  - [x] Chot cong thuc overlap interval theo nguyen tac giao nhau thuc te (`start < other_end` va `end > other_start`, tuong duong `[start, end)`).
  - [x] Chot cach tinh `end_time` (uu tien truong `end_time`, fallback `duration`, fallback mac dinh 120').
- [x] Status duoc xem la conflict de chan:
  - [x] `published` (bat buoc chan).
  - [x] Chua mo rong hard-block cho `requested/approved/registration/in_progress` trong batch nay.
  - [x] Bo qua `cancelled/completed/draft`.
- [x] Rule update:
  - [x] Exclude current activity khi edit.
  - [x] Neu doi gio hoac doi class thi conflict tinh lai ngay tren server-side.
- [x] Rule block:
  - [x] Teacher bi chan hard khi conflict.
  - [x] Admin hien tai cung bi chan, chua co override flow.
- [x] UX:
  - [x] Hien danh sach class conflict + activity conflict (title, time, overlap minutes).
  - [x] Disable nut submit va show thong diep huong dan cach xu ly.

### Viec can lam (implementation batch sau khi chot nghiep vu)

- [x] Tao helper/service conflict schedule theo class (tai su dung duoc cho create + edit + check route).
- [x] Cap nhat `POST /api/activities/check-conflicts`:
  - [x] bo sung class schedule conflict payload theo selected class IDs.
  - [x] tra ve summary tong hop conflict/warning.
- [x] Cap nhat `POST /api/activities` va `PUT /api/activities/[id]`:
  - [x] enforce server-side hard block neu class conflict.
  - [x] tra ve canonical error code `CLASS_SCHEDULE_CONFLICT`.
- [x] Cap nhat teacher create/edit page:
  - [x] trigger conflict check khi doi date/time/duration/class scope.
  - [x] render panel conflict ro rang va chan submit.
- [x] Test:
  - [x] route tests cho create/update/check-conflicts.
  - [x] page tests cho create/edit UX block.
  - [x] regression cho case edit exclude current activity.

### Risk / defer

- [x] Da tach helper conflict dung chung (`src/lib/activity-schedule-conflicts.ts`) de giam duplicate logic route-level.
- [x] Da enforce server-side guard cho create/update de chan race condition FE-check-pass nhung state doi.
- [ ] Chua mo admin override + audit override trong batch nay; se can Decision Gate neu mo rong sau.

### Verification

- [x] `cmd /c npx vitest run test/activity-check-conflicts-route.test.ts test/activities-create-route.test.ts test/activities.test.ts test/teacher-create-activity-page.test.tsx test/teacher-create-activity-preview.test.tsx test/teacher-edit-activity-page.test.tsx test/teacher-edit-activity-preview.test.tsx` -> PASS (7 files / 22 tests, 2026-04-24)

### Prompt bo sung (copy de chay batch nay)

```text
Ban dong vai Senior Fullstack Release Engineer trong repo UniAct.
Muc tieu batch nay: teacher tao/sua activity neu chon class bi trung gio voi activity khac cua class do thi phai CANH BAO + CHAN submit.

Yeu cau nghiep vu:
1) Conflict theo class schedule:
- Kiem tra overlap khung gio giua activity dang tao/sua va cac activity da ton tai cua cac class duoc chon.
- Exclude current activity khi edit.
- Chot va document ro status nao gay block (toi thieu: published), status nao chi warning, status nao bo qua.
2) Enforcement:
- FE chi de UX; BE phai enforce hard-block (khong tin FE).
- Tra canonical API error code: CLASS_SCHEDULE_CONFLICT, kem danh sach conflict chi tiet de FE hien thi.
3) UX:
- Teacher create/edit page hien panel conflict (class, activity title, time, overlap) va disable submit khi co conflict block.
- Message ro, ngan gon, huong den hanh dong sua ngay/doi class.
4) Technical:
- Tach helper conflict check tai su dung cho check route + create + update.
- Khong duplicate business logic o nhieu noi.
5) Tests:
- Them route tests cho check-conflicts/create/update.
- Them page tests cho create/edit block UX.
- Cover case edit exclude current activity.

Truoc khi code:
- Liet ke file se sua.
- Chot ro overlap formula + status policy bang comment nguyen tac trong patch.

Sau khi code:
- Chay test cum lien quan.
- Cap nhat docs/release-backbone-batch-todos.md (section 9.70) voi ket qua va risk/defer.
```

## 9.71) Batch uu tien nong - dong bo filename export tu API cho teacher activity pages

### Muc tieu

- Dong bo ten file tai xuong o UI teacher theo `Content-Disposition` tra ve tu API, tranh lech ten giua FE fallback va BE.
- Don residual timezone drift cho route export diem danh hoat dong theo moc ngay VN thay vi cat chuoi UTC.
- Bo sung helper parse filename de tai su dung cho cac page export client-side.

### Viec can lam

- [x] `src/lib/download-filename.ts` (moi)
  - [x] them helper parse `filename`/`filename*` tu `Content-Disposition`.
  - [x] ho tro decode percent-encoding va fallback an toan.
- [x] `src/app/teacher/activities/[id]/participants/page.tsx`
  - [x] dung filename tra ve tu header API, fallback `participants-{id}-{VN date}.csv`.
  - [x] them `URL.revokeObjectURL` sau khi trigger download.
- [x] `src/app/teacher/activities/[id]/attendance/history/page.tsx`
  - [x] dung filename tra ve tu header API, fallback `dau-danh-{id}-{VN date}.xlsx`.
  - [x] them `URL.revokeObjectURL` sau khi trigger download.
- [x] `src/app/api/activities/[id]/attendance/export/route.ts`
  - [x] doi filename date stamp sang `toVietnamDateStamp(activity.date_time)` de tranh drift quanh moc 00:00.
- [x] Test hardening:
  - [x] `test/download-filename.test.ts` (moi)
  - [x] `test/timezone-export-filenames-route.test.ts` (bo sung case attendance export filename).

### Risk / defer

- [ ] Van con mot so page export client-side khac chua uu tien parse filename tu header (dang fallback local), se tiep tuc audit o batch timezone residual tiep theo.
- [ ] Batch nay chua chuan hoa toan bo header quoting (`filename=` vs `filename="..."`) o tat ca route export.

### Verification

- [x] `npm.cmd test -- test/download-filename.test.ts test/timezone-export-filenames-route.test.ts` -> PASS (2 files / 7 tests, 2026-04-24)

## 9.72) Batch uu tien nong - chuan hoa Content-Disposition cho residual export routes

### Muc tieu

- Chuan hoa `Content-Disposition` theo dang quoted filename de tranh parser sai ten tep tren mot so trinh duyet/tooling.
- Khoa regression cho 2 route residual export con `filename=${filename}`.

### Viec can lam

- [x] `src/app/api/export/users/route.ts`
  - [x] doi header thanh `attachment; filename=\"${filename}\"`.
- [x] `src/app/api/reports/participation/route.ts`
  - [x] doi header thanh `attachment; filename=\"${filename}\"`.
- [x] Test hardening:
  - [x] `test/participation-report-route.test.ts` bo sung assert `Content-Disposition`.
  - [x] `test/export-users-route.test.ts` (moi) cover unauthorized + csv filename quoted.

### Risk / defer

- [ ] Van con cac route khong thuoc backbone export flow co the dung naming/header custom; can tiep tuc audit theo nhom domain.

### Verification

- [x] `npm.cmd test -- test/participation-report-route.test.ts test/export-users-route.test.ts` -> PASS (2 files / 6 tests, 2026-04-24)

## 9.73) Batch uu tien nong - timezone VN cho admin backup filename + FE sync header

### Muc tieu

- Dong bo ten file backup admin theo timestamp VN thay vi ISO UTC.
- Cho trang admin advanced uu tien filename do API tra ve qua `Content-Disposition`.

### Viec can lam

- [x] `src/app/api/admin/backup/route.ts`
  - [x] doi filename sang `uniact-${toVietnamFileTimestamp(new Date())}.db`.
- [x] `src/app/admin/system-config/advanced/page.tsx`
  - [x] parse `Content-Disposition` de lay filename server tra ve.
  - [x] fallback filename theo helper VN `toVietnamFileTimestamp`.
- [x] `test/admin-backup-and-rankings-routes.test.ts`
  - [x] cap nhat assert regex filename backup theo format VN (`YYYY-MM-DD_HH-mm`).

### Risk / defer

- [ ] Van con cac route backup noi bo khac (khong user-facing export) su dung timestamp phuc vu unique key, khong doi trong batch nay.

### Verification

- [x] `npm.cmd test -- test/admin-backup-and-rankings-routes.test.ts` -> PASS (1 file / 4 tests, 2026-04-24)

## 9.74) Batch uu tien nong - sync Content-Disposition filename cho residual blob exports

### Muc tieu

- Dong bo them cac page export client-side dang dung `response.blob()` ve filename tu `Content-Disposition`.
- Giam do lech ten file giua FE fallback va BE tra ve, giu fallback VN khi header thieu.
- Bo sung `URL.revokeObjectURL` day du cho luong download con thieu cleanup.

### Viec can lam

- [x] Cum teacher export da sua do:
  - [x] `src/app/teacher/reports/attendance/page.tsx`
  - [x] `src/app/teacher/reports/participation/page.tsx`
  - [x] `src/app/teacher/reports/class-stats/page.tsx`
  - [x] `src/app/teacher/notifications/history/page.tsx`
  - [x] `src/app/teacher/attendance/[id]/manual/page.tsx`
  - [x] `src/app/teacher/polls/responses/page.tsx`
  - [x] dung `resolveDownloadFilename(...)` + fallback timestamp VN.
- [x] Cum admin export da sua:
  - [x] `src/app/admin/classes/page.tsx`
  - [x] `src/app/admin/scores/export/page.tsx`
  - [x] `src/app/admin/bonus-approval/page.tsx`
  - [x] `src/app/admin/bonus-reports/page.tsx`
  - [x] `src/app/admin/reports/custom/page.tsx`
  - [x] `src/app/admin/backup/page.tsx`
  - [x] dung `resolveDownloadFilename(...)` + fallback an toan theo context.
- [x] Khong doi contract API trong batch nay; chi sync cach dat ten file tai FE.

### Risk / defer

- [ ] Van con nhieu nut export tao CSV thu cong tren FE (khong qua export route), nen khong co `Content-Disposition`; giu fallback local theo nghiep vu hien tai.
- [x] Route `teacher polls responses export` da co hardening test route-level (`test/teacher-poll-responses-route.test.ts`, 2026-04-24 batch 9.77).

### Verification

- [x] `npm.cmd test -- test/teacher-participation-page.test.tsx test/teacher-class-stats-page.test.tsx test/teacher-notification-history-page.test.tsx test/download-filename.test.ts test/admin-scores-route.test.ts test/custom-report-page.test.tsx test/teacher-poll-responses-page.test.tsx test/bonus-reports.test.ts` -> PASS (8 files / 49 tests, 2026-04-24)
- [x] `npm.cmd test -- test/admin-backup-and-rankings-routes.test.ts test/admin-database-ops-routes.test.ts test/download-filename.test.ts` -> PASS (3 files / 14 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.75) Batch uu tien nong - cleanup local CSV export date stamp + object URL revoke

### Muc tieu

- Don cac trang export CSV tao file ngay tren FE: chuyen date stamp fallback ve helper `toVietnamDateStamp(...)` thay cho `toVietnamDatetimeLocalValue(...).slice(0, 10)`.
- Bo sung `URL.revokeObjectURL(...)` day du cho cac export local con thieu cleanup.
- Giu nguyen contract API va payload hien tai; batch nay chi harden client-side export UX/technical debt.

### Viec can lam

- [x] Cac trang admin:
  - [x] `src/app/admin/activities/[id]/page.tsx`
  - [x] `src/app/admin/audit/page.tsx`
  - [x] `src/app/admin/classes/[id]/page.tsx`
  - [x] `src/app/admin/classes/[id]/students/page.tsx`
  - [x] `src/app/admin/users/page.tsx`
  - [x] `src/app/admin/leaderboard/page.tsx`
  - [x] `src/app/admin/scoreboard/page.tsx`
  - [x] `src/app/admin/users/import/page.tsx`
- [x] Cac trang teacher/student:
  - [x] `src/app/teacher/classes/page.tsx`
  - [x] `src/app/teacher/polls/[id]/page.tsx`
  - [x] `src/app/student/history/page.tsx`
  - [x] `src/app/student/scores/page.tsx`
- [x] Tat ca diem export vua sua deu co revoke object URL sau khi click download.

### Risk / defer

- [ ] Cac export khong tao blob file (vd image static/route khac) khong nam trong scope batch nay.
- [ ] Chua chuan hoa thong nhat thong diep toast/ten file cho tat ca export local theo 1 convention duy nhat; chi harden phan date stamp + cleanup URL.

### Verification

- [x] `npm.cmd test -- test/admin-activities-page.test.tsx test/student-history-page.test.tsx test/student-scores-page.test.tsx` -> PASS (3 files / 8 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.76) Batch uu tien nong - chuan hoa Content-Disposition UTF-8 cho class export route

### Muc tieu

- Chuan hoa header `Content-Disposition` cua `/api/classes/[id]/export` theo chuan UTF-8 (`filename*`) de trinh duyet/FE parse dung ten file co dau.
- Giu fallback ASCII `filename=` de tuong thich trinh duyet cu.
- Bo sung route regression test cho class export de khoa lai drift filename/header.

### Viec can lam

- [x] `src/app/api/classes/[id]/export/route.ts`
  - [x] doi date stamp filename sang `toVietnamDateStamp(new Date())`.
  - [x] doi `Content-Disposition` sang dang:
    - [x] `filename="class-{id}-{date}.csv"` (ASCII fallback)
    - [x] `filename*=UTF-8''{encoded}` (UTF-8 full filename)
- [x] `test/class-export-route.test.ts` (moi)
  - [x] cover admin success va assert header co ca fallback + `filename*`.
  - [x] cover teacher out-of-scope bi chan.
  - [x] cover validate class id khong hop le.

### Risk / defer

- [ ] Cac export route khac co ten file co dau dang dung `filename="..."` nhung chua bo sung `filename*` se audit tiep theo domain.

### Verification

- [x] `npm.cmd test -- test/class-export-route.test.ts test/download-filename.test.ts` -> PASS (2 files / 7 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.77) Batch uu tien nong - Poll teacher API closeout + auth canonical + route regression

### Muc tieu

- Dong bo namespace Poll teacher (`/api/teacher/polls/*`) de man hinh responses/settings/export hoat dong day du.
- Chuan hoa auth cho `/api/polls` theo cookie/token guard thay vi header tam.
- Giu backward compatibility cho student poll flow (`/api/polls` list/detail/vote).

### Viec can lam

- [x] Them helper schema poll dung chung:
  - [x] `src/lib/polls.ts` (`ensurePollSchema`, `parsePollId`, `parseTemplateOptions`, `csvCell`).
- [x] Refactor poll core APIs:
  - [x] `src/app/api/polls/route.ts`
  - [x] `src/app/api/polls/[id]/route.ts`
  - [x] auth guard canonical + validate scope + vote/delete logic.
- [x] Them day du teacher poll routes con thieu:
  - [x] `src/app/api/teacher/polls/route.ts`
  - [x] `src/app/api/teacher/polls/[id]/route.ts`
  - [x] `src/app/api/teacher/polls/[id]/responses/route.ts`
  - [x] `src/app/api/teacher/polls/[id]/responses/export/route.ts`
  - [x] `src/app/api/teacher/polls/settings/route.ts`
  - [x] `src/app/api/teacher/polls/templates/route.ts`
  - [x] `src/app/api/teacher/polls/templates/[id]/route.ts`
- [x] Dong bo teacher poll page sang namespace teacher:
  - [x] `src/app/teacher/polls/page.tsx`.
- [x] Bo sung route regression:
  - [x] `test/teacher-poll-responses-route.test.ts`
  - [x] `test/teacher-poll-settings-route.test.ts`.

### Risk / defer

- [ ] Poll detail UI text con mojibake tren mot so trang legacy (`teacher/polls/[id]`, `student/polls`), batch nay uu tien API contract/guard truoc.
- [x] Da bo sung route test rieng cho `/api/teacher/polls` list/create va `/api/teacher/polls/templates/[id]` delete trong batch 9.79.

### Verification

- [x] `npm.cmd test -- test/teacher-poll-responses-route.test.ts test/teacher-poll-settings-route.test.ts test/teacher-poll-responses-page.test.tsx` -> PASS (3 files / 7 tests, 2026-04-24)
- [x] `npm.cmd run build` -> PASS (2026-04-24)

## 9.78) Batch uu tien nong - prompt tong hop batch con lai + ap dung ngay

### Muc tieu

- Tao prompt tong hop tai lieu toan he thong, danh so batch con lai de co the chon theo list so.
- Bat buoc nhung yeu cau cleanup repository: don rac, gom file co the gom, cap nhat cac diem xung dot tai lieu.
- Ap dung prompt ngay bang cach sinh catalog batch con lai tu state hien tai.

### Viec can lam

- [x] Tao prompt:
  - [x] `docs/system-wide-remaining-batches-planner-prompt.md`
  - [x] ho tro 2 vong: (1) xuat danh sach batch danh so, (2) nhan list so va lap execution plan hop nhat.
- [x] Ap dung prompt (vong 1) va xuat catalog:
  - [x] `docs/system-wide-remaining-batches-catalog.md`
  - [x] da bao gom batch cleanup/hygiene bat buoc va cac batch he thong con lai theo muc tieu end-user flow.

### Risk / defer

- [ ] Catalog batch con lai la snapshot theo trang thai 2026-04-24; can cap nhat lai neu co batch lon moi duoc merge.
- [ ] Chua thuc thi xoa/gom file cleanup trong batch nay; moi dung o muc planning + scope chuan hoa.

## 9.79) Batch uu tien nong - Poll route parity regression hardening

### Muc tieu

- Khoa regression cho cac route teacher poll con defer sau batch 9.77.
- Chot parity route-level cho list/create/close/delete/templates CRUD o namespace `/api/teacher/polls`.

### Viec can lam

- [x] Bo sung route test:
  - [x] `test/teacher-polls-management-routes.test.ts`
  - [x] cover:
    - [x] GET `/api/teacher/polls` (teacher-owned list)
    - [x] POST `/api/teacher/polls` (create success + class-scope guard fail)
    - [x] DELETE `/api/teacher/polls/[id]` (close owner + forbidden non-owner)
    - [x] GET/POST `/api/teacher/polls/templates`
    - [x] DELETE `/api/teacher/polls/templates/[id]`
- [x] Re-run poll bundle regression:
  - [x] `test/teacher-polls-management-routes.test.ts`
  - [x] `test/teacher-poll-responses-route.test.ts`
  - [x] `test/teacher-poll-settings-route.test.ts`
  - [x] `test/teacher-poll-responses-page.test.tsx`

### Risk / defer

- [ ] Poll pages legacy (`teacher/polls/[id]`, `student/polls`) van con text mojibake, can batch UI text cleanup rieng de tranh va cham logic.
- [x] Da bo sung route test cho `/api/polls` student vote/detail edge-cases trong batch 9.80.

### Verification

- [x] `npm.cmd test -- test/teacher-polls-management-routes.test.ts test/teacher-poll-responses-route.test.ts test/teacher-poll-settings-route.test.ts test/teacher-poll-responses-page.test.tsx` -> PASS (4 files / 13 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 9.80) Batch uu tien nong - Poll core route parity (student scope + vote constraints)

### Muc tieu

- Khoa regression cho namespace poll core `/api/polls` va `/api/polls/[id]`.
- Dam bao matrix truy cap student/teacher + vote constraints duoc bao phu test route-level.

### Viec can lam

- [x] Them route test:
  - [x] `test/polls-core-routes.test.ts`
  - [x] cover:
    - [x] GET `/api/polls` cho student scope list active.
    - [x] POST `/api/polls` teacher class-out-of-scope -> forbidden.
    - [x] GET `/api/polls/[id]` student out-of-scope -> forbidden.
    - [x] POST `/api/polls/[id]` reject multi-select khi `allow_multiple=0`.
    - [x] POST `/api/polls/[id]` vote success ghi nhan poll_responses.
- [x] Re-run poll full regression bundle (core + teacher routes + teacher page consumer).

### Risk / defer

- [ ] Chua bo sung route test cho DELETE `/api/polls/[id]` action close/delete matrix (owner/admin) va edge-case poll da dong.
- [ ] Chua bo sung page-level regression cho `student/polls` va `teacher/polls/[id]` (hien dang route-level la chinh).

### Verification

- [x] `npm.cmd test -- test/polls-core-routes.test.ts test/teacher-polls-management-routes.test.ts test/teacher-poll-responses-route.test.ts test/teacher-poll-settings-route.test.ts test/teacher-poll-responses-page.test.tsx` -> PASS (5 files / 18 tests, 2026-04-25)

## 9.81) Batch uu tien nong - timezone VN residual sweep (admin/student user-facing dates)

### Muc tieu

- Don residual date rendering con dung `toLocaleDateString(...)` de tranh lech ngay theo timezone may client.
- Chuan hoa ve helper timezone VN cho cac surface user-facing con lai trong cum admin/student.

### Viec can lam

- [x] UI date formatting update:
  - [x] `src/app/admin/attendance/page.tsx`
    - [x] doi `new Date(...).toLocaleDateString()` -> `formatVietnamDateTime(..., 'date')`.
  - [x] `src/app/admin/activities/ActivityTable.tsx`
    - [x] doi `toLocaleDateString('vi-VN')` -> `formatVietnamDateTime(..., 'date')`.
  - [x] `src/app/student/awards/history/page.tsx`
    - [x] doi `toLocaleDateString('en-US', ...)` -> `formatVietnamWithOptions(..., ..., 'en-US')` de giu locale nhung chot timezone VN.
- [x] Regression tests:
  - [x] `test/admin-attendance-page.test.tsx` (moi)
  - [x] `test/student-award-history-page.test.tsx` (moi)
  - [x] `test/admin-activities-page.test.tsx` (bo sung assert date format table).

### Risk / defer

- [ ] Van con residual `toLocaleString/new Date` o nhieu module khac (bao gom route logs/internal timestamps) khong nam trong user-facing date scope batch nay.
- [ ] `teacher/dashboard/page_old.tsx` la legacy page, chua uu tien cleanup timezone trong batch nay.

### Verification

- [x] `npm.cmd test -- test/admin-attendance-page.test.tsx test/student-award-history-page.test.tsx test/admin-activities-page.test.tsx` -> PASS (3 files / 7 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 9.82) Batch uu tien nong - khoi phuc scripts maintenance bi hong encoding + hygiene

### Muc tieu

- Khoi phuc cac script maintenance dang bi hong nhi phan trong `scripts/maintenance` de tra lai kha nang van hanh.
- Giu nguyen contract npm scripts hien tai (`backup-db`, `validate*`, `fix*`) de khong vo quy trinh release/ops.
- Dong bo batch hygiene bat buoc trong RB-10: loai bo file script khong doc duoc va thay bang TypeScript sach.

### Viec can lam

- [x] Thay moi cac file maintenance bi hong:
  - [x] `scripts/maintenance/backup-db.ts`
  - [x] `scripts/maintenance/validate-project.ts`
  - [x] `scripts/maintenance/fix-project.ts`
  - [x] `scripts/maintenance/add-workflow-cols.ts`
  - [x] `scripts/maintenance/db-analysis-and-reset.ts`
- [x] Tao helper dung chung de giam duplicate logic sqlite/cli:
  - [x] `scripts/maintenance/_db-maintenance-utils.ts`
- [x] Bao toan contract mode:
  - [x] `validate`: `all|schema|data|indexes`
  - [x] `fix`: `all|schema|api-queries|dry-run`
  - [x] `backup-db`: backup theo timestamp VN + WAL checkpoint truoc copy.

### Risk / defer

- [ ] Can tiep tuc cleanup mojibake text o mot so file legacy ngoai scope maintenance scripts.
- [ ] Kiem tra warning du lieu `Teachers without homeroom class` trong env demodata truoc khi dung `validate` lam gate cứng CI.

### Verification

- [x] `npm.cmd run fix:dry-run` -> PASS (planned/applied summary, 2026-04-25)
- [x] `npm.cmd run fix` -> PASS (schema + index actions, 2026-04-25)
- [x] `npm.cmd run validate` -> PASS (0 error / 1 warning, 2026-04-25)
- [x] `npm.cmd run validate:indexes` -> PASS (2026-04-25)
- [x] `npm.cmd run backup-db -- --label=smoke` -> PASS, tao backup file trong `backups/` (2026-04-25)
- [x] `npx.cmd tsx scripts/maintenance/db-analysis-and-reset.ts --mode=analyze` -> PASS (2026-04-25)
- [x] `npx.cmd tsx scripts/maintenance/add-workflow-cols.ts --mode=dry-run` -> PASS (2026-04-25)

## 9.83) Batch uu tien nong - Poll UI text cleanup + page parity residual

### Muc tieu

- Don text mojibake o Poll UI cho 2 actor con defer (`student/polls`, `teacher/polls/[id]`).
- Giu nguyen API contract poll core/teacher namespace, chi clean user-facing labels + thong diep.
- Khoa regression page-level de chot parity UI sau cac batch route-level 9.77-9.80.

### Viec can lam

- [x] UI text cleanup:
  - [x] `src/app/student/polls/page.tsx`
    - [x] thay chuoi mojibake bang text tieng Viet ro rang.
    - [x] don labels/user messages cho list/detail/vote states.
  - [x] `src/app/teacher/polls/[id]/page.tsx`
    - [x] clean toan bo labels/heading/status/export toast.
    - [x] giu nguyen luong export CSV + revoke object URL.
- [x] Page regression tests moi:
  - [x] `test/student-polls-page.test.tsx`
  - [x] `test/teacher-poll-detail-page.test.tsx`
  - [x] cover render labels chinh + anti-mojibake signal (`/[ÃÂâ]/` khong xuat hien).
- [x] Re-run poll bundle route + page de dam bao khong hoi quy logic.

### Risk / defer

- [ ] Van con cac page khac trong he thong co text legacy/mojibake, can tiep tuc cleanup theo domain (khong chi poll).
- [ ] Batch nay khong mo rong them i18n framework; chi harden text user-facing o poll pages.

### Verification

- [x] `npm.cmd test -- test/student-polls-page.test.tsx test/teacher-poll-detail-page.test.tsx test/polls-core-routes.test.ts test/teacher-polls-management-routes.test.ts` -> PASS (4 files / 14 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 9.84) Batch uu tien nong - timezone VN cho admin database backup/restore filenames

### Muc tieu

- Loai bo timestamp UTC/`Date.now()` trong backup filename cua namespace `/api/admin/database/*`.
- Dong bo ten file backup/safety-backup theo helper timezone VN de tranh drift ngay khi van hanh qua moc 00:00.
- Bo sung regression test route-level de khoa format filename.

### Viec can lam

- [x] `src/app/api/admin/database/backup/route.ts`
  - [x] doi filename tu `uniact_backup_${date}_${Date.now()}.db` sang `uniact_backup_${toVietnamFileTimestamp(new Date())}.db`.
- [x] `src/app/api/admin/database/restore/route.ts`
  - [x] doi safety backup filename sang `pre_restore_${toVietnamFileTimestamp(new Date())}.db`.
- [x] `test/admin-database-ops-routes.test.ts`
  - [x] bo sung test cho `POST /api/admin/database/backup` assert format filename timestamp VN.
  - [x] cap nhat test restore assert `safety_backup` theo format VN.
  - [x] bo sung mock `mkdirSync` + fix mock admin user co `email` de khop contract route.

### Risk / defer

- [ ] UI `admin/backup/page.tsx` van con residual mojibake text legacy; batch nay chi uu tien timezone filename + route regression.
- [ ] Cac route noi bo khac dung `Date.now()` cho ten file khong user-facing (vd QR logo upload) khong nam trong scope batch nay.

### Verification

- [x] `npm.cmd test -- test/admin-database-ops-routes.test.ts` -> PASS (1 file / 7 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 9.85) Batch uu tien nong - poll core delete/close parity regression

### Muc tieu

- Dong no risk con treo tu batch poll core: bo sung test cho `DELETE /api/polls/[id]`.
- Khoa matrix quyen thao tac poll tren core route: owner teacher, non-owner teacher, admin.
- Bao phu edge-case poll da dong van co the bi admin delete.

### Viec can lam

- [x] `test/polls-core-routes.test.ts`
  - [x] them case owner teacher close poll voi `?action=close`.
  - [x] them case non-owner teacher bi chan thao tac.
  - [x] them case admin delete poll da dong.
- [x] Re-run poll regression bundle core/teacher routes.

### Risk / defer

- [ ] Chua bo sung e2e/page-level flow cho thao tac close/delete poll tu UI (batch nay route-level regression la chinh).
- [ ] Chua mo rong audit log cho close/delete poll trong core route (neu can theo policy van hanh se tach batch audit rieng).

### Verification

- [x] `npm.cmd test -- test/polls-core-routes.test.ts test/teacher-polls-management-routes.test.ts test/admin-database-ops-routes.test.ts` -> PASS (3 files / 21 tests, 2026-04-25)

## 9.86) Batch uu tien nong - admin database backups API parity (list/delete)

### Muc tieu

- Dong bo backend cho UI `/admin/backup`: bo sung namespace con thieu `/api/admin/database/backups` va `/api/admin/database/backups/[filename]`.
- Dam bao luong backup management day du: liet ke backup + xoa backup + audit log.
- Khoa regression route-level cho list/delete de tranh vo flow van hanh backup.

### Viec can lam

- [x] Them route list backup:
  - [x] `src/app/api/admin/database/backups/route.ts` (moi)
  - [x] quet file `.db` trong thu muc `backups/`
  - [x] merge metadata tu `backup_history` neu co, fallback theo file stats.
- [x] Them route xoa backup:
  - [x] `src/app/api/admin/database/backups/[filename]/route.ts` (moi)
  - [x] validate filename (chan path traversal)
  - [x] xoa file + cleanup `backup_history` + ghi `audit_logs` action `DATABASE_BACKUP_DELETE`.
- [x] Them route tests:
  - [x] `test/admin-database-backups-routes.test.ts` (moi)
  - [x] cover list success, empty dir, delete success, invalid filename.

### Risk / defer

- [ ] Chua bo sung soft-delete/retention policy cho backup files; hien tai xoa la xoa vat ly ngay.
- [ ] Chua bo sung filter/pagination cho danh sach backup neu so luong file qua lon.

### Verification

- [x] `npm.cmd test -- test/admin-database-backups-routes.test.ts test/admin-database-ops-routes.test.ts` -> PASS (2 files / 11 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 9.87) Batch uu tien nong - admin backup page text cleanup + page regression

### Muc tieu

- Don residual text mojibake tren trang `/admin/backup` de UI user-facing nhat quan va de doc.
- Giu nguyen API contract backup/restore/backups da chot o batch 9.84-9.86.
- Bo sung page-level regression de khoa flow load du lieu va anti-mojibake signal.

### Viec can lam

- [x] `src/app/admin/backup/page.tsx`
  - [x] clean labels/messages user-facing tren toan trang.
  - [x] giu download flow dung `resolveDownloadFilename(...)` + `encodeURIComponent(filename)` cho query file.
  - [x] giu nguyen logic refresh danh sach backup + db stats sau thao tac.
- [x] Them page test:
  - [x] `test/admin-backup-page.test.tsx` (moi)
  - [x] cover load `/api/admin/database/stats` + `/api/admin/database/backups`.
  - [x] cover redirect non-admin -> `/login`.
  - [x] cover anti-mojibake signal (`/[ÃƒÃ‚Ã¢]/` khong xuat hien tren rendered text).

### Risk / defer

- [ ] Chua cover interaction test cho confirm dialog backup/restore/delete (batch nay uu tien render/load/redirect regression).
- [ ] Van con residual text legacy/mojibake o mot so page domain khac ngoai `/admin/backup`.

### Verification

- [x] `npm.cmd test -- test/admin-backup-page.test.tsx test/admin-database-backups-routes.test.ts test/admin-database-ops-routes.test.ts` -> PASS (3 files / 13 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 9.88) Batch uu tien nong - export Content-Disposition UTF-8 parity + timezone residual hardening

### Muc tieu

- Chuan hoa header download cho cac route export chinh: tra ve ca `filename` (ASCII fallback) va `filename*` (UTF-8) de client nhan dung ten file.
- Giam residual drift/khac biet ten file giua cac route export activity/qr/poll.
- Tao helper dung chung de tranh duplicate logic tao `Content-Disposition`.

### Viec can lam

- [x] Them helper:
  - [x] `src/lib/content-disposition.ts` (moi)
  - [x] `buildAttachmentContentDisposition(filename)` tra ve:
    - [x] `filename="..."` fallback ASCII an toan
    - [x] `filename*=UTF-8''...` cho ten file goc UTF-8
- [x] Ap helper vao cac route export:
  - [x] `src/app/api/activities/[id]/participants/export/route.ts`
  - [x] `src/app/api/activities/[id]/attendance/export/route.ts`
  - [x] `src/app/api/qr-sessions/[id]/scans/export/route.ts`
  - [x] `src/app/api/teacher/polls/[id]/responses/export/route.ts`
- [x] Regression tests:
  - [x] `test/content-disposition.test.ts` (moi) cho helper fallback + UTF-8.
  - [x] `test/timezone-export-filenames-route.test.ts` cap nhat assert header co ca `filename` + `filename*`.
  - [x] `test/teacher-poll-responses-route.test.ts` bo sung assert co `filename*=UTF-8''`.

### Risk / defer

- [ ] Cac route export khac trong he thong van chua migrate sang helper dung chung (se tiep tuc theo cum de tranh patch qua lon).
- [ ] Batch nay uu tien header parity, chua gom cleanup text legacy/mojibake trong toan bo route export.

### Verification

- [x] `npm.cmd test -- test/content-disposition.test.ts test/timezone-export-filenames-route.test.ts test/teacher-poll-responses-route.test.ts` -> PASS (3 files / 8 tests, 2026-04-25)
- [x] `npm.cmd run build` -> PASS (2026-04-25)

## 10) Ke hoach commit de xuat

- [ ] Commit 1: Batch 1 text refactor + org-level bug fix
- [ ] Commit 2: Batch 2 realtime infra + toast UI
- [ ] Commit 3: Batch 3 notification scope + is_mandatory flow
- [ ] Commit 4: Batch 4 QR session reuse + realtime attendance trigger
- [x] Commit 5: Batch 5 FaceID foundation + notification matrix
  - [x] Split commits: `194c4eb`, `de6900c`, `0e1e5bb`, `9e221ac`
- [x] Commit 6: Final regression fixes + release docs
- [x] Commit 7: Production build hardening + point_calculations schema self-heal
- [x] Commit 8: docs sync baseline + clone handoff (`804d71a`)
- [x] Commit 9: activity workflow lint/type hardening (batch 9.8) (`7769e0b`)
- [x] Commit 10: admin approvals lint/type hardening (batch 9.9) (`36564a2`)
- [x] Commit 11: admin alerts/audit lint cleanup (batch 9.10) (`76771f1`)
- [x] Commit 12: admin users lint/type cleanup (batch 9.11) (`1f8265c`)
- [x] Commit 13: format admin user pages for release check (`cb33491`)
- [x] Commit 14: admin classes lint/type cleanup (batch 9.12) (`4c37921`)
- [x] Commit 15: admin awards/bonus/reports/scores lint cleanup (batch 9.13) (`b48ef66`)
- [x] Commit 16: admin scoring/scoring-config lint/type cleanup (batch 9.14) (`5f06b16`)
- [x] Commit 17: dark contrast + notification projector CTA + navbar integrity (batch 9.17)
  - [x] Split commits: `435ec7c`, `e50f9c7`
- [x] Commit 18: teacher activities UI modernization (batch 9.18)
  - [x] Split commits: `07e5ac8`, `59efe67`, `a8d0b8e`
- [x] Commit 19: landing contrast rescue v2 + scanner/inbox polish (batch 9.19) (`c304ca7`)
- [x] Commit 20: biometric pages camera helper alignment + tests (batch 9.20) (`b9c18a3`)
- [x] Commit 21: navbar actor integrity + dedupe hardening + landing dark/system rescue (batch 9.21) (`176eec4`)
- [x] Commit 22: server-side push notification dedupe guard + tests (batch 9.22) (`cf46bf7`)
- [x] Commit 23: attendance CTA hardening + projector quick action + camera helper + landing contrast v4 (batch 9.23) (`a58233c`)
- [x] Commit 24: actor route namespace integrity hardening (batch 9.25) (`1be6968`)
- [x] Commit 25: dark mode button-link contrast guard + theme regression test (batch 9.26) (`e32de41`)
- [x] Commit 26: dark mode action button readability guard v2 (batch 9.27) (`50e386d`)
- [x] Commit 27: teacher attendance history/bulk hardening (batch 9.28) (`d431b0b`)
- [x] Commit 28: browser camera fallback for student QR scan (batch 9.29) (`f0c5e21`)
- [x] Commit 29: UAT login rate-limit unblock + dark button text-white guard v3 (batch 9.30)
- [x] Commit 30: QR decoder fallback cross-browser (batch 9.31)
- [x] Commit 31: dark button contrast hardening + teacher QR fullscreen fallback (batch 9.32) (`d194fa8`)
- [x] Commit 32: realtime notification dedupe persistence across reconnect/mount (batch 9.33) (`9040610`)
- [x] Commit 33: UAT awards/notification stability hardening (batch 9.34) (`82fd139`)
- [x] Commit 34: system dark mode contrast guard (batch 9.35) (`1d97aa8`)
- [x] Commit 35: admin attendance shortcut + attendance UI vi (batch 9.36) (`0ee3b07`)
- [x] Commit 36: docs record batch 9.35-9.36 (`8bb6b97`)

---

## 11) Codex IDE handoff (chuyen han tu VSCode)

### Muc tieu

- Dung Codex IDE lam moi truong code chinh, giu on dinh luong release backbone.

### Tai lieu vao cua session

- [x] Da tao goi handoff: `docs/codex-ide-transition-pack.md`
- [x] Da tao prompt clone may moi: `docs/codex-clone-coreflows-prompt.md`
- [ ] Bat dau moi session bang prompt khoi dong trong handoff pack.
- [x] Lam viec theo workflow: Audit -> Patch nho -> Test cum -> Update docs -> Commit.

### Prompt khoi dong rut gon

```text
Dung prompt trong docs/codex-clone-coreflows-prompt.md.
Prompt nay da gom thu tu xu ly blocker + workflow batch + format bao cao.
```

### Checklist chuyen doi

- [x] Xac nhan env local trong Codex IDE (`.env`, migrate, seed:qa, build/start) o muc build/test backbone cho batch blocker (2026-04-21).
- [x] Chot branch lam viec cho batch hien tai.
  - [x] Branch hien tai: `main`
- [x] Chay test cum lien quan truoc va sau khi sua.
- [x] Cap nhat lai checklist batch + risk/defer ngay trong file nay.
