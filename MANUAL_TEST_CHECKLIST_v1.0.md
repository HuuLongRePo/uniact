# UniAct Manual Test Checklist (20-Step Critical Path)

**Objective**: Verify production-readiness across all 3 user roles (Admin, Teacher, Student)  
**Duration**: ~2 hours  
**Test Environment**: Development or Staging (http://localhost:3000)  
**Test Accounts**: See `/api/auth/demo-accounts` endpoint

---

## 🔐 PHASE 1: Authentication & Authorization (5 steps)

### Step 1: Admin Login
- [ ] Navigate to login page
- [ ] Enter: `admin@annd.edu.vn` / `Admin@2025`
- [ ] Click "Đăng nhập"
- [ ] ✅ Should redirect to `/admin/dashboard`
- [ ] ✅ Should see "Admin" label in navbar

### Step 2: Registration Rate Limiting  
- [ ] Go to `/register` page
- [ ] Submit 6 new account registrations rapidly in under 1 minute
- [ ] ✅ On 6th attempt, should see error: "Quá nhiều yêu cầu đăng ký. Hãy thử lại sau 1 giờ"
- [ ] ✅ Should NOT create 6th account

### Step 3: Login Rate Limiting
- [ ] Go to `/login`
- [ ] Attempt login 11 times with wrong password for same account (in under 15 minutes)
- [ ] ✅ On 11th attempt, should see rate-limited message
- [ ] ✅ Should NOT allow 11th login attempt

### Step 4: Teacher Login Flow
- [ ] Logout (if logged in)
- [ ] Login as: `teacher1@annd.edu.vn` / `teacher123`
- [ ] ✅ Should redirect to `/teacher/activities`
- [ ] ✅ Teacher-only menus should be visible

### Step 5: Student Login Flow
- [ ] Logout
- [ ] Login as: `student1@annd.edu.vn` / `student123`
- [ ] ✅ Should redirect to `/student/activities`
- [ ] ✅ Only student-accessible menus should show

---

## 📝 PHASE 2: Activity Lifecycle (5 steps)

### Step 6: Create Activity (Teacher)
- [ ] Login as teacher
- [ ] Click "Tạo hoạt động mới"
- [ ] Fill form:
  - Title: "Test Activity"
  - Type: "Khoa học"
  - Date/Time: Tomorrow at 2:00 PM
  - Location: "Room 101"
  - Max participants: 50
- [ ] Click "Tạo"
- [ ] ✅ Should see **SUCCESS toast**: "Hoạt động được tạo thành công"
- [ ] ✅ Activity should appear in teacher's list with status = "Nháp" (Draft)

### Step 7: Submit for Approval (Teacher)
- [ ] Click on created activity
- [ ] Click "Gửi phê duyệt"
- [ ] ✅ Should see **SUCCESS toast**: "Đã gửi phê duyệt"
- [ ] ✅ Status should change to "Chờ duyệt" (Pending)
- [ ] ✅ "Gửi phê duyệt" button should disappear

### Step 8: Approve Activity (Admin)
- [ ] Logout, login as admin
- [ ] Go to `/admin/approvals`
- [ ] ✅ Should see teacher's activity in pending list
- [ ] Click activity → Click "Duyệt"
- [ ] ✅ Should see **SUCCESS toast**: "Hoạt động đã được duyệt"
- [ ] ✅ Status should change to "Công khai" (Published)

### Step 9: View Audit Log (Admin)
- [ ] Go to `/admin/audit-logs`
- [ ] ✅ Should see entries for: CREATE_ACTIVITY, SUBMIT_APPROVAL, APPROVE_ACTIVITY
- [ ] ✅ Actor names should be correct (teacher name, admin name)

### Step 10: Activity Appears in Student List
- [ ] Logout, login as student
- [ ] Go to `/student/activities`
- [ ] ✅ Should see created activity in available list
- [ ] ✅ Should see activity details (date, time, location, teacher name)

---

## 🔗 PHASE 3: QR Session & Attendance (3 steps)

### Step 11: Generate QR Session (Teacher)
- [ ] Login as teacher
- [ ] Click on published activity
- [ ] Click "Tạo phiên QR"
- [ ] Set: "Thời hạn: 5 phút"
- [ ] Click "Tạo"
- [ ] ✅ Should see QR code displayed
- [ ] ✅ Should see session token (random string)
- [ ] ✅ Should see countdown timer "4:59..."

### Step 12: QR Session Rate Limiting
- [ ] In same teacher browser, create 20 QR sessions in rapid succession
- [ ] ✅ 21st request should be blocked with 429 error: "Too many QR session requests"

### Step 13: Record Attendance (Manual)
- [ ] Login as teacher
- [ ] Click activity → Click "Điểm danh"
- [ ] Select "Điểm danh thủ công"
- [ ] Check 10 student names
- [ ] For each: Set achievement level (Excellent/Good/Participated)
- [ ] Click "Lưu"
- [ ] ✅ Should see **SUCCESS toast**: "Điểm danh thành công (10 học viên)"
- [ ] ✅ Checked students should have attendance_status = "attended" in DB

---

## 🏆 PHASE 4: Scoring & Rewards (3 steps)

### Step 14: View Points (Student)
- [ ] Login as student
- [ ] Go to `/student/scores`
- [ ] ✅ Should see personal total points
- [ ] ✅ Should see breakdown by activity type (Khoa học, Văn hoá, etc.)
- [ ] ✅ Should see leaderboard position

### Step 15: Propose Bonus Points (Teacher)
- [ ] Login as teacher
- [ ] Go to `/teacher/bonus-proposal`
- [ ] Click "Đề xuất"
- [ ] Select student, enter points (e.g., 10)
- [ ] Write reason: "Xuất sắc trong buổi"
- [ ] Click "Gửi"
- [ ] ✅ Should see **SUCCESS toast**: "Đề xuất thành công"
- [ ] ✅ Status should show "Chờ duyệt" (Pending Admin approval)

### Step 16: Approve Bonus (Admin)
- [ ] Login as admin
- [ ] Go to `/admin/awards`
- [ ] Click bonus proposal
- [ ] Click "Duyệt"
- [ ] ✅ Should see **SUCCESS toast**: "Khen thưởng đã được phê duyệt"
- [ ] ✅ Check student's points updated by 10

---

## 📊 PHASE 5: Reports & Analytics (2 steps)

### Step 17: Export Attendance Report (Teacher)
- [ ] Login as teacher
- [ ] Go to `/teacher/reports/attendance`
- [ ] Click "Xuất CSV"
- [ ] ✅ Should download CSV file
- [ ] ✅ CSV should contain: Student Name, Attendance Status, Points, Date
- [ ] ✅ Data should match database (spot-check 3 students)

### Step 18: View Analytics (Admin)
- [ ] Login as admin
- [ ] Go to `/admin/dashboard`
- [ ] ✅ Should see charts: Participation by Activity Type, Class Scores, Student Rankings
- [ ] ✅ Charts should update when scrolling (not frozen)
- [ ] ✅ Should respond to filter changes (e.g., date range)

---

## 🔐 PHASE 6: Security & Edge Cases (2 steps)

### Step 19: Student Cannot Access Admin Endpoints
- [ ] Login as student
- [ ] Manually navigate to `/admin/users`
- [ ] ✅ Should redirect to `/student/activities` (unauthorized)
- [ ] Open browser DevTools → Network tab
- [ ] Try calling `/api/admin/activities/bulk-approve` with student token
- [ ] ✅ Should get 403 Forbidden error

### Step 20: Cron Endpoints Protected
- [ ] Open terminal
- [ ] Attempt: `curl http://localhost:3000/api/cron/complete-activities -X POST`
- [ ] ✅ Should get 401 Unauthorized (no CRON_SECRET)
- [ ] Attempt with valid secret: `curl -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/complete-activities -X POST`
- [ ] ✅ Should execute job and return success message

---

## ✅ Sign-Off

- [ ] All 20 steps passed
- [ ] No unexpected errors in console
- [ ] No data inconsistencies (audit logs match actions)
- [ ] All toast notifications display correctly
- [ ] Date/times display correctly across timezones

**Tester**: __________________  
**Date**: __________________  
**Status**: ☐ PASS / ☐ FAIL  
**Notes**: ______________________________________________________________________

---

## Notes for QA Team

- **Test Database**: Run `npm run seed qa` before each test cycle
- **Browser**: Chrome/Firefox (latest)
- **Timezone**: Test with system timezone = Vietnam Standard Time (GMT+7)
- **Network**: Simulate 3G network in DevTools to test loading states
- **Mobile**: Test steps 1-10 on iPhone 12/Android device (responsive design)
- **Keyboard**: Test all forms with Tab/Enter navigation (accessibility)
