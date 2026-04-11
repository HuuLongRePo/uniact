# UniAct - Face Attendance Pilot Plan

_Last updated: 2026-04-11 (Asia/Saigon)_

## 1. Current status

### What is already available
- manual attendance backbone is stable
- QR attendance backbone is stable
- biometric / face-related routes and pages already exist in the codebase
- production build passes
- actor UAT backbone passes

### What is still missing
- there is no clear, explicit **pilot policy** deciding which activities should enter face-attendance rollout first
- QR fallback thresholds are not yet encoded as a stable operational policy
- teacher-side operations still need a clearer rule for when to stay on QR, when to switch to manual, and when to prefer face-first mixed mode
- face attendance is not yet connected to the operational attendance policy as a first-class rollout slice

## 2. Recommended pilot scope

### Start with activities that are:
- published / approved
- mandatory for at least one target class
- high-volume enough to justify identity automation
- identity-sensitive enough that stronger verification is useful

### Initial pilot criteria
An activity is **face-pilot eligible** when:
- approval/publish state is valid
- it includes at least 1 mandatory class target
- expected scale is medium/high (for initial policy: >= 50 participants by actual/expected volume, or max participants >= 80)

### Recommended mode for pilot
- default overall attendance mode remains **mixed**
- for face-pilot eligible activities:
  - recommended mode = `mixed`
  - preferred primary method = `face`
  - teacher keeps manual override
- for non-eligible activities:
  - recommended mode = `mixed`
  - preferred primary method = `qr`

## 3. QR fallback threshold proposal (pilot v1)

### Technical thresholds
Preset `pilot-default`:
- p95 response time >= **1500 ms**
- queue backlog >= **25**
- scan failure rate >= **12%**
- minimum sample size before auto trigger = **20 scans**

### Fallback behavior
- teacher can always switch manually
- system may recommend / auto-trigger fallback when one of the thresholds is exceeded and sample size is sufficient
- initial fallback target:
  - from `qr` -> `mixed`
  - from `mixed` -> manual-heavy operation

## 4. Face pilot slice to implement now

### Scope for this round
1. create an explicit reusable attendance policy module
2. expose an API that computes policy + pilot recommendation per activity
3. keep backbone attendance flows unchanged
4. verify build + attendance backbone still pass

## 5. Risks / assumptions
- local/offline-first remains the default assumption
- face attendance rollout should not destabilize manual/QR flows that are already passing
- thresholds are operational presets for pilot, not final permanent governance values

## 6. Next implementation steps after this slice
1. teacher-facing UI badge / panel to show activity policy and pilot eligibility
2. face-first mixed attendance action on teacher side
3. low-confidence fallback UX for teacher confirmation
4. selected pilot rollout for real activity groups

## 7. Verification plan
- build must pass
- attendance backbone UAT must remain green
- new policy module should have direct unit coverage
- new policy API should be smoke-tested
