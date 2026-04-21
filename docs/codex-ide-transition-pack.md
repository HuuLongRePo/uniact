# CODEX IDE TRANSITION PACK (NO VSCODE)

Ngay cap nhat: 2026-04-21
Pham vi: Tai lieu handoff de chuyen han sang Codex IDE va tiep tuc release backbone.

---

## 1) Muc tieu tai lieu
- Chuan hoa cach lam viec trong Codex IDE de khong phu thuoc VSCode.
- Dam bao tiep tuc dung luong: Audit -> Code -> Test -> Commit theo batch.
- Co prompt mau, command mau, va checklist mau de bat dau nhanh.

---

## 2) One-time setup trong Codex IDE
1. Mo workspace: `c:\Users\nhuul\Downloads\uniact`
2. Kiem tra env:
   - `Copy-Item .env.example .env` (neu chua co `.env`)
   - bo sung `JWT_SECRET` trong `.env`
3. Cai dependencies:
   - `npm install`
4. Khoi tao DB + seed:
   - `npm run db:migrate`
   - `npm run seed:qa`
5. Chay smoke build:
   - `npm run build`
   - `npm start`

Neu can mode dev:
- `npm run dev`

---

## 3) Prompt khoi dong chuan cho moi session Codex IDE
Copy prompt duoi day vao message dau tien:

```text
Tiep tuc release backbone theo docs/release-backbone-batch-todos.md.
Lam theo nguyen tac: Plan first, code later; patch nho; test theo cum lien quan; cap nhat docs sau moi batch.
Neu gap quyet dinh nghiep vu, dung lai va tao Decision Gate dang trac nghiem (2-4 lua chon, co khuyen nghi).
Uu tien: tinh nang da co thi fix loi + go diem nghen; tinh nang moi lam theo thu tu batch.
Moi lan bao cao can co:
1) File da sua
2) Test da chay + ket qua
3) Risk con lai
4) Buoc tiep theo
```

---

## 4) Prompt mau theo tinh huong

### 4.1 Prompt bat dau batch moi
```text
Bat dau Batch <N> trong docs/release-backbone-batch-todos.md.
Buoc 1: audit va liet ke file can sua.
Buoc 2: de xuat patch theo thu tu uu tien.
Buoc 3: code ngay cac phan da ro.
Buoc 4: test theo cum route/page lien quan.
Buoc 5: cap nhat checklist batch va tong hop ket qua.
Khong dump full file, chi patch can thiet.
```

### 4.2 Prompt tiep tuc khi dang do
```text
Tiep tuc phan dang do cua batch hien tai.
Doc lai file docs/release-backbone-batch-todos.md va docs/codex-ide-transition-pack.md.
Khong lam lai viec da xong, chi xu ly phan con ton.
```

### 4.3 Prompt Decision Gate (khi can chot logic)
```text
Dung code va mo Decision Gate cho nghiep vu sau: <mo ta ngan>.
Tra ve dang trac nghiem:
- A/B/C (toi da 4 lua chon)
- tac dong cua tung lua chon
- khuyen nghi lua chon tot nhat
Chi code tiep sau khi toi chot dap an.
```

---

## 5) Workflow chuan moi batch trong Codex IDE
1. Audit scope:
   - Doc docs batch
   - `rg` de khoanh vung file
2. Implement patch nho:
   - Uu tien file user-facing truoc
   - Tranh sua lan man ngoai scope
3. Chay test theo cum:
   - route test
   - page/component test
4. Cap nhat tai lieu:
   - tick checklist trong `docs/release-backbone-batch-todos.md`
   - ghi note neu co risk/defer
5. Chuan bi commit:
   - commit theo batch/chu de ro rang

---

## 6) Command runbook nhanh (copy)

### 6.1 Tinh trang repo
```powershell
git status --short
git diff --name-only
```

### 6.2 Tim file nhanh
```powershell
rg -n "<pattern>" src test docs
```

### 6.3 Test theo backbone
```powershell
npm run test:core-flows
npm run test:admin-reports
npm run test:backbone
```

### 6.4 Test chi dinh file
```powershell
npm test -- test/<file>.test.ts
npm test -- test/<file>.test.tsx
```

### 6.5 Build/Release sanity
```powershell
npm run build
npm start
npm run release:check:fast
```

---

## 7) Trang thai handoff hien tai

### 7.1 Batch 1
- Da hoan tat audit + refactor text + fix duplicate Organization Level.
- Da don thong diep API tieng Anh con sot trong scope user-facing.
- Da cap nhat checklist Batch 1 trong `docs/release-backbone-batch-todos.md`.

### 7.2 Batch tiep theo de lam ngay
- Batch 2: Realtime notification infrastructure.
- Thu tu de xuat:
  1. Chot transport (SSE uu tien)
  2. Dung event model
  3. Tao toast UI truoc
  4. Noi stream/push vao route

---

## 8) File uu tien doc truoc khi code
1. `docs/release-backbone-batch-todos.md`
2. `README.md`
3. `CANONICAL_DOCS.md`
4. `RELEASE_AND_QA.md`
5. `docs/SYSTEM_FLOWS_DIAGRAM.md`

---

## 9) Quy uoc commit de tranh roi context
- Nhanh, nho, theo batch:
  - `batch-1: api message vi localization`
  - `batch-2: realtime toast base ui`
- Moi commit phai co:
  - danh sach file doi
  - test da chay
  - risk/defer neu co

---

## 10) Mau bao cao ket qua moi turn
```text
Ket qua:
1) Da sua:
- <file 1>
- <file 2>

2) Test:
- <lenh 1>: PASS/FAIL
- <lenh 2>: PASS/FAIL

3) Risk con lai:
- <risk 1>

4) Buoc tiep:
- <next 1>
```

---

## 11) Luu y van hanh quan trong
- Neu thay unexpected change do nguoi khac sua, dung va xac nhan lai truoc khi tiep tuc.
- Khong dung lenh destructive (`git reset --hard`, `git checkout --`) neu chua duoc yeu cau ro rang.
- Neu command test/build bi chan boi sandbox, xin escalate de chay ngoai sandbox.
- Uu tien sua dung root cause, khong chi sua symptom tren UI.

