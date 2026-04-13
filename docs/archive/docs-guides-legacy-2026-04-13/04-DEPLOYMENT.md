# 🚀 HƯỚNG DẪN TRIỂN KHAI

> **Hướng dẫn triển khai UniAct trên mạng LAN nội bộ**  
> **100% OFFLINE** - Không cần Internet

---

## 📋 MỤC LỤC

1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Cài Đặt](#cài-đặt)
3. [Cấu Hình](#cấu-hình)
4. [Khởi Chạy](#khởi-chạy)
5. [Tối Ưu Hiệu Năng](#tối-ưu-hiệu-năng)
6. [Sao Lưu & Khôi Phục](#sao-lưu--khôi-phục)
7. [Giám Sát Hệ Thống](#giám-sát-hệ-thống)
8. [Khắc Phục Sự Cố](#khắc-phục-sự-cố)
9. [Bảo Mật](#bảo-mật)

---

## 🔒 Scope Guard – Triển khai

**Phạm vi**: Triển khai web app nội bộ trên LAN, dùng Nginx reverse proxy (nếu cần), cơ sở dữ liệu SQLite, không phụ thuộc dịch vụ đám mây, hỗ trợ vận hành offline 100%.

**Ngoài phạm vi**: Push notifications di động, GPU/LLM inference, tích hợp diện rộng với hệ thống bên thứ ba, mobile app iOS/Android, integration hub, gamification, blockchain.

**Giới hạn**: SSL là khuyến nghị khi truy cập ngoài LAN; backup SQLite định kỳ; zero-downtime không bắt buộc trong giai đoạn hiện tại.

---

## 💻 YÊU CẦU HỆ THỐNG

### Phần Cứng

| Thành Phần | Tối Thiểu | Khuyến Nghị | Ghi Chú |
|------------|-----------|-------------|---------|
| **CPU** | 2 cores | 4 cores (i5/Ryzen 5) | Xử lý 1000+ users |
| **RAM** | 4GB | 8GB | Cache + concurrent |
| **Ổ Đĩa** | HDD 20GB | SSD 40GB | DB < 500MB + backups |
| **Mạng** | 100 Mbps | 1 Gbps | LAN switch |

### Phần Mềm

| Phần Mềm | Phiên Bản | Bắt Buộc |
|----------|-----------|----------|
| **Node.js** | 18+ | ✅ |
| **npm** | 9+ | ✅ |
| **Git** | Mới Nhất | ✅ |
| **SQLite** | 5.1.7+ | ✅ (bundled) |

### Hệ Điều Hành

- ✅ **Windows Server** 2019/2022
- ✅ **Ubuntu Server** 22.04 LTS
- ✅ **Windows 10/11** (phát triển)

---

## 📥 CÀI ĐẶT

### Bước 1: Clone Repository

```bash
# Clone từ repository nội bộ
git clone https://github.com/your-org/uniact.git
cd uniact
```

### Bước 2: Cài Đặt Dependencies

```bash
# Cài đặt tất cả dependencies
npm install

# Kiểm Tra Cài Đặt
npm list --depth=0
```

### Bước 3: Thiết Lập Môi Trường

```bash
# Sao chép file .env mẫu (Linux/macOS)
cp .env.example .env

# Sao chép file .env mẫu (Windows PowerShell)
Copy-Item .env.example .env

# Chỉnh sửa .env (xem mục Cấu Hình)
nano .env  # hoặc notepad .env trên Windows
```

### Bước 4: Khởi Tạo Cơ Sở Dữ Liệu

```bash
# Chạy migrations tự động
npm run db:migrate

# Tải Dữ Liệu Demo (tùy chọn)
npm run seed:enhanced
```

---

## ⚙️ CẤU HÌNH

### File .env

```bash
# ===== ENVIRONMENT =====
NODE_ENV=production
PORT=3000

# ===== SECURITY =====
JWT_SECRET=your-32-char-random-secret-here
JWT_EXPIRES_IN=7d

# ===== DATABASE =====
DATABASE_PATH=./uniact.db
BACKUP_DIR=./backups

# ===== SERVER =====
HOST=0.0.0.0  # Cho phép truy cập từ LAN
```

### Generate JWT Secret

```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### SQLite Optimization

File `src/lib/database.ts` đã tối ưu sẵn:

```typescript
// Bật WAL mode (Write-Ahead Logging)
await db.run('PRAGMA journal_mode = WAL');

// Sync mode
await db.run('PRAGMA synchronous = NORMAL');

// Cache size (~64MB)
await db.run('PRAGMA cache_size = -64000');

// Temp storage
await db.run('PRAGMA temp_store = MEMORY');
```

---

## 🚀 KHỞI CHẠY

### Development Mode

```bash
# Start dev server với hot reload
npm run dev

# Server chạy tại: http://localhost:3000
```

### Production Mode

```bash
# Build production
npm run production:build

# Start production server
npm run production:start

# Hoặc với PM2 (khuyến nghị)
npm install -g pm2
pm2 start npm --name "uniact" -- run production:start
# Windows có thể cần:
pm2 start npm.cmd --name "uniact" -- run production:start
pm2 save
pm2 startup  # Auto start on boot
```

### Kiểm Tra

```bash
# Health check
npm run health-check

# Hoặc gọi trực tiếp endpoint
curl http://localhost:3000/api/health

# Response:
{
  "status": "ok",
  "database": "connected",
  "uptime": "1 hour 23 minutes"
}
```

---

## ⚡ TỐI ƯU PERFORMANCE

### 1. Database Indexes

Đã tạo sẵn 30+ indexes trong migrations:

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Activities
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_date_time ON activities(date_time);

-- Participations
CREATE INDEX idx_participations_activity_user ON participations(activity_id, user_id);
```

### 2. Caching Strategy

**In-memory cache** với TTL:

```typescript
// Activities: 5 minutes
// Users: 10 minutes
// Classes: 15 minutes
// Scoreboard: 2 minutes
// Config: 30 minutes
```

**Cache hit rate:** 85% (target: 70%)

### 3. Connection Pool

SQLite sử dụng WAL mode cho concurrent reads:

- **Read:** Unlimited concurrent
- **Write:** Sequential (NORMAL sync mode)

### 4. Query Optimization

- ✅ JOIN thay vì N+1 queries
- ✅ Pagination (default: 20 items)
- ✅ Lazy loading components
- ✅ Server-side rendering (Next.js)

---

## 💾 BACKUP & RESTORE

### Auto Backup Script

Script đang dùng thực tế: `scripts/maintenance/backup-db.ts` (gọi qua `npm run backup-db`)

Nếu cần chạy thủ công, ưu tiên `npm run backup-db` để bám đúng logic hiện tại của repo.

### Manual Backup

```bash
# Chạy backup script
npm run backup-db

# Hoặc copy trực tiếp (Linux/macOS)
cp uniact.db backups/backup-$(date +%Y%m%d-%H%M%S).db

# Windows PowerShell
Copy-Item .\uniact.db .\backups\backup-manual.db
```

### Scheduled Backup (Linux)

**Cron job** - Backup hàng ngày lúc 2:00 AM:

```bash
# Edit crontab
crontab -e

# Thêm dòng:
0 2 * * * cd /path/to/uniact && npm run backup-db
```

### Scheduled Backup (Windows)

**Task Scheduler**:

1. Mở Task Scheduler
2. Create Basic Task
3. Trigger: Daily, 2:00 AM
4. Action: Start a program
5. Program: `C:\Program Files\nodejs\npm.cmd`
6. Arguments: `run backup-db`
7. Start in: `C:\path\to\uniact`

### Restore from Backup

```bash
# 1. Stop server
pm2 stop uniact

# 2. Backup current DB (safety)
cp uniact.db uniact.db.before-restore

# 3. Restore from backup
cp backups/backup-2025-11-19-020000.db uniact.db

# 4. Restart server
pm2 start uniact
```

---

## 📊 MONITORING

### Health Check Endpoint

```bash
GET /api/admin/system-health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "healthy",
    "uptime": "5 days 3 hours",
    "disk_usage": "45%",
    "total_users": 1500,
    "total_activities": 250,
    "cache_hit_rate": "85%"
  }
}
```

### PM2 Monitoring

```bash
# Status
pm2 status

# Logs
pm2 logs uniact

# Monitor dashboard
pm2 monit

# Web dashboard (optional)
pm2 web
```

### Database Size Check

```bash
# Linux/Mac
ls -lh uniact.db

# Windows
dir uniact.db

# Inside SQLite
sqlite3 uniact.db "SELECT page_count * page_size / 1024 / 1024 as size_mb FROM pragma_page_count(), pragma_page_size();"
```

---

## 🔧 TROUBLESHOOTING

### 1. Port Already in Use

**Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Giải pháp:**

```bash
# Linux/Mac - Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Windows - Kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Hoặc đổi port trong .env
PORT=3001
```

### 2. Database Locked

**Triệu chứng:**
```
Error: SQLITE_BUSY: database is locked
```

**Giải pháp:**

```bash
# Remove WAL files (Linux/macOS)
rm uniact.db-wal
rm uniact.db-shm

# Windows PowerShell
Remove-Item .\uniact.db-wal, .\uniact.db-shm -ErrorAction SilentlyContinue

# Restart server
pm2 restart uniact
```

### 3. Migration Failed

**Triệu chứng:**
```
Migration 005 failed
```

**Giải pháp:**

```bash
# Re-run migration
npm run db:migrate
```

Nếu cần kiểm tra trạng thái migration chi tiết, hãy mở bảng `migrations` bằng DB Browser for SQLite hoặc công cụ SQLite phù hợp với máy hiện tại trước khi chỉnh tay.

### 4. Out of Memory

**Triệu chứng:**
```
FATAL ERROR: Reached heap limit
```

**Giải pháp:**

```bash
# Increase Node.js memory limit (Linux/macOS)
export NODE_OPTIONS="--max-old-space-size=4096"
npm run production:start

# PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run production:start

# PM2 Linux/macOS
pm2 start npm --name "uniact" --node-args="--max-old-space-size=4096" -- run production:start

# PM2 Windows
pm2 start npm.cmd --name "uniact" --node-args="--max-old-space-size=4096" -- run production:start
```

### 5. Slow Queries

**Kiểm tra:**

```sql
-- Enable query log
PRAGMA query_only = ON;

-- Check slow queries
SELECT * FROM sqlite_stat1;
```

**Giải pháp:**
- Tạo thêm indexes
- Optimize JOINs
- Tăng cache_size

### 6. Cache Not Working

**Kiểm tra:**

```bash
# Check cache-related lines in logs
pm2 logs uniact

# Repo hiện tại chưa có route clear-cache mặc định; ưu tiên xác minh nguyên nhân rồi restart tiến trình nếu cần
pm2 restart uniact
```

### 7. QR Code Expired

**Triệu chứng:**
```
QR code đã hết hạn
```

**Giải pháp:**

```sql
-- Clean expired sessions
DELETE FROM qr_sessions WHERE expires_at < datetime('now');

-- Adjust expiration in admin config
```

### 8. Permission Denied

**Triệu chứng:**
```
Error: EACCES: permission denied
```

**Giải pháp:**

```bash
# Linux/Mac - Fix permissions
chmod -R 755 uniact
chown -R www-data:www-data uniact

# Windows - Run as Administrator
```

---

## 🔐 SECURITY

### Network Security

**Firewall Rules:**

```bash
# Linux (ufw)
sudo ufw allow 3000/tcp
sudo ufw deny from any to any port 3000 proto tcp  # Chỉ LAN
sudo ufw enable

# Windows Firewall
New-NetFirewallRule -DisplayName "UniAct" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**LAN Only Access:**

```bash
# .env
HOST=192.168.1.100  # Internal IP only, not 0.0.0.0
```

### Database Security

```bash
# File permissions
chmod 600 uniact.db  # Owner read/write only

# Backup encryption (optional)
gpg -c backups/backup-2025-11-19.db
```

### Application Security

**Đã implement:**
- ✅ JWT authentication
- ✅ Password hashing (bcrypt 12 rounds)
- ✅ RBAC (Role-Based Access Control)
- ✅ Input validation (Zod)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React auto-escaping)
- ✅ Audit logging

### SSL/TLS (Optional - for internal CA)

```bash
# Generate self-signed cert
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Next.js HTTPS
# next.config.ts (custom server required)
```

---

## 📞 SUPPORT

### Log Files

```bash
# PM2 logs
~/.pm2/logs/uniact-error.log
~/.pm2/logs/uniact-out.log

# Application logs
logs/error.log
logs/audit.log
```

### Debug Mode

```bash
# Enable debug logging (Linux/macOS)
DEBUG=* npm run production:start

# PowerShell
$env:DEBUG="db:*,api:*"; npm run production:start
```

---

## ✅ CHECKLIST TRIỂN KHAI

**Pre-deployment:**
- [ ] Server setup (CPU, RAM, Disk)
- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] .env configured với JWT secret

**Deployment:**
- [ ] Migrations chạy thành công
- [ ] Demo data seeded (optional)
- [ ] PM2 configured
- [ ] Firewall rules setup
- [ ] LAN IP accessible

**Post-deployment:**
- [ ] Health check OK
- [ ] Login test (admin, teacher, student)
- [ ] QR attendance test
- [ ] First backup created
- [ ] Cron/Task Scheduler configured

**Monitoring:**
- [ ] PM2 auto-restart on
- [ ] Daily backups scheduled
- [ ] Disk space monitoring
- [ ] Performance metrics baseline

---

## 🎓 TRAINING

**Admin Training (2h):**
1. User & class management
2. Activity approval workflow
3. System configuration
4. Reports & analytics
5. Backup & restore

**Teacher Training (1.5h):**
1. Create & manage activities
2. QR attendance
3. Evaluation & scoring
4. View reports

**Student Training (30min):**
1. Browse & register activities
2. QR check-in
3. View points & awards

---

**Cập nhật:** 19/11/2025  
**Phiên bản:** 1.0.0  
**Contact:** IT Support Team
