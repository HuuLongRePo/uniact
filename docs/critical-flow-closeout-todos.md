# CRITICAL FLOW CLOSEOUT TODOS

## Must-finish first
- [x] Create activity -> submit approval -> approve -> publish -> visibility smoke now has route/page/UAT backbone coverage, and should move to final manual RC smoke instead of more speculative refactor.
- [x] QR attendance happy path stays smooth for operational actors, with existing actor UAT plus integration backbone coverage.
- [x] Scoring persistence remains visible after attendance/evaluation across student/admin/teacher surfaces in the hardened regression bundle.
- [x] Notification path is reliable for teacher/admin/student actors on the active backbone, including face attendance success visibility for students.
- [~] Face attendance pilot readiness is unblocked enough to continue with image training.
  - Done: readiness contract, persisted biometric lifecycle, enrollment/training mutation, embedding storage, candidate preview flow, camera groundwork, teacher/student/admin/report visibility, UAT actor chain.
  - Still blocked: real runtime inference/model-loading/liveness implementation in `src/lib/biometrics/face-runtime.ts`.

## Deferred after critical path
- [ ] Broader residual page cleanup outside critical actor flow.
- [ ] Additional list/filter ergonomics outside the active release path.
- [ ] Deep archive/not-held model expansion.
- [ ] Broader analytics/export/back-office polishing.
- [ ] Wider non-critical notification template/management polish.
