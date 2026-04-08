# PHẦN III: THÔNG TIN VỀ TRIỂN KHAI ỨNG DỤNG PHẦN MỀM/SẢN PHẨM CÔNG NGHỆ

---

## III.1. Cài đặt & Triển khai

Phần này mô tả quy trình triển khai UniAct theo hướng dẫn dự thi: yêu cầu hệ thống, biên dịch (build), các bước cài đặt và cấu hình.

### III.1.1. Yêu cầu phần cứng/phần mềm

**Phần cứng (tham khảo cho triển khai nội bộ):**

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---:|---:|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Ổ đĩa | 20 GB | 40 GB (SSD) |
| Mạng | 100 Mbps | 1 Gbps |

**Phần mềm:**

| Phần mềm | Phiên bản | Lưu ý |
|---|---|---|
| Node.js | 18+ | Chạy Next.js |
| npm | 9+ | Quản lý dependency |
| Git | mới | Lấy mã nguồn (nếu dùng repo) |

### III.1.2. Biên dịch (Build)

```bash
npm install
npm run build
```

### III.1.3. Các bước cài đặt

**Bước 1: Chuẩn bị mã nguồn**
- Copy thư mục dự án hoặc clone từ repo nội bộ.

**Bước 2: Cài dependency**
```bash
npm install
```

**Bước 3: Khởi tạo CSDL**
```bash
npm run db:migrate
```

**Bước 4: Nạp dữ liệu mẫu (tùy chọn)**
```bash
npm run seed
```

**Bước 5: Chạy hệ thống**
- Chế độ phát triển:
```bash
npm run dev
```
- Chế độ production:
```bash
npm run build
npm run start
```

**Bước 6: Kiểm tra**
```bash
npm run health-check
```

### III.1.4. Cấu hình hệ thống

Hệ thống đọc cấu hình từ biến môi trường (ví dụ `.env`). Các biến cốt lõi khi triển khai:

- `NODE_ENV`: `production` hoặc `development`
- `PORT`: cổng chạy (mặc định 3000 theo Next.js)
- `HOST`: địa chỉ bind (triển khai LAN thường dùng `0.0.0.0`)
- `JWT_SECRET`: khóa ký token (bắt buộc đặt khi production)

Thiết kế dự kiến:
- CSDL SQLite lưu theo file (ví dụ `uniact.db`) để thuận tiện triển khai nội bộ.
- Khi triển khai kiểm thử tự động, có thể dùng DB tạm thời (ví dụ `:memory:`) để chạy nhanh và cô lập dữ liệu.



Lưu ý: phần triển khai chi tiết (Nginx/PM2/backup/giám sát) xem thêm tại tài liệu dự án [04-DEPLOYMENT.md](../04-DEPLOYMENT.md).

---

## III.2. An toàn, bảo mật

### III.2.1. Phân quyền người dùng

- Hệ thống áp dụng RBAC theo 3 vai trò: **Admin / Teacher / Student**.
- Các API nhạy cảm thực hiện kiểm tra xác thực và vai trò (guards) trước khi xử lý.

### III.2.2. Quản lý phiên đăng nhập

- Đăng nhập trả về cookie `token` dạng **HTTP-only**, `SameSite=strict`.
- Trong production, cookie đặt cờ `secure`.

### III.2.3. Mã hóa, sao lưu dữ liệu

