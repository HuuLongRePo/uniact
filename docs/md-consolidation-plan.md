# Markdown Consolidation Plan

This document audits the current Markdown sprawl in the UniAct repo and proposes the smallest logical active-doc set that still preserves clear source-of-truth boundaries.

---

# PHẦN A. INVENTORY

## 1. Root, active product and project docs
- `README.md`
- `CANONICAL_DOCS.md`
- `CORE_PRODUCT_FLOW.md`
- `PROJECT_AUDIT.md`
- `BUSINESS_QUESTIONS.md`
- `BUSINESS_DECISIONS.md`
- `TASK_QUEUE.md`

## 2. Active release / QA / RC docs in `docs/`
- `docs/decision-implementation-matrix.md`
- `docs/deep-system-flow-and-manual-test-scenarios.md`
- `docs/manual-qa-checklist-web-rc.md`
- `docs/qa-issue-intake-template.md`
- `docs/release-blocker-matrix.md`
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`
- `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`
- `docs/SYSTEM_FLOWS_DIAGRAM.md`
- `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md`
- `docs/web-release-readiness-report.md`
- `docs/INTERNAL_RC_ANNOUNCEMENT_TEMPLATE_2026-04-12.md`
- `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`
- `docs/INTERNAL_RC_TAGGING_PLAN_2026-04-12.md`
- `docs/INTERNAL_RELEASE_NOTE_2026-04-12.md`

## 3. Archive clusters
- `docs/archive/docs-guides-legacy-2026-04-13/*`
- `docs/archive/docs-legacy-2026-04-13/*`
- `docs/archive/docs-reports-legacy-2026-04-13/*`
- `docs/archive/root-legacy/*`

## 4. Thesis / de-tai cluster
- `de-tai/*`

## 5. Miscellaneous non-core repo docs
- `quarantine/corrupted-tests/README.md`
- `src/components/VIP_PROCEDURE_UNIACT.md`
- `test/uat/README.md`

---

# PHẦN B. PHÂN LOẠI

## 1. Setup / onboarding / repo entry
### Files
- `README.md`
- `CANONICAL_DOCS.md`

### Purpose thật
- repo entry
- setup/runtime/test/seed source-of-truth
- docs map

### Audience
- dev
- QA
- release owner

### Status
- active

### Overlap
- overlaps partly with legacy install/dev guides in archive

## 2. Product / business source-of-truth
### Files
- `CORE_PRODUCT_FLOW.md`
- `BUSINESS_QUESTIONS.md`
- `BUSINESS_DECISIONS.md`

### Purpose thật
- define backbone flows
- define open questions
- define confirmed business decisions

### Audience
- product + engineer + QA

### Status
- active

### Overlap
- overlaps with `decision-implementation-matrix.md` and some archived planning docs

## 3. Technical / audit / active implementation state
### Files
- `PROJECT_AUDIT.md`
- `TASK_QUEUE.md`
- `docs/decision-implementation-matrix.md`

### Purpose thật
- current audit / implementation queue / decision-to-code mapping

### Audience
- engineering execution

### Status
- active

### Overlap
- overlaps with some roadmap/summary/archive docs and portions of release docs

## 4. Release / QA / readiness cluster
### Files
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

### Purpose thật
- readiness assessment
- manual QA
- smoke execution
- blocker triage
- release communication

### Audience
- QA
- release owner
- internal stakeholders

### Status
- active, but fragmented

### Overlap
- very high overlap between readiness report, checklist, blocker matrix, deep scenarios, RC checklist, smoke checklist, RC summary

## 5. Diagram / explanatory support
### Files
- `docs/SYSTEM_FLOWS_DIAGRAM.md`

### Purpose thật
- visual/structural support for system flow understanding

### Audience
- product, dev, QA

### Status
- active if still updated

### Overlap
- overlaps conceptually with deep flow/scenario docs, but different format

## 6. Archive clusters
### Purpose thật
- historical context
- prior plans, audits, guides, release notes, bug reports

### Audience
- only when archaeology is needed

### Status
- obsolete / historical

### Overlap
- massive overlap with current active docs

## 7. `de-tai` cluster
### Purpose thật
- thesis/report deliverable, not operational product docs

### Audience
- academic/reporting

### Status
- separate track, not part of active product source-of-truth

### Overlap
- some conceptual overlap with system/business docs, but different lifecycle and audience

---

# PHẦN C. PROPOSAL GỘP FILE TỐI THIỂU

## Recommended minimal active doc set

### 1. `README.md`
Keep as repo entry and setup/runtime/seed guide.

### 2. `PRODUCT_AND_BUSINESS.md`
Merge into one active product source-of-truth:
- `CORE_PRODUCT_FLOW.md`
- `BUSINESS_QUESTIONS.md`
- `BUSINESS_DECISIONS.md`

### 3. `ENGINEERING_STATE.md`
Merge active engineering execution docs:
- `PROJECT_AUDIT.md`
- `TASK_QUEUE.md`
- `docs/decision-implementation-matrix.md`

### 4. `RELEASE_AND_QA.md`
Merge active RC/release/QA docs:
- `docs/web-release-readiness-report.md`
- `docs/manual-qa-checklist-web-rc.md`
- `docs/release-blocker-matrix.md`
- `docs/qa-issue-intake-template.md`
- `docs/deep-system-flow-and-manual-test-scenarios.md`
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`
- `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md`
- `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md`

### 5. `RELEASE_COMMS.md`
Merge release communication/support docs:
- `docs/INTERNAL_RC_SUMMARY_2026-04-12.md`
- `docs/INTERNAL_RELEASE_NOTE_2026-04-12.md`
- `docs/INTERNAL_RC_TAGGING_PLAN_2026-04-12.md`
- `docs/INTERNAL_RC_ANNOUNCEMENT_TEMPLATE_2026-04-12.md`

### 6. `SYSTEM_FLOWS_DIAGRAM.md`
Keep separate if it genuinely provides diagram-first value.

### 7. `CANONICAL_DOCS.md`
Keep, but rewrite to point only to the new minimal set.

## Final count for active operational docs
- `README.md`
- `CANONICAL_DOCS.md`
- `PRODUCT_AND_BUSINESS.md`
- `ENGINEERING_STATE.md`
- `RELEASE_AND_QA.md`
- `RELEASE_COMMS.md`
- `SYSTEM_FLOWS_DIAGRAM.md`

That is the smallest clean active set I recommend for operational docs.

## Even more minimal option
If you want absolute minimum:
- `README.md`
- `CANONICAL_DOCS.md`
- `PRODUCT_AND_BUSINESS.md`
- `ENGINEERING_AND_RELEASE.md`
- `SYSTEM_FLOWS_DIAGRAM.md`

This is smaller, but riskier because engineering state + QA + release comms become too crowded.

---

# PHẦN D. MERGE MAP CỤ THỂ

| Current file | Action | Target | Notes |
|---|---|---|---|
| `README.md` | Keep | `README.md` | Primary repo entry |
| `CANONICAL_DOCS.md` | Keep + rewrite | `CANONICAL_DOCS.md` | Point to new minimal set |
| `CORE_PRODUCT_FLOW.md` | Merge | `PRODUCT_AND_BUSINESS.md` | Backbone flow section |
| `BUSINESS_QUESTIONS.md` | Merge | `PRODUCT_AND_BUSINESS.md` | Open questions section |
| `BUSINESS_DECISIONS.md` | Merge | `PRODUCT_AND_BUSINESS.md` | Confirmed decisions section |
| `PROJECT_AUDIT.md` | Merge | `ENGINEERING_STATE.md` | Audit section |
| `TASK_QUEUE.md` | Merge | `ENGINEERING_STATE.md` | Active queue section |
| `docs/decision-implementation-matrix.md` | Merge | `ENGINEERING_STATE.md` | Matrix section |
| `docs/web-release-readiness-report.md` | Merge | `RELEASE_AND_QA.md` | Readiness section |
| `docs/manual-qa-checklist-web-rc.md` | Merge | `RELEASE_AND_QA.md` | QA checklist section |
| `docs/release-blocker-matrix.md` | Merge | `RELEASE_AND_QA.md` | Blocker triage section |
| `docs/qa-issue-intake-template.md` | Merge | `RELEASE_AND_QA.md` | Issue intake appendix |
| `docs/deep-system-flow-and-manual-test-scenarios.md` | Merge | `RELEASE_AND_QA.md` | Deep scenarios section |
| `docs/RELEASE_CANDIDATE_CHECKLIST.md` | Merge | `RELEASE_AND_QA.md` | RC checklist section |
| `docs/TARGETED_MANUAL_SMOKE_CHECKLIST.md` | Merge | `RELEASE_AND_QA.md` | Smoke checklist subsection |
| `docs/SMOKE_EXECUTION_PLAN_2026-04-12.md` | Merge | `RELEASE_AND_QA.md` | Smoke plan subsection |
| `docs/INTERNAL_RC_SUMMARY_2026-04-12.md` | Merge | `RELEASE_COMMS.md` | Summary section |
| `docs/INTERNAL_RELEASE_NOTE_2026-04-12.md` | Merge | `RELEASE_COMMS.md` | Release note section |
| `docs/INTERNAL_RC_TAGGING_PLAN_2026-04-12.md` | Merge | `RELEASE_COMMS.md` | Tagging section |
| `docs/INTERNAL_RC_ANNOUNCEMENT_TEMPLATE_2026-04-12.md` | Merge | `RELEASE_COMMS.md` | Announcement templates |
| `docs/SYSTEM_FLOWS_DIAGRAM.md` | Keep | `docs/SYSTEM_FLOWS_DIAGRAM.md` | Separate diagram artifact |
| `docs/archive/**` | Keep archived | Archive | Do not merge into active docs |
| `de-tai/**` | Keep separate | Academic track | Different audience/lifecycle |
| `quarantine/corrupted-tests/README.md` | Keep separate | Same path | Operational local note |
| `src/components/VIP_PROCEDURE_UNIACT.md` | Review separately | maybe move to archive or feature docs | Not core source-of-truth |
| `test/uat/README.md` | Keep separate | Same path | UAT runner context |

---

# PHẦN E. REDUNDANCY / BLOAT ANALYSIS

## Biggest redundancy clusters
### 1. Release / QA / RC cluster
This is the heaviest duplication zone.
Repeated concepts appear across:
- readiness report
- blocker matrix
- manual QA checklist
- deep system flow scenarios
- RC checklist
- smoke checklist
- smoke execution plan
- RC summary

### 2. Product/business planning cluster
Repeated concepts appear across:
- core product flow
- business questions
- business decisions
- decision implementation matrix
- project audit

### 3. Historical docs archive
The archive retains many earlier variants of:
- roadmap
- release plan
- audit
- cleanup plan
- bug reports
- manual test checklists

This is acceptable as archive, but dangerous if active docs still duplicate them.

## Highest source-of-truth risk
- business rules split across multiple files
- release status split across multiple small docs
- QA guidance spread across readiness/checklist/matrix/scenario files
- engineering execution split between audit, queue, and matrix

## Where updates are easiest to miss
- changing a business rule in one file but not the others
- changing RC status but not updating blocker matrix/checklist/report
- changing test priorities but not scenario docs

---

# PHẦN F. KHUYẾN NGHỊ CẤU TRÚC CUỐI

## Option 1. Absolute minimum
- `README.md`
- `CANONICAL_DOCS.md`
- `PRODUCT_AND_BUSINESS.md`
- `ENGINEERING_AND_RELEASE.md`
- `SYSTEM_FLOWS_DIAGRAM.md`

### Pros
- extremely few files
- hard to lose track

### Cons
- one huge engineering/release doc becomes unwieldy
- mixed audience problem

## Option 2. Balanced minimal structure (recommended)
- `README.md`
- `CANONICAL_DOCS.md`
- `PRODUCT_AND_BUSINESS.md`
- `ENGINEERING_STATE.md`
- `RELEASE_AND_QA.md`
- `RELEASE_COMMS.md`
- `SYSTEM_FLOWS_DIAGRAM.md`

### Pros
- still very small active set
- clearer separation by audience and lifecycle
- less risk of giant unmaintainable mega-file

### Cons
- not the absolute minimum possible

## Recommendation
Choose **Option 2**.
It is the smallest structure that is still practical and maintainable.

---

# PHẦN G. KẾ HOẠCH THỰC THI

## Step 1. Freeze active source-of-truth boundaries
- Decide the target set:
  - `PRODUCT_AND_BUSINESS.md`
  - `ENGINEERING_STATE.md`
  - `RELEASE_AND_QA.md`
  - `RELEASE_COMMS.md`

## Step 2. Merge product/business docs first
- merge `CORE_PRODUCT_FLOW.md`
- merge `BUSINESS_QUESTIONS.md`
- merge `BUSINESS_DECISIONS.md`
- then archive or delete old active copies after verification

## Step 3. Merge engineering-state docs
- merge `PROJECT_AUDIT.md`
- merge `TASK_QUEUE.md`
- merge `docs/decision-implementation-matrix.md`

## Step 4. Merge release/QA docs
- merge readiness/checklist/matrix/scenario/smoke docs into `RELEASE_AND_QA.md`
- preserve sections and headings so no information is lost

## Step 5. Merge release communication docs
- consolidate summary/release-note/tagging/announcement into `RELEASE_COMMS.md`

## Step 6. Rewrite `CANONICAL_DOCS.md`
- point to only the new active set
- explicitly mark archive clusters as historical
- explicitly exclude `de-tai/` from active operational docs

## Step 7. Archive or delete superseded active files
- move old individual active docs into archive snapshot folder, or delete after confirming git history is enough
- safer route: move to `docs/archive/post-consolidation-YYYY-MM-DD/`

## Step 8. Link cleanup
- update internal references in README and canonical docs
- check no active docs point to removed filenames

## Step 9. Validation pass
- verify every major domain still has one obvious source-of-truth
- verify no domain is split unnecessarily across multiple active files

## Safe execution principle
Do not delete old docs before the consolidated files are reviewed once. Merge first, review second, archive/delete last.

---

# FINAL PRACTICAL TAKE

For active operational docs, the repo should likely shrink to **7 core files** plus archive and thesis/UAT side tracks.

That is the best balance between:
- minimum file count
- low duplication
- clear source-of-truth
- maintainability
