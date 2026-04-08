# 🚀 UniAct Installation Guide - 5 Steps

**Cài đặt hệ thống UniAct trên máy tính mới từ đầu - chỉ trong 5 bước.**

📋 **Thời gian ước tính:** 10-15 phút (tồn task chủ yếu cho download dependencies)

---

## **Step 1️⃣: Prerequisites - Kiểm tra & Cài Đặt Công Cụ**

### Yêu Cầu Hệ Thống:
- **OS:** Windows 10+, macOS 11+, Ubuntu 20.04+
- **RAM:** 4 GB (tối thiểu), 8 GB (khuyến nghị)
- **Ổ Đĩa:** 2 GB trống

### Cài Đặt Công Cụ (chọn theo OS):

#### **🪟 Windows (Command Prompt / PowerShell):**
```bash
# 1. Download & cài Node.js 18+ từ https://nodejs.org
# 2. Verify installation
node --version          # Expected: v18.x.x hoặc v20.x.x
npm --version           # Expected: 9.x.x hoặc cao hơn

# 3. (Optional) Cài Git để clone repository
# Download từ https://git-scm.com/download/win
git --version           # Expected: git version 2.x.x
```

#### **🍎 macOS (Terminal):**
```bash
# 1. Cài Homebrew (nếu chưa có)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Cài Node.js via Homebrew
brew install node@18
brew switch node 18    # (nếu có nhiều version)

# 3. Verify
node --version
npm --version
```

#### **🐧 Linux (Ubuntu/Debian):**
```bash
# 1. Update package manager
sudo apt update && sudo apt upgrade -y

# 2. Cài Node.js from NodeSource repository
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Verify
node --version
npm --version
```

---

## **Step 2️⃣: Clone & Setup Project**

### Option A: Clone from Git (Nếu có repository)
```bash
# Clone repository
git clone https://github.com/your-org/uniact.git
cd uniact

# Hoặc nếu bạn có folder code sẵn
# cd path/to/uniact
```

### Option B: Copy Existing Code
```bash
# Nếu code đã có trên máy
cd path/to/uniact-project
```

### Kiểm Tra Cấu Trúc Folder:
```bash
ls -la
# Kỳ vọng thấy:
# ├── src/              # Source code
# ├── public/           # Static files
# ├── package.json      # Dependencies
# ├── .env.example      # Environment template
# └── ...
```

---

## **Step 3️⃣: Cài Dependencies & Database**

### 3.1 Cài NPM Packages:
```bash
# Cài đặt tất cả dependencies
npm install

# Expected output:
# added XXX packages in X seconds ✓
```

### 3.2 Chuẩn Bị Environment Variables:
```bash
# Copy file .env.example → .env.local
cp .env.example .env.local

# ✏️ Edit .env.local và điền các giá trị (hoặc dùng defaults):
# JWT_SECRET=your-secret-key-here      (Để test: to be changed)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# NODE_ENV=development
```

### 3.3 Khởi Tạo & Seed Database:
```bash
# Tạo database tables từ migrations
npm run db:migrate

# Expected: ✅ Migrations applied successfully

# Seed dữ liệu demo (sinh viên, giáo viên, hoạt động)
npm run seed

# Expected: ✅ Demo data seeded successfully
# 
# Dữ liệu được tạo:
# - 1 Admin: admin@test.edu / Admin123!
# - 2 Teachers: teacher1@test.edu, teacher2@test.edu / Teacher123!
# - 10 Students: student01-10@test.edu / Student123!
```

---

## **Step 4️⃣: Build & Test Local**

### 4.1 Development Mode (Với Hot Reload):
```bash
# Chạy dev server
npm run dev

# Expected output:
# ▲ Next.js 15.5.4
# ▶ Ready in 2.5s
# ◀ Local: http://localhost:3000
```

**🌐 Mở browser và test:**
- Truy cập: http://localhost:3000/login
- Đăng nhập thử:
  - **Admin:** admin@test.edu / Admin123!
  - **Teacher:** teacher1@test.edu / Teacher123!
  - **Student:** student01@test.edu / Student123!
  - ✅ Nhìn thấy dashboard của từng role → **Thành công!**

### 4.2 (Optional) Production Build Test:
```bash
# Build tối ưu cho production
npm run build

# Expected: ✅ Compiled successfully

# Chạy production build
npm run start

# Expected: ▲ Ready on http://localhost:3000
```

---

## **Step 5️⃣: Deploy với Docker (Optional but Recommended)**

### Nếu chỉ test local, skip bước này. Nếu muốn deploy:

### 5.1 Build Docker Image:
```bash
# Tạo Docker image
docker build -t uniact:latest .

# Expected: ✅ Successfully tagged uniact:latest
```

