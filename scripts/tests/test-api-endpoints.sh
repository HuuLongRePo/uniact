#!/bin/bash

echo "🧪 UniAct - API Testing Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Auth options
#   AUTH_MODE: none|admin|teacher|student
#   ADMIN_EMAIL / ADMIN_PASSWORD: used for admin auto-login (dev only)
#   *_COOKIE_FILE: Netscape cookie jar file (curl -b)
AUTH_MODE="${AUTH_MODE:-none}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@school.edu}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

TEACHER_EMAIL="${TEACHER_EMAIL:-}"
TEACHER_PASSWORD="${TEACHER_PASSWORD:-teacher123}"

STUDENT_EMAIL="${STUDENT_EMAIL:-}"
STUDENT_PASSWORD="${STUDENT_PASSWORD:-student123}"

ADMIN_COOKIE_FILE="${ADMIN_COOKIE_FILE:-./cookie_admin.txt}"
TEACHER_COOKIE_FILE="${TEACHER_COOKIE_FILE:-./cookie_teacher.txt}"
STUDENT_COOKIE_FILE="${STUDENT_COOKIE_FILE:-./cookie_student.txt}"

TMP_DIR="${TMPDIR:-/tmp}"
mkdir -p "$TMP_DIR" 2>/dev/null || true

AUTH_COOKIE_JAR=""
CURL_AUTH_ARGS=()

has_token_cookie() {
  local cookieFile="$1"
  if [ -z "$cookieFile" ] || [ ! -f "$cookieFile" ]; then
    return 1
  fi
  grep -q "\<token\>" "$cookieFile" 2>/dev/null
}

auth_me_status() {
  local cookieFile="$1"
  curl -s --max-time 5 -w "%{http_code}" -o /dev/null -b "$cookieFile" "$BASE_URL/api/auth/me" 2>/dev/null || echo 000
}

login_and_set_cookie_jar() {
  local email="$1"
  local password="$2"
  local jarOut="$3"

  local loginBody
  loginBody=$(printf '{"email":"%s","password":"%s"}' "$email" "$password")

  local loginTmp
  loginTmp="$TMP_DIR/login_response_$$.txt"
  local loginStatus
  loginStatus=$(curl -s -w "%{http_code}" -o "$loginTmp" -c "$jarOut" \
    -H "Content-Type: application/json" \
    -d "$loginBody" \
    "$BASE_URL/api/auth/login")
  rm -f "$loginTmp" 2>/dev/null || true

  if [ "$loginStatus" != "200" ]; then
    echo "$loginStatus"
    return 0
  fi

  if has_token_cookie "$jarOut"; then
    echo 200
    return 0
  fi

  echo 000
}

db_first_email_by_role() {
  local role="$1"
  if [ ! -f "./uniact.db" ]; then
    return 0
  fi

  node -e "const sqlite3=require('sqlite3');
  const db=new sqlite3.Database('uniact.db');
  db.get('SELECT email FROM users WHERE role = ? ORDER BY id LIMIT 1',[process.argv[1]],(e,row)=>{
    if(!e && row && row.email) process.stdout.write(String(row.email));
    db.close();
  });" "$role" 2>/dev/null || true
}

