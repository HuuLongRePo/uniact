# REALTIME FILTERS PERFORMANCE FOLLOW-UP TASKS

Status: active strategic backlog after auditing approval notification behavior

## Core finding
Current system mostly relies on fetch-on-open and manual refetch after local actions.
Some DB notifications/alerts are written, but most user-facing pages do not receive instant updates automatically.

## P0 - Realtime-critical feature audit
Identify all features that should feel near-realtime to users, for example:
- admin approves/rejects activity -> teacher sees status/notification quickly,
- teacher submits activity -> admin approval queue updates quickly,
- attendance changes -> dashboards and participant views update quickly,
- evaluation/scoring changes -> student/admin score surfaces refresh quickly,
- critical operational alerts -> visible without deep navigation.

## P0 - Delivery strategy matrix
For each realtime-worthy feature, decide the right delivery model:
- full realtime push,
- short polling,
- focus/refetch on visibility change,
- optimistic local update only,
- manual refresh acceptable.

## P1 - Compact smart filter design
### Goal
Give users many useful filters without bloating screen space.

### Design principles
- show only highest-value filters by default,
- collapse advanced filters into expandable panel or drawer,
- keep labels semantic and easy to understand,
- preserve mobile friendliness,
- reset pagination when filters change,
- expose active filter chips/summary clearly.

## P1 - Filter taxonomy by use case
- workflow lists: status/review/owner/date/search
- attendance tables: name/class/attendance/anomaly
- report tables: period/scope/sort metric
- student visibility pages: timeframe/status/type

## P1 - Performance and speed discipline
Every new filter/realtime feature should consider:
- query cost,
- payload size,
- rerender cost,
- polling interval impact,
- expensive derived computations,
- whether client-side filtering should move server-side.

## P1 - Performance hotspots to inspect
- teacher activity create/edit form lag,
- large list pages without server pagination,
- repeated full-page refetch on small mutations,
- dashboards that reload too much data at once,
- attendance/participant tables with growing rows.

## Recommended next execution order
1. Build realtime-critical feature matrix.
2. Classify each feature by acceptable freshness model.
3. Standardize compact smart filter UI patterns.
4. Audit high-cost list/render surfaces.
5. Roll out route/UI optimizations in prioritized batches.
