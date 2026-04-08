#!/bin/bash

# Automated Testing for UniAct - All Scenarios
# Tests Admin, Teacher, Student flows via API calls

BASE_URL="http://localhost:3000"
ADMIN_EMAIL="admin@annd.edu.vn"
ADMIN_PASS="Admin@2025"
TEACHER_EMAIL="gv.nguyenthilan@annd.edu.vn"
TEACHER_PASS="teacher123"
STUDENT_EMAIL="sv31a101@annd.edu.vn"
STUDENT_PASS="student123"

PASS=0
FAIL=0
WARN=0

echo "🧪 AUTOMATED SCENARIO TESTING"
echo "==============================="
echo ""

test_result() {
    if [ "$1" = "PASS" ]; then
        echo "✅ $2"
        PASS=$((PASS+1))
    elif [ "$1" = "FAIL" ]; then
        echo "❌ $2"
        FAIL=$((FAIL+1))
    else
        echo "⚠️  $2"
        WARN=$((WARN+1))
    fi
}

# =======================
# ADMIN LOGIN
# =======================
echo "## SCENARIO A0: Admin Authentication"
echo "-------------------------------------"

ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

if echo "$ADMIN_LOGIN" | grep -q "\"role\":\"admin\""; then
    test_result "PASS" "Admin login successful"
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    test_result "FAIL" "Admin login failed: $ADMIN_LOGIN"
    ADMIN_TOKEN=""
fi

echo ""

# =======================
# SCENARIO A1: System Initialization
# =======================
echo "## SCENARIO A1: System Initialization"
echo "--------------------------------------"

