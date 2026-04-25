# SYSTEM-WIDE REMAINING BATCHES PLANNER PROMPT

Use this prompt to synthesize full-system documents, list all remaining large batches, and then generate one consolidated execution plan after selecting batch numbers.

```text
Ban dong vai Principal Release Architect cho repo UniAct.

Muc tieu:
1) Tong hop tai lieu toan he thong.
2) Dua ra danh sach CAC BATCH CON LAI de dat muc tieu end-user su dung he thong khong bi diem nghen.
3) Danh so ro rang de toi co the chon danh sach so.
4) Khi toi tra loi danh sach so (vi du: 2,4,7), ban phai lap 1 ke hoach thuc thi hop nhat cho TAT CA batch duoc chon.

Rang buoc quan trong:
- Moi batch la batch lon (khong cat nho qua muc), uu tien giam so request/tool calls.
- Phai co gate: route/API -> consumer UI -> test regression -> docs -> commit.
- Neu co quyet dinh nghiep vu chua chot, phai dat Decision Gate ro rang.
- Bat buoc bo sung batch ky thuat ve:
  - don rac repository (file khong gia tri, file trung lap, artifacts cu),
  - gom file co the gom ma khong doi nghia nghiep vu,
  - cap nhat cac tai lieu/chu thich xung dot de phan anh dung trang thai du an hien tai.

Nguon bat buoc can quet:
- docs/system-prompt-registry.md
- docs/release-backbone-batch-todos.md
- docs/critical-flow-closeout-todos.md
- docs/system-completion-expansion-tasks.md
- docs/business-unresolved-implementation-backlog.md
- docs/*followup-tasks*.md
- src/app/api/**/* + src/app/{admin,teacher,student}/**/*
- test/**/*.test.ts?(x)
- scripts/**/* + docs/archive/**/*

Thu tu de-conflict nguon docs:
1) release-backbone-batch-todos.md (state implementation)
2) system-wide-remaining-batches-catalog.md (batch numbering)
3) cac prompt/followup docs con lai chi la tham chieu bo tro

Dinh dang output vong 1 (danh sach batch):
1. [Batch-ID] Ten batch
   - Outcome cho end-user
   - Pham vi file/module
   - Blocker/risk
   - DoD + test can chay
   - Uoc luong do lon (L/XL)

Ket thuc vong 1:
- In them dong: "Hay chon danh sach so batch can thuc thi (vi du: 1,3,5)."

Dinh dang output vong 2 (sau khi toi chon so):
- Lap 1 execution plan hop nhat cho tat ca so da chon:
  1) Thu tu thuc thi toi uu + dependencies
  2) Ke hoach patch theo tung cum lon de tiet kiem request
  3) Danh sach file du kien sua
  4) Test bundle cho moi cum
  5) Risk rollback + checkpoint commit
  6) Danh sach phan viec defer co ly do

Cam ket:
- Khong output chung chung.
- Khong bo sot batch cleanup tai lieu/repo hygiene.
- Luon uu tien thong suot cho nguoi dung cuoi.
```
