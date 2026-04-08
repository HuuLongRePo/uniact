# Phase 2 – Đề xuất cấu trúc thư mục (Scalable + Feature-first)

## Mục tiêu
- Chuyển dần từ cấu trúc pha trộn (`app`, `lib`, `components`, `contexts`) sang **feature-first**.
- Tách rõ: route layer (Next.js) ↔ business/domain layer ↔ infrastructure layer.
- Giữ khả năng migrate từng phần nhỏ, không cần big-bang rewrite.

## Cấu trúc đích đề xuất

```text
src/
  app/                          # Chỉ giữ routing, page/layout, API route entry
    (auth)/
    (dashboard)/
    api/

  features/
    auth/
      api/
      components/
      hooks/
      services/
      schemas/
      types/
      index.ts
    activities/
      api/
      components/
      services/
      validators/
      types/
      index.ts
    approvals/
    attendance/
    notifications/
    reports/
    scoring/
    students/
    classes/
    admin/

  shared/
    ui/                         # UI dùng chung (từ components dùng đa feature)
    hooks/
    utils/
    constants/
    types/

  infrastructure/
    db/                         # db-core, database, migration runtime helpers
    logger/
    cache/
    jobs/

  middleware/                   # middleware tách riêng nếu cần mở rộng
```

## Quy tắc phân lớp
1. `app/*` chỉ gọi vào `features/*` hoặc `infrastructure/*` (không nhét business logic trực tiếp).
2. `features/A` không import trực tiếp `features/B` trừ khi qua public API (`index.ts`).
3. Logic dùng chung đặt vào `shared/*`, tránh vòng phụ thuộc giữa features.
4. `infrastructure/*` không import từ `app/*`.

## Mapping từ hiện trạng sang cấu trúc đích

- `src/components/*`:
  - Component generic → `src/shared/ui/*`
  - Component domain-specific → `src/features/<domain>/components/*`

- `src/contexts/AuthContext.tsx`:
  - Auth provider/hook → `src/features/auth/hooks/*` hoặc `src/features/auth/services/*`

- `src/lib/*`:
  - DB/runtime/core → `src/infrastructure/db/*`
  - Notification/email/job infra → `src/infrastructure/jobs/*` hoặc `src/features/notifications/services/*`
  - Domain service (approval/scoring/attendance) → `src/features/<domain>/services/*`

- `src/types/*`:
  - Type dùng chung toàn app → `src/shared/types/*`
  - Type theo nghiệp vụ → `src/features/<domain>/types/*`

## Lộ trình migrate an toàn (khuyến nghị)

### Wave 1 (ít rủi ro, lợi ích cao)
- Tạo thư mục `shared/` + `infrastructure/`.
- Di chuyển nhóm file “pure utility” khỏi `lib` vào `shared/utils`.
- Di chuyển nhóm DB runtime khỏi `lib` vào `infrastructure/db`.
- Duy trì re-export tại path cũ để tránh vỡ import hàng loạt.

### Wave 2
- Chuẩn hóa feature `auth`, `activities`, `reports` (đang có usage cao).
- Chuyển dần page/api handlers trong `app/` thành thin controllers.

### Wave 3
- Tách phần teacher/admin/student APIs vào các service trong `features/*`.
- Loại bỏ re-export cũ, cập nhật import tuyệt đối theo target mới.

## Guardrails kỹ thuật
- Bật rule lint giới hạn import cross-layer (no-restricted-imports theo thư mục).
- Mỗi feature có `index.ts` làm public API.
- Migrate theo PR nhỏ (20-40 file/PR), mỗi PR phải build pass.

## Định nghĩa Done cho Phase 2
- `src/app` không còn business logic nặng.
- `src/lib` chỉ còn bridge tạm thời hoặc được loại bỏ hoàn toàn.
- Ít nhất 3 domain chính (`auth`, `activities`, `reports`) chạy theo mô hình feature-first.
- Build pass và không tăng cảnh báo lint mới so với baseline.
