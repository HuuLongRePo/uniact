# MANDATORY PARTICIPATION GENERATION ANALYSIS PROMPT

Continue Batch 2 analysis for UniAct mandatory participation creation after approval.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Current approval helper path already calls mandatory participation materialization on approve.
- `dbHelpers.decideApproval(...)` updates activity to published and calls `materializeMandatoryParticipationsForActivity(activityId)`.
- It already returns:
  - `mandatory_participations_created`
  - `mandatory_participations_upgraded`

## Research objective
Determine what remains incomplete in the mandatory participation generation lifecycle, especially compared with prior business decisions.

## Required analysis

### 1. Current implemented baseline
Explain exactly what the current code already does when an activity with mandatory scope is approved.

### 2. Compare against business decisions
Compare current code with prior decisions:
- `D14` mandatory participation creation timing
- `D15` bulk creation strategy
- `D16` partial success model
- `D17` fully published vs processing semantics
- `D18` visibility during processing

### 3. Identify remaining gaps
Focus on:
- scale/performance limitations,
- lack of processing-state model,
- missing route/UI surfacing,
- future impact when target scope expands beyond simple class-only mandatory groups.

### 4. Safest next implementation batch
Recommend the smallest next batch that improves correctness without premature queue architecture.

## Deliverables
Return in this order:
1. current implemented behavior summary,
2. decision-vs-implementation gap matrix,
3. recommended processing/visibility model,
4. safest next commit-sized batch,
5. performance and migration risks.

## Constraints
- Do not claim this area is unimplemented when core synchronous materialization already exists.
- Keep the analysis grounded in current code reality.
- Avoid introducing a queue/background system unless scale or target model truly requires it.
