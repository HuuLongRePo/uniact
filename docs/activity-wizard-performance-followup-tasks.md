# ACTIVITY WIZARD PERFORMANCE FOLLOW-UP TASKS

Status: active backlog derived from latest product idea for faster activity creation/editing

## New product direction
Activity create/edit should move toward a **multi-step wizard** instead of one long scrolling form.

### Desired properties
- separate steps for key sections,
- can move forward/backward quickly,
- no full page reload,
- no SSR/F5 dependency for ordinary step changes,
- minimal unnecessary requests,
- fast enough for real use,
- still surfaces important changed-state information to users when needed.

## Proposed wizard step model
1. Basic information
   - title
   - description
   - date/time/location
   - activity type / organization level

2. Scope model
   - global-open toggle
   - mandatory classes
   - voluntary classes
   - direct students (mandatory/voluntary)

3. Preview and policy
   - participation preview
   - attendance/registration implications
   - conflict warnings
   - deadline summary

4. Attachments and submit
   - files
   - save draft / submit approval

## P0 - UX/state architecture
- Keep the entire wizard state client-side.
- Do not reload page between steps.
- Preserve edits while moving back and forth.
- Show clear step progress and allow quick navigation.

## P0 - Request minimization rules
- Load static option lists once (classes, activity types, organization levels).
- Only call participation preview when scope-related fields changed and user explicitly opens preview or reaches preview step.
- Debounce or batch scope-derived preview calls.
- Avoid repetitive full-page fetches after tiny local changes.

## P0 - Update-notification model without heavy realtime/reload
When server-side changes matter during the wizard or nearby management views:
- prefer lightweight system notice,
- or focused refetch,
- or manual refresh CTA,
- instead of full page reload or excessive polling.

## P1 - Performance guardrails
- avoid giant monolithic component rerenders,
- split step panels into smaller memoizable pieces,
- keep expensive preview computation isolated,
- do not refetch static data across step changes,
- consider route-level preview only when needed.

## P1 - Edit parity
The same wizard approach should later apply to edit flow with:
- prefilled state,
- ability to move steps without losing progress,
- smart dirty-state handling,
- reapproval logic where needed.

## Recommended next execution order
1. Design wizard state architecture.
2. Split current create page into step containers without changing route yet.
3. Move preview to an explicit later step.
4. Add direct-student selection into the scope step.
5. Reuse the architecture for edit flow.
