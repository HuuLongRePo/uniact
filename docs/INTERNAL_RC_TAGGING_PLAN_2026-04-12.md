# UniAct Internal RC Tagging Plan (2026-04-12)

Status: prepared, not yet executed
Recommended tag candidate after smoke passes: `internal-rc-2026-04-12`
Current latest commit when drafting: `9c5600d`

## Purpose

This document prepares the final small step from internal RC prep into a more explicit internal RC milestone.
It should only be used after targeted manual smoke finishes without blockers.

## Preconditions

Before creating the tag, confirm all of the following:

- [x] Widened RC regression baseline is green.
- [x] Production build is green.
- [ ] Targeted manual smoke checklist is completed.
- [ ] No blocker remains open from smoke.

## Recommended tag

```bash
git tag -a internal-rc-2026-04-12 -m "UniAct internal RC milestone after backbone hardening, regression baseline, and build verification"
git push origin internal-rc-2026-04-12
```

## Recommended short announcement

> UniAct has reached a stronger internal RC milestone.
> Core admin, teacher, and student backbone flows have been hardened,
> the widened regression baseline is green,
> and the production build is passing.
> This milestone is still internal-facing and should not yet be described as final public production release.

## Recommended longer announcement

UniAct has now reached a stronger internal release candidate milestone for internal use.

What supports that claim:
- major admin, teacher, and student backbone routes were hardened toward a more consistent canonical contract
- a widened RC regression baseline passed
- the production build passed successfully
- release-prep docs, smoke checklist, and internal milestone notes are now in place

What this still does not mean:
- full repo-wide legacy cleanup is complete
- every long-tail route has been standardized
- the project should be marketed yet as fully production-ready for public release

Next expected step after tagging:
- keep smoke results and blockers documented
- only promote the wording further if manual smoke remains clean and remaining risks stay low