ensure_auth() {
  case "$AUTH_MODE" in
    none)
      CURL_AUTH_ARGS=()
      return 0
      ;;
    teacher)
      if [ -z "$TEACHER_EMAIL" ]; then
        TEACHER_EMAIL=$(db_first_email_by_role teacher)
      fi
      if [ -z "$TEACHER_EMAIL" ]; then
        TEACHER_EMAIL="t001@school.edu"
      fi

      if has_token_cookie "$TEACHER_COOKIE_FILE"; then
        ME_STATUS=$(auth_me_status "$TEACHER_COOKIE_FILE")
        if [ "$ME_STATUS" = "200" ]; then
          CURL_AUTH_ARGS=(-b "$TEACHER_COOKIE_FILE")
          echo -e "${GREEN}✓ Using teacher cookie jar${NC}"
          return 0
        fi
      fi

      AUTH_COOKIE_JAR="$TMP_DIR/uniact_teacher_cookie_$$.txt"
      LOGIN_STATUS=$(login_and_set_cookie_jar "$TEACHER_EMAIL" "$TEACHER_PASSWORD" "$AUTH_COOKIE_JAR")
      if [ "$LOGIN_STATUS" = "200" ]; then
        CURL_AUTH_ARGS=(-b "$AUTH_COOKIE_JAR")
        echo -e "${GREEN}✓ Authenticated as teacher via /api/auth/login${NC}"
        return 0
      fi

      echo -e "${RED}✗ Teacher auto-login failed (status: $LOGIN_STATUS)${NC}"
      echo "  Tried: $TEACHER_EMAIL"
      echo "  Hint: set TEACHER_EMAIL / TEACHER_PASSWORD or provide TEACHER_COOKIE_FILE with token"
      exit 1
      ;;
    student)
      if [ -z "$STUDENT_EMAIL" ]; then
        STUDENT_EMAIL=$(db_first_email_by_role student)
      fi
      if [ -z "$STUDENT_EMAIL" ]; then
        STUDENT_EMAIL="s001@school.edu"
      fi

      if has_token_cookie "$STUDENT_COOKIE_FILE"; then
        ME_STATUS=$(auth_me_status "$STUDENT_COOKIE_FILE")
        if [ "$ME_STATUS" = "200" ]; then
          CURL_AUTH_ARGS=(-b "$STUDENT_COOKIE_FILE")
          echo -e "${GREEN}✓ Using student cookie jar${NC}"
          return 0
        fi
      fi

      AUTH_COOKIE_JAR="$TMP_DIR/uniact_student_cookie_$$.txt"
      LOGIN_STATUS=$(login_and_set_cookie_jar "$STUDENT_EMAIL" "$STUDENT_PASSWORD" "$AUTH_COOKIE_JAR")
      if [ "$LOGIN_STATUS" = "200" ]; then
        CURL_AUTH_ARGS=(-b "$AUTH_COOKIE_JAR")
        echo -e "${GREEN}✓ Authenticated as student via /api/auth/login${NC}"
        return 0
      fi

      echo -e "${RED}✗ Student auto-login failed (status: $LOGIN_STATUS)${NC}"
      echo "  Tried: $STUDENT_EMAIL"
      echo "  Hint: set STUDENT_EMAIL / STUDENT_PASSWORD or provide STUDENT_COOKIE_FILE with token"
      exit 1
      ;;
    admin)
      if has_token_cookie "$ADMIN_COOKIE_FILE"; then
        ME_STATUS=$(auth_me_status "$ADMIN_COOKIE_FILE")
        if [ "$ME_STATUS" = "200" ]; then
          CURL_AUTH_ARGS=(-b "$ADMIN_COOKIE_FILE")
          echo -e "${GREEN}✓ Using admin cookie jar${NC}"
          return 0
        fi
      fi

      AUTH_COOKIE_JAR="$TMP_DIR/uniact_admin_cookie_$$.txt"
      LOGIN_STATUS=$(login_and_set_cookie_jar "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$AUTH_COOKIE_JAR")
      if [ "$LOGIN_STATUS" = "200" ]; then
        CURL_AUTH_ARGS=(-b "$AUTH_COOKIE_JAR")
        echo -e "${GREEN}✓ Authenticated as admin via /api/auth/login${NC}"
        return 0
      fi

      echo -e "${RED}✗ Admin auto-login failed (status: $LOGIN_STATUS)${NC}"
      echo "  Tried: $ADMIN_EMAIL"
      echo "  Hint: set ADMIN_EMAIL / ADMIN_PASSWORD or provide ADMIN_COOKIE_FILE with token"
      exit 1
      ;;
    *)
      echo -e "${RED}✗ Invalid AUTH_MODE: $AUTH_MODE${NC}"
      echo "  Use: none|admin|teacher|student"
      exit 1
      ;;
  esac
}

http_status() {
  local method="$1"
  local url="$2"
  local outFile="$3"
  if [ -n "$outFile" ]; then
    curl -s -w "%{http_code}" -o "$outFile" -X "$method" "${CURL_AUTH_ARGS[@]}" "$url"
  else
    curl -s -w "%{http_code}" -o /dev/null -X "$method" "${CURL_AUTH_ARGS[@]}" "$url"
  fi
}

