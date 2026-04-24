# ACTIVITY WIZARD PERFORMANCE ANALYSIS PROMPT

Continue implementation planning for UniAct activity create/edit UX modernization.

## New product idea to preserve
When creating an activity with mandatory classes or mandatory students, the flow should move by **steps** instead of forcing the user to scroll through one long page.
The user should be able to move quickly forward/backward between steps without page reload.

## Requirements to optimize for
- fast activity authoring,
- less scrolling,
- client-side step transitions,
- no unnecessary SSR reloads or full page refreshes,
- minimal request volume,
- minimal rerender cost,
- still provide timely user awareness when important server-side state changes happen.

## Objectives

### 1. Wizard architecture proposal
Design the best multi-step architecture for activity create/edit flows.
Include:
- step model,
- state ownership,
- back/next behavior,
- validation boundaries by step,
- how to preserve progress without reload.

### 2. Request minimization strategy
Explain when the UI should fetch:
- static options,
- preview data,
- scope-derived checks,
- submit/update responses.

Recommend how to avoid:
- excessive preview requests,
- reloading whole pages,
- SSR/F5 style refresh dependence,
- user-visible lag.

### 3. Performance strategy
Analyze likely performance hotspots and recommend:
- component splitting,
- memoization boundaries,
- debouncing,
- explicit preview step/loading,
- cache/refetch model.

### 4. Change-awareness strategy
If server-side state changes while the user is in the flow or nearby management pages, propose the lightest acceptable update model such as:
- system notice,
- focused refresh CTA,
- targeted refetch,
- lightweight periodic refresh only where necessary.

### 5. Safest next implementation batch
Recommend the smallest high-value batch to start the wizard migration without destabilizing current activity CRUD.

## Deliverables
Return in this order:
1. wizard architecture proposal,
2. request minimization strategy,
3. performance hotspot analysis,
4. change-awareness model,
5. safest next batch,
6. risks/tradeoffs.

## Constraints
- Preserve current business semantics already established.
- Do not over-engineer with heavy realtime when simpler freshness models are enough.
- Keep the UI compact and fast for end users.