- Mật khẩu dự kiến được băm bằng **bcrypt**/**bcryptjs**.
- Một số cơ chế xác thực bổ trợ có thể sử dụng **argon2** (ví dụ câu hỏi bảo mật).
- Sao lưu CSDL SQLite: thiết kế theo hướng có quy trình sao lưu/khôi phục rõ ràng; khi triển khai sẽ bổ sung script phù hợp môi trường.

---

## III.3. Đánh giá về kết quả kiểm thử

### III.3.1. Kiểm thử tự động

- Unit/Integration: dự kiến dùng Vitest
```bash
npm test
```
- E2E: dự kiến dùng Playwright
```bash
npm run test:e2e
```

### III.3.2. Kiểm thử thủ công

- Kiểm thử theo vai trò (Admin/Teacher/Student), tập trung vào các luồng chính: tạo hoạt động → duyệt → đăng ký → điểm danh QR → tổng hợp.
- Checklist có thể tham chiếu thêm trong thư mục `docs/`.

---

## III.4. Khả năng ứng dụng và phát triển

### III.4.1. Khả năng triển khai trong nhà trường

- Có thể triển khai trong mạng nội bộ (LAN) và vận hành theo mô hình web app.
- Dữ liệu tập trung giúp truy vết, tổng hợp báo cáo nhanh hơn so với quy trình rời rạc.

### III.4.2. Khả năng mở rộng, nâng cấp

- Mở rộng chức năng theo module (activities/attendance/scores/awards…).
- Có thể chuẩn hóa response API và tăng coverage kiểm thử khi quy mô tăng.

### III.4.3. Định hướng phát triển

- Hoàn thiện báo cáo thống kê, biểu mẫu xuất dữ liệu.
- Bổ sung đo kiểm tải/giám sát vận hành theo môi trường triển khai.

---

## III.5. Phụ lục kỹ thuật (tham khảo): Công nghệ & trích đoạn mã nguồn

### 5.1.1. Công nghệ tổng quan

| Tầng | Công nghệ | Lưu ý | Lý do |
|------|-----------|--------|-------|
| **Framework** | Next.js | Dự kiến sử dụng | Full-stack, SSR, API Routes |
| **UI Library** | React | Dự kiến sử dụng | Component-based, Virtual DOM |
| **Language** | TypeScript | Dự kiến sử dụng | Type safety, trải nghiệm phát triển tốt |
| **Styling** | Tailwind CSS | Dự kiến sử dụng | Utility-first, responsive |
| **Database** | SQLite | File-based (không cần DB server riêng) | Đơn giản triển khai, phù hợp phạm vi triển khai nội bộ |
| **Auth** | JWT | Dự kiến sử dụng | Stateless, secure |
| **Validation** | Zod | Dự kiến sử dụng | Schema validation |
| **Testing** | Vitest | Dự kiến sử dụng | Fast, Jest-compatible |
| **QR Code** | react-qr-code / qrcode | Dự kiến sử dụng | Tạo QR/token theo nghiệp vụ |

### 5.1.2. Next.js - Tính năng cốt lõi

**1. App Router:**
```typescript
src/app/
├── layout.tsx           // Layout gốc
├── page.tsx             // Trang chủ
├── admin/
│   ├── layout.tsx      // Layout quản trị
│   └── dashboard/
│       └── page.tsx    // Dashboard quản trị
└── api/
    └── activities/
        └── route.ts    // Điểm cuối API
```

**2. Server Components (thành phần phía server):**
```typescript
// app/activities/page.tsx
export default async function ActivitiesPage() {
  // Fetch trực tiếp trong component
  const activities = await db.query('SELECT * FROM activities');
  
  return <ActivityList activities={activities} />;
}
```

**3. API Routes (tuyến API):**
```typescript
// app/api/activities/route.ts
export async function GET(request: Request) {
  const activities = await db.query('SELECT * FROM activities');
  return Response.json({ success: true, data: activities });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Kiểm tra dữ liệu, thêm mới...
  return Response.json({ success: true });
}
```

### 5.1.3. React - Mẫu sử dụng (tham khảo)

**1. Server Components (thành phần phía server):**
```typescript
// Chạy trên server, không gửi JS về client
async function ActivityList() {
  const activities = await fetchActivities();
  
  return (
    <div>
      {activities.map(act => <ActivityCard key={act.id} {...act} />)}
    </div>
  );
}
```

**2. Client Components (thành phần phía client):**
```typescript
'use client'; // Chỉ định chạy phía client

import { useState } from 'react';

export function ActivityFilter() {
  const [filter, setFilter] = useState('');
  // Xử lý tương tác...
  return <input value={filter} onChange={e => setFilter(e.target.value)} />;
}
```

**3. Hook tùy biến (Custom Hook):**
```typescript
// lib/hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, []);
  
  return { user, isAuthenticated: !!user };
}
```

### 5.1.4. TypeScript - An toàn kiểu dữ liệu

**1. Kiểu dữ liệu CSDL:**
```typescript
// types/database.ts
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  class_id: number | null;
}

export interface Activity {
  id: number;
  title: string;
  date_time: string;
  teacher_id: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
}
```

**2. Kiểu dữ liệu API:**
```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type GetActivitiesResponse = ApiResponse<Activity[]>;
export type CreateActivityRequest = Omit<Activity, 'id'>;
```

**3. Schema kiểm tra dữ liệu:**
```typescript
// lib/validation.ts
import { z } from 'zod';

export const CreateActivitySchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().optional(),
  date_time: z.string().datetime(),
  location: z.string(),
  activity_type_id: z.number().int().positive(),
  max_participants: z.number().int().positive().optional(),
});

export type CreateActivityData = z.infer<typeof CreateActivitySchema>;
```

---

## 5.2. CẤU TRÚC MÃ NGUỒN

### 5.2.1. Cấu trúc thư mục

```
uniact/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── admin/              # Admin pages
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── approvals/
│   │   │   └── ...
│   │   ├── teacher/            # Teacher pages
│   │   ├── student/            # Student pages
│   │   └── api/                # API Routes
│   │       ├── auth/
│   │       ├── activities/
│   │       ├── attendance/
│   │       └── ...
│   ├── components/             # React Components
│   │   ├── ActivityCard.tsx
│   │   ├── Navigation.tsx
│   │   ├── DataTable.tsx
│   │   └── ...
│   ├── features/               # Feature modules
│   │   ├── activity-types/
│   │   ├── dashboard/
│   │   └── reports/
│   ├── lib/                    # Utilities
│   │   ├── database.ts         # SQLite
│   │   ├── auth.ts             # JWT
│   │   ├── validation.ts       # Zod schemas
│   │   ├── cache.ts            # Caching
│   │   └── logger.ts           # Logging
│   └── types/                  # TypeScript types
│       └── database.ts
├── test/                       # Test files
│   ├── activities.test.ts
│   ├── attendance.test.ts
│   └── integration/
├── public/                     # Static files
│   └── uploads/
├── scripts/                    # Utility scripts
│   ├── seed/seed-data.ts
│   └── maintenance/backup-db.ts
├── uniact.db                   # SQLite database (đường dẫn có thể cấu hình)
├── package.json
├── tsconfig.json
└── next.config.ts
```

### 5.2.2. Phụ thuộc module

```
┌──────────────┐
│ app/         │  ← Pages
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ components/  │  ← UI Components
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ lib/         │  ← Business Logic
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ database     │  ← Data Layer
└──────────────┘
```

---

## 5.3. TRIỂN KHAI TÍNH NĂNG CHÍNH

### 5.3.1. Authentication với JWT

**1. Login Flow:**
```typescript
// app/api/auth/login/route.ts
import { db } from '@/lib/database';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  // 1. Tìm user
  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  
  // 2. Verify password
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  
  // 3. Generate JWT
  const token = generateToken({ 
    userId: user.id, 
    role: user.role 
  });
  
  // 4. Set HTTP-only cookie
  const response = Response.json({ success: true, user });
  response.headers.set('Set-Cookie', 
    `token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`
  );
  
  return response;
}
```

**2. JWT Utility:**
```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || '<secret>';

export function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

**3. Auth Middleware:**
```typescript
// lib/guards.ts
import { verifyToken } from './auth';
import { cookies } from 'next/headers';

export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) throw new Error('Unauthorized');
  
  const payload = verifyToken(token);
  if (!payload) throw new Error('Invalid token');
  
  return payload;
}

export async function requireRole(role: string) {
  const user = await requireAuth();
  if (user.role !== role) throw new Error('Forbidden');
  return user;
}
```

### 5.3.2. QR Code Authentication

**1. Generate QR Session:**
```typescript
// app/api/qr-sessions/route.ts
import { requireAuth, generateToken } from '@/lib/auth';
import { db } from '@/lib/database';

export async function POST(request: Request) {
  const user = await requireAuth();
  const { activityId, expiresInMinutes = 5 } = await request.json();
  
  // 1. Verify activity ownership
  const activity = await db.get(
    'SELECT * FROM activities WHERE id = ? AND teacher_id = ?',
    [activityId, user.userId]
  );
  if (!activity) return Response.json({ error: 'Not found' }, { status: 404 });
  
  // 2. Create QR session
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const result = await db.run(
    'INSERT INTO qr_sessions (activity_id, expires_at) VALUES (?, ?)',
    [activityId, expiresAt.toISOString()]
  );
  
  // 3. Generate JWT token for QR
  const qrToken = generateToken({
    sessionId: result.lastID,
    activityId,
    exp: Math.floor(expiresAt.getTime() / 1000)
  });
  
  return Response.json({ 
    success: true, 
    sessionId: result.lastID,
    qrToken,
    expiresAt 
  });
}
```

**2. Validate QR Scan:**
```typescript
// app/api/attendance/validate/route.ts
export async function POST(request: Request) {
  const user = await requireAuth();
  const { qrToken } = await request.json();
  
  // 1. Verify QR token
  const payload = verifyToken(qrToken);
  if (!payload) return Response.json({ error: 'Invalid QR' }, { status: 400 });
  
  // 2. Check session exists & not expired
  const session = await db.get(
    'SELECT * FROM qr_sessions WHERE id = ? AND expires_at > datetime("now")',
    payload.sessionId
  );
  if (!session) return Response.json({ error: 'Expired' }, { status: 400 });
  
  // 3. Check student eligibility
  const participation = await db.get(
    'SELECT * FROM participations WHERE activity_id = ? AND student_id = ?',
    [session.activity_id, user.userId]
  );
  if (!participation) return Response.json({ error: 'Not registered' }, { status: 403 });
  
  // 4. Check duplicate
  const existing = await db.get(
    'SELECT * FROM attendance_records WHERE activity_id = ? AND student_id = ?',
    [session.activity_id, user.userId]
  );
  if (existing) return Response.json({ error: 'Already checked in' }, { status: 400 });
  
  // 5. Mark attendance
  await db.run(
    `INSERT INTO attendance_records 
     (activity_id, student_id, qr_session_id, attendance_status) 
     VALUES (?, ?, ?, 'present')`,
    [session.activity_id, user.userId, session.id]
  );
  
  // 6. Update scan count
  await db.run(
    'UPDATE qr_sessions SET scan_count = scan_count + 1 WHERE id = ?',
    session.id
  );
  
  return Response.json({ success: true, message: 'Checked in!' });
}
```

### 5.3.3. Scoring Engine

**1. Calculate Score:**
```typescript
// lib/scoring.ts
export async function calculateStudentScore(studentId: number) {
  // 1. Get all attended activities
  const records = await db.all(`
    SELECT ar.*, a.activity_type_id, a.organization_level_id
    FROM attendance_records ar
    JOIN activities a ON ar.activity_id = a.id
    WHERE ar.student_id = ? AND ar.attendance_status = 'present'
  `, studentId);
  
  // 2. Get scoring config
  const activityTypes = await db.all('SELECT * FROM activity_types');
  const orgLevels = await db.all('SELECT * FROM organization_levels');
  
  const typeScores = Object.fromEntries(
    activityTypes.map(t => [t.id, t.base_score])
  );
  const levelMultipliers = Object.fromEntries(
    orgLevels.map(l => [l.id, l.multiplier])
  );
  
  // 3. Calculate total
  let total = 0;
  for (const record of records) {
    const baseScore = typeScores[record.activity_type_id] || 1;
    const multiplier = levelMultipliers[record.organization_level_id] || 1;
    total += baseScore * multiplier;
  }
  
  // 4. Update database
  await db.run(`
    INSERT OR REPLACE INTO student_scores (student_id, total_score, last_updated)
    VALUES (?, ?, datetime('now'))
  `, [studentId, total]);
  
  return total;
}
```

**2. Đề xuất khen thưởng (nếu có):**

Hệ thống có thể sinh gợi ý khen thưởng dựa trên dữ liệu tổng hợp điểm và tiêu chí của từng loại khen thưởng.

- Dữ liệu nguồn: bảng tổng hợp điểm (ví dụ `student_scores`) và danh mục loại khen thưởng (ví dụ `award_types`).
- Kết quả gợi ý được lưu để admin xem xét/duyệt (ví dụ `award_suggestions` → `student_awards`).
- Phạm vi chọn đối tượng (top N/toàn bộ), ngưỡng và lý do gợi ý phụ thuộc cấu hình và yêu cầu triển khai; không cố định.

### 5.3.4. Hệ thống cảnh báo

Hệ thống có mô-đun cảnh báo để hỗ trợ theo dõi các trường hợp cần quan tâm (tùy theo cấu hình và phạm vi triển khai).

- API dự kiến: các endpoint để quản lý/xem cảnh báo theo vai trò.
- Có thể có tác vụ nền để sinh cảnh báo định kỳ (nếu triển khai yêu cầu).
- Nội dung/mức độ/ngưỡng cảnh báo sẽ được cấu hình khi triển khai; tránh gán cứng số liệu nếu chưa kiểm chứng.

---

## 5.4. KIỂM THỬ VÀ TRIỂN KHAI

### 5.4.1. Unit Tests

```typescript
// test/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStudentScore } from '@/lib/scoring';

describe('Scoring Engine', () => {
  it('should calculate correct score', async () => {
    const score = await calculateStudentScore(1);
    expect(score).toBeGreaterThan(0);
  });
  
  it('should handle no activities', async () => {
    const score = await calculateStudentScore(999);
    expect(score).toBe(0);
  });
});
```

### 5.4.2. Integration Tests

Kiểm thử tích hợp có thể thực hiện theo kịch bản nghiệp vụ (tạo hoạt động → duyệt → đăng ký → điểm danh → tổng hợp). Trong phạm vi công trình, ưu tiên danh sách kiểm thử/UAT và tự động hóa UAT (Playwright) tùy điều kiện triển khai.

### 5.4.3. Triển khai

**1. Build (đóng gói):**
```bash
npm run build
# Kết quả: thư mục .next/
```

**2. Chạy production:**
```bash
npm start
# Server: http://localhost:3000
```

**3. Triển khai nội bộ (LAN/intranet) (tham khảo):**
```bash
# Xác định địa chỉ/hostname của máy chủ (ví dụ)
ipconfig  # Windows

# Cấu hình NEXT_PUBLIC_API_URL theo môi trường triển khai
# (khuyến nghị đặt trong file .env hoặc biến môi trường khi chạy)
# NEXT_PUBLIC_API_URL=http://<server-host>:<port>

# Chạy dịch vụ
npm start

# Truy cập từ máy trạm:
# http://<server-host>:<port>
```

---

**KẾT LUẬN (CÔNG NGHỆ THỰC HIỆN):**

Phần này trình bày chi tiết:
- Công nghệ sử dụng (Next.js, React, TypeScript, SQLite)
- Cấu trúc mã nguồn và tổ chức thư mục
- Triển khai các chức năng chính theo phạm vi dự án (xác thực, QR, tổng hợp điểm, khen thưởng)
- Kiểm thử và hướng triển khai nội bộ (LAN)

Hệ thống là nền tảng để tiếp tục đánh giá và hoàn thiện khi triển khai thực tế.
