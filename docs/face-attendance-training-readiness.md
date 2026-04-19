# FACE ATTENDANCE TRAINING READINESS

## Current truth in repo
- `src/app/api/attendance/face/route.ts` already exists and supports a pilot-style face attendance decision path.
- Attendance policy/config groundwork already exists:
  - `src/lib/attendance-policy.ts`
  - `src/lib/attendance-policy-config.ts`
  - admin/teacher attendance policy pages
- Biometric encryption groundwork exists:
  - `src/lib/biometrics/encryption.ts`
- But runtime is currently disabled:
  - `src/lib/biometrics/face-runtime.ts`
  - `FACE_BIOMETRIC_RUNTIME_ENABLED = false`

## Practical conclusion
UniAct already has:
- pilot policy selection,
- fallback semantics,
- a face attendance API contract,
- readiness/configuration surfaces.

UniAct does NOT yet have a release-ready end-to-end student image training path.
That means the shortest safe path is not pretending face attendance is complete, but making readiness explicit and closing prerequisites in order.

## Must-finish before calling face attendance complete
1. Student image enrollment flow
   - upload/manage student reference images
   - ownership/consent/admin-teacher controls
2. Embedding generation / training flow
   - produce encrypted embeddings
   - versioning / retraining semantics
   - status reporting per student
3. Runtime enablement
   - replace stubbed `face-runtime` behavior
   - model loading / inference readiness
4. Actor-visible readiness UX
   - clear banner/status when runtime is off
   - show why pilot is blocked vs ready
5. End-to-end regression / UAT
   - training-ready student
   - low confidence fallback
   - successful face attendance record
   - duplicate detection

## Recommended next batch
### Batch: student image enrollment + training-path groundwork
Goal:
- create the minimal real path for storing student image/training readiness metadata,
- expose readiness status in admin/teacher surfaces,
- keep face attendance route honest until runtime is genuinely enabled.

## Deferred until after that batch
- performance optimization of biometric runtime
- richer liveness checks
- broader analytics around biometric confidence
- advanced teacher intervention tooling
