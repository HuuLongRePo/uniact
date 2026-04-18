# RELEASE COMMS

Active internal release communication reference for UniAct.

---

## 1. Current internal release wording
Recommended wording:

> UniAct is in an **internal release candidate preparation / QA-gated closeout** phase.
> Core admin, teacher, and student backbone flows have been significantly hardened and regression-verified.
> The main remaining work is manual QA, environment validation, and targeted blocker fixing rather than broad refactor work.

---

## 2. Internal RC summary
### What is stronger now
- admin backbone contracts are more consistent
- teacher backbone reporting and evaluation flows are more stable
- student backbone visibility and scoring flows are more stable
- scoring/reporting surfaces are now much better aligned with persisted state

### Why this matters
The project is no longer behaving like several unrelated contract generations stitched together in the most active release-critical areas.
That makes manual QA and release decision-making much safer.

---

## 3. Runtime verification interpretation
Recommended interpretation for internal stakeholders:
- serialized production-like verification is more trustworthy than noisy parallelized build checks
- some historical build/test failures were environmental or worker-saturation artifacts rather than clear product regressions
- current release confidence should be anchored in the stabilized backbone regression bundles and role-based smoke checks

---

## 4. Release note content blocks
Use these in internal summaries or RC handoff notes.

### Status block
- internal RC prep achieved on web backbone
- auth/session, activity workflow, attendance/evaluation/scoring, and reporting have been materially hardened
- current state is fit for manual QA-driven release closeout

### Risk block
- remaining risks are concentrated in real-environment QA findings, seed/demo assumptions, and non-core long-tail surfaces
- non-core backlog should not block current web release path unless reproduced as operational issues

### Recommendation block
- run final manual QA by role
- convert only reproduced issues into blockers
- fix blockers only
- defer non-core backlog

---

## 5. Internal announcement template
### Short announcement
UniAct web backbone has reached a near-RC state for internal release prep.
Core admin, teacher, and student flows are now materially more stable.
Next step is final manual QA and targeted blocker fixing.

### Slightly longer announcement
The UniAct web backbone has completed a major hardening pass across auth/session, activity workflow, attendance/evaluation, student visibility, and admin/teacher reporting.
Regression coverage across the release-critical surface is substantially stronger than before.
The project should now move through manual QA and only targeted blocker fixes, rather than further broad churn.

---

## 6. Tagging / milestone guidance
If tagging an internal RC milestone, the tag/note should emphasize:
- this is not a claim of public-production perfection
- this is a strong internal stabilization milestone for the web backbone
- manual QA and environment validation remain part of the closeout step

Suggested milestone interpretation:
- `internal-rc-web-backbone`
- `qa-gated-web-rc`

---

## 7. Practical comms rule
When communicating status internally:
- say what is hardened
- say what still needs QA
- say what is intentionally deferred
- avoid claiming the entire repo is fully production-polished if non-core tracks are still unfinished
