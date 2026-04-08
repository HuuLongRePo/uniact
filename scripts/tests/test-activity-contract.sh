#!/bin/bash

# Integration contract test for /api/activities (create + update)
# Covers: invalid payload, deadline edge, class mismatch, valid create/update.

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEACHER_EMAIL="${TEACHER_EMAIL:-gvcn.nguyenvanmanh@annd.edu.vn}"
TEACHER_PASSWORD="${TEACHER_PASSWORD:-teacher123}"
COOKIE_FILE="${COOKIE_FILE:-/tmp/uniact_activity_contract.cookie}"
TMP_DIR="${TMPDIR:-/tmp}"

mkdir -p "$TMP_DIR"

PASS=0
FAIL=0
CREATED_ACTIVITY_ID=""
CLASS_ID=""

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_pass() {
  echo -e "${GREEN}✓ $1${NC}"
  PASS=$((PASS+1))
}

print_fail() {
  echo -e "${RED}✗ $1${NC}"
  FAIL=$((FAIL+1))
}

http_json() {
  local method="$1"
  local url="$2"
  local body="$3"
  local out_file="$4"

  if [ -n "$body" ]; then
    curl -s -w "%{http_code}" -o "$out_file" -X "$method" \
      -b "$COOKIE_FILE" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$url"
  else
    curl -s -w "%{http_code}" -o "$out_file" -X "$method" \
      -b "$COOKIE_FILE" \
      "$url"
  fi
}

assert_validation_field() {
  local file="$1"
  local field="$2"

  node -e "
const fs=require('fs');
const p=process.argv[1];
const field=process.argv[2];
let j;
try { j=JSON.parse(fs.readFileSync(p,'utf8')); } catch { process.exit(1); }
const ok = j?.success === false
  && j?.code === 'VALIDATION_ERROR'
  && j?.details
  && Object.prototype.hasOwnProperty.call(j.details, field);
process.exit(ok ? 0 : 1);
" "$file" "$field"
}

extract_first_class_id() {
  local file="$1"

  node -e "
const fs=require('fs');
const p=process.argv[1];
let j;
try { j=JSON.parse(fs.readFileSync(p,'utf8')); } catch { process.exit(0); }
const candidates = [j?.data?.classes, j?.classes, j?.data, j?.items].filter(Array.isArray);
const list = candidates[0] || [];
const id = list[0]?.id ?? list[0]?.class_id;
if (id !== undefined && id !== null) process.stdout.write(String(id));
" "$file"
}

extract_created_activity_id() {
  local file="$1"

  node -e "
const fs=require('fs');
const p=process.argv[1];
let j;
try { j=JSON.parse(fs.readFileSync(p,'utf8')); } catch { process.exit(0); }
const id =
  j?.data?.activity?.id
  ?? j?.activity?.id
  ?? j?.data?.id
  ?? j?.id;
if (id !== undefined && id !== null) process.stdout.write(String(id));
" "$file"
}

assert_success_with_activity() {
  local file="$1"

  node -e "
const fs=require('fs');
const p=process.argv[1];
let j;
try { j=JSON.parse(fs.readFileSync(p,'utf8')); } catch { process.exit(1); }
const ok = j?.success === true && (j?.data?.activity || j?.activity);
process.exit(ok ? 0 : 1);
" "$file"
}

login_teacher() {
  local login_file="$TMP_DIR/activity_contract_login_$$.json"
  rm -f "$COOKIE_FILE"

  local status
  status=$(curl -s -w "%{http_code}" -o "$login_file" -c "$COOKIE_FILE" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEACHER_EMAIL\",\"password\":\"$TEACHER_PASSWORD\"}" \
    "$BASE_URL/api/auth/login")

  if [ "$status" != "200" ]; then
    print_fail "Teacher login failed (HTTP $status)"
    echo "  Response: $(cat "$login_file" 2>/dev/null | head -c 200)"
    return 1
  fi

  if ! grep -q "\\<token\\>" "$COOKIE_FILE" 2>/dev/null; then
    print_fail "Teacher login succeeded but token cookie not found"
    return 1
  fi

  print_pass "Teacher login success"
  return 0
}

echo -e "${BLUE}🧪 Activity API Contract Test${NC}"
echo "BASE_URL=$BASE_URL"
echo ""

if ! login_teacher; then
  echo ""
  echo -e "${RED}Contract test aborted due to login failure.${NC}"
  exit 1
fi

CLASSES_FILE="$TMP_DIR/activity_contract_classes_$$.json"
CLASSES_STATUS=$(http_json "GET" "$BASE_URL/api/classes" "" "$CLASSES_FILE")
if [ "$CLASSES_STATUS" != "200" ]; then
  print_fail "Fetch classes failed (HTTP $CLASSES_STATUS)"
  echo "  Response: $(cat "$CLASSES_FILE" 2>/dev/null | head -c 200)"
