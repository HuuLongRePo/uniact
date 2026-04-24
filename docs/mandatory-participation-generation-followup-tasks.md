# MANDATORY PARTICIPATION GENERATION FOLLOW-UP TASKS

Status: Batch 2 audit notes after checking current approval path

## Confirmed current implementation
The current approval persistence path already does more than just mark the activity approved.
Inside `dbHelpers.decideApproval(...)`:
- approved activity is moved to `published`
- `materializeMandatoryParticipationsForActivity(activityId)` is called
- result is surfaced as:
  - `mandatory_participations_created`
  - `mandatory_participations_upgraded`

So Batch 2 is **partially implemented already** at the DB/business-helper level.

## What is still unresolved
### P0 - Fully published vs processing semantics
Prior business decisions (`D17`, `D18`) say:
- if mandatory participation generation is still incomplete/processing,
- activity should not be treated as fully published for final participants yet.

Current implementation appears synchronous and immediate for the mandatory class scope that exists today.
But it does not yet establish a broader processing-state model for large targets.

### P0 - Scale strategy for large target sets
Prior business decisions (`D15`, `D16`) say:
- small scale can be synchronous,
- large scale should use batch/chunk or queue/background processing,
- large scale may need partial success + retry tracking.

Current implementation loops synchronously over students.
This is acceptable for small current scope, but not a finished answer for larger mixed/global scope models.

### P1 - Visibility semantics during processing
Need a canonical model for:
- approved but participation-generation still running,
- who can see the activity during that time,
- when student-facing visibility becomes final.

### P1 - UI/admin/teacher surfacing
Current code surfaces creation/upgraded counts in DB/business results, but active admin/teacher surfaces do not yet clearly explain:
- how many mandatory participations were materialized,
- whether publication is fully complete,
- whether there were partial/repair issues.

## Recommended next execution order
1. Treat current synchronous materialization as the small-scale baseline.
2. Add route/UI regression and surfacing for created/upgraded counts where useful.
3. Design explicit processing-state model for larger future target scopes.
4. Add chunk/queue strategy when global/direct-student targeting expands target size significantly.
