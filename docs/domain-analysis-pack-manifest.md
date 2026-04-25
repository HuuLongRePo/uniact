# DOMAIN ANALYSIS PACK MANIFEST

Ngay cap nhat: 2026-04-25  
Muc tieu: chot danh muc domain analysis packs dang active de planner quet dung nguon va giam trung lap prompt docs.

## 1) Active domain packs

1. `DP-01` Teacher activity scope/UX
- Prompt: `docs/teacher-activity-scope-and-ux-analysis-prompt-v2.md`
- Tasks: `docs/teacher-activity-scope-and-ux-next-batches.md`, `docs/teacher-activity-form-followup-tasks.md`
- Trang thai: ACTIVE

2. `DP-02` Teacher cross-class activity management
- Prompt: `docs/teacher-cross-class-activity-management-analysis-prompt.md`
- Tasks: `docs/teacher-cross-class-activity-management-followup-tasks.md`
- Notes: implementation notes o `docs/teacher-cross-class-activity-management-implementation-notes.md`
- Trang thai: ACTIVE

3. `DP-03` Approved activity visibility
- Prompt: `docs/approved-activity-visibility-analysis-prompt.md`
- Tasks: `docs/approved-activity-visibility-followup-tasks.md`
- Trang thai: ACTIVE

4. `DP-04` Student activity visibility
- Prompt: `docs/student-activity-visibility-analysis-prompt.md`
- Tasks: `docs/student-activity-visibility-followup-tasks.md`
- Trang thai: ACTIVE

5. `DP-05` Mandatory participation generation
- Prompt: `docs/mandatory-participation-generation-analysis-prompt.md`
- Tasks: `docs/mandatory-participation-generation-followup-tasks.md`
- Trang thai: ACTIVE

6. `DP-06` Activity overdue/listing
- Prompt: `docs/activity-overdue-and-listing-analysis-prompt.md`
- Tasks: `docs/activity-overdue-and-listing-followup-tasks.md`
- Trang thai: ACTIVE

7. `DP-07` Realtime filters/performance
- Prompt: `docs/realtime-filters-performance-analysis-prompt.md`
- Tasks: `docs/realtime-filters-performance-followup-tasks.md`
- Trang thai: ACTIVE

8. `DP-08` Activity wizard performance
- Prompt: `docs/activity-wizard-performance-analysis-prompt.md`
- Tasks: `docs/activity-wizard-performance-followup-tasks.md`
- Trang thai: ACTIVE

9. `DP-09` Admin attendance/scoring authority
- Prompt: `docs/admin-attendance-scoring-authority-analysis-prompt.md`
- Tasks: `docs/admin-attendance-scoring-authority-followup-tasks.md`
- Trang thai: ACTIVE

10. `DP-10` Admin attendance + actor filters
- Prompt: `docs/admin-attendance-and-actor-filters-analysis-prompt.md`
- Tasks: `docs/actor-filters-pagination-followup-tasks.md`
- Trang thai: ACTIVE

## 2) Reference-only / deprecated prompts

1. `docs/reference-prompts/teacher-activity-form-analysis-prompt.md`
- Ly do: superseded boi `teacher-activity-scope-and-ux-analysis-prompt-v2.md`.
- Trang thai: REFERENCE_ONLY

2. `docs/reference-prompts/md-consolidation-plan.md`
- Ly do: exploratory artifact, khong con dung lam source-of-truth cho planning hien tai.
- Trang thai: REFERENCE_ONLY

## 3) Rule su dung

1. Planner/implementation prompt chi duoc quet danh sach ACTIVE o muc 1 khi tao execution plan.
2. Cac file REFERENCE_ONLY chi dung de tra cuu boi canh lich su, khong duoc override state trong:
- `docs/release-backbone-batch-todos.md`
- `docs/system-wide-remaining-batches-catalog.md`
3. Khi tao pack moi:
- bo sung entry vao manifest nay,
- cap nhat `docs/system-prompt-registry.md` neu can.
