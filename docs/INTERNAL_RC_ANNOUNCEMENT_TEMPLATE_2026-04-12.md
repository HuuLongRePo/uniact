# UniAct Internal RC Announcement Template (2026-04-12)

## Short version

UniAct has reached a stronger **internal RC milestone**.
The current codebase now has a widened green regression baseline, a passing production build, and significantly more consistent admin, teacher, and student backbone contracts.
This is still an internal milestone, not a final public production release.

## Medium version

UniAct has reached a stronger **internal release candidate milestone** for internal use.

Highlights:
- admin backbone is more stable across activities, approvals, config, attendance, and completion flows
- teacher backbone is more stable across approvals, dashboard, students, and evaluation-related flows
- student backbone is more stable across activity discovery, registration, cancellation, and registration counting behavior
- widened RC regression baseline is green
- production build is green
- release-prep docs and smoke checklist are in place

Current limitation:
- this milestone still assumes targeted manual smoke is clean and some long-tail legacy cleanup remains outside the current backbone-first scope

## One-line status

UniAct is now in a stronger internal RC state, with backbone hardening, regression verification, and build verification in place.
