# ADMIN ATTENDANCE AND ACTOR FILTERS ANALYSIS PROMPT

Continue research and planning for UniAct management-surface usability.

## Repo context
- Repo: `C:\Users\nhuul\OneDrive\Máy tính\uniact`
- Current focus has moved from workflow-core hardening to operational/admin usability.
- Admin activity detail participants tab has begun gaining search/filter/pagination support, but broader actor-wide consistency still needs an audit.

## Objectives
Analyze the current management surfaces for admin, teacher, and student to determine where filters, sorting, and pagination are missing or weak.

### 1. Admin attendance management quality
Investigate whether admin attendance-related surfaces are sufficiently scientific/intelligent.
Focus on:
- activity detail participant management,
- attendance visibility,
- summaries,
- filters,
- exports,
- how quickly admin can find attendance anomalies.

Return:
- current gaps,
- what “smart enough” should mean operationally,
- highest-value missing controls.

### 2. Actor-wide page audit
Inspect all major active pages for:
- admin,
- teacher,
- student.

For each page, record whether it has:
- search,
- filters,
- sorting,
- pagination,
- sensible default ordering,
- useful empty state.

### 3. Standardization proposal
Propose a canonical pattern library for pages by use case:
- management lists,
- participant/attendance tables,
- report tables,
- student history/visibility pages.

Specify:
- which filters belong on which type of page,
- when pagination is mandatory,
- when client-side filtering is acceptable,
- when route/server pagination should be introduced.

### 4. Batch planning
Return the safest phased implementation plan to bring all actor pages to a consistent standard.

## Deliverables
Return in this order:
1. admin attendance usability audit,
2. actor-page audit matrix,
3. filter/pagination standard proposal,
4. prioritized implementation plan,
5. safest next commit-sized batch,
6. risks/tradeoffs.

## Constraints
- Stay focused on active web surfaces first.
- Prefer incremental high-value batches.
- Do not add pagination/filtering blindly where the list is tiny or the use case does not need it.
- Preserve canonical route/response conventions already established.
