#!/bin/bash

# Quick test runner script (no npm install needed)
# Usage: ./run-tests.sh [scenario-name]

set -e

ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:4100}"
SCENARIOS_DIR="../data/scenarios"
VERBOSE="${VERBOSE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

echo "🧪 Automated Scenario Testing Framework"
echo ""
echo "Orchestrator URL: $ORCHESTRATOR_URL"
echo ""

# Check if orchestrator is running
if ! curl -s "$ORCHESTRATOR_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot reach orchestrator at $ORCHESTRATOR_URL${NC}"
    echo "Please start the orchestrator:"
    echo "  cd services/orchestrator && npm run dev"
    exit 1
fi

# Get scenario filter if provided
SCENARIO_FILTER="${1:-}"

# Function to test a single scenario
test_scenario() {
    local SCENARIO_DIR="$1"
    local SCENARIO_NAME=$(basename "$SCENARIO_DIR")

    # Skip if filtering and doesn't match
    if [ -n "$SCENARIO_FILTER" ] && [[ ! "$SCENARIO_NAME" =~ "$SCENARIO_FILTER" ]]; then
        return
    fi

    TOTAL=$((TOTAL + 1))

    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Testing: $SCENARIO_NAME"

    # Check required files
    if [ ! -f "$SCENARIO_DIR/gl_balance.csv" ]; then
        echo -e "${RED}❌ Missing gl_balance.csv${NC}"
        FAILED=$((FAILED + 1))
        return
    fi
    if [ ! -f "$SCENARIO_DIR/subledger_balance.csv" ]; then
        echo -e "${RED}❌ Missing subledger_balance.csv${NC}"
        FAILED=$((FAILED + 1))
        return
    fi
    if [ ! -f "$SCENARIO_DIR/expected_results.json" ]; then
        echo -e "${RED}❌ Missing expected_results.json${NC}"
        FAILED=$((FAILED + 1))
        return
    fi

    # Create payload (simple JSON construction - not production-grade!)
    # Note: This is a simplified version. The TypeScript version is more robust.

    # For now, just call the API and check if it returns 200
    local START_TIME=$(date +%s%3N)

    local RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ORCHESTRATOR_URL/agent/runs" \
        -H "Content-Type: application/json" \
        -d "{
            \"userPrompt\": \"Reconcile scenario: $SCENARIO_NAME\",
            \"payload\": {
                \"glBalances\": [],
                \"subledgerBalances\": []
            }
        }" 2>/dev/null)

    local HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    local BODY=$(echo "$RESPONSE" | head -n -1)

    local END_TIME=$(date +%s%3N)
    local DURATION=$((END_TIME - START_TIME))

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ $SCENARIO_NAME - PASSED${NC} (${DURATION}ms)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ $SCENARIO_NAME - FAILED${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))

        if [ "$VERBOSE" = "true" ]; then
            echo "Response:"
            echo "$BODY" | python -m json.tool 2>/dev/null || echo "$BODY"
        fi
    fi
}

# Find and test all scenarios
for SCENARIO in "$SCENARIOS_DIR"/[0-9][0-9]-*; do
    if [ -d "$SCENARIO" ]; then
        test_scenario "$SCENARIO"
    fi
done

# Print summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo "TEST SUMMARY"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo "Total:    $TOTAL scenarios"
echo -e "Passed:   ${GREEN}$PASSED ✅${NC}"
echo -e "Failed:   ${RED}$FAILED ❌${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
fi
