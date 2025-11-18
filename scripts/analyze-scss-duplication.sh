#!/bin/bash
#
# SCSS Duplication Analysis Script
# Finds duplicate CSS class definitions across component SCSS files
#

echo "🔍 SCSS Duplication Analysis"
echo "================================"
echo ""

cd "$(dirname "$0")/.." || exit 1

echo "📊 Total SCSS files:"
find src/app/components -name "*.scss" | wc -l
echo ""

echo "📋 Common Class Duplications:"
echo ""

echo "1. .formGroup occurrences:"
grep -r "\.formGroup\s*{" src/app/components --include="*.scss" | wc -l
echo ""

echo "2. .block occurrences:"
grep -r "\.block\s*{" src/app/components --include="*.scss" | wc -l
echo ""

echo "3. .row occurrences:"
grep -r "\.row\s*{" src/app/components --include="*.scss" | wc -l
echo ""

echo "4. .col occurrences:"
grep -r "\.col\s*{" src/app/components --include="*.scss" | wc -l
echo ""

echo "5. .inputBox occurrences:"
grep -r "\.inputBox\s*{" src/app/components --include="*.scss" | wc -l
echo ""

echo "6. .section occurrences:"
grep -r "\.section\s*{" src/app/components --include="*.scss" | wc -l
echo ""

echo "📊 Hardcoded Values Analysis:"
echo ""

echo "Hardcoded colors (examples):"
echo "  #f3f4f5: $(grep -r "#f3f4f5" src/app/components --include="*.scss" | wc -l) occurrences"
echo "  #2e3646: $(grep -r "#2e3646" src/app/components --include="*.scss" | wc -l) occurrences"
echo "  #16d3d2: $(grep -r "#16d3d2" src/app/components --include="*.scss" | wc -l) occurrences"
echo ""

echo "Hardcoded spacing (examples):"
echo "  10px: $(grep -r ":\s*10px" src/app/components --include="*.scss" | wc -l) occurrences"
echo "  15px: $(grep -r ":\s*15px" src/app/components --include="*.scss" | wc -l) occurrences"
echo "  20px: $(grep -r ":\s*20px" src/app/components --include="*.scss" | wc -l) occurrences"
echo "  24px: $(grep -r ":\s*24px" src/app/components --include="*.scss" | wc -l) occurrences"
echo ""

echo "📊 Design Token Usage:"
echo ""

echo "var(--spacing-*): $(grep -r "var(--spacing-" src/app/components --include="*.scss" | wc -l) occurrences"
echo "var(--color-*): $(grep -r "var(--color-" src/app/components --include="*.scss" | wc -l) occurrences"
echo ""

echo "🎯 Consolidation Opportunities:"
echo ""

echo "Files with .formGroup definitions:"
grep -r "\.formGroup\s*{" src/app/components --include="*.scss" -l | head -10
echo ""

echo "Files with hardcoded #f3f4f5:"
grep -r "#f3f4f5" src/app/components --include="*.scss" -l | head -10
echo ""

echo "================================"
echo "✅ Analysis Complete"
echo ""
echo "Next steps:"
echo "1. Create shared/_layout.scss for common patterns"
echo "2. Create shared/_forms.scss for form styles"
echo "3. Create shared/_sections.scss for section styles"
echo "4. Extract duplicates from components"
echo "5. Replace hardcoded values with design tokens"












