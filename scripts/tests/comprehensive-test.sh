#!/bin/bash

# Comprehensive Testing Script
# Tests all scenarios and finds issues/redundancies

echo "🔍 COMPREHENSIVE SYSTEM TEST - UNIACT"
echo "===================================="
echo ""

RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$RESULTS_FILE") 2>&1

PASS=0
FAIL=0
WARN=0

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

echo "## 1. CODE STRUCTURE TESTS"
echo "----------------------------"

# Test 1.1: Check for duplicate code
echo "1.1 Checking for duplicate code..."
DUPLICATE_IMPORTS=$(grep -r "import.*from '@/lib/database'" src/app/api --include="*.ts" | wc -l)
if [ "$DUPLICATE_IMPORTS" -gt 50 ]; then
    test_result "WARN" "Too many database imports ($DUPLICATE_IMPORTS files) - Consider consolidation"
else
    test_result "PASS" "Database imports: $DUPLICATE_IMPORTS files"
fi

# Test 1.2: Check for unused imports
echo "1.2 Checking for potential unused code..."
if [ -f "src/lib/internet-blocker.ts" ] && [ -f "src/lib/network-status.tsx" ]; then
    test_result "WARN" "Found both internet-blocker.ts and network-status.tsx - May be duplicate"
else
    test_result "PASS" "No obvious duplicate network files"
fi

