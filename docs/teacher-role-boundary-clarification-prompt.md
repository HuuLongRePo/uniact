# TEACHER ROLE BOUNDARY CLARIFICATION PROMPT

Use this prompt when business clarification is needed from the user during implementation.

## Goal
Clarify permission boundaries between:
- giảng viên chủ nhiệm,
- giảng viên không phải chủ nhiệm,
- lớp,
- học viên,
- activity-scoped management rights.

## Questions to ask the user when needed
1. Giảng viên chủ nhiệm có toàn quyền gì khác với giảng viên không chủ nhiệm?
2. Giảng viên không chủ nhiệm có thể tạo hoạt động cho lớp nào và vì sao?
3. Khi một activity chọn lớp/học viên ngoài lớp mình quản lý, teacher được phép làm gì chính xác?
4. Teacher có được xem toàn bộ thông tin học viên hay chỉ thông tin tối thiểu để vận hành activity?
5. Với attendance/evaluation/scoring, quyền của teacher theo lớp quản lý khác gì quyền theo activity-scoped selection?
6. Có action nào chỉ giảng viên chủ nhiệm làm được, còn teacher khác thì không?
7. Khi quyền conflict giữa teacher chủ nhiệm, teacher activity owner, và admin, ưu tiên thuộc về ai?

## Expected output after asking
Return:
1. a concise permission matrix,
2. what should change in guards/routes,
3. what should change in CRUD UI,
4. which decisions should be written back into durable docs/tasks.

## Usage rule
Do not ask all questions every time.
Ask only the subset needed by the current implementation blocker, and present 2-3 concrete choices when possible.
