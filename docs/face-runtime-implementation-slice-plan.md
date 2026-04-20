# FACE RUNTIME IMPLEMENTATION SLICE PLAN

## Current truth
`src/lib/biometrics/face-runtime.ts` is still a stubbed contract surface.

What already exists around it:
- config-aware runtime gating
- readiness route and per-student readiness state
- encrypted embedding persistence
- runtime verification bridge
- candidate preview contract
- teacher face attendance QA/demo flow
- actor-visible notification/history/report surfaces
- UAT actor chain for face attendance visibility

What is still missing:
- actual model loading
- actual embedding detection
- actual liveness execution
- a safe transition from `config_enabled_stubbed` to a true runtime-ready branch

## Release-safe implementation order

### Slice 1. Runtime adapter seam, still fail-closed
Goal: refactor `face-runtime.ts` so stubbed behavior and future real provider behavior share one adapter contract.

Must deliver:
- explicit runtime provider interface
- single place that decides `stubbed | config_enabled_stubbed | runtime_ready`
- no behavior change for current production paths
- focused tests for adapter selection and fail-closed semantics

### Slice 2. Model loading readiness without verification enablement
Goal: support loading checks and cache state, but do not yet claim attendance verification is production-ready.

Must deliver:
- lazy model loader with memoized readiness state
- structured load result / load error reporting
- readiness route can distinguish config-enabled-but-load-failed vs fully stubbed
- `attendance_api_accepting_runtime_verification` remains false unless all prerequisites are met

### Slice 3. Browser-side embedding detection pilot
Goal: let the teacher camera preview path call a real detector when models are available, but keep attendance route fail-closed unless server/runtime policy is truly ready.

Must deliver:
- real `detectSingleEmbedding(...)` implementation behind guarded adapter
- preserved manual embedding fallback
- explicit error taxonomy for no face / multiple faces / low quality / runtime unavailable
- tests for fallback and gated behavior

### Slice 4. Liveness pilot implementation
Goal: replace fake `performLivenessCheck(...)` return with a real, limited liveness heuristic while still preserving fail-closed behavior.

Status: groundwork partially landed.

What now exists:
- normalized liveness result semantics (`runtime_unavailable | insufficient_signal | passed`)
- teacher camera flow respects runtime-unavailable and weak-signal liveness states
- deterministic failure messaging for weak liveness details

Still missing before Slice 4 can be called fully real:
- actual blink/head-movement heuristic implementation behind the adapter
- telemetry persistence / observability for liveness signal reasons
- readiness/capability promotion from semantic groundwork to real `liveness_check_ready`

Must deliver:
- blink/head-movement heuristic contract
- deterministic low-confidence failure path
- telemetry-friendly detail output
- no silent pass when signals are weak

### Slice 5. Honest transition to runtime-ready
Goal: only after model loading + embedding detection + liveness are all stable, allow runtime capability to report `runtime_ready`.

Must deliver:
- runtime capability updated from actual adapter signals
- face attendance route accepts runtime verification only in truly ready environments
- regression for `stubbed`, `config_enabled_stubbed`, and `runtime_ready`
- updated manual QA checklist for runtime-on environments

## Hard rules
- Do not overclaim readiness.
- Keep route behavior fail-closed until runtime signals are real.
- Keep manual / QR fallback paths healthy.
- Prefer browser/provider abstraction over inlining vendor-specific logic into route handlers.
- Every slice must ship with route/page/test evidence, not only helper code.

## Recommended next coding batch
Implement **Slice 1** first:
- introduce a runtime adapter seam in `src/lib/biometrics/face-runtime.ts`
- preserve current stubbed outputs
- add focused tests for adapter selection and fail-closed behavior
- avoid turning on `runtime_ready` yet
