#!/bin/bash

# Pre-Move File Safety Checklist
# 
# This script runs a series of checks before moving files to ensure
# nothing breaks in the codebase.
#
# Usage:
#   ./scripts/pre-move-checklist.sh <filename>
#   ./scripts/pre-move-checklist.sh memory-quality-standards.md

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if filename is provided
if [ $# -eq 0 ]; then
    echo -e "${BLUE}Pre-Move File Safety Checklist${NC}"
    echo ""
    echo "Usage: $0 <filename>"
    echo "Example: $0 memory-quality-standards.md"
    exit 1
fi

FILENAME="$1"

echo -e "${BLUE}=== Pre-Move Safety Checklist for: ${YELLOW}$FILENAME${NC} ==="
echo ""

# Initialize check results
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to run a check
run_check() {
    local check_name="$1"
    local check_command="$2"
    
    echo -e "${BLUE}Running:${NC} $check_name"
    
    if eval "$check_command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((CHECKS_FAILED++))
    fi
    echo ""
}

# Check 1: File exists
run_check "File exists" "[ -f '$FILENAME' ]"

# Check 2: Search for direct references
echo -e "${BLUE}Checking for direct references...${NC}"
REFS=$(grep -rn "$FILENAME" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude-dir=build \
    --exclude-dir=data-backups \
    --exclude-dir=memories \
    --exclude-dir=tasks \
    --exclude="$0" \
    2>/dev/null | wc -l || echo "0")

if [ "$REFS" -gt 0 ]; then
    echo -e "${RED}✗ Found $REFS direct reference(s)${NC}"
    echo "Run this to see details:"
    echo "  node scripts/check-file-references.js $FILENAME"
    ((CHECKS_FAILED++))
else
    echo -e "${GREEN}✓ No direct references found${NC}"
    ((CHECKS_PASSED++))
fi
echo ""

# Check 3: Check for imports/requires (for JS/TS files)
if [[ "$FILENAME" =~ \.(js|jsx|ts|tsx|json)$ ]]; then
    echo -e "${BLUE}Checking for import/require statements...${NC}"
    
    # Get filename without path
    BASENAME=$(basename "$FILENAME")
    BASENAME_NO_EXT="${BASENAME%.*}"
    
    # Search for various import patterns
    IMPORTS=$(grep -rn -E "(import|require).*['\"].*$BASENAME_NO_EXT|from ['\"].*$BASENAME" . \
        --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        2>/dev/null | wc -l || echo "0")
    
    if [ "$IMPORTS" -gt 0 ]; then
        echo -e "${RED}✗ Found $IMPORTS import/require reference(s)${NC}"
        ((CHECKS_FAILED++))
    else
        echo -e "${GREEN}✓ No import/require references found${NC}"
        ((CHECKS_PASSED++))
    fi
    echo ""
fi

# Check 4: Check package.json scripts
if [ -f "package.json" ]; then
    echo -e "${BLUE}Checking package.json scripts...${NC}"
    
    if grep -q "$FILENAME" package.json; then
        echo -e "${RED}✗ Found reference in package.json${NC}"
        ((CHECKS_FAILED++))
    else
        echo -e "${GREEN}✓ No references in package.json${NC}"
        ((CHECKS_PASSED++))
    fi
    echo ""
fi

# Check 5: Check for configuration files
echo -e "${BLUE}Checking configuration files...${NC}"
CONFIG_REFS=0

for config in .env .env.* *.config.js *.config.ts tsconfig.json jsconfig.json; do
    if [ -f "$config" ] && grep -q "$FILENAME" "$config" 2>/dev/null; then
        echo -e "${YELLOW}  Found in: $config${NC}"
        ((CONFIG_REFS++))
    fi
done

if [ "$CONFIG_REFS" -gt 0 ]; then
    echo -e "${RED}✗ Found $CONFIG_REFS configuration file reference(s)${NC}"
    ((CHECKS_FAILED++))
else
    echo -e "${GREEN}✓ No configuration file references${NC}"
    ((CHECKS_PASSED++))
fi
echo ""

# Check 6: Run tests (if available)
if [ -f "package.json" ] && grep -q "\"test\":" package.json; then
    echo -e "${BLUE}Running tests to ensure nothing is broken...${NC}"
    
    if npm test --silent 2>/dev/null; then
        echo -e "${GREEN}✓ All tests passing${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠ Tests failed or couldn't run${NC}"
        echo "  Run 'npm test' manually to check"
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}=== SUMMARY ===${NC}"
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ File appears safe to move!${NC}"
    echo ""
    echo "Recommended next steps:"
    echo "1. Make a backup: cp $FILENAME $FILENAME.backup"
    echo "2. Move the file to new location"
    echo "3. Run tests again to confirm"
else
    echo -e "${RED}✗ Issues found! Fix these before moving the file.${NC}"
    echo ""
    echo "To see detailed references, run:"
    echo "  node scripts/check-file-references.js $FILENAME"
fi

exit $CHECKS_FAILED