else
  CLASS_ID=$(extract_first_class_id "$CLASSES_FILE")
  if [ -z "$CLASS_ID" ]; then
    print_fail "No class id found from /api/classes"
  else
    print_pass "Resolved class_id=$CLASS_ID"
  fi
fi

if [ -z "$CLASS_ID" ]; then
  echo ""
  echo -e "${RED}Contract test aborted because no valid class_id was found.${NC}"
  exit 1
fi

EVENT_DATE=$(node -e "const d=new Date(Date.now()+96*60*60*1000);process.stdout.write(d.toISOString())")
DEADLINE_TOO_SOON=$(node -e "const d=new Date(Date.now()+84*60*60*1000);process.stdout.write(d.toISOString())")
DEADLINE_OK=$(node -e "const d=new Date(Date.now()+60*60*60*1000);process.stdout.write(d.toISOString())")

# 1) Invalid create payload
INVALID_CREATE_FILE="$TMP_DIR/activity_contract_invalid_create_$$.json"
INVALID_CREATE_PAYLOAD='{"title":"","date_time":"invalid-date","location":"","max_participants":0,"class_ids":["x"]}'
INVALID_CREATE_STATUS=$(http_json "POST" "$BASE_URL/api/activities" "$INVALID_CREATE_PAYLOAD" "$INVALID_CREATE_FILE")
if [ "$INVALID_CREATE_STATUS" = "400" ] && assert_validation_field "$INVALID_CREATE_FILE" "title"; then
  print_pass "POST invalid payload returns 400 + details"
else
  print_fail "POST invalid payload should return validation error"
  echo "  HTTP=$INVALID_CREATE_STATUS body=$(cat "$INVALID_CREATE_FILE" 2>/dev/null | head -c 240)"
fi

# 2) Deadline too short
DEADLINE_CREATE_FILE="$TMP_DIR/activity_contract_deadline_create_$$.json"
DEADLINE_CREATE_PAYLOAD=$(printf '{"title":"Test deadline too short","description":"Contract test","date_time":"%s","location":"P.101","max_participants":30,"class_ids":[%s],"registration_deadline":"%s"}' "$EVENT_DATE" "$CLASS_ID" "$DEADLINE_TOO_SOON")
DEADLINE_CREATE_STATUS=$(http_json "POST" "$BASE_URL/api/activities" "$DEADLINE_CREATE_PAYLOAD" "$DEADLINE_CREATE_FILE")
if [ "$DEADLINE_CREATE_STATUS" = "400" ] && assert_validation_field "$DEADLINE_CREATE_FILE" "registration_deadline"; then
  print_pass "POST deadline <24h returns 400"
else
  print_fail "POST deadline <24h should return validation error"
  echo "  HTTP=$DEADLINE_CREATE_STATUS body=$(cat "$DEADLINE_CREATE_FILE" 2>/dev/null | head -c 240)"
fi

# 3) Class id mismatch
CLASS_MISMATCH_CREATE_FILE="$TMP_DIR/activity_contract_class_mismatch_create_$$.json"
CLASS_MISMATCH_CREATE_PAYLOAD=$(printf '{"title":"Test invalid class","description":"Contract test","date_time":"%s","location":"P.102","max_participants":20,"class_ids":[999999]}' "$EVENT_DATE")
CLASS_MISMATCH_CREATE_STATUS=$(http_json "POST" "$BASE_URL/api/activities" "$CLASS_MISMATCH_CREATE_PAYLOAD" "$CLASS_MISMATCH_CREATE_FILE")
if [ "$CLASS_MISMATCH_CREATE_STATUS" = "400" ] && assert_validation_field "$CLASS_MISMATCH_CREATE_FILE" "class_ids"; then
  print_pass "POST invalid class_ids returns 400"
else
  print_fail "POST invalid class_ids should return validation error"
  echo "  HTTP=$CLASS_MISMATCH_CREATE_STATUS body=$(cat "$CLASS_MISMATCH_CREATE_FILE" 2>/dev/null | head -c 240)"
fi

# 4) Valid create
VALID_CREATE_FILE="$TMP_DIR/activity_contract_valid_create_$$.json"
VALID_CREATE_TITLE="Contract Test $(date +%s)"
VALID_CREATE_PAYLOAD=$(printf '{"title":"%s","description":"Contract create success","date_time":"%s","location":"Phòng test","max_participants":40,"class_ids":[%s],"registration_deadline":"%s"}' "$VALID_CREATE_TITLE" "$EVENT_DATE" "$CLASS_ID" "$DEADLINE_OK")
VALID_CREATE_STATUS=$(http_json "POST" "$BASE_URL/api/activities" "$VALID_CREATE_PAYLOAD" "$VALID_CREATE_FILE")
CREATED_ACTIVITY_ID=$(extract_created_activity_id "$VALID_CREATE_FILE")
if [ "$VALID_CREATE_STATUS" = "201" ] && [ -n "$CREATED_ACTIVITY_ID" ]; then
  print_pass "POST valid payload returns 201 (activity_id=$CREATED_ACTIVITY_ID)"
