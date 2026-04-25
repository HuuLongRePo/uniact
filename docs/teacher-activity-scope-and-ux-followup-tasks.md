# TEACHER ACTIVITY SCOPE AND UX FOLLOW-UP TASKS

Status: ACTIVE canonical follow-up pack for teacher activity scope/UX domain.

Supersedes:
- `docs/archive/post-consolidation-2026-04-25/teacher-activity-form-followup-tasks.md`
- `docs/archive/post-consolidation-2026-04-25/teacher-activity-scope-and-ux-next-batches.md`

## 1) Decision Gate (required before implementation)

1. Registration deadline policy
- Current backend rule: deadline phai truoc start time it nhat 24 gio.
- Conflict: preset 5/10/15/30 phut khong hop le theo rule hien tai.
- Options:
  - Giu rule 24h (chi cho preset >= 1 ngay),
  - Ha rule co dieu kien theo loai hoat dong/flow draft,
  - Cho preset ngan chi voi hoat dong noi bo teacher-managed.

2. Teacher scope policy
- Chot ro teacher duoc thao tac toan bo class/student hay chi class/student lien quan.
- Chot ro quy tac khi student da dang ky nhung ngoai scope teacher quan ly ban dau.

## 2) P0 Workstreams

### P0-A Form responsiveness (title input lag)
- Investigate typing lag on `Ten hoat dong` in create/edit pages.
- Likely causes:
  - broad rerender from large shared form state,
  - preview/conflict recomputation tied to unrelated input changes,
  - class/preview tree rerender on every keystroke.
- Expected outcome:
  - typing remains responsive with preview/conflict enabled.

### P0-B Time/deadline control redesign
- Keep clear buttons for start/end datetime.
- Replace raw deadline editing with hybrid control:
  - preset dropdown: 5p, 10p, 15p, 30p, 1h, 2h, 1d, 2d, 3d, 7d
  - custom numeric day/hour/minute.
- Output must remain canonical `registration_deadline` datetime.
- Implement only after Decision Gate for deadline policy.

### P0-C Teacher scope visibility and selection power
- Support teacher workflows with:
  - mandatory classes,
  - voluntary classes,
  - mandatory students,
  - voluntary students,
  - bulk select all eligible.
- Preserve visibility for already registered students with clear explanation source.

## 3) P1 Workstreams

### P1-A Mixed-scope preview semantics
- Preview must explain why each student appears:
  - mandatory,
  - voluntary eligible,
  - direct selected,
  - already registered.

### P1-B Regression expansion
- Add focused tests for:
  - title input responsiveness-sensitive behavior (where feasible),
  - deadline preset/custom conversion,
  - mixed class/student payload generation,
  - preview explanation parity in create/edit.

## 4) Canonical execution order

1. Resolve Decision Gates (deadline + scope policy).
2. Profile and isolate render hot paths in create/edit forms.
3. Implement deadline control with one shared offset helper.
4. Implement mixed-scope payload + preview parity.
5. Run route/page regression bundle and close with docs + commit.