print_status_note() {
  local status="$1"
  if [ "$status" = "401" ]; then
    echo -e "${BLUE}Note: 401 Unauthorized (check AUTH_MODE / cookie / login)${NC}"
  elif [ "$status" = "403" ]; then
    echo -e "${BLUE}Note: 403 Forbidden (authenticated but role not allowed)${NC}"
  fi
}

status_label() {
  local status="$1"
  if [ "$status" = "401" ]; then
    echo "401 Unauthorized"
  elif [ "$status" = "403" ]; then
    echo "403 Forbidden"
  else
    echo "$status"
  fi
}

ok_if_status_in() {
  local status="$1"
  shift
  for s in "$@"; do
    if [ "$status" = "$s" ]; then
      return 0
    fi
  done
  return 1
}

extract_first_id() {
  # Reads JSON from stdin and prints the first plausible id.
  node -e "const fs=require('fs');
  const input=fs.readFileSync(0,'utf8').trim();
  if(!input){process.exit(0)}
  let j; try{j=JSON.parse(input)}catch{process.exit(0)}
  const candidates=[
    j?.data,
    j?.classes,
    j?.activities,
    j?.items,
    j?.results,
    j?.awards,
  ].find(a=>Array.isArray(a)&&a.length);
  const id=candidates?.[0]?.id ?? candidates?.[0]?.activity_id ?? candidates?.[0]?.class_id;
  if(id!==undefined&&id!==null) process.stdout.write(String(id));"
}

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
HEALTH=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/health")
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${RED}✗ Server health check failed (status: $HEALTH)${NC}"
  exit 1
fi
echo ""

# Optional authentication setup
if [ "$AUTH_MODE" != "none" ]; then
  echo -e "${BLUE}Auth: $AUTH_MODE${NC}"
  ensure_auth
  echo ""
fi

# Test 2: Award Types Endpoint (Auth expectation)
echo -e "${BLUE}Test 2: Award Types Endpoint (Public)${NC}"
AWARD_TMP_FILE="$TMP_DIR/award_response_$$.txt"
AWARD_STATUS=$(curl -s -w "%{http_code}" -o "$AWARD_TMP_FILE" "$BASE_URL/api/admin/award-types")
AWARD_BODY=$(cat "$AWARD_TMP_FILE" 2>/dev/null || true)
rm -f "$AWARD_TMP_FILE" 2>/dev/null || true

if [[ "$AWARD_STATUS" == "401" || "$AWARD_STATUS" == "403" ]]; then
  echo -e "${GREEN}✓ Award Types endpoint requires authentication (status: $(status_label "$AWARD_STATUS"))${NC}"
else
  echo -e "${BLUE}Note: Award Types returned status $(status_label "$AWARD_STATUS")${NC}"
  print_status_note "$AWARD_STATUS"
fi
echo "  Response preview: $(echo $AWARD_BODY | head -c 100)..."
echo ""

# Test 3: Activity Types (Public)
echo -e "${BLUE}Test 3: Activity Types Endpoint${NC}"
ACTIVITY_TYPES=$(curl -s "$BASE_URL/api/activity-types")
if echo "$ACTIVITY_TYPES" | grep -q "activityTypes\|activity_types\|data"; then
  echo -e "${GREEN}✓ Activity Types endpoint working${NC}"
  echo "  Found activity types in response"
else
  echo -e "${BLUE}Note: Activity Types response: $(echo $ACTIVITY_TYPES | head -c 80)...${NC}"
fi
echo ""

# Test 4: Classes Endpoint
echo -e "${BLUE}Test 4: Classes Endpoint${NC}"
CLASSES_TMP_FILE="$TMP_DIR/classes_response_$$.txt"
CLASSES_STATUS=$(curl -s -w "%{http_code}" -o "$CLASSES_TMP_FILE" "$BASE_URL/api/classes")
CLASSES_BODY=$(cat "$CLASSES_TMP_FILE" 2>/dev/null || true)
rm -f "$CLASSES_TMP_FILE" 2>/dev/null || true

