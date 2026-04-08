# PHẦN II: THÔNG TIN VỀ THIẾT KẾ, XÂY DỰNG PHẦN MỀM/SẢN PHẨM CÔNG NGHỆ

Nội dung trong file này tập trung vào: tổng quan giải pháp, nền tảng lý thuyết, kiến trúc và công nghệ liên quan đến hệ thống UniAct.

---

## 2.1. TỔNG QUAN VỀ QUẢN LÝ HOẠT ĐỘNG NGOẠI KHÓA

### 2.1.1. Khái niệm hoạt động ngoại khóa

**Hoạt động ngoại khóa** là các hoạt động giáo dục được tổ chức ngoài giờ học chính khóa, nhằm:
- Phát triển kỹ năng mềm (soft skills)
- Rèn luyện thể chất, tinh thần
- Nâng cao ý thức cộng đồng
- Bồi dưỡng năng khiếu, sở trường

Theo **Thông tư 16/2015/TT-BGDĐT**, hoạt động ngoại khóa là bắt buộc trong chương trình đào tạo đại học.

### 2.1.2. Phân loại hoạt động

Tại Trường Đại học An Ninh Nhân dân, hoạt động được phân thành **8 loại hình**:

| Loại | Ví dụ | Tần suất |
|------|-------|----------|
| **Học thuật** | Hội thảo, Nghiên cứu khoa học | 20% |
| **Thể thao** | Giải bóng đá, Marathon | 25% |
| **Văn nghệ** | Hội diễn, Liên hoan | 15% |
| **Thiện nguyện** | Tình nguyện, Từ thiện | 10% |
| **Kỹ năng** | Soft skills, Workshop | 15% |
| **Chính trị** | Tọa đàm, Học tập | 5% |
| **Văn hóa** | Giao lưu, Trải nghiệm | 5% |
| **Khác** | Các hoạt động khác | 5% |

### 2.1.3. Quy trình quản lý truyền thống

**Quy trình hiện tại:**
```
1. Giảng viên → Tạo kế hoạch (Word/Excel)
2. Giảng viên → Gửi email/giấy đề xuất
3. Ban Công tác SV → Duyệt thủ công
4. Thông báo → Sinh viên (qua lớp trưởng)
5. Điểm danh → Danh sách giấy
6. Tính điểm → Thủ công (Excel)
7. Khen thưởng → Đề xuất thủ công
```

**Vấn đề:**
- Mất nhiều thời gian (ước lượng theo vận hành thực tế).
- Dễ sai sót, thất lạc hồ sơ.
- Thiếu minh bạch, khó truy vết.
- Khó theo dõi, thống kê.

---

## 2.2. CÔNG NGHỆ WEB HIỆN ĐẠI

### 2.2.1. Next.js - React Framework

**Next.js** là một React framework mã nguồn mở do Vercel phát triển, cung cấp:

**1. Server-Side Rendering (SSR) / Server Components:**

Trong kiến trúc Next.js App Router, nhiều trang có thể là **Server Components** và thực hiện truy vấn dữ liệu phía server (không cần `getServerSideProps` như mô hình Pages Router).

**Ưu điểm:**
- Hỗ trợ nhiều chiến lược render (SSR/SSG/ISR) phù hợp từng nhu cầu.
- Cải thiện trải nghiệm tải trang trong nhiều kịch bản triển khai.

**2. API Routes (App Router):**

Trong thiết kế, hệ thống dự kiến tổ chức các tuyến API theo mô hình App Router (API routes nằm trong cùng dự án web) để thuận tiện triển khai và bảo trì.

**Ưu điểm:**
- Backend trong cùng project (API routes)
- Hỗ trợ TypeScript
- Triển khai thuận tiện (tùy mô hình)

**3. File-based Routing (App Router):**
```
src/app/
├── page.tsx                 → /
├── login/page.tsx           → /login
├── admin/.../page.tsx       → /admin/...
└── api/activities/route.ts  → /api/activities
```

