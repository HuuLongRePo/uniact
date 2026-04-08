# Quarantined Corrupted / Wrong-Type Test Files

These files were moved out of the active `test/` tree because they are not valid UniAct test sources.

## Why quarantined?

During audit:
- `workflow.test.ts` was identified as Dart/Flutter source stored under a `.ts` filename.
- `recommendation.test.ts` contained unrelated WordCopilot/minified JS blob content.
- `teacher-student-workflow.spec.ts` behaved like a binary/garbled file instead of a text test spec.
- `admin-teacher-workflow.spec.ts` belonged to the same broken legacy workflow cluster and had previously produced parser errors.

Keeping these files inside the active test tree would:
- confuse audit and future development
- create misleading parser/typecheck failures
- hide real regressions behind repository contamination

## Important

These files are retained here temporarily for forensic/reference purposes only.
They should not be treated as valid source-of-truth tests.

## Replacement strategy

Do **not** restore them directly.
Prefer the structured actor-based UAT suite already present under:
- `test/uat/actor-admin/`
- `test/uat/actor-teacher/`
- `test/uat/actor-student/`
- `test/uat/actor-integration/`

If coverage is missing, create new clean tests from those flows instead of reviving corrupted files.
