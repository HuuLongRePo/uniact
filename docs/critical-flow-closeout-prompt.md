# CRITICAL FLOW CLOSEOUT PROMPT

You are working in the UniAct repo at:
`C:\Users\nhuul\OneDrive\Máy tính\uniact`

## Priority goal
Make the release-critical operational path smooth first, before other cleanup:
1. teacher/admin create activity
2. submit approval -> admin approve -> published visibility
3. attendance by QR succeeds reliably
4. scoring persists and is visible to actors
5. notifications reach the right actors with usable consumers
6. open the path for student image training + face attendance pilot readiness

## Hard priorities
- Finish the path above before broad backlog cleanup.
- Treat non-critical residual items as backlog/todos.
- Prefer route -> consumer -> regression batches.
- Preserve current working business rules unless a blocker proves they are broken.

## What to inspect first
- submit/approve/publish flows
- QR session creation/history/scan/export flows
- student + teacher notification consumers and routes
- face attendance pilot route and any missing training/readiness surface
- scoring persistence after attendance/evaluation

## Expected outputs
1. tighten any broken/high-drift route or consumer in the critical path
2. add focused regressions for the touched path
3. create/update a todo file for deferred non-critical work
4. summarize:
   - what is now smooth,
   - what is still blocked,
   - what should be the next batch

## Constraints
- Do not start deep speculative refactors.
- Keep requests low and UX practical.
- Preserve canonical payload handling and error surfacing.
- If image-training support is not fully implemented, create the clearest possible readiness/todo prompt and unblock path prerequisites now.
