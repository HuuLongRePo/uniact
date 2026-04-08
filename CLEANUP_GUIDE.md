# 🧹 UniAct System Cleanup Guide

## Mục Đích

Script `cleanup.js` tự động dọn rác hệ thống, bao gồm:
- Build artifacts (`.next`, `.next-integration`, `dist`)
- Test logs và temp files
- OS artifacts (`.DS_Store`, `Thumbs.db`)
- Development cache và tạm thời files

**Bảo vệ:**
- ✅ Source code (`src/`, `scripts/`, `public/`)
- ✅ Version control (`.git/`)
- ✅ Package management (`package.json`, dependencies)
- ✅ Configuration files

---

## Cách Sử Dụng

### 1. **Xem trước trước khi xóa (An toàn nhất)**

```bash
npm run cleanup:dry-run
```

Output sẽ hiển thị:
- Danh sách file/folder sẽ bị xóa
- Dung lượng sẽ được giải phóng
- **Không xóa gì hết**

### 2. **Thực hiện cleanup đầy đủ (Xóa all)**

```bash
npm run cleanup
```

Xóa:
- Build artifacts
- Test logs
- node_modules
- Cache files
- OS artifacts

### 3. **Cleanup nhẹ (Giữ node_modules)**

```bash
npm run cleanup:soft
```

Giữ `node_modules` (tiết kiệm thời gian vì không cần reinstall).

---

## Các File/Folder Bị Xóa

### Build Artifacts
- `.next` (Next.js dev artifacts)
- `.next-integration` (Test integration artifacts)
- `dist`, `build`, `out`
- `tsconfig.tsbuildinfo`

### Test & Development
- `TEST_*.log` (test result logs)
- `build*.log`, `build_*.log`
- `quick_test.log`
- `.env.local`, `*.pid`
- `.tmp`, `*.tmp`

### OS & Cache
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)
- `.cache`, `.eslintcache`
- `node_path.log`

---

## Dung Lượng Tiết Kiệm

Trung bình cleanup sẽ giải phóng:
- **node_modules**: ~500MB - 1GB
- **Build artifacts**: ~200-300MB
- **Logs & temp**: ~50-100MB
- **Total**: ~750MB - 1.5GB

---

## Tình Huống Sử Dụng

| Tình Huống | Command | Lý Do |
|-----------|---------|-------|
| Muốn dọn dẹp trước commit | `npm run cleanup` | Giảm repository size |
| Muốn tiết kiệm dung lượng ổ cứng | `npm run cleanup` | Xóa build + modules |
| Muốn rebuild nhanh hơn | `npm run cleanup:soft` | Giữ node_modules |
| Kiểm tra trước xóa | `npm run cleanup:dry-run` | An toàn, không mất dữ liệu |
| After test runs | `npm run cleanup:soft` | Xóa logs, giữ modules |

---

## Restore After Cleanup

Nếu cần restore:

```bash
# Rebuild Next.js artifacts
npm run build

# Reinstall dependencies (nếu dùng cleanup đầy đủ)
npm install

# Restore database từ backup (nếu cần)
npm run seed
```

---

## Advanced: Manual Direct Invocation

```bash
# Dry run mode
node cleanup.js --dry-run

# Keep node_modules
node cleanup.js --no-nodemodules

# Both options
node cleanup.js --dry-run --no-nodemodules
```

---

## ⚠️ Cảnh Báo

- **Không xóa source code** - tất cả `.js`, `.ts` files trong `src/` đều được bảo vệ
- **Git history an toàn** - `.git/` folder không bị xóa
- **Luôn dùng `--dry-run` trước** nếu không chắc

---

## Troubleshooting

### Script báo lỗi khi xóa node_modules

Trên Windows, `node_modules` có thể bị khóa. Giải pháp:

```bash
# Dùng soft cleanup
npm run cleanup:soft

# Sau đó xóa node_modules bằng File Explorer
# Rồi reinstall
npm install
```

### Vẫn còn `.next` sau cleanup

Chạy lại:

```bash
npm run cleanup
npm run cleanup:dry-run  # Xem còn gì
```

---

## Automation (CI/CD)

Add vào CI pipeline (pre-deploy):

```yaml
# GitHub Actions
- name: System Cleanup
  run: npm run cleanup
```

```bash
# Git pre-commit hook
#!/bin/bash
npm run cleanup:soft
git add .
```

---

## Notes

- Script được viết bằng **Node.js** (cross-platform: Windows/Mac/Linux)
- Không cần bash hay PowerShell riêng
- Tất cả paths dùng `path.join()` (Windows-compatible)
- Output màu sắc cho dễ đọc

---

Tạo ngày: **26/03/2026**  
Script: `cleanup.js`  
Cách gọi: `npm run cleanup`, `npm run cleanup:dry-run`, `npm run cleanup:soft`
