# ACTOR FILTERS AND PAGINATION FOLLOW-UP TASKS

Status: active cross-surface usability standardization backlog

## Goal
Make every major management surface for admin / teacher / student have filtering and pagination that fits the actual use case, instead of inconsistent ad hoc tables.

## P0 - Admin attendance management intelligence
### Current gap
Admin attendance management is still not scientific enough on active surfaces, especially activity participant management/detail screens.

### Desired baseline
For admin attendance-related management surfaces, provide where relevant:
- keyword search,
- attendance status filter,
- class filter,
- pagination,
- counts/summary for current filter,
- export consistent with current filtered context when practical.

## P0 - Actor-wide audit matrix
Build a matrix of all active management pages for:
- admin,
- teacher,
- student,
and check for each page:
- has search?
- has semantic filters?
- has sort?
- has pagination?
- default ordering matches user intent?
- empty state is useful?

## P1 - Standardized filter taxonomy by page type
### Suggested categories
- list management pages:
  - search,
  - status/workflow/review filters,
  - owner/class filters,
  - date sort,
  - pagination.
- participant/attendance pages:
  - search student,
  - attendance status,
  - class,
  - date range if relevant,
  - pagination.
- reports/rankings pages:
  - time period,
  - class/teacher scope,
  - sort metric,
  - page size/pagination when row counts are large.

## P1 - Pages to inspect first
- `admin/activities/[id]` participants tab
- `admin/activities`
- `admin/users`
- `admin/classes`
- `teacher/activities`
- `teacher/students`
- `teacher/approvals`
- `teacher/reports/participation`
- key student visibility pages with long lists/history

## P1 - Pagination consistency rules
- default page size should match surface density,
- reset to page 1 when filters/search change,
- show current range and total,
- keep query state or component state predictable,
- avoid huge client-rendered tables without paging.

## Recommended next execution order
1. Finish admin attendance/listing usability on active participant surfaces.
2. Build actor-page audit matrix.
3. Standardize filter/pagination patterns for admin list pages.
4. Standardize teacher list/report pages.
5. Sweep student long-list visibility pages last.
