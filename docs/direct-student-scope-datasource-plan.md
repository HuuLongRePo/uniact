# DIRECT STUDENT SCOPE DATASOURCE PLAN

Status: lightweight groundwork before heavier UI/wizard batch

## Current decision
Do not immediately stuff a large direct-student multi-select UI into the current long teacher create/edit form.
That would likely increase lag and clutter before the wizard migration lands.

## Groundwork now in place
- validation/types support student scope,
- persistence supports `activity_students`,
- preview route supports `direct_students`,
- new helper: `src/lib/activity-student-scope.ts`
  - normalizes direct student scope state,
  - builds payload shape,
  - provides student index helper.

## Recommended next UI data-source pattern
When wiring direct-student selection into teacher create/edit:
1. fetch student datasource lazily, not on first paint unless needed,
2. scope fetches by current search/class filters,
3. cache current step state client-side,
4. only open heavy student selection UI in the scope step,
5. keep preview as explicit action/step.

## Why this is the fastest safe path
- keeps current form from becoming slower immediately,
- preserves direct-student semantics already added deeper in the stack,
- creates a stable contract for Codex/UI batches,
- aligns with the future wizard architecture.
