# System-Wide Master Execution Prompt

```text
Tiep tuc work tren repo `C:\Users\nhuul\OneDrive\Máy tính\uniact`.

Boi canh hien tai:
- Student shell da duoc lam lon roi: dashboard, activities, activity detail, my-activities, history, points, scores, ranking, profile, devices, notifications, alerts, recommendations, polls, awards, award history, upcoming awards, achievement tips, check-in QR.
- Score flow student da thong nhat nguon du lieu.
- QR check-in student da chay dung luong: khong auto diem danh qua link, bat buoc mo camera web va quet lai.
- Route cu `/student/profile/edit` da redirect ve `/student/profile`.
- Route `/student/activities/[id]/check-in` da redirect ve `/student/check-in?activityId=...`.
- Navbar da duoc sap lai theo tan suat su dung va muc do quan trong cho student, teacher, admin.
- Teacher face attendance da duoc lam lai theo huong van hanh ro rang hon, nhung van can tiep tuc QA va hoan thien luong nhan dien khuon mat.

Muc tieu:
- Ra soat va hoan thien nhung phan con lai cua toan he thong de nguoi dung cuoi dung duoc tron tru, khong mac diem nghen.
- Uu tien blocker that, loi luong, loi responsive mobile, dark mode, text loi ma hoa, route cu, contract API lech, man hinh xau/chua hoan thien.
- Lam theo batch lon de tiet kiem request limit. Khong dung o phan tich; phai sua, test, va bao cao phan da xong.

Quy tac thuc hien:
1. Khong lam lai nhung man da on dinh neu khong co bug that.
2. Tap trung vao cac diem nguoi dung cuoi con va phai khi dung that.
3. Moi route legacy neu con can giu thi chuyen thanh redirect toi gian ve route chuan va them test.
4. Don rac:
   - xoa hoac co lap file/page/component legacy khong con gia tri,
   - gop file neu trung trach nhiem ma khong gay mo ho,
   - don text mojibake/loi ma hoa tren UI user-facing,
   - cap nhat cac cho mau thuan de phan anh dung du an hien tai.
5. Khong xoa test co gia tri.
6. Moi batch phai co test phu hop; uu tien test regression cho route, page, flow quan trong.
7. Neu phat hien them backlog moi, tu nhom vao P0/P1/P2 va tiep tuc xu ly theo thu tu.

Batch 1: Student final QA va polish cuoi
- Ra soat lai toan bo menu student tren mobile that va dark mode:
  - `/student/dashboard`
  - `/student/activities`
  - `/student/activities/[id]`
  - `/student/my-activities`
  - `/student/history`
  - `/student/points`
  - `/student/scores`
  - `/student/ranking`
  - `/student/profile`
  - `/student/devices`
  - `/student/notifications`
  - `/student/alerts`
  - `/student/recommendations`
  - `/student/polls`
  - `/student/awards`
  - `/student/awards/history`
  - `/student/awards/upcoming`
  - `/student/check-in`
- Tim cac diem con tho:
  - spacing/safe-area,
  - nut bi che boi navbar/sidebar,
  - bang/card chua hop mobile,
  - dark mode kho doc,
  - wording chua nhat quan,
  - panel ky thuat lo khong dung cho,
  - CTA chua chuan.
- Sua ngay cac diem phat hien duoc va them test neu co route/logic lien quan.

Batch 2: Navbar information architecture va shell dung chung
- Ra soat lai toan bo navbar cua admin, teacher, student.
- Nguyen tac sap xep:
  - day cac muc hay dung va quan trong nhat len tren,
  - gom nhom theo job-to-be-done thay vi theo ten ky thuat,
  - uu tien `dashboard`, `attendance`, `activities`, `notifications`, `classes`, `students`, `reports`,
  - day `settings`, `history`, `experimental`, `legacy`, `advanced tools` xuong duoi.
- Yeu cau:
  - ten menu phai ro, ngan, nhat quan,
  - nhom menu phai hop ly voi role,
  - mobile navbar/overlay khong che noi dung quan trong,
  - dark mode va focus state phai de doc, de bam,
  - route khong con dung phai redirect hoac bo khoi menu.
- Them test de khoa thu tu uu tien cho nhung route cot loi.

Batch 3: Face recognition va face attendance hardening
- Kiem tra va hoan thien toan bo luong nhan dien khuon mat:
  - teacher face attendance page,
  - biometric runtime,
  - camera capture,
  - liveness validation,
  - candidate preview,
  - verify/submit attendance,
  - pending roster sau submit,
  - fallback khi runtime unavailable.
- Lam ro va sua cac nghiep vu:
  - chi cho ghi nhan khi candidate preview hop le,
  - khong ghi nhan neu quality thap, nhieu mat, khong thay mat, liveness fail,
  - thong bao loi phai ro va dung ngu canh van hanh,
  - neu runtime chua san sang thi UI phai noi ro dang o che do nao.
- Uu tien:
  - mobile/tablet camera UX,
  - empty/loading/error states,
  - text user-facing sach, khong mojibake,
  - test regression cho camera errors, preview, submit success/fail.

Batch 4: Teacher critical flows
- Kiem tra toan bo menu teacher va uu tien cac luong nguoi dung dung nhieu nhat:
  - dashboard,
  - activities list/detail/create/edit,
  - approvals,
  - attendance,
  - QR attendance,
  - face attendance,
  - notifications/broadcast/history/settings,
  - classes,
  - students,
  - reports.
- Tap trung tim:
  - blocker thao tac,
  - contract API lech UI,
  - responsive mobile/tablet,
  - dark mode,
  - text loi ma hoa,
  - route sai hoac legacy route can redirect.
- Fix theo batch lon va them test regression.

Batch 5: Admin critical flows
- Kiem tra cac man admin quan trong cho van hanh:
  - dashboard,
  - users,
  - students,
  - teachers,
  - classes,
  - activities,
  - approvals,
  - attendance,
  - scores,
  - leaderboard/scoreboard,
  - reports,
  - settings/system-config.
- Uu tien P0:
  - man khong mo duoc,
  - action sai logic,
  - API lech du lieu,
  - file legacy gay hieu nham,
  - mobile/dark mode qua kem o cac man chinh.
- Fix va test.

Batch 6: Shared shell + cleanup
- Ra cac component/shared shell:
  - `AuthContent`
  - `Sidebar`
  - dialog/confirm/modal
  - empty/loading/error states
  - card/list/table shell
  - notification inbox
  - QR scanner related UI
  - face attendance shared components
- Don cac component route phu cu khong con gia tri.
- Chuan hoa safe-area, mobile spacing, dark mode contrast, wording he thong.

Batch 7: Regression lock
- Chay lai cac suite trong yeu theo nhom:
  - student,
  - QR/check-in,
  - face attendance,
  - teacher critical,
  - admin critical.
- Bo sung test thieu cho cac redirect legacy va cac flow vua sua.
- Ket thuc bang danh sach backlog con lai theo muc do uu tien.

Yeu cau bao cao sau moi batch:
1. Da sua gi, theo outcome nguoi dung chu khong phai changelog file vun.
2. Nhung file chinh da cham.
3. Test nao da chay, pass/fail ra sao.
4. Nhung gi con lai, danh so theo P0/P1/P2.
5. Neu gap blocker that thi neu ro blocker va pham vi anh huong.

Bat dau ngay tu Batch 1, sau do tu tiep tuc sang Batch 2 va Batch 3 neu khong co blocker nghiem trong.
```