### 2.2.2. React - UI Library

**React** là thư viện JavaScript để xây dựng giao diện người dùng, phát triển bởi Facebook.

**1. Component-Based:**
```typescript
function ActivityCard({ activity }: Props) {
  return (
    <div className="card">
      <h3>{activity.title}</h3>
      <p>{activity.description}</p>
    </div>
  )
}
```

**2. Virtual DOM:**
- Cập nhật UI hiệu quả
- Chỉ re-render phần thay đổi
- Hiệu năng tốt hơn thao tác DOM trực tiếp

**3. Hooks:**
```typescript
const [activities, setActivities] = useState([])

useEffect(() => {
  fetchActivities().then(setActivities)
}, [])
```

### 2.2.3. TypeScript - An toàn kiểu dữ liệu

**TypeScript** là JavaScript với hệ thống type tĩnh.

**Ví dụ:**
```typescript
interface Activity {
  id: number
  title: string
  date_time: string
  max_participants?: number
}

const createActivity = (data: Activity): Promise<Activity> => {
  return api.post('/activities', data)
}
```

**Lợi ích:**
- Phát hiện lỗi sớm (khi biên dịch)
- Hỗ trợ IDE tốt hơn (gợi ý mã, tự động hoàn thành)
- Dễ bảo trì và refactor

### 2.2.4. Tailwind CSS - Utility-First CSS

**Tailwind CSS** là CSS framework utility-first.

**Ví dụ:**
```tsx
<button className="px-4 py-2 rounded border">
  Đăng ký
</button>
```

**Ưu điểm:**
- Viết CSS nhanh bằng utility classes
- Giao diện nhất quán theo hệ thống token/quy ước
- Responsive thuận tiện
- Tối ưu kích thước CSS (loại bỏ phần không dùng khi build)

---

## 2.3. KIẾN TRÚC HỆ THỐNG

### 2.3.1. Kiến trúc 3 tầng (3-Tier Architecture)

```
┌─────────────────────────────────────┐
│   TẦNG GIAO DIỆN (PRESENTATION)     │
│   - React Components                │
│   - UI/UX                           │
│   - Xử lý phía client               │
└─────────────────────────────────────┘
             ↕ HTTP/JSON
┌─────────────────────────────────────┐
│   TẦNG NGHIỆP VỤ (BUSINESS LOGIC)   │
│   - API Routes (Next.js)            │
│   - Xác thực (JWT)                  │
│   - Phân quyền (RBAC)               │
│   - Quy tắc nghiệp vụ               │
└─────────────────────────────────────┘
             ↕ SQL Queries
┌─────────────────────────────────────┐
│   TẦNG TRUY CẬP DỮ LIỆU (DATA)      │
│   - CSDL SQLite                      │
│   - CRUD                            │
│   - Giao dịch (transactions)         │
└─────────────────────────────────────┘
```

**Ưu điểm:**
- Tách biệt trách nhiệm
- Dễ bảo trì và mở rộng
- Có thể thay đổi từng tầng tương đối độc lập

### 2.3.2. Mô hình MVC (Model-View-Controller)

**Model:** Database schemas
```typescript
// Model: User
interface User {
  id: number
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'teacher' | 'student'
}
```

**View:** React Components
```typescript
// View: UserList component
function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

**Controller:** API Routes
```typescript
// Controller: GET /api/users
export default async function handler(req, res) {
  const users = await db.getAllUsers()
  res.json(users)
}
```

### 2.3.3. Client-Server Architecture

**Client (Browser):**
- React SPA (Single Page Application)
- Handle UI interactions
- Make API requests

**Server (Next.js):**
- Serve static files
- Handle API requests
- Database operations
- Authentication

**Communication:**
- HTTP/HTTPS protocol
- JSON data format
- RESTful API design

---

## 2.4. BẢO MẬT WEB

### 2.4.1. JWT (JSON Web Token) Authentication

**JWT** là chuẩn mở (RFC 7519) để truyền thông tin an toàn giữa các bên.

**Cấu trúc JWT:**
```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "userId": 1,
  "role": "admin",
  "email": "admin@school.edu",
  "iat": 1699999999,
  "exp": 1700003599
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

