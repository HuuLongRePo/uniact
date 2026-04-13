# Release Checklist

## 1) Pre-checks
- Đồng bộ migration và dữ liệu seed cần thiết
- Xác nhận biến môi trường production đã cấu hình
- Xác nhận không còn file backup/corrupt trong `src/`

## 2) One-command verification
Chạy lệnh:

```bash
npm run release:check
```

Hoặc dùng gate nhanh cho deploy runtime:

```bash
npm run release:check:fast
```

Lệnh này chạy tuần tự:
1. `npm run format:check`
2. `npm run lint -- --dir src/app --dir src/lib --dir src/infrastructure`
3. `npx tsc --project tsconfig.release.json --noEmit --pretty false`
4. `npm run build`

Ghi chú: `tsconfig.release.json` loại trừ `test/**`, `backups/**`, `artifacts/**` để tránh nhiễu từ file không thuộc runtime release.

`release:check` (full) = format + lint + typecheck + build.

`release:check:fast` = typecheck + build.

## 3) Go-live gate
- Tất cả checks phải pass
- Không có migration pending
- Đã backup DB trước deploy
- Đã kiểm tra route `/welcome`, `/upgrade`, `/consent-settings`

## 4) Post-deploy smoke test
- `GET /api/health`
- Đăng nhập admin/teacher/student
- Tạo activity, duyệt activity, chấm điểm
- Kiểm tra dashboard và export cơ bản
