# QA Issue Intake Template

Use this template to capture manual QA findings quickly and route them into the right fix batch.

---

## 1. Summary
- **Title:**
- **Role:** admin / teacher / student
- **Area:** auth / dashboard / activities / students / history / points / scores / reports / export / other
- **Severity:** blocker / high / medium / low
- **Environment:** local / staging / demo / other
- **Build/commit:**

## 2. Reproduction
1.
2.
3.
4.

## 3. Expected behavior
-

## 4. Actual behavior
-

## 5. Evidence
- Screenshot/video:
- Console error:
- Network error:
- Relevant route/page:

## 6. Contract classification
- **Type:**
  - UI consumer drift
  - route/response contract drift
  - auth/session bug
  - guard/permission bug
  - scoring persistence bug
  - reporting/export bug
  - seed/data issue
  - copy only

- **Likely scope:**
  - page only
  - route only
  - route + page
  - subsystem level

## 7. Release triage
- **RC blocker?** yes / no
- **Why:**
- **Safe to defer?** yes / no
- **Suggested batch:**

---

## Fast triage rules

### Mark as blocker when
- login/logout/session continuity is broken
- wrong role can access protected content
- activity create/register/cancel/submit/evaluate fails
- score persistence is wrong or missing
- student score/history/points visibility is inconsistent with persisted data
- export/report happy path is broken for core reports

### Usually not blocker when
- copy polish only
- small layout issue with intact workflow
- non-core analytics surface
- teacher notification/poll tooling outside active RC path
- experimental auth fallback branch

---

## Suggested labels for backlog
- `web-rc`
- `qa-found`
- `admin`
- `teacher`
- `student`
- `auth`
- `scoring`
- `reporting`
- `export`
- `guard`
- `seed-data`
- `non-blocker`
- `defer`

---

## Example
- **Title:** Student history page shows blank state instead of API error
- **Role:** student
- **Area:** history
- **Severity:** medium
- **Type:** UI consumer drift
- **Likely scope:** route + page
- **RC blocker?:** no
- **Suggested batch:** student visibility closeout