**Flow Authentication:**
```
1. User → Login (email, password)
2. Server → Verify credentials
3. Server → Generate JWT token
4. Server → Set HTTP-only cookie
5. Client → Subsequent requests with cookie
6. Server → Verify JWT → Return data
```

### 2.4.2. RBAC (Role-Based Access Control)

**RBAC** là mô hình phân quyền dựa trên vai trò.

**3 Roles:**
| Role | Permissions |
|------|-------------|
| **Admin** | Full access (CRUD all, approve, config) |
| **Teacher** | Create activities, mark attendance, view class |
| **Student** | View activities, register, scan QR |

**Implementation:**
```typescript
// Middleware kiểm tra role
const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    const user = req.user // From JWT
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// Usage
app.get('/api/admin/users', requireRole(['admin']), handler)
```

### 2.4.3. SQL Injection Prevention

**SQL Injection** là kỹ thuật tấn công bằng cách chèn mã SQL độc hại.

**Ví dụ tấn công:**
```sql
-- Input: email = "' OR '1'='1"
SELECT * FROM users WHERE email = '' OR '1'='1' -- Trả về tất cả users
```

**Phòng chống: Parameterized Queries**
```typescript
// Không nên: nối chuỗi trực tiếp
const query = `SELECT * FROM users WHERE email = '${email}'`

// Nên: dùng query tham số
const query = 'SELECT * FROM users WHERE email = ?'
db.get(query, [email])
```

### 2.4.4. XSS (Cross-Site Scripting) Prevention

**XSS** là tấn công bằng cách chèn JavaScript độc hại.

**Phòng chống:**
- React tự động escape HTML
- Sử dụng `dangerouslySetInnerHTML` cẩn thận
- Content Security Policy (CSP)

### 2.4.5. CSRF (Cross-Site Request Forgery) Prevention

**CSRF** là tấn công bằng cách giả mạo request từ user.

**Phòng chống:**
- HTTP-only cookies
- SameSite cookie attribute
- CSRF tokens (cho forms quan trọng)

---

## 2.5. QR CODE & ĐIỂM DANH

### 2.5.1. QR Code là gì?

**QR Code** (Quick Response Code) là mã vạch 2D chứa thông tin.

**Đặc điểm:**
- Chứa tối đa 4,296 ký tự alphanumeric
- Quét nhanh bằng camera
- Có khả năng sửa lỗi (7-30%)

### 2.5.2. QR Code với JWT Token

**Thay vì chứa text thường, QR Code chứa JWT token:**

```typescript
// 1. Teacher tạo QR Session
const session = await createQRSession(activityId)

// 2. Generate JWT token
const token = jwt.sign({
  sessionId: session.id,
  activityId: activity.id,
  jti: randomUUID(), // Prevent replay
  exp: Date.now() + 30 * 60 * 1000 // 30 minutes
}, SECRET)

// 3. Generate QR Code chứa token
const qrCode = await QRCode.toDataURL(token)

// 4. Student scan QR → Get token
// 5. Send token to server
fetch('/api/attendance/validate', {
  method: 'POST',
  body: JSON.stringify({ token })
})

// 6. Server validate token
const decoded = jwt.verify(token, SECRET)
// Check: session exists, not expired, student eligible
```

**Ưu điểm:**
- Bảo mật nhờ chữ ký số của JWT.
- Có thể đặt thời hạn hiệu lực cho token theo cấu hình.
- Kết hợp kiểm tra điều kiện hợp lệ (phiên điểm danh, người dùng, quyền truy cập).

Lưu ý: việc “chống quét lại/jti tracking/offline” là các biến thể thiết kế; cần mô tả theo đúng triển khai thực tế.

### 2.5.3. Chống gian lận

Các biện pháp chống gian lận thường gặp (tùy theo quy trình và triển khai):

