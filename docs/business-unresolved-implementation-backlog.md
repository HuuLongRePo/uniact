# BUSINESS UNRESOLVED IMPLEMENTATION BACKLOG

Status: extracted from prior business questions/answers and compared against current implementation reality

## Why this exists
These items were already asked and partially answered in prior business docs, but they are still not fully implemented or not yet made explicit in current code/UI.

## P0 - Activity scope model closeout
### Still unresolved / incomplete
- explicit global-open / all-students activity scope
- direct student targeting in CRUD flow
- full mixed target model beyond class-only UI

### Prior business basis
- `D9`, `D10`, `D19`, `D20`, `D21`

## P0 - Mandatory participation creation after approval
### Still unresolved / incomplete
- participation auto-generation timing for mandatory targets after approval
- distinction between approved vs fully published while generation is processing
- safe bulk strategy for large target sets

### Prior business basis
- `D14`, `D15`, `D16`, `D17`, `D18`

## P0 - Admin override + audit completeness
### Still unresolved / incomplete
- full admin intervention parity across attendance/evaluation/scoring/repair
- explicit override reason capture everywhere sensitive
- consistent audit trail for admin repairs

### Prior business basis
- `Q3`, `D3`, `D4`, `D6`

## P1 - Student mandatory/exemption lifecycle
### Still unresolved / incomplete
- exemption / approved absence request flow for mandatory activities
- distinction between `exempted` and `approved_absence`
- scoring impact and UI explanation for those states

### Prior business basis
- `D22`, `D23`, `D24`

## P1 - Teacher multi-scope targeting UX
### Still unresolved / incomplete
- group/organization targeting beyond classes
- direct-student targeting UX
- preview explanation for why a student is included

### Prior business basis
- `Q1`, `Q2`, `Q6`, `D10`, `D12`, `D13`

## P1 - Post-publish change workflow
### Still unresolved / incomplete
- recall/edit/reapproval path after publish
- version snapshots before/after change
- notify registered students and exceptional cancel rights after major approved changes

### Prior business basis
- `Q9`, `D8`

## P1 - Overdue/not-held/archive operational model
### Still unresolved / incomplete
- non-held activity outcome model
- archive/reason hub
- conflict/non-occurrence operational handling

### Prior business basis
- derived from current issue set, not fully closed in prior docs

## P1 - Actor-wide compact filter/pagination/realtime/performance standard
### Still unresolved / incomplete
- actor-page audit matrix execution
- compact advanced filter design rollout
- realtime freshness model by feature
- performance discipline on heavy pages/lists

### Prior business basis
- derived from recent issue set and active docs

## Recommended execution order after current Batch 1
1. Finish explicit global-open scope Batch 1
2. Mandatory participation generation lifecycle
3. Admin override + audit completeness
4. Student exemption/approved absence lifecycle
5. Post-publish change workflow
6. Overdue/archive model
7. Filter/pagination/realtime/performance rollout