### 5.2 Chạy với Docker:
```bash
# Cách 1: Lệnh đơn
docker run -p 3000:3000 \
  -e JWT_SECRET="your-secret-key" \
  -e NODE_ENV=production \
  uniact:latest

# Cách 2: Dùng docker-compose (khuyến nghị)
docker-compose up -d

# Verify:
docker ps
# Kỳ vọng thấy "uniact-app" running

# Kiểm tra logs:
docker-compose logs -f uniact

# Truy cập:
# http://localhost:3000
```

### 5.3 Dọn dẹp:
```bash
# Stop containers
docker-compose down

# Xóa volumes (reset data)
docker-compose down -v

# Xóa images
docker rmi uniact:latest
```

---

## **Troubleshooting** 🆘

### ❌ `npm install` fails
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### ❌ Port 3000 already in use
```bash
# Linux/Mac: Kill process
lsof -ti:3000 | xargs kill -9

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Or use different port
PORT=3001 npm run dev
```

### ❌ Database migration fails
```bash
# Reset database completely
rm uniact.db*
npm run db:migrate
npm run seed
```

### ❌ `npm run build` fails
```bash
# Check Node.js version (need 18+)
node --version

# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### ❌ Docker containers won't start
```bash
# Check Docker daemon running
docker ps

# View detailed error logs
docker-compose logs -f

# Rebuild image (clear cache)
docker-compose build --no-cache
```

---

## **Quick Reference - Lệnh Hữu Ích** 📚

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build           # Production build
npm run start           # Run production build

# Database
npm run db:migrate      # Apply migrations
npm run db:reset        # Reset database completely
npm run seed            # Seed demo data
npm run seed:reset      # Full reset + seed (QA mode)

# Quality Assurance
npm run lint            # Check code quality
npm run format:check    # Check formatting
npm test                # Run tests
npm run test:e2e        # E2E tests (Playwright)

# Load Testing
k6 run scripts/load-test-qr.k6.js    # QR attendance load test

# Docker
docker-compose up       # Start all services
docker-compose down     # Stop all services
docker-compose logs -f  # View live logs
```

---

## **Cấu Trúc Folder Quan Trọng** 📁

```
uniact/
├── src/
│   ├── app/             # Pages & API routes (Next.js App Router)
│   │   ├── api/         # API endpoints
│   │   ├── admin/       # Admin dashboard
│   │   ├── teacher/     # Teacher dashboard
│   │   └── student/     # Student dashboard
│   ├── components/      # Reusable React components
│   ├── features/        # Feature-specific UI components
│   ├── lib/             # Shared utilities & logic
│   └── types/           # TypeScript types
│
├── public/              # Static files (images, icons)
├── migrations/          # Database schema migrations
├── scripts/             # Build & utility scripts
├── test/                # Test files
│
├── package.json         # Project metadata & dependencies
├── tsconfig.json        # TypeScript configuration
├── next.config.ts       # Next.js configuration
├── .env.example         # Environment variables template
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
└── README.md            # Project documentation
```

---

## **Verify Installation** ✅

Chạy script verification để chắc chắn mọi thứ được setup đúng:

```bash
# Tạo file verify.sh (Linux/Mac) hoặc verify.bat (Windows)
# Copy code dưới đây vào file

# ⚠️ hoặc chỉ chạy các lệnh sau thủ công:

# 1. Check Node.js
node --version

# 2. Check npm
npm --version

# 3. Check .env.local exists
ls .env.local

# 4. Try migration
npm run db:migrate

# 5. Try seed
npm run seed

# 6. Build
npm run build

# 7. Test API health
curl http://localhost:3000/api/health
# Expected: { "status": "ok" }
```

---

## **Next Steps** 🎯

Sau khi cài xong:

1. **Customize cấu hình:** Edit `.env.local` với giá trị thực
2. **Thay đổi dữ liệu:** Sửa `scripts/seed/seed-data.ts` nếu muốn dữ liệu khác
3. **Deploy:** Dùng `docker-compose` hoặc platform như Vercel, Railway, DigitalOcean
4. **Learning:** Đọc docs trong `de-tai/` folder để hiểu architecture
5. **Testing:** Chạy `npm run test` & `npm run test:e2e` để verify functionality

---

## **Hỗ Trợ & Tài Liệu** 📖

- **Architecture:** [de-tai/06-THIET-KE-HE-THONG.md](../de-tai/06-THIET-KE-HE-THONG.md)
- **Permissions/Rules:** [de-tai/PERMISSIONS_AND_BUSINESS_RULES.md](../de-tai/PERMISSIONS_AND_BUSINESS_RULES.md)
- **Development Guide:** [DEVELOPMENT_GUIDE.md](../03-DEVELOPMENT_GUIDE.md)
- **API Documentation:** [API.md](../API.md) (nếu có)

---

**🎉 Chúc mừng! Bạn đã cài đặt thành công UniAct. Happy coding!**