- Token có thời hạn hiệu lực và được kiểm tra khi gửi lên server.
- Kiểm tra điều kiện tham gia/đăng ký trước khi ghi nhận điểm danh.
- Ghi nhận điểm danh và từ chối yêu cầu trùng lặp theo quy tắc nghiệp vụ.
- Ghi log/audit cho thao tác quan trọng (nếu áp dụng).

**3. Class eligibility:**
```typescript
// Kiểm tra student thuộc lớp được phép
if (!activity.allowed_classes.includes(student.class_id)) {
  throw new Error('Not eligible')
}
```

**4. Prevent double scan:**
```typescript
// Kiểm tra đã điểm danh chưa
const existing = await db.getAttendance(activityId, studentId)
if (existing) {
  throw new Error('Already attended')
}
```

**5. Audit log:**
```typescript
// Ghi log mọi lần quét
await db.insertAuditLog({
  user_id: student.id,
  action: 'QR_SCAN',
  activity_id: activityId,
  ip_address: req.ip,
  timestamp: new Date()
})
```

---

## 2.6. DATABASE MANAGEMENT

### 2.6.1. SQLite - File-Based Database

**SQLite** là database nhẹ, không cần server, lưu trữ trong 1 file.

**Ưu điểm:**
- Không cần server riêng; phù hợp triển khai gọn nhẹ.
- Đa nền tảng.
- Hỗ trợ giao dịch ACID.
- Sao lưu/khôi phục đơn giản (sao chép file DB) theo quy trình vận hành.

**Nhược điểm:**
- Không phù hợp cho kịch bản ghi cực lớn (có thể giảm rủi ro với WAL + tối ưu truy vấn/chỉ mục).
- Khó mở rộng theo chiều ngang như mô hình DB server.

### 2.6.2. Database Normalization

**Chuẩn hóa** là quá trình tổ chức database để giảm redundancy.

**3NF (Third Normal Form):**
- 1NF: Atomic values
- 2NF: No partial dependencies
- 3NF: No transitive dependencies

**Ví dụ:**
```sql
-- Không chuẩn hóa
CREATE TABLE participations (
  id INTEGER PRIMARY KEY,
  student_name TEXT,
  student_email TEXT,
  activity_title TEXT,
  activity_date TEXT
)

-- Chuẩn hóa (3NF)
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT
)

CREATE TABLE activities (
  id INTEGER PRIMARY KEY,
  title TEXT,
  date_time TEXT
)

CREATE TABLE participations (
  id INTEGER PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  activity_id INTEGER REFERENCES activities(id)
)
```

### 2.6.3. Database Indexes

**Index** là cấu trúc dữ liệu giúp tìm kiếm nhanh.

**Ví dụ:**
```sql
-- Tạo index trên email
CREATE INDEX idx_users_email ON users(email);

-- Query nhanh hơn 100x
SELECT * FROM users WHERE email = 'admin@school.edu';
-- Không index: Full table scan O(n)
-- Có index: Binary search O(log n)
```

**Composite Index:**
```sql
-- Index cho multiple columns
CREATE INDEX idx_activities_teacher_status 
ON activities(teacher_id, status);

-- Query tối ưu
SELECT * FROM activities 
WHERE teacher_id = 1 AND status = 'approved';
```

---

## KẾT LUẬN (PHẦN II – CƠ SỞ LÝ THUYẾT)

Phần này đã trình bày cơ sở lý thuyết cho công trình:
- Tổng quan về quản lý hoạt động ngoại khóa
- Công nghệ web hiện đại (Next.js, React, TypeScript)
- Kiến trúc hệ thống (3-tier, MVC)
- Bảo mật web (JWT, RBAC, SQL Injection)
- QR Code và điểm danh dựa trên JWT
- Quản trị CSDL (SQLite, chỉ mục)

Những kiến thức này là nền tảng để phân tích, thiết kế và triển khai hệ thống trong các phần tiếp theo.