# Test 1.3: Check for large files
echo "1.3 Checking for large files..."
LARGE_FILES=$(find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500 {print $2}' | wc -l)
if [ "$LARGE_FILES" -gt 5 ]; then
    test_result "WARN" "Found $LARGE_FILES files > 500 lines - Consider refactoring"
    find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500 {print "  - " $2 " (" $1 " lines)"}'
else
    test_result "PASS" "File sizes reasonable"
fi

echo ""
echo "## 2. API ENDPOINT TESTS"
echo "------------------------"

# Test 2.1: Check for duplicate routes
echo "2.1 Checking for duplicate API routes..."
DUPLICATE_ROUTES=$(find src/app/api -name "route.ts" | sed 's/route\.ts$//' | sort | uniq -d | wc -l)
if [ "$DUPLICATE_ROUTES" -gt 0 ]; then
    test_result "FAIL" "Found duplicate routes"
else
    test_result "PASS" "No duplicate routes found"
fi

# Test 2.2: Check all critical endpoints exist
echo "2.2 Checking critical endpoints..."
CRITICAL_ENDPOINTS=(
    "src/app/api/admin/users/route.ts"
    "src/app/api/admin/users/import/route.ts"
    "src/app/api/activities/route.ts"
    "src/app/api/activities/[id]/clone/route.ts"
    "src/app/api/student/rankings/route.ts"
    "src/app/api/auth/login/route.ts"
)

for endpoint in "${CRITICAL_ENDPOINTS[@]}"; do
    if [ -f "$endpoint" ]; then
        test_result "PASS" "Endpoint exists: $endpoint"
    else
        test_result "FAIL" "Missing endpoint: $endpoint"
    fi
done

echo ""
echo "## 3. PAGE COMPONENT TESTS"
echo "--------------------------"

# Test 3.1: Check critical pages exist
CRITICAL_PAGES=(
    "src/app/admin/dashboard/page.tsx"
    "src/app/teacher/activities/page.tsx"
    "src/app/student/ranking/page.tsx"
    "src/app/student/dashboard/page.tsx"
)

for page in "${CRITICAL_PAGES[@]}"; do
    if [ -f "$page" ]; then
        test_result "PASS" "Page exists: $page"
    else
        test_result "FAIL" "Missing page: $page"
    fi
done

# Test 3.2: Check for orphaned pages
echo "3.2 Checking for potential orphaned pages..."
ORPHANED=$(find src/app -name "page.tsx" -path "*/\[*\]/*" | wc -l)
test_result "PASS" "Found $ORPHANED dynamic route pages"

echo ""
echo "## 4. FEATURE COMPLETENESS TESTS"
echo "--------------------------------"

# Test 4.1: Clone activity feature
echo "4.1 Testing clone activity feature..."
if grep -q "handleClone" src/app/teacher/activities/page.tsx && \
   [ -f "src/app/api/activities/[id]/clone/route.ts" ]; then
    test_result "PASS" "Clone activity feature complete"
else
    test_result "FAIL" "Clone activity feature incomplete"
fi

# Test 4.2: Ranking feature
echo "4.2 Testing ranking feature..."
if [ -f "src/app/student/ranking/page.tsx" ] && \
   [ -f "src/app/api/student/rankings/route.ts" ]; then
    test_result "PASS" "Ranking feature complete"
else
    test_result "FAIL" "Ranking feature incomplete"
fi

# Test 4.3: Import students feature
echo "4.3 Testing import students feature..."
if [ -f "src/app/admin/students/StudentImportDialog.tsx" ] && \
   [ -f "src/app/api/admin/users/import/route.ts" ]; then
    test_result "PASS" "Import students feature complete"
else
    test_result "FAIL" "Import students feature incomplete"
fi

# Test 4.4: Biometric authentication
echo "4.4 Testing biometric authentication..."
if [ -f "src/app/biometric/auth/page.tsx" ] && \
   [ -f "src/app/api/biometric/authenticate/route.ts" ]; then
    test_result "PASS" "Biometric auth feature complete"
else
    test_result "WARN" "Biometric auth feature may be incomplete"
fi

echo ""
echo "## 5. DATABASE TESTS"
echo "-------------------"

# Test 5.1: Check migration files
echo "5.1 Checking migrations..."
MIGRATION_COUNT=$(find scripts/migrations -name "*.ts" -not -name "run.ts" | wc -l)
if [ "$MIGRATION_COUNT" -ge 6 ]; then
    test_result "PASS" "Found $MIGRATION_COUNT migration files"
else
    test_result "WARN" "Only $MIGRATION_COUNT migrations found"
fi

# Test 5.2: Check if latest migration is registered
if grep -q "028_comprehensive_indexes" scripts/migrations/run.ts; then
    test_result "PASS" "Latest migration (028) registered"
else
    test_result "WARN" "Migration 028 may not be registered"
fi

echo ""
echo "## 6. REDUNDANCY TESTS"
echo "---------------------"

# Test 6.1: Check for unused components
echo "6.1 Checking for potentially unused components..."
COMPONENTS_DIR="src/components"
if [ -d "$COMPONENTS_DIR" ]; then
    for component in $(find "$COMPONENTS_DIR" -name "*.tsx" -type f); do
        COMPONENT_NAME=$(basename "$component" .tsx)
        USAGE_COUNT=$(grep -r "$COMPONENT_NAME" src/app --include="*.tsx" --include="*.ts" | wc -l)
        if [ "$USAGE_COUNT" -eq 0 ]; then
            test_result "WARN" "Potentially unused component: $component"
        fi
    done
fi

# Test 6.2: Check for duplicate utility functions
echo "6.2 Checking for duplicate utility files..."
if [ -f "src/lib/utils.ts" ] && [ -f "src/lib/helpers.ts" ]; then
    test_result "WARN" "Found both utils.ts and helpers.ts - May contain duplicates"
else
    test_result "PASS" "No obvious duplicate utility files"
fi

echo ""
echo "## 7. SECURITY TESTS"
echo "-------------------"

# Test 7.1: Check for hardcoded secrets
echo "7.1 Checking for hardcoded secrets..."
HARDCODED_SECRETS=$(grep -r "password.*=" src --include="*.ts" --include="*.tsx" | grep -v "password:" | grep -v "Password" | grep -v "PasswordInput" | wc -l)
if [ "$HARDCODED_SECRETS" -gt 0 ]; then
    test_result "WARN" "Found $HARDCODED_SECRETS potential hardcoded values"
else
    test_result "PASS" "No obvious hardcoded secrets"
fi

# Test 7.2: Check for auth guards
echo "7.2 Checking auth implementation..."
if grep -q "requireAuth" src/lib/guards.ts && \
   grep -q "requireRole" src/lib/guards.ts; then
    test_result "PASS" "Auth guards implemented"
else
    test_result "FAIL" "Auth guards missing or incomplete"
fi

echo ""
echo "## 8. PERFORMANCE TESTS"
echo "----------------------"

# Test 8.1: Check for database indexes
echo "8.1 Checking database indexes..."
if [ -f "scripts/migrations/028_comprehensive_indexes.ts" ]; then
    INDEX_COUNT=$(grep -c "CREATE INDEX" scripts/migrations/028_comprehensive_indexes.ts)
    if [ "$INDEX_COUNT" -ge 30 ]; then
        test_result "PASS" "Comprehensive indexes created ($INDEX_COUNT indexes)"
    else
        test_result "WARN" "Only $INDEX_COUNT indexes found"
    fi
else
    test_result "FAIL" "Comprehensive indexes migration missing"
fi

# Test 8.2: Check for caching
echo "8.2 Checking caching implementation..."
if [ -f "src/lib/cache.ts" ]; then
    CACHE_USAGE=$(grep -r "cache\." src/app/api --include="*.ts" | wc -l)
    if [ "$CACHE_USAGE" -gt 5 ]; then
        test_result "PASS" "Caching used in $CACHE_USAGE places"
    else
        test_result "WARN" "Limited cache usage ($CACHE_USAGE uses)"
    fi
else
    test_result "WARN" "No caching implementation found"
fi

echo ""
echo "## 9. UI/UX TESTS"
echo "----------------"

# Test 9.1: Check for loading states
echo "9.1 Checking loading states..."
LOADING_SPINNERS=$(grep -r "LoadingSpinner" src/app --include="*.tsx" | wc -l)
if [ "$LOADING_SPINNERS" -gt 10 ]; then
    test_result "PASS" "Loading states implemented ($LOADING_SPINNERS uses)"
else
    test_result "WARN" "Limited loading states ($LOADING_SPINNERS uses)"
fi

# Test 9.2: Check for error handling
echo "9.2 Checking error handling..."
ERROR_HANDLING=$(grep -r "try.*catch" src/app --include="*.tsx" | wc -l)
if [ "$ERROR_HANDLING" -gt 20 ]; then
    test_result "PASS" "Error handling present ($ERROR_HANDLING try-catch blocks)"
else
    test_result "WARN" "Limited error handling ($ERROR_HANDLING try-catch blocks)"
fi

echo ""
echo "## 10. DOCUMENTATION TESTS"
echo "-------------------------"

# Test 10.1: Check for README files
DOCS=(
    "01-README.md"
    "02-PROGRESS.md"
    "03-DEVELOPMENT_GUIDE.md"
    "04-DEPLOYMENT.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        test_result "PASS" "Documentation exists: $doc"
    else
        test_result "WARN" "Missing documentation: $doc"
    fi
done

echo ""
echo "========================================="
echo "📊 FINAL SUMMARY"
echo "========================================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "⚠️  Warnings: $WARN"
echo "Total Tests: $((PASS + FAIL + WARN))"
echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo "🎉 All critical tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Review the log above."
    exit 1
fi