if [ "$CLASSES_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Classes endpoint responds (status: 200)${NC}"
else
  echo -e "${BLUE}Note: Classes returned status $(status_label "$CLASSES_STATUS")${NC}"
  print_status_note "$CLASSES_STATUS"
fi
echo "  Response preview: $(echo $CLASSES_BODY | head -c 80)..."
echo ""

# Test 5: UI Pages Load
echo -e "${BLUE}Test 5: Homepage Load${NC}"
HOME_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/")
if [ "$HOME_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Homepage loads successfully${NC}"
else
  echo -e "${RED}✗ Homepage failed (status: $HOME_STATUS)${NC}"
fi
echo ""

# Test 6: Login Page
echo -e "${BLUE}Test 6: Login Page${NC}"
LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/login")
if [ "$LOGIN_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Login page loads successfully${NC}"
else
  echo -e "${RED}✗ Login page failed (status: $LOGIN_STATUS)${NC}"
fi
echo ""

# Test 7: Teacher Activities UI Page
echo -e "${BLUE}Test 7: Teacher Activities Page${NC}"
TEACHER_ACTIVITIES_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/teacher/activities")
if [ "$TEACHER_ACTIVITIES_STATUS" = "200" ] || [ "$TEACHER_ACTIVITIES_STATUS" = "302" ]; then
  echo -e "${GREEN}✓ Teacher activities page responds${NC}"
else
  echo -e "${BLUE}Note: Teacher activities page status: $TEACHER_ACTIVITIES_STATUS (may require auth)${NC}"
fi
echo ""

# Test 8: Award Types UI Page
echo -e "${BLUE}Test 8: Award Types Admin Page${NC}"
AWARD_PAGE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/admin/award-types")
if [ "$AWARD_PAGE" = "200" ] || [ "$AWARD_PAGE" = "302" ]; then
  echo -e "${GREEN}✓ Award Types page responds${NC}"
else
  echo -e "${BLUE}Note: Award Types page status: $AWARD_PAGE (may require auth)${NC}"
fi
echo ""

# Safe probes for Attendance endpoints (validation-only, no side effects)
if [ "$AUTH_MODE" = "admin" ] || [ "$AUTH_MODE" = "teacher" ]; then
  echo -e "${BLUE}Test 8.1: Attendance Manual (Safe validation probes)${NC}"

  # GET without activity_id should be 400 (or auth errors if cookie invalid)
  MANUAL_GET_STATUS=$(http_status "GET" "$BASE_URL/api/attendance/manual" /dev/null)
  if ok_if_status_in "$MANUAL_GET_STATUS" 400 401 403; then
    echo -e "${GREEN}✓ GET /api/attendance/manual validation responds (status: $MANUAL_GET_STATUS)${NC}"
  else
    echo -e "${RED}✗ GET /api/attendance/manual unexpected (status: $MANUAL_GET_STATUS)${NC}"
    print_status_note "$MANUAL_GET_STATUS"
  fi

  # POST with empty body should be 400 (or auth errors if cookie invalid)
  MANUAL_POST_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${CURL_AUTH_ARGS[@]}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "$BASE_URL/api/attendance/manual")
  if ok_if_status_in "$MANUAL_POST_STATUS" 400 401 403; then
    echo -e "${GREEN}✓ POST /api/attendance/manual validation responds (status: $MANUAL_POST_STATUS)${NC}"
  else
    echo -e "${RED}✗ POST /api/attendance/manual unexpected (status: $MANUAL_POST_STATUS)${NC}"
    print_status_note "$MANUAL_POST_STATUS"
  fi
  echo ""
fi

# Deep checks (module audit) - requires auth
if [ "$AUTH_MODE" = "admin" ]; then
  echo -e "${BLUE}Test 9: Admin Classes (List)${NC}"
  ADMIN_CLASSES_TMP="$TMP_DIR/admin_classes_$$.json"
  ADMIN_CLASSES_STATUS=$(http_status "GET" "$BASE_URL/api/admin/classes" "$ADMIN_CLASSES_TMP")
  ADMIN_CLASSES_BODY=$(cat "$ADMIN_CLASSES_TMP" 2>/dev/null || true)
  rm -f "$ADMIN_CLASSES_TMP" 2>/dev/null || true
  if [ "$ADMIN_CLASSES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/admin/classes OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/classes failed (status: $ADMIN_CLASSES_STATUS)${NC}"
    print_status_note "$ADMIN_CLASSES_STATUS"
    echo "  Response preview: $(echo $ADMIN_CLASSES_BODY | head -c 140)..."
  fi
  CLASS_ID=$(echo "$ADMIN_CLASSES_BODY" | extract_first_id)
  echo ""

  if [ -n "$CLASS_ID" ]; then
    echo -e "${BLUE}Test 10: Admin Classes (Detail: $CLASS_ID)${NC}"
    CLASS_STATUS=$(http_status "GET" "$BASE_URL/api/admin/classes/$CLASS_ID" /dev/null)
    if [ "$CLASS_STATUS" = "200" ]; then
      echo -e "${GREEN}✓ /api/admin/classes/$CLASS_ID OK${NC}"
    else
      echo -e "${RED}✗ /api/admin/classes/$CLASS_ID failed (status: $CLASS_STATUS)${NC}"
      print_status_note "$CLASS_STATUS"
    fi
    echo ""
  fi

  echo -e "${BLUE}Test 11: Admin Activities (List)${NC}"
  ADMIN_ACTIVITIES_TMP="$TMP_DIR/admin_activities_$$.json"
  ADMIN_ACTIVITIES_STATUS=$(http_status "GET" "$BASE_URL/api/admin/activities?limit=50" "$ADMIN_ACTIVITIES_TMP")
  ADMIN_ACTIVITIES_BODY=$(cat "$ADMIN_ACTIVITIES_TMP" 2>/dev/null || true)
  rm -f "$ADMIN_ACTIVITIES_TMP" 2>/dev/null || true

  if [ "$ADMIN_ACTIVITIES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/admin/activities OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/activities failed (status: $ADMIN_ACTIVITIES_STATUS)${NC}"
    print_status_note "$ADMIN_ACTIVITIES_STATUS"
  fi
  ACTIVITY_ID=$(echo "$ADMIN_ACTIVITIES_BODY" | extract_first_id)
  echo ""

  echo -e "${BLUE}Test 12: Admin Activities (Pending)${NC}"
  ADMIN_PENDING_STATUS=$(http_status "GET" "$BASE_URL/api/admin/activities/pending" /dev/null)
  if [ "$ADMIN_PENDING_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/admin/activities/pending OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/activities/pending failed (status: $ADMIN_PENDING_STATUS)${NC}"
    print_status_note "$ADMIN_PENDING_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 13: Admin Awards (List)${NC}"
  ADMIN_AWARDS_STATUS=$(http_status "GET" "$BASE_URL/api/admin/awards" /dev/null)
  if [ "$ADMIN_AWARDS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/admin/awards OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/awards failed (status: $ADMIN_AWARDS_STATUS)${NC}"
    print_status_note "$ADMIN_AWARDS_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 14: Admin Award Types (List)${NC}"
  ADMIN_AWARD_TYPES_STATUS=$(http_status "GET" "$BASE_URL/api/admin/award-types" /dev/null)
  if [ "$ADMIN_AWARD_TYPES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/admin/award-types OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/award-types failed (status: $ADMIN_AWARD_TYPES_STATUS)${NC}"
    print_status_note "$ADMIN_AWARD_TYPES_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 15: Admin Scores (List)${NC}"
  ADMIN_SCORES_STATUS=$(http_status "GET" "$BASE_URL/api/admin/scores" /dev/null)
  if [ "$ADMIN_SCORES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/admin/scores OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/scores failed (status: $ADMIN_SCORES_STATUS)${NC}"
    print_status_note "$ADMIN_SCORES_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 16: Admin Time Slots Create (Route Exists)${NC}"
  TIME_SLOTS_STATUS=$(http_status "GET" "$BASE_URL/api/admin/time-slots/create" /dev/null)
  if [ "$TIME_SLOTS_STATUS" = "405" ] || [ "$TIME_SLOTS_STATUS" = "400" ]; then
    echo -e "${GREEN}✓ /api/admin/time-slots/create exists (status: $TIME_SLOTS_STATUS)${NC}"
  elif [ "$TIME_SLOTS_STATUS" = "404" ]; then
    echo -e "${RED}✗ /api/admin/time-slots/create not found (404)${NC}"
  else
    echo -e "${BLUE}Note: /api/admin/time-slots/create status: $TIME_SLOTS_STATUS${NC}"
  fi
  echo ""

  echo -e "${BLUE}Test 16.1: Admin Time Slots (List)${NC}"
  TS_LIST_STATUS=$(http_status "GET" "$BASE_URL/api/admin/time-slots" /dev/null)
  if ok_if_status_in "$TS_LIST_STATUS" 200; then
    echo -e "${GREEN}✓ /api/admin/time-slots OK${NC}"
  else
    echo -e "${RED}✗ /api/admin/time-slots unexpected (status: $TS_LIST_STATUS)${NC}"
    print_status_note "$TS_LIST_STATUS"
  fi

  if [ -n "$ACTIVITY_ID" ]; then
    TS_BY_ACTIVITY_STATUS=$(http_status "GET" "$BASE_URL/api/admin/time-slots?activity_id=$ACTIVITY_ID" /dev/null)
    if ok_if_status_in "$TS_BY_ACTIVITY_STATUS" 200 400 404; then
      echo -e "${GREEN}✓ /api/admin/time-slots?activity_id=$ACTIVITY_ID responds (status: $TS_BY_ACTIVITY_STATUS)${NC}"
    else
      echo -e "${RED}✗ /api/admin/time-slots?activity_id=$ACTIVITY_ID unexpected (status: $TS_BY_ACTIVITY_STATUS)${NC}"
      print_status_note "$TS_BY_ACTIVITY_STATUS"
    fi
  else
    echo -e "${BLUE}Note: skip activity_id probe (no activity found)${NC}"
  fi
  echo ""

  echo -e "${BLUE}Test 17: Admin Activities Workflow (Safe probes)${NC}"
  # Use a non-existent activity id to avoid side effects while still exercising handler DB access.
  INVALID_ACTIVITY_ID=0

  # Review endpoint should reject missing/invalid state with 400/404, not 500.
  REVIEW_TMP="$TMP_DIR/admin_activity_review_$$.txt"
  REVIEW_STATUS=$(curl -s -w "%{http_code}" -o "$REVIEW_TMP" -X POST "${CURL_AUTH_ARGS[@]}" \
    -H "Content-Type: application/json" \
    -d '{"action":"approve","notes":"smoke"}' \
    "$BASE_URL/api/admin/activities/$INVALID_ACTIVITY_ID/review")
  REVIEW_BODY=$(cat "$REVIEW_TMP" 2>/dev/null || true)
  rm -f "$REVIEW_TMP" 2>/dev/null || true
  if ok_if_status_in "$REVIEW_STATUS" 200 400 404 409; then
    echo -e "${GREEN}✓ /api/admin/activities/:id/review responds (status: $REVIEW_STATUS)${NC}"
  else
    echo -e "${RED}✗ /api/admin/activities/:id/review unexpected (status: $REVIEW_STATUS)${NC}"
    echo "  Response preview: $(echo $REVIEW_BODY | head -c 140)..."
  fi

  # Complete endpoint should return 400/404 for invalid id, not 500.
  COMPLETE_TMP="$TMP_DIR/admin_activity_complete_$$.txt"
  COMPLETE_STATUS=$(curl -s -w "%{http_code}" -o "$COMPLETE_TMP" -X POST "${CURL_AUTH_ARGS[@]}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "$BASE_URL/api/admin/activities/$INVALID_ACTIVITY_ID/complete")
  COMPLETE_BODY=$(cat "$COMPLETE_TMP" 2>/dev/null || true)
  rm -f "$COMPLETE_TMP" 2>/dev/null || true
  if ok_if_status_in "$COMPLETE_STATUS" 200 400 404 409; then
    echo -e "${GREEN}✓ /api/admin/activities/:id/complete responds (status: $COMPLETE_STATUS)${NC}"
  else
    echo -e "${RED}✗ /api/admin/activities/:id/complete unexpected (status: $COMPLETE_STATUS)${NC}"
    echo "  Response preview: $(echo $COMPLETE_BODY | head -c 140)..."
  fi

  # These should be GET endpoints. Using invalid id should yield 404/400, not 500.
  for path in approval-history participants; do
    S=$(http_status "GET" "$BASE_URL/api/admin/activities/$INVALID_ACTIVITY_ID/$path" /dev/null)
    if ok_if_status_in "$S" 200 400 404; then
      echo -e "${GREEN}✓ /api/admin/activities/:id/$path responds (status: $S)${NC}"
    else
      echo -e "${RED}✗ /api/admin/activities/:id/$path unexpected (status: $S)${NC}"
      print_status_note "$S"
    fi
  done
  echo ""

  echo -e "${BLUE}Test 18: Admin Awards Workflow (Safe probes)${NC}"
  INVALID_AWARD_ID=0
  for action in approve reject; do
    AW_TMP="$TMP_DIR/admin_award_${action}_$$.txt"
    AW_STATUS=$(curl -s -w "%{http_code}" -o "$AW_TMP" -X PUT "${CURL_AUTH_ARGS[@]}" \
      -H "Content-Type: application/json" \
      -d '{"note":"smoke","reason":"smoke"}' \
      "$BASE_URL/api/admin/awards/$INVALID_AWARD_ID/$action")
    AW_BODY=$(cat "$AW_TMP" 2>/dev/null || true)
    rm -f "$AW_TMP" 2>/dev/null || true
    if ok_if_status_in "$AW_STATUS" 200 400 404 409; then
      echo -e "${GREEN}✓ /api/admin/awards/:id/$action responds (status: $AW_STATUS)${NC}"
    else
      echo -e "${RED}✗ /api/admin/awards/:id/$action unexpected (status: $AW_STATUS)${NC}"
      print_status_note "$AW_STATUS"
      echo "  Response preview: $(echo $AW_BODY | head -c 140)..."
    fi
  done
  echo ""

  echo -e "${BLUE}Test 19: Admin Scores Workflow (Safe probes)${NC}"
  # Recalculate is designed to be safe in this codebase.
  RECALC_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${CURL_AUTH_ARGS[@]}" "$BASE_URL/api/admin/scores/recalculate")
  if ok_if_status_in "$RECALC_STATUS" 200 202; then
    echo -e "${GREEN}✓ /api/admin/scores/recalculate OK (status: $RECALC_STATUS)${NC}"
  else
    echo -e "${RED}✗ /api/admin/scores/recalculate unexpected (status: $RECALC_STATUS)${NC}"
    print_status_note "$RECALC_STATUS"
  fi

  # Adjust should respond 404 for invalid student id (no table-missing 500).
  INVALID_STUDENT_ID=0
  ADJ_TMP="$TMP_DIR/admin_score_adjust_$$.txt"
  ADJ_STATUS=$(curl -s -w "%{http_code}" -o "$ADJ_TMP" -X POST "${CURL_AUTH_ARGS[@]}" \
    -H "Content-Type: application/json" \
    -d '{"points":1,"reason":"smoke"}' \
    "$BASE_URL/api/admin/scores/$INVALID_STUDENT_ID/adjust")
  ADJ_BODY=$(cat "$ADJ_TMP" 2>/dev/null || true)
  rm -f "$ADJ_TMP" 2>/dev/null || true
  if ok_if_status_in "$ADJ_STATUS" 200 400 404; then
    echo -e "${GREEN}✓ /api/admin/scores/:id/adjust responds (status: $ADJ_STATUS)${NC}"
  else
    echo -e "${RED}✗ /api/admin/scores/:id/adjust unexpected (status: $ADJ_STATUS)${NC}"
    print_status_note "$ADJ_STATUS"
    echo "  Response preview: $(echo $ADJ_BODY | head -c 140)..."
  fi
  echo ""

  echo -e "${BLUE}Test 20: Admin Reports (Smoke)${NC}"
  for ep in scores teachers student-points; do
    RS=$(http_status "GET" "$BASE_URL/api/admin/reports/$ep" /dev/null)
    if ok_if_status_in "$RS" 200 400 404; then
      echo -e "${GREEN}✓ /api/admin/reports/$ep responds (status: $RS)${NC}"
    else
      echo -e "${RED}✗ /api/admin/reports/$ep unexpected (status: $RS)${NC}"
      print_status_note "$RS"
    fi
  done
  echo ""
fi

if [ "$AUTH_MODE" = "teacher" ]; then
  echo -e "${BLUE}Test 9: Teacher Classes API${NC}"
  TEACHER_CLASSES_STATUS=$(http_status "GET" "$BASE_URL/api/teacher/classes" /dev/null)
  if [ "$TEACHER_CLASSES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/teacher/classes OK${NC}"
  else
    echo -e "${RED}✗ /api/teacher/classes failed (status: $TEACHER_CLASSES_STATUS)${NC}"
    print_status_note "$TEACHER_CLASSES_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 10: Teacher Dashboard Stats API${NC}"
  TEACHER_DASH_STATUS=$(http_status "GET" "$BASE_URL/api/teacher/dashboard-stats" /dev/null)
  if [ "$TEACHER_DASH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/teacher/dashboard-stats OK${NC}"
  else
    echo -e "${RED}✗ /api/teacher/dashboard-stats failed (status: $TEACHER_DASH_STATUS)${NC}"
    print_status_note "$TEACHER_DASH_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 11: Teacher Attendance Bulk (Route Exists)${NC}"
  TEACHER_BULK_STATUS=$(http_status "GET" "$BASE_URL/api/teacher/attendance/bulk" /dev/null)
  if [ "$TEACHER_BULK_STATUS" = "405" ] || [ "$TEACHER_BULK_STATUS" = "400" ]; then
    echo -e "${GREEN}✓ /api/teacher/attendance/bulk exists (status: $TEACHER_BULK_STATUS)${NC}"
  elif [ "$TEACHER_BULK_STATUS" = "404" ]; then
    echo -e "${RED}✗ /api/teacher/attendance/bulk not found (404)${NC}"
  else
    echo -e "${BLUE}Note: /api/teacher/attendance/bulk status: $TEACHER_BULK_STATUS${NC}"
  fi
  echo ""

  echo -e "${BLUE}Test 11.1: Teacher Attendance Bulk (Safe validation probe)${NC}"
  # POST empty body should be 400 (validation), not 500.
  TEACHER_BULK_POST_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST "${CURL_AUTH_ARGS[@]}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "$BASE_URL/api/teacher/attendance/bulk")
  if ok_if_status_in "$TEACHER_BULK_POST_STATUS" 400 401 403; then
    echo -e "${GREEN}✓ POST /api/teacher/attendance/bulk validation responds (status: $TEACHER_BULK_POST_STATUS)${NC}"
  else
    echo -e "${RED}✗ POST /api/teacher/attendance/bulk unexpected (status: $TEACHER_BULK_POST_STATUS)${NC}"
    print_status_note "$TEACHER_BULK_POST_STATUS"
  fi
  echo ""
fi

if [ "$AUTH_MODE" = "student" ]; then
  echo -e "${BLUE}Test 9: Student Scores API${NC}"
  STUDENT_SCORES_STATUS=$(http_status "GET" "$BASE_URL/api/student/scores" /dev/null)
  if [ "$STUDENT_SCORES_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/student/scores OK${NC}"
  else
    echo -e "${RED}✗ /api/student/scores failed (status: $STUDENT_SCORES_STATUS)${NC}"
    print_status_note "$STUDENT_SCORES_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 10: Student Awards API${NC}"
  STUDENT_AWARDS_STATUS=$(http_status "GET" "$BASE_URL/api/student/awards" /dev/null)
  if [ "$STUDENT_AWARDS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/student/awards OK${NC}"
  else
    echo -e "${RED}✗ /api/student/awards failed (status: $STUDENT_AWARDS_STATUS)${NC}"
    print_status_note "$STUDENT_AWARDS_STATUS"
  fi
  echo ""

  echo -e "${BLUE}Test 11: Student Statistics API${NC}"
  STUDENT_STATS_STATUS=$(http_status "GET" "$BASE_URL/api/student/statistics" /dev/null)
  if [ "$STUDENT_STATS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ /api/student/statistics OK${NC}"
  else
    echo -e "${RED}✗ /api/student/statistics failed (status: $STUDENT_STATS_STATUS)${NC}"
    print_status_note "$STUDENT_STATS_STATUS"
  fi
  echo ""
fi

echo -e "${GREEN}======================================"
echo "Testing Complete!"
echo "======================================"
echo ""
echo "📌 Gợi ý: đặt BASE_URL để test đúng port (vd. BASE_URL=http://localhost:3004)"
