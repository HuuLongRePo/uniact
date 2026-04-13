# Phase 3 Baseline (Security + Performance)

## Đã triển khai trong batch này
- Bổ sung hardening headers:
  - `Strict-Transport-Security`
  - `X-DNS-Prefetch-Control`
  - `X-Permitted-Cross-Domain-Policies`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Resource-Policy`
- Tắt `X-Powered-By` qua `poweredByHeader: false` trong Next config.
- Chuẩn hóa release gate với `npm run release:check`.

## Mục tiêu kế tiếp (ưu tiên)
1. Chuẩn hóa CSP production để loại bỏ dần `unsafe-inline` / `unsafe-eval`.
2. Rà soát toàn bộ auth endpoints cho session/cookie flags (`HttpOnly`, `Secure`, `SameSite`).
3. Thêm rate limit theo route nhóm nhạy cảm (auth/reset-password/admin).
4. Thiết lập performance budget cho trang trọng yếu (dashboard, teacher pages).
5. Bổ sung smoke test bắt buộc trong pipeline trước deploy.

## Định nghĩa Done Phase 3 (đề xuất)
- Security headers đạt baseline OWASP cho production web app.
- Không còn endpoint nhạy cảm thiếu kiểm soát truy cập/rate limit cơ bản.
- Release gate (`release:check`) chạy ổn định và là bắt buộc trước merge/deploy.
