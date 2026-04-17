# UniAct Decision-to-Implementation Matrix

_Status: working matrix for web backbone completion_

## P0/P1 backbone clusters

| Cluster | Business rule | Primary code surface | Current status | Key gap | Next action | Priority |
|---|---|---|---|---|---|---|
| Activity workflow | `draft -> requested -> approved -> published`, reject can resubmit | `src/app/api/activities/*`, `src/app/teacher/activities/page.tsx`, admin approval routes | Partially aligned | Teacher list consumer still uses legacy payload/error toast assumptions, dedicated regression missing | Canonicalize teacher activities consumer + add page regression | P0 |
| Status transition | Preserve workflow/business/guard errors, don't collapse to 500 | `src/app/api/activities/[id]/status/route.ts` | Improved in current session | Needs regression lock | Keep new route regression and expand transition cases later | P0 |
| Student visibility/register | 3-state visibility, mandatory reason, not-applicable reason, register/cancel should use API message | `src/app/student/activities/page.tsx`, `src/app/student/activities/[id]/page.tsx`, register/cancel routes | Mostly aligned | Detail page had canonical payload drift; tests are brittle | Finish stabilizing detail-page regressions | P0 |
| Participation model | Mandatory > voluntary, preview/final applicability semantics visible to student | activities routes + student consumers | Partially aligned | More end-to-end coverage missing | Add regression around applicability states after consumer cleanup | P1 |
| Attendance/evaluation/scoring | Attendance confirms participation, evaluation finalizes score | teacher/admin attendance & evaluate routes/pages | Not fully audited in current sweep | No current matrix-backed audit yet | Audit after workflow/student batch | P1 |
| Dashboard/report consumers | Consumers should reflect canonical payloads and latest semantics | dashboard/admin/teacher/student pages | Much improved | Need one more residual sweep after activity-centric batch | Final release-surface sweep | P1 |
| Advanced auth fallback | Security questions etc. are non-blocking for web backbone | `src/app/api/auth/security-questions/route.ts`, related libs/components | Experimental | Not canonical, but not backbone-critical | Leave outside current release-critical batch | P2 |

## Recommended execution order

1. Teacher activities page: route consumer + regression
2. Student activity detail regression stabilization
3. Expand status route regression
4. Full residual unfinished sweep on web release surface
