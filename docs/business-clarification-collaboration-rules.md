# BUSINESS CLARIFICATION COLLABORATION RULES

## User collaboration preference captured
During implementation and analysis, if important business ambiguity appears, ask the user directly instead of silently guessing when the choice would materially affect architecture, permissions, workflow, or UX semantics.

## Examples of ambiguity that should be surfaced to the user
- quyền giữa giảng viên chủ nhiệm và giảng viên không phải chủ nhiệm,
- ranh giới quyền của teacher trên lớp/học viên không do mình quản lý trực tiếp,
- khi nào activity được coi là fully published,
- broad-open/all-students semantics,
- admin override scope with or without mandatory reason,
- attendance/scoring exception policies,
- post-publish edit/reapproval behavior when registrations already exist.

## Working rule
- For low-risk implementation detail: decide and continue.
- For high-impact business ambiguity: ask Long directly with 2-3 concrete options and a recommendation.
- After the question is resolved, add the answer into follow-up tasks/docs if it creates durable value.