else
  print_fail "POST valid payload should return 201 with activity id"
  echo "  HTTP=$VALID_CREATE_STATUS body=$(cat "$VALID_CREATE_FILE" 2>/dev/null | head -c 240)"
fi

if [ -n "$CREATED_ACTIVITY_ID" ]; then
  # 5) Invalid update payload
  INVALID_UPDATE_FILE="$TMP_DIR/activity_contract_invalid_update_$$.json"
  INVALID_UPDATE_PAYLOAD='{"max_participants":0}'
  INVALID_UPDATE_STATUS=$(http_json "PUT" "$BASE_URL/api/activities/$CREATED_ACTIVITY_ID" "$INVALID_UPDATE_PAYLOAD" "$INVALID_UPDATE_FILE")
  if [ "$INVALID_UPDATE_STATUS" = "400" ] && assert_validation_field "$INVALID_UPDATE_FILE" "max_participants"; then
    print_pass "PUT invalid payload returns 400 + details"
  else
    print_fail "PUT invalid payload should return validation error"
    echo "  HTTP=$INVALID_UPDATE_STATUS body=$(cat "$INVALID_UPDATE_FILE" 2>/dev/null | head -c 240)"
  fi

  # 6) Update class_id mismatch
  CLASS_MISMATCH_UPDATE_FILE="$TMP_DIR/activity_contract_class_mismatch_update_$$.json"
  CLASS_MISMATCH_UPDATE_PAYLOAD='{"class_ids":[999999]}'
  CLASS_MISMATCH_UPDATE_STATUS=$(http_json "PUT" "$BASE_URL/api/activities/$CREATED_ACTIVITY_ID" "$CLASS_MISMATCH_UPDATE_PAYLOAD" "$CLASS_MISMATCH_UPDATE_FILE")
  if [ "$CLASS_MISMATCH_UPDATE_STATUS" = "400" ] && assert_validation_field "$CLASS_MISMATCH_UPDATE_FILE" "class_ids"; then
    print_pass "PUT invalid class_ids returns 400"
  else
    print_fail "PUT invalid class_ids should return validation error"
    echo "  HTTP=$CLASS_MISMATCH_UPDATE_STATUS body=$(cat "$CLASS_MISMATCH_UPDATE_FILE" 2>/dev/null | head -c 240)"
  fi

  # 7) Update deadline too short
  DEADLINE_UPDATE_FILE="$TMP_DIR/activity_contract_deadline_update_$$.json"
  DEADLINE_UPDATE_PAYLOAD=$(printf '{"registration_deadline":"%s"}' "$DEADLINE_TOO_SOON")
  DEADLINE_UPDATE_STATUS=$(http_json "PUT" "$BASE_URL/api/activities/$CREATED_ACTIVITY_ID" "$DEADLINE_UPDATE_PAYLOAD" "$DEADLINE_UPDATE_FILE")
  if [ "$DEADLINE_UPDATE_STATUS" = "400" ] && assert_validation_field "$DEADLINE_UPDATE_FILE" "registration_deadline"; then
    print_pass "PUT deadline <24h returns 400"
  else
    print_fail "PUT deadline <24h should return validation error"
    echo "  HTTP=$DEADLINE_UPDATE_STATUS body=$(cat "$DEADLINE_UPDATE_FILE" 2>/dev/null | head -c 240)"
  fi

  # 8) Valid update
  VALID_UPDATE_FILE="$TMP_DIR/activity_contract_valid_update_$$.json"
  VALID_UPDATE_PAYLOAD=$(printf '{"title":"%s (updated)","location":"Phòng test 2","max_participants":45,"class_ids":[%s]}' "$VALID_CREATE_TITLE" "$CLASS_ID")
  VALID_UPDATE_STATUS=$(http_json "PUT" "$BASE_URL/api/activities/$CREATED_ACTIVITY_ID" "$VALID_UPDATE_PAYLOAD" "$VALID_UPDATE_FILE")
  if [ "$VALID_UPDATE_STATUS" = "200" ] && assert_success_with_activity "$VALID_UPDATE_FILE"; then
    print_pass "PUT valid payload returns 200"
  else
    print_fail "PUT valid payload should return 200 with activity"
    echo "  HTTP=$VALID_UPDATE_STATUS body=$(cat "$VALID_UPDATE_FILE" 2>/dev/null | head -c 240)"
  fi
fi

echo ""
echo "=============================="
echo "Activity Contract Test Summary"
echo "=============================="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
if [ -n "$CREATED_ACTIVITY_ID" ]; then
  echo "Created activity id: $CREATED_ACTIVITY_ID"
fi

echo ""
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
