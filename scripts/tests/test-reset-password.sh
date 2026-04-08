#!/bin/bash

# Test UC-A05: Reset Password API

echo "==================================="
echo "TEST: UC-A05 Reset Password"
echo "==================================="
echo ""

# 1. Login as admin để lấy token
echo "1. Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@campus.edu",
    "password": "admin123"
  }' -c cookies.txt)

echo "Login response: $LOGIN_RESPONSE"
echo ""

# 2. Get user ID (chọn student đầu tiên)
echo "2. Get student list..."
USERS_RESPONSE=$(curl -s -b cookies.txt http://localhost:3003/api/users?role=student&limit=1)
echo "Users response: $USERS_RESPONSE"

# Extract first user ID (basic parsing)
USER_ID=$(echo $USERS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Target user ID: $USER_ID"
echo ""

# 3. Reset password
echo "3. Reset password for user $USER_ID..."
RESET_RESPONSE=$(curl -s -b cookies.txt -X POST \
  http://localhost:3003/api/users/$USER_ID/reset-password)

echo "Reset response:"
echo $RESET_RESPONSE | jq '.'
echo ""

# Cleanup
rm -f cookies.txt

echo "==================================="
echo "TEST COMPLETED"
echo "==================================="