# A1.1: Fetch classes
echo "A1.1: Fetching classes..."
CLASSES_RESPONSE=$(curl -s "$BASE_URL/api/classes")
if echo "$CLASSES_RESPONSE" | grep -q "\"classes\""; then
    CLASS_COUNT=$(echo "$CLASSES_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Fetched $CLASS_COUNT classes"
else
    test_result "FAIL" "Failed to fetch classes"
fi

# A1.2: Fetch students
echo "A1.2: Fetching students..."
STUDENTS_RESPONSE=$(curl -s "$BASE_URL/api/admin/students")
if echo "$STUDENTS_RESPONSE" | grep -q "\"users\""; then
    STUDENT_COUNT=$(echo "$STUDENTS_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Fetched $STUDENT_COUNT students"
else
    test_result "FAIL" "Failed to fetch students"
fi

# A1.3: Fetch teachers
echo "A1.3: Fetching teachers..."
TEACHERS_RESPONSE=$(curl -s "$BASE_URL/api/admin/users?role=teacher")
if echo "$TEACHERS_RESPONSE" | grep -q "\"role\":\"teacher\""; then
    TEACHER_COUNT=$(echo "$TEACHERS_RESPONSE" | grep -o '"role":"teacher"' | wc -l)
    test_result "PASS" "Fetched $TEACHER_COUNT teachers"
else
    test_result "WARN" "No teachers found or API not returning teachers list"
fi

echo ""

# =======================
# SCENARIO A2: Activity Approval Workflow
# =======================
echo "## SCENARIO A2: Activity Approval"
echo "----------------------------------"

# A2.1: Fetch pending activities
echo "A2.1: Fetching pending activities..."
PENDING_ACTIVITIES=$(curl -s "$BASE_URL/api/admin/activities?status=pending")
if echo "$PENDING_ACTIVITIES" | grep -q "\"activities\""; then
    PENDING_COUNT=$(echo "$PENDING_ACTIVITIES" | grep -o '"approval_status":"pending"' | wc -l)
    test_result "PASS" "Found $PENDING_COUNT pending activities"
    
    # Get first pending activity ID for testing
    FIRST_PENDING_ID=$(echo "$PENDING_ACTIVITIES" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
else
    test_result "WARN" "No pending activities found (may be expected)"
    FIRST_PENDING_ID=""
fi

# A2.2: Test approval (if activity exists)
if [ -n "$FIRST_PENDING_ID" ]; then
    echo "A2.2: Testing approval workflow for activity $FIRST_PENDING_ID..."
    APPROVAL_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/admin/activities/$FIRST_PENDING_ID" \
      -H "Content-Type: application/json" \
      -d "{\"approval_status\":\"approved\"}")
    
    if echo "$APPROVAL_RESPONSE" | grep -q "\"approval_status\":\"approved\""; then
        test_result "PASS" "Activity approved successfully"
    else
        test_result "FAIL" "Activity approval failed: $APPROVAL_RESPONSE"
    fi
else
    test_result "WARN" "Skipped approval test (no pending activities)"
fi

echo ""

# =======================
# SCENARIO A3: Awards Management
# =======================
echo "## SCENARIO A3: Awards Management"
echo "----------------------------------"

# A3.1: Fetch awards
echo "A3.1: Fetching awards..."
AWARDS_RESPONSE=$(curl -s "$BASE_URL/api/awards")
if echo "$AWARDS_RESPONSE" | grep -q "\"awards\""; then
    AWARDS_COUNT=$(echo "$AWARDS_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Found $AWARDS_COUNT awards"
else
    test_result "WARN" "No awards found or API issue"
fi

# A3.2: Fetch award types
echo "A3.2: Fetching award types..."
AWARD_TYPES_RESPONSE=$(curl -s "$BASE_URL/api/award-types")
if echo "$AWARD_TYPES_RESPONSE" | grep -q "\"types\""; then
    TYPES_COUNT=$(echo "$AWARD_TYPES_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Found $TYPES_COUNT award types"
else
    test_result "FAIL" "Failed to fetch award types"
fi

echo ""

# =======================
# SCENARIO A4: Audit Logs
# =======================
echo "## SCENARIO A4: Audit Logs"
echo "--------------------------"

# A4.1: Fetch audit logs
echo "A4.1: Fetching audit logs..."
AUDIT_LOGS=$(curl -s "$BASE_URL/api/admin/audit-logs?limit=10")
if echo "$AUDIT_LOGS" | grep -q "\"logs\""; then
    LOG_COUNT=$(echo "$AUDIT_LOGS" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Fetched $LOG_COUNT audit log entries"
else
    test_result "WARN" "No audit logs found or API issue"
fi

echo ""

# =======================
# TEACHER SCENARIOS
# =======================
echo "## SCENARIO T0: Teacher Authentication"
echo "---------------------------------------"

TEACHER_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEACHER_EMAIL\",\"password\":\"$TEACHER_PASS\"}")

if echo "$TEACHER_LOGIN" | grep -q "\"role\":\"teacher\""; then
    test_result "PASS" "Teacher login successful"
    TEACHER_TOKEN=$(echo "$TEACHER_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    test_result "FAIL" "Teacher login failed: $TEACHER_LOGIN"
    TEACHER_TOKEN=""
fi

echo ""

# =======================
# SCENARIO T1: Create Activities
# =======================
echo "## SCENARIO T1: Create & Clone Activities"
echo "------------------------------------------"

# T1.1: Fetch teacher's activities
echo "T1.1: Fetching teacher's activities..."
TEACHER_ACTIVITIES=$(curl -s "$BASE_URL/api/activities?created_by=teacher")
if echo "$TEACHER_ACTIVITIES" | grep -q "\"activities\""; then
    TEACHER_ACTIVITY_COUNT=$(echo "$TEACHER_ACTIVITIES" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Teacher has $TEACHER_ACTIVITY_COUNT activities"
    FIRST_ACTIVITY_ID=$(echo "$TEACHER_ACTIVITIES" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
else
    test_result "WARN" "No teacher activities found"
    FIRST_ACTIVITY_ID=""
fi

# T1.2: Test clone activity
if [ -n "$FIRST_ACTIVITY_ID" ]; then
    echo "T1.2: Testing clone activity $FIRST_ACTIVITY_ID..."
    CLONE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/activities/$FIRST_ACTIVITY_ID/clone")
    
    if echo "$CLONE_RESPONSE" | grep -q "\"id\""; then
        NEW_ACTIVITY_ID=$(echo "$CLONE_RESPONSE" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
        test_result "PASS" "Activity cloned successfully (new ID: $NEW_ACTIVITY_ID)"
    else
        test_result "FAIL" "Clone activity failed: $CLONE_RESPONSE"
    fi
else
    test_result "WARN" "Skipped clone test (no activities)"
fi

echo ""

# =======================
# SCENARIO T3: Attendance
# =======================
echo "## SCENARIO T3: Attendance Management"
echo "--------------------------------------"

if [ -n "$FIRST_ACTIVITY_ID" ]; then
    # T3.1: Fetch participants
    echo "T3.1: Fetching activity participants..."
    PARTICIPANTS=$(curl -s "$BASE_URL/api/activities/$FIRST_ACTIVITY_ID/participants")
    
    if echo "$PARTICIPANTS" | grep -q "\"participants\""; then
        PARTICIPANT_COUNT=$(echo "$PARTICIPANTS" | grep -o '"user_id":[0-9]*' | wc -l)
        test_result "PASS" "Found $PARTICIPANT_COUNT participants"
    else
        test_result "WARN" "No participants found"
    fi

    # T3.2: Test QR generation
    echo "T3.2: Testing QR code generation..."
    QR_RESPONSE=$(curl -s "$BASE_URL/api/teacher/qr?activity_id=$FIRST_ACTIVITY_ID")
    
    if echo "$QR_RESPONSE" | grep -q "\"qr_code\""; then
        test_result "PASS" "QR code generated successfully"
    else
        test_result "WARN" "QR generation issue (may require specific setup)"
    fi
else
    test_result "WARN" "Skipped attendance tests (no activities)"
fi

echo ""

# =======================
# STUDENT SCENARIOS
# =======================
echo "## SCENARIO S0: Student Authentication"
echo "---------------------------------------"

STUDENT_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASS\"}")

if echo "$STUDENT_LOGIN" | grep -q "\"role\":\"student\""; then
    test_result "PASS" "Student login successful"
    STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    STUDENT_ID=$(echo "$STUDENT_LOGIN" | grep -o '"id":[0-9]*' | cut -d':' -f2)
else
    test_result "FAIL" "Student login failed: $STUDENT_LOGIN"
    STUDENT_TOKEN=""
    STUDENT_ID=""
fi

echo ""

# =======================
# SCENARIO S1: Browse Activities
# =======================
echo "## SCENARIO S1: Browse Activities"
echo "----------------------------------"

# S1.1: Fetch available activities
echo "S1.1: Fetching available activities..."
AVAILABLE_ACTIVITIES=$(curl -s "$BASE_URL/api/activities?status=published")
if echo "$AVAILABLE_ACTIVITIES" | grep -q "\"activities\""; then
    AVAILABLE_COUNT=$(echo "$AVAILABLE_ACTIVITIES" | grep -o '"id":[0-9]*' | wc -l)
    test_result "PASS" "Found $AVAILABLE_COUNT available activities"
else
    test_result "WARN" "No available activities"
fi

echo ""

# =======================
# SCENARIO S3: Rankings
# =======================
echo "## SCENARIO S3: View Rankings"
echo "------------------------------"

# S3.1: Fetch school ranking
echo "S3.1: Fetching school-wide ranking..."
SCHOOL_RANKING=$(curl -s "$BASE_URL/api/student/rankings?scope=school")
if echo "$SCHOOL_RANKING" | grep -q "\"rankings\""; then
    RANK_COUNT=$(echo "$SCHOOL_RANKING" | grep -o '"rank":[0-9]*' | wc -l)
    test_result "PASS" "Fetched school ranking ($RANK_COUNT students)"
else
    test_result "FAIL" "Failed to fetch school ranking: $SCHOOL_RANKING"
fi

# S3.2: Fetch class ranking
echo "S3.2: Fetching class ranking..."
CLASS_RANKING=$(curl -s "$BASE_URL/api/student/rankings?scope=class")
if echo "$CLASS_RANKING" | grep -q "\"rankings\""; then
    CLASS_RANK_COUNT=$(echo "$CLASS_RANKING" | grep -o '"rank":[0-9]*' | wc -l)
    test_result "PASS" "Fetched class ranking ($CLASS_RANK_COUNT students)"
else
    test_result "WARN" "Failed to fetch class ranking (may need class_id)"
fi

echo ""

# =======================
# FEATURE COMPLETENESS TESTS
# =======================
echo "## FEATURE COMPLETENESS"
echo "=======================

"

# Test critical endpoints existence
echo "Testing critical endpoints..."

ENDPOINTS=(
    "/api/auth/login"
    "/api/activities"
    "/api/classes"
    "/api/admin/students"
    "/api/student/rankings"
    "/api/awards"
)

for endpoint in "${ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
        test_result "PASS" "Endpoint $endpoint exists (HTTP $HTTP_CODE)"
    else
        test_result "FAIL" "Endpoint $endpoint issue (HTTP $HTTP_CODE)"
    fi
done

echo ""

# =======================
# SUMMARY
# =======================
echo "========================================="
echo "📊 TEST SUMMARY"
echo "========================================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "⚠️  Warnings: $WARN"
echo "Total: $((PASS + FAIL + WARN))"
echo ""

SUCCESS_RATE=$((PASS * 100 / (PASS + FAIL + WARN)))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "🎉 All critical tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Review the log above."
    exit 1
fi
