# SYSTEM PROMPT REGISTRY

Ngay cap nhat: 2026-04-25
Muc tieu: chot 1 nguon canonical cho toan bo prompt/todo planning docs, giam trung lap va conflict khi lap batch lon.

## 1) Orchestrator canonical (uu tien cao nhat)

1. `docs/release-backbone-batch-todos.md`
- Vai tro: backlog xuyen suot, log batch da lam, risk/defer, verification.
- Trang thai: `CANONICAL`.

2. `docs/system-wide-remaining-batches-catalog.md`
- Vai tro: danh muc batch lon con lai theo RB-ID cho nguoi ra quyet dinh.
- Trang thai: `CANONICAL`.

3. `docs/system-wide-remaining-batches-planner-prompt.md`
- Vai tro: prompt planner 2 vong (liet ke batch -> lap execution plan hop nhat).
- Trang thai: `CANONICAL`.

4. `docs/codex-clone-coreflows-prompt.md`
- Vai tro: prompt khoi dong session thi cong (audit -> patch -> test -> docs -> commit).
- Trang thai: `CANONICAL`.

## 2) Domain analysis packs (tham chieu co dinh huong)

- Manifest canonical: `docs/domain-analysis-pack-manifest.md`
- Rule: planner chi quet cac pack duoc danh dau `ACTIVE` trong manifest.
- Cac prompt/followup ngoai manifest khong duoc coi la domain pack active.

## 3) Prompt docs chi de tham khao (khong lam nguon su that chinh)

- `docs/reference-prompts/codex-batch-prompts.md`
- `docs/reference-prompts/system-completion-expansion-prompts.md`
- `docs/reference-prompts/critical-flow-closeout-prompt.md`
- `docs/reference-prompts/attendance-timezone-face-closeout-prompt.md`
- `docs/reference-prompts/demo-data-refresh-prompt.md`
- `docs/reference-prompts/teacher-activity-form-analysis-prompt.md`
- `docs/reference-prompts/md-consolidation-plan.md`

Nguyen tac:
- Khong dung cac file tren de override backlog canonical.
- Neu xung dot noi dung, uu tien muc 1.

## 4) Rule de-conflict khi gap noi dung trung lap

1. Uu tien `release-backbone-batch-todos.md` cho state implementation.
2. Uu tien `system-wide-remaining-batches-catalog.md` cho danh so batch lon.
3. Prompt nao khac catalog/todos:
- cap nhat prompt de dong bo,
- khong tu y doi state trong catalog/todos neu chua xac thuc bang code+test.

## 5) Rule cleanup cho cac batch tiep theo

- Khi tao prompt moi, phai gan vao 1 trong 2 nhom:
  - `CANONICAL orchestrator`, hoac
  - `Domain analysis pack`.
- Khong tao prompt moi neu noi dung da duoc bao phu boi file canonical.
- Moi batch docs hygiene phai cap nhat file registry nay.
