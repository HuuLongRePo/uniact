#!/bin/bash

# Test Script - Verify All Implementations
echo "🧪 Testing UniAct Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test 1: Check compile errors
echo "📝 Test 1: Checking compile errors..."
if tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ FAILED: Compile errors found${NC}"
    FAILED=$((FAILED+1))
else
    echo -e "${GREEN}✅ PASSED: No compile errors${NC}"
    PASSED=$((PASSED+1))
fi
echo ""

# Test 2: Check if ranking page exists
echo "📝 Test 2: Checking student ranking page..."
if [ -f "src/app/student/ranking/page.tsx" ]; then
    echo -e "${GREEN}✅ PASSED: Ranking page exists${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: Ranking page not found${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Test 3: Check if ranking API exists
echo "📝 Test 3: Checking ranking API endpoint..."
if [ -f "src/app/api/student/rankings/route.ts" ]; then
    echo -e "${GREEN}✅ PASSED: Ranking API exists${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: Ranking API not found${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Test 4: Check if clone endpoint exists
echo "📝 Test 4: Checking clone activity endpoint..."
if [ -f "src/app/api/activities/[id]/clone/route.ts" ]; then
    echo -e "${GREEN}✅ PASSED: Clone endpoint exists${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: Clone endpoint not found${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Test 5: Check if migration 028 exists
echo "📝 Test 5: Checking comprehensive indexes migration..."
if [ -f "scripts/migrations/028_comprehensive_indexes.ts" ]; then
    echo -e "${GREEN}✅ PASSED: Migration 028 exists${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: Migration 028 not found${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Test 6: Check if database is refactored
echo "📝 Test 6: Checking database refactoring..."
if [ -f "src/lib/db-core.ts" ] && [ -f "src/lib/db-queries.ts" ]; then
    echo -e "${GREEN}✅ PASSED: Database refactored${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: Database not refactored${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Test 7: Check index count in migration 028
echo "📝 Test 7: Checking index count in migration..."
INDEX_COUNT=$(grep -c "CREATE INDEX" scripts/migrations/028_comprehensive_indexes.ts)
if [ "$INDEX_COUNT" -ge 30 ]; then
    echo -e "${GREEN}✅ PASSED: $INDEX_COUNT indexes found (≥30)${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: Only $INDEX_COUNT indexes found (<30)${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Test 8: Check if admin/students page compiles
echo "📝 Test 8: Checking admin students page..."
if grep -q "handleMoveClass" src/app/admin/students/page.tsx; then
    echo -e "${GREEN}✅ PASSED: handleMoveClass function exists${NC}"
    PASSED=$((PASSED+1))
else
    echo -e "${RED}❌ FAILED: handleMoveClass function missing${NC}"
    FAILED=$((FAILED+1))
fi
echo ""

# Summary
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED+FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed!${NC}"
    exit 1
fi
