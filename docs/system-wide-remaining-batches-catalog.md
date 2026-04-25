# SYSTEM-WIDE REMAINING BATCHES CATALOG

Ngay cap nhat: 2026-04-25
Nguon tong hop: release backbone todos + critical closeout todos + expansion/backlog docs + current API/UI/test surface

## Danh sach batch lon con lai

1. **[RB-01] Face runtime production readiness (inference + liveness)**
- Outcome cho end-user: diem danh khuon mat chay that, giam fallback manual.
- Pham vi: `src/lib/biometrics/face-runtime.ts`, route attendance face, teacher/admin biometric pages, audit/alerts.
- Blocker/risk: hieu nang runtime, false accept/reject, phu thuoc model assets.
- DoD/test: runtime success/no-match/low-quality/multi-face + route/page regression + UAT actor.
- Do lon: XL.

2. **[RB-02] Mobile QR/Camera deep-link E2E reliability**
- Outcome cho end-user: hoc vien thao tac notification/link check-in tren mobile on dinh.
- Pham vi: student check-in flow, notification CTA routes, camera fallback UX, auth redirect.
- Blocker/risk: secure-context policy HTTP LAN khong bypass duoc bang frontend.
- DoD/test: E2E mobile chain (tap notification -> login -> auto check-in), fallback message ro rang.
- Do lon: L.

3. **[RB-03] Timezone VN residual sweep (UI + export filename + content date)**
- Outcome cho end-user: ngay gio dong nhat theo VN, ten file xuat khong drift timezone.
- Pham vi: module admin/teacher/student con `toLocaleString/new Date` residual, export routes/page fallback.
- Blocker/risk: surface lon, de phat sinh mismatch contract neu sua khong theo cum.
- DoD/test: route/page timezone regression bundle + build pass.
- Cap nhat 2026-04-25: da hoan thanh them cum `/api/admin/database/backup` + `/api/admin/database/restore` sang timestamp VN (batch 9.84); RB-03 con residual cleanup mojibake + timezone sweep tiep theo domain.
- Cap nhat 2026-04-25 (tiep): da chuan hoa `Content-Disposition` (co `filename` + `filename*`) cho cum export activity attendance/participants + qr scans + teacher poll responses qua helper `buildAttachmentContentDisposition` (batch 9.88); RB-03 con cac route export khac chua migrate.
- Do lon: XL.

4. **[RB-04] Poll UI text cleanup + final page parity residual**
- Outcome cho end-user: poll teacher/student hien thi text nhat quan, khong mojibake, page-level parity day du.
- Pham vi: `src/app/teacher/polls/[id]/page.tsx`, `src/app/student/polls/page.tsx`, poll page regressions.
- Blocker/risk: sua text/page lon de va cham snapshot va i18n khong chuan.
- DoD/test: page tests cho detail/vote/results, zero mojibake o poll pages user-facing.
- Cap nhat 2026-04-25: da hoan thanh trong batch 9.83 (UI text cleanup + page regression tests), RB-04 dong.
- Do lon: L.

5. **[RB-05] Admin override + audit completeness**
- Outcome cho end-user: khi co su co attendance/scoring, admin can thiep co ly do va trace day du.
- Pham vi: attendance/evaluation/scoring/admin repair routes, audit logs, admin surfaces.
- Blocker/risk: quyen override va nghiep vu can Decision Gate.
- DoD/test: override matrix + reason capture + audit consistency regression.
- Do lon: XL.

6. **[RB-06] Mandatory participation lifecycle hardening**
- Outcome cho end-user: mandatory targets duoc tao/quan ly dung timing va status sau duyet/xuat ban.
- Pham vi: approval/publish pipeline, participation generation jobs, student visibility/status.
- Blocker/risk: xu ly khoi luong lon va idempotency.
- DoD/test: generation after approval/publish + retry-safe + student/admin/teacher parity.
- Do lon: XL.

7. **[RB-07] Post-publish edit/reapproval workflow**
- Outcome cho end-user: sua hoat dong sau publish co quy trinh ro, thong bao nguoi bi anh huong.
- Pham vi: activity versioning, submit-resubmit, approval history, notification fanout.
- Blocker/risk: de va cham voi state machine hien tai.
- DoD/test: recall/edit/reapprove scenarios + participant notification + audit.
- Do lon: XL.

8. **[RB-08] Overdue/not-held/archive operational model**
- Outcome cho end-user: hoat dong qua han/khong to chuc co ket qua van hanh ro rang.
- Pham vi: status model, cron lifecycle, archive/reason hub, filters/reports.
- Blocker/risk: quyet dinh nghiep vu completed/cancelled/not-held.
- DoD/test: lifecycle transitions + filter/report consistency + docs rule matrix.
- Do lon: XL.

9. **[RB-09] Actor-wide filter/sort/pagination/performance standard**
- Outcome cho end-user: danh sach admin/teacher/student dung de, nhanh, khong lech hanh vi.
- Pham vi: list-heavy pages, shared filter pattern, pagination defaults, realtime freshness.
- Blocker/risk: pham vi rong, de tung bug nho neu khong gom batch hop ly.
- DoD/test: audit matrix theo actor + perf guard rails + route/page regressions.
- Do lon: XL.

10. **[RB-10] Repository hygiene + docs conflict reconciliation (bat buoc)**
- Outcome cho end-user: release nhat quan, team dev khong bi nghen do tai lieu/ma nguon rac/xung dot.
- Pham vi:
  - don file khong gia tri/trung lap (scripts/docs legacy, quarantine khong dung),
  - gom file co the gom ma khong doi nghia nghiep vu,
  - cap nhat tai lieu xung dot/loi thoi de phan anh dung state hien tai.
- Cap nhat 2026-04-25: da khoi phuc xong cum script maintenance bi hong encoding (`backup-db`, `validate-project`, `fix-project`, `add-workflow-cols`, `db-analysis-and-reset`); RB-10 con phan docs/legacy cleanup va hop nhat tai lieu.
- Cap nhat 2026-04-25 (tiep): da bo sung route parity cho Admin backup management (`/api/admin/database/backups`, `/api/admin/database/backups/[filename]`) de khop consumer `/admin/backup`.
- Cap nhat 2026-04-25 (tiep 2): da don text mojibake + khoa page regression cho `/admin/backup` (`test/admin-backup-page.test.tsx`); RB-10 con phan dọn docs legacy va reconciliation toan repository.
- Blocker/risk: xoa nham tai lieu tham chieu con dung.
- DoD/test: manifest truoc-sau cleanup + link/docs integrity checks + build/test smoke.
- Do lon: L.

## Cach chon batch de thuc thi

Hay chon danh sach so batch can thuc thi (vi du: `1,3,4,10`).
Khi nhan danh sach so, se lap 1 execution plan hop nhat cho tat ca batch da chon:
- thu tu toi uu + dependencies,
- patch cum lon de tiet kiem request,
- danh sach file du kien sua,
- test bundle va checkpoint commit.
