# SCORE LEDGER INCONSISTENCY AUDIT

Status: active engineering audit artifact

Purpose: map where UniAct scoring surfaces derive totals from different sources, identify the concrete mismatch patterns, and recommend a canonical score-ledger model for the web backbone.

---

## 1. Executive verdict
The score/reporting backbone is materially more stable than before, but the system still does **not** behave as if it has one unambiguous scoring ledger.

The main problem is not only contract drift. It is **semantic drift** between:
- `point_calculations` as participation-scoring truth,
- `student_scores` as aggregated or event-like score entries,
- route/page consumers that sum one source, the other source, or an ad hoc combination of both.

This creates a real risk that different role surfaces show different answers to the same business question:

> “What is this student's real current score?”

---

## 2. The two ledgers currently in play

### A. `point_calculations`
Represents participation-linked scoring details.

Typical characteristics:
- tied to a `participation_id`
- stores base points, coefficient, bonus, penalty, total points
- is the strongest source for explaining how a participation produced a score

Current main producers/consumers:
- producer: `src/lib/scoring-calculator.ts`
- used heavily by:
  - `src/app/api/student/scores/route.ts`
  - `src/app/api/student/history/route.ts`
  - `src/app/api/student/points-breakdown/route.ts`
  - `src/app/api/admin/leaderboard/route.ts`
  - `src/app/api/admin/reports/scores/route.ts`
  - `src/app/api/admin/scores/route.ts`
  - `src/app/api/admin/rankings/route.ts`

### B. `student_scores`
Acts like a score-entry ledger, but its semantics are mixed.

Typical characteristics:
- stores `points`, `source`, optional `activity_id`
- contains at least:
  - `evaluation`
  - `award:*`
  - `adjustment:*`
- is used by many dashboards/reports as if it were the total authoritative score ledger

Current main producers/consumers:
- producer for evaluation: `src/lib/scoring-calculator.ts`
- producer for awards/adjustments:
  - `src/app/api/admin/awards/create/route.ts`
  - `src/app/api/admin/scores/[id]/adjust/route.ts`
- used heavily by:
  - `src/app/api/student/statistics/route.ts`
  - `src/app/api/admin/students/route.ts`
  - `src/app/api/teacher/students/route.ts`
  - `src/app/api/teacher/reports/class-stats/route.ts`
  - many export/chart/profile/dashboard routes

---

## 3. Important current behavior

### 3.1 Evaluation currently writes to both ledgers
`src/lib/scoring-calculator.ts` does two things when saving evaluation results:
1. upserts `point_calculations`
2. upserts `student_scores` with `source = 'evaluation'`

This means the system is already maintaining two related but differently used representations of the same underlying event.

### 3.2 Awards and manual adjustments live in `student_scores`
Awards and admin score adjustments are not modeled as `point_calculations`; they exist in `student_scores`.

This is fine in principle, but it means any total-score surface must explicitly define whether totals include:
- participation scores only,
- participation + awards,
- participation + awards + adjustments,
- or some role-specific subset.

Right now that rule is not consistently encoded.

---

## 4. Concrete mismatch matrix

## 4.1 Student-facing surfaces

### `src/app/api/student/statistics/route.ts`
Uses `student_scores` for:
- total score
- recent score
- rank calculation inputs

Interpretation:
- statistics currently behaves as if `student_scores` is the canonical total ledger.

### `src/app/api/student/scores/route.ts`
Uses `point_calculations` for score history and summary.

Interpretation:
- scores page behaves as if participation-linked calculated scores are the canonical truth.

### `src/app/api/student/history/route.ts`
Uses `point_calculations` for earned points shown in participation history.

Interpretation:
- history behaves as if points are participation-derived first, not total-ledger-derived.

### `src/app/api/student/points-breakdown/route.ts`
Uses:
- `point_calculations` for by-activity/by-type/by-level/by-achievement and base summary
- `student_scores` for awards
- then computes `final_total = grand_total + total_award_points`

Interpretation:
- this route explicitly mixes both ledgers.
- it still omits generic adjustment points from the final total summary.

### Student-facing risk
A student can plausibly see:
- `statistics.totalScore` from all `student_scores`
- `points-breakdown.summary.final_total` from participation totals + awards only
- `scores.summary.total_points` from participation calculations only

Those can all diverge while each route is still “working as coded”.

---

## 4.2 Admin-facing surfaces

### `src/app/api/admin/reports/scores/route.ts`
Computes total report score as:
- participation points from `point_calculations`
- plus award points from `student_scores`
- plus adjustment points from `student_scores`

Interpretation:
- this is the most explicit “final score” model in the current backbone.

### `src/app/api/admin/scores/route.ts`
Computes `total_points` as:
- participation points from `point_calculations`
- plus adjustment points from `student_scores`

But it also exposes `award_points` separately.

Interpretation:
- this route treats awards as visible metadata, but not part of `total_points`.
- that is inconsistent with `admin/reports/scores`, where awards are included in the total report value.

