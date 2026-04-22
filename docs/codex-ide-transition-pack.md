# CODEX IDE TRANSITION PACK (CLONE TO NEW MACHINE)

Ngay cap nhat: 2026-04-22  
Pham vi: handoff de clone repo sang may khac va tiep tuc hoan thanh cac luong nong cot bang Codex.

## 1) Snapshot hien tai
- Da hoan tat Batch 1 -> Batch 9.7 theo `docs/release-backbone-batch-todos.md`.
- Da pass:
  - `npm run test:backbone` -> 11 files / 47 tests (2026-04-22).
  - FaceID regression bundle -> 10 files / 41 tests (2026-04-22).
  - `npm run release:check:full` -> 4/4 checks pass (2026-04-22).
  - UAT actor smoke (admin/teacher/student) pass tren dev mode (2026-04-22).
- Blocker truoc RC da dong:
  - Build blocker `ensureActivityStudentScope` + `attendance_status` type mismatch da fix.
  - Schema drift `point_calculations.activity_id/coefficient` da co self-heal/backfill.
  - Decision gate production liveness/matching + embedding retention da chot va implement.

## 2) Clone + bootstrap tren may moi
Chay tu PowerShell:

```powershell
git clone <REPO_URL>
cd uniact
git checkout main
npm install
Copy-Item .env.example .env -ErrorAction SilentlyContinue
```

Cap nhat `.env` toi thieu:
- `JWT_SECRET=<your-secret>`
- (khuyen nghi) `UAT_MODE=1` khi chay UAT local.

Khoi tao DB sach:

```powershell
npm run db:migrate
npm run seed:qa
```

Neu gap schema drift local (cot thieu/khong dong bo), reset DB local roi migrate + seed lai:

```powershell
Remove-Item -LiteralPath .\uniact.db -Force
npm run db:migrate
npm run seed:qa
```

## 3) Smoke gates tren may moi (bat buoc)
1. Regression backbone:
```powershell
npm run test:backbone
```
2. FaceID regression:
```powershell
npm test -- test/admin-biometric-enrollment-route.test.ts test/admin-biometric-training-route.test.ts test/admin-biometric-students-route.test.ts test/admin-biometrics-page.test.tsx test/biometric-candidate-preview-route.test.ts test/biometric-identify-route.test.ts test/biometric-runtime-capability.test.ts test/attendance-runtime-bridge.test.ts test/face-attendance-route.test.ts test/teacher-face-attendance-page.test.tsx
```
3. UAT actor smoke (khi server dang chay):
```powershell
npx playwright test test/uat/actor-admin/02-activity-approval.spec.ts test/uat/actor-teacher/04-qr-refresh-close.spec.ts test/uat/actor-student/02-qr-checkin.spec.ts --reporter=dot
```

## 4) Prompt duy nhat de tiep tuc bang Codex
Dung prompt trong file:
- `docs/codex-clone-coreflows-prompt.md`

Chi can copy nguyen van prompt do lam message dau tien trong Codex session moi.

## 5) Quy tac van hanh khi tiep tuc
- Luon doc:
  - `docs/release-backbone-batch-todos.md`
  - `docs/codex-clone-coreflows-prompt.md`
- Moi turn phai bao cao:
  1. File da sua
  2. Test da chay + ket qua
  3. Risk/defer con lai
  4. Buoc tiep theo
- Neu gap quyet dinh nghiep vu, dung code va mo Decision Gate (2-4 lua chon).
- Khong dung lenh pha huy (`git reset --hard`, `git checkout --`) neu khong duoc yeu cau ro rang.

