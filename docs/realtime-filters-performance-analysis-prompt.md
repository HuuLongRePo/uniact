# REALTIME FILTERS PERFORMANCE ANALYSIS PROMPT

Continue analysis for UniAct system completion with a focus on realtime behavior, compact smart filters, and speed optimization.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Approval and notification logic already writes some DB notifications/alerts.
- Many user-facing pages still depend on manual refresh or fetch-on-open rather than true realtime delivery.
- Recent usability work has also shown the need for richer but compact filters and better performance discipline.

## Objectives

### 1. Realtime-critical feature audit
Audit all active features that should update quickly from the user perspective.
At minimum inspect flows such as:
- admin approves/rejects activity -> teacher sees change quickly,
- teacher submits activity -> admin queue updates quickly,
- attendance changes -> participant/admin/teacher views update quickly,
- evaluation/scoring changes -> student/admin score surfaces update quickly,
- critical notifications and alerts.

For each feature, decide whether it needs:
- true push realtime,
- short polling,
- focus/refetch,
- optimistic local update,
- or manual refresh only.

### 2. Expand from realtime audit to adjacent system issues
For each realtime gap, infer related missing work in:
- notification surfacing,
- cache invalidation,
- route payload freshness,
- actor dashboards,
- auditability,
- UX messaging.

### 3. Smart compact filter design
Design a standard pattern for pages that need many filters without occupying too much space.
You must balance:
- usability,
- semantics,
- compactness,
- mobile responsiveness,
- discoverability,
- low visual noise.

Return a recommended pattern for:
- default visible filters,
- advanced/collapsible filters,
- active filter chips,
- per-page filter prioritization.

### 4. Performance and speed optimization audit
Analyze how new realtime and filter features can avoid slowing the system down.
Inspect likely hotspots in:
- heavy forms,
- large tables,
- dashboards,
- repeated refetch loops,
- client-side filtering on large payloads.

Recommend:
- when to keep client-side filtering,
- when to move to server-side queries,
- where to add pagination,
- where to debounce or memoize,
- where polling intervals are safe vs too expensive.

## Deliverables
Return in this order:
1. realtime-critical feature matrix,
2. freshness model recommendation per feature,
3. expanded adjacent-work matrix,
4. smart filter design proposal,
5. performance hotspot audit,
6. phased implementation plan,
7. safest next commit-sized batch.

## Constraints
- Do not default everything to websocket/push without justification.
- Prefer the cheapest freshness model that meets the user need.
- Keep filters compact, semantic, and uncluttered.
- Treat speed as a first-class requirement while implementing usability improvements.
