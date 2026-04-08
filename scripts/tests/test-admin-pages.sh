#!/bin/bash

# Test Admin Pages - Activities & Approvals
# Kiểm tra xem data có hiển thị đúng không

BASE_URL="${BASE_URL:-http://10.90.224.58:3000}"
COOKIE_FILE="cookie_admin.txt"

echo "🧪 Testing Admin Pages..."
echo "================================"
echo ""

# 1. Login as admin
echo "1️⃣ Login as admin..."
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uniact.local","password":"Admin123!@#"}')

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# 2. Test /api/admin/activities
echo "2️⃣ Testing /api/admin/activities..."
ACTIVITIES_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/admin/activities?limit=5")

echo "Response:"
echo "$ACTIVITIES_RESPONSE" | jq '.'
echo ""

# Check if response has activities array
ACTIVITIES_COUNT=$(echo "$ACTIVITIES_RESPONSE" | jq '.activities | length')
echo "📊 Found $ACTIVITIES_COUNT activities"

# Check first activity structure
if [ "$ACTIVITIES_COUNT" -gt 0 ]; then
  echo ""
  echo "🔍 First activity fields:"
  echo "$ACTIVITIES_RESPONSE" | jq '.activities[0] | keys'
  echo ""
  echo "Sample data:"
  echo "$ACTIVITIES_RESPONSE" | jq '.activities[0] | {
    id,
    title,
    teacher_name,
    activity_type,
    organization_level,
    start_date,
    status,
    approval_status,
    participant_count,
    points
  }'
fi
echo ""

# 3. Test /api/admin/activities/pending
echo "3️⃣ Testing /api/admin/activities/pending..."
PENDING_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/admin/activities/pending?limit=5")

echo "Response:"
echo "$PENDING_RESPONSE" | jq '.'
echo ""

# Check if response has activities array
PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq '.activities | length')
echo "📊 Found $PENDING_COUNT pending activities"

# Check first pending activity structure
if [ "$PENDING_COUNT" -gt 0 ]; then
  echo ""
  echo "🔍 First pending activity fields:"
  echo "$PENDING_RESPONSE" | jq '.activities[0] | keys'
  echo ""
  echo "Sample data:"
  echo "$PENDING_RESPONSE" | jq '.activities[0] | {
    id,
    title,
    teacher_name,
    creator_name,
    date_time,
    start_date,
    location,
    max_participants,
    participant_count,
    status,
    approval_status
  }'
else
  echo "⚠️  No pending activities found. This is OK if there are none."
fi
echo ""

# 4. Summary
echo "================================"
echo "📋 SUMMARY"
echo "================================"
echo "✅ Admin login: OK"
echo "✅ /api/admin/activities: $ACTIVITIES_COUNT activities"
echo "✅ /api/admin/activities/pending: $PENDING_COUNT pending"
echo ""

# Check for missing fields
echo "🔍 Field validation:"
if echo "$ACTIVITIES_RESPONSE" | jq -e '.activities[0].teacher_name' > /dev/null 2>&1; then
  echo "✅ teacher_name exists in activities"
else
  echo "❌ teacher_name missing in activities"
fi

if echo "$ACTIVITIES_RESPONSE" | jq -e '.activities[0].activity_type' > /dev/null 2>&1; then
  echo "✅ activity_type exists in activities"
else
  echo "❌ activity_type missing in activities"
fi

if echo "$ACTIVITIES_RESPONSE" | jq -e '.activities[0].organization_level' > /dev/null 2>&1; then
  echo "✅ organization_level exists in activities"
else
  echo "❌ organization_level missing in activities"
fi

if [ "$PENDING_COUNT" -gt 0 ]; then
  if echo "$PENDING_RESPONSE" | jq -e '.activities[0].teacher_name' > /dev/null 2>&1; then
    echo "✅ teacher_name exists in pending"
  else
    echo "⚠️  teacher_name missing in pending (checking creator_name...)"
    if echo "$PENDING_RESPONSE" | jq -e '.activities[0].creator_name' > /dev/null 2>&1; then
      echo "✅ creator_name exists in pending"
    fi
  fi
fi

echo ""
echo "🎉 Test complete!"
