# CANONICAL DOCS - UNIACT

Updated status: consolidated active-doc structure

This file is the map of what should be treated as active source-of-truth versus archive/reference material.

---

## 1. Active canonical doc set
Read these first.

### A. Repo entry and setup
1. `README.md`
2. `CANONICAL_DOCS.md`

### B. Product and business source-of-truth
3. `PRODUCT_AND_BUSINESS.md`

### C. Active engineering execution state
4. `ENGINEERING_STATE.md`

### D. Release, QA, blocker, and issue-triage source-of-truth
5. `RELEASE_AND_QA.md`

### E. Internal release communication reference
6. `RELEASE_COMMS.md`

### F. Diagram support
7. `docs/SYSTEM_FLOWS_DIAGRAM.md`

---

## 2. Reading order by objective

### If you want to take over and continue execution
1. `README.md`
2. `CANONICAL_DOCS.md`
3. `PRODUCT_AND_BUSINESS.md`
4. `ENGINEERING_STATE.md`
5. `RELEASE_AND_QA.md`

### If you want to understand the product and business logic
1. `README.md`
2. `PRODUCT_AND_BUSINESS.md`
3. `docs/SYSTEM_FLOWS_DIAGRAM.md`

### If you want to make release or QA decisions
1. `README.md`
2. `RELEASE_AND_QA.md`
3. `RELEASE_COMMS.md`

---

## 3. What is no longer primary source-of-truth
These may still contain useful information, but should not be treated as the active canonical set anymore once consolidation is adopted.

### Older active-doc fragments now superseded by the consolidated structure
- `CORE_PRODUCT_FLOW.md`
- `BUSINESS_QUESTIONS.md`
- `BUSINESS_DECISIONS.md`
- `PROJECT_AUDIT.md`
- `TASK_QUEUE.md`
- `docs/decision-implementation-matrix.md`
- `docs/web-release-readiness-report.md`
- `docs/manual-qa-checklist-web-rc.md`
- `docs/release-blocker-matrix.md`
- `docs/qa-issue-intake-template.md`
- `docs/deep-system-flow-and-manual-test-scenarios.md`
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`
- `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md`
- `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`
- `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`
- `docs/INTERNAL_RELEASE_NOTE_2026-04-12.md`
- `docs/INTERNAL_RC_TAGGING_PLAN_2026-04-12.md`
- `docs/INTERNAL_RC_ANNOUNCEMENT_TEMPLATE_2026-04-12.md`

These should either be archived or retained only as historical fragments during the consolidation transition.

---

## 4. Archive and side tracks

### Archive
- `docs/archive/**`
- historical snapshots, reports, plans, bug logs, and previous checklists
- useful for archaeology only

### Academic / thesis track
- `de-tai/**`
- separate audience and lifecycle
- not part of the active operational source-of-truth for the web product

### Local/special-purpose notes that may remain separate
- `test/uat/README.md`
- `quarantine/**`
- narrowly scoped feature or local operational notes that are not core source-of-truth

---

## 5. Update rule from now on
- Update the consolidated active docs first.
- Do not create a new active top-level status doc if the content belongs in one of the canonical files above.
- If a document is just a snapshot, report, or one-off plan, label it clearly as historical/report or move it into archive.

---

## 6. Practical summary
The active UniAct operational doc system should now be treated as a **small consolidated set**, not a large fragmented collection of overlapping markdown files.