### `src/app/api/admin/leaderboard/route.ts`
Uses only participation-linked points:
- `SUM(COALESCE(pc.total_points, p.points_earned, 0))`

Interpretation:
- leaderboard currently excludes awards and adjustments.

### `src/app/api/admin/rankings/route.ts`
Uses:
- activity points from `point_calculations`
- award points from `student_scores`
- no obvious symmetric adjustment inclusion in the displayed total path

Interpretation:
- rankings semantics do not perfectly match either leaderboard or admin scores or reports scores.

### `src/app/api/admin/students/route.ts`
Uses total points from `student_scores` sums.

Interpretation:
- admin students list behaves as if `student_scores` is authoritative.

### Admin-facing risk
An admin can plausibly see different totals for the same student across:
- students list
- scores page
- leaderboard
- rankings
- score reports

This is the most serious confidence risk in the current score/reporting system.

---

## 4.3 Teacher-facing surfaces

### `src/app/api/teacher/students/route.ts`
Uses `student_scores` total sums.

### `src/app/api/teacher/reports/class-stats/route.ts`
Uses `student_scores` in several class-total/report calculations.

### `src/lib/teacher-dashboard-data.ts`
Also uses `student_scores` for ranked student summaries.

### Teacher-facing risk
Teacher score visibility tends to align with the `student_scores` worldview, not the participation-breakdown worldview.
That increases the chance that teacher-facing totals diverge from some student detail surfaces.

---

## 5. Highest-severity inconsistencies

### Severity A: Student statistics vs student scores vs student points breakdown
These three surfaces can already disagree without any route being obviously broken.

Why severe:
- they are all student-trust surfaces
- they answer nearly the same question with different math

### Severity A: Admin scores vs admin reports scores vs leaderboard vs rankings
These are governance/reporting surfaces.

Why severe:
- admins make decisions from these numbers
- ranking/leaderboard/reporting inconsistencies undermine trust in the whole system

### Severity B: Teacher totals vs student explanatory surfaces
Why important:
- teachers may see a student's score total that the student cannot reconstruct from their own point breakdown/history views

---

## 6. Root cause
The system currently lacks one explicit, documented answer to this question:

> What is the canonical definition of “current total score”?

The codebase implicitly uses at least four competing answers:
1. sum of `student_scores`
2. sum of participation-linked `point_calculations`
3. participation totals + awards
4. participation totals + awards + adjustments

Until one answer is chosen and encoded consistently, scoring/reporting drift will keep reappearing.

---

## 7. Recommended canonical model
Recommendation: adopt a **two-layer model**.

### Layer 1: participation scoring truth
Use `point_calculations` as the canonical explanation ledger for participation-derived points.

This answers:
- why a specific activity gave a specific score
- what the evaluated attendance/achievement produced

### Layer 2: score event ledger
Use `student_scores` as the canonical additive event ledger for final non-participation score effects:
- `evaluation`
- `award:*`
- `adjustment:*`

But document clearly that `student_scores` is the authoritative source for **current total score only if** all participation-derived score writes are mirrored there exactly once and idempotently.

### Practical canonical question split
- “How was this activity score calculated?” -> `point_calculations`
- “What is the student's current final total?” -> normalized aggregation from `student_scores`
- “What is the participation-only total?” -> `point_calculations`

This split is already close to existing behavior, but it is not consistently enforced.

---

## 8. Recommended fix path

## Phase A - declare canonical semantics
Create one short engineering/business note that defines:
- participation-only total
- award total
- adjustment total
- final total
- which UI surfaces should show which number

## Phase B - unify route semantics
### Final-total surfaces should all agree
Likely candidates to use the same normalized final-total query:
- `student/statistics`
- `admin/students`
- `admin/scores`
- `admin/reports/scores`
- `teacher/students`
- `teacher/reports/class-stats`
- leaderboard/rankings, if product wants awards/adjustments to affect ranking

### Participation-detail surfaces should all agree
Likely candidates:
- `student/scores`
- `student/history`
- `student/points-breakdown`
- participation detail exports/reports

## Phase C - explicitly choose ranking semantics
Decide whether ranking/leaderboard is based on:
1. participation-only score
2. final total score including awards and adjustments

This must be explicit. Right now different ranking/reporting surfaces imply different answers.

## Phase D - add regression matrix
Add regression coverage that locks cross-surface consistency for the same seeded student across:
- statistics
- scores
- points breakdown
- admin scores
- admin reports scores
- leaderboard
- rankings

---

## 9. Best next implementation batch
If continuing from this audit, the highest-value implementation batch is:

### `Canonicalize score ledger semantics across student/admin/teacher surfaces`
Scope:
- choose final-total rule
- choose ranking rule
- normalize queries for total-score surfaces
- update any mismatched consumers/tests
- add one cross-surface consistency regression bundle

---

## 10. Bottom line
The scoring subsystem is no longer just a route-contract problem.
It is now primarily a **meaning consistency** problem.

If UniAct wants trustworthy release-ready reporting, the next hardening wave should treat score totals as a product-definition issue first, then a code/query cleanup issue second.
