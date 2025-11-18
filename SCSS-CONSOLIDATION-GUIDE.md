# SCSS Consolidation Guide

**Project**: Backend Component Unification  
**Phase**: Phase 6 - SCSS Consolidation  
**Goal**: Reduce CSS bundle from 196 KB to 157-166 KB (15-20% reduction)  
**Status**: Foundation laid, incremental cleanup in progress

---

## What's Been Done

### ✅ Shared Style Files Created (T044-T046)

**Created**:
1. ✅ `src/styles/_layout.scss` - Common layout patterns
2. ✅ `src/styles/_forms.scss` - Form-specific styles  
3. ✅ `src/styles/_sections.scss` - Section organization

**Imported**: ✅ All three files imported into `src/styles.scss`

### ✅ Analysis Complete (T043)

**Script Created**: `scripts/analyze-scss-duplication.sh`

**Key Findings**:
- **100 SCSS files** total
- **Duplicate classes** found:
  - `.row`: 52 duplicates
  - `.formGroup`: 25 duplicates
  - `.col`: 24 duplicates
  - `.block`: 23 duplicates
- **Hardcoded values**:
  - `10px`: 175 occurrences
  - `15px`: 150 occurrences
  - `24px`: 96 occurrences
  - Colors: 47+ hardcoded color values
- **Good news**: Already using design tokens!
  - `var(--spacing-*)`: 1068 uses
  - `var(--color-*)`: 301 uses

### ✅ Example Cleanup (T048)

**File**: `settings/about/about.component.scss`

**Removed Duplicates**:
- `.outerCol` definition (now in _layout.scss)
- `.outerColSmall` definition (now in _layout.scss)
- `.block` definition (now in _layout.scss)
- `.section-header` definition (now in _layout.scss)
- `.formGroup` definition (now in _layout.scss)

**Migrated to Design Tokens**:
- `gap: 24px` → `gap: var(--spacing-6, 24px)`
- `padding: 24px` → `padding: var(--spacing-6, 24px)`

**Result**: Cleaner component SCSS, duplicates removed

---

## Shared Styles Now Available

### Layout Classes (_layout.scss)

```scss
.formGroup      // Form field container
.row            // Horizontal flex layout
.col            // Column layout (flex: 1)
.col2row        // Two-column row layout
.row3col        // Three-column row layout
.block          // Content block with shadow
.outerBlock     // Outer block with background
.inputBox       // Input wrapper with label
.section        // Page section
.section-header // Section header with title/description
.container      // Main container
.btnHolder      // Button container
.btnRow         // Button row
```

### Form Classes (_forms.scss)

```scss
.formBlock      // Form container
.authBlock      // Auth form wrapper
.form-label     // Field labels
.error-message  // Error display
.success-message // Success display
.form-actions   // Form button row
```

### Section Classes (_sections.scss)

```scss
.inner-page     // Page wrapper
.leftCol        // Left column
.rightCol       // Right column
.outerCol       // Outer column
.outerColSmall  // Small outer column
```

---

## How to Clean Up Component SCSS Files

### Step 1: Identify Duplicates

**For each component SCSS file**:

1. Look for definitions of: `.formGroup`, `.row`, `.col`, `.block`, `.section-header`
2. These are now in `_layout.scss` - remove them from component
3. Keep only component-specific styles

### Step 2: Replace with Shared Classes

**BEFORE** (in component.scss):
```scss
.formGroup {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block {
  background: #ffffff;
  padding: 24px;
  border-radius: 8px;
}

// Unique component style
.my-special-element {
  color: red;
}
```

**AFTER** (in component.scss):
```scss
// .formGroup removed - now in _layout.scss
// .block removed - now in _layout.scss

// Keep only unique component styles
.my-special-element {
  color: red;
}
```

### Step 3: Migrate Hardcoded Values to Design Tokens

**BEFORE**:
```scss
.element {
  padding: 24px;
  gap: 15px;
  background-color: #f3f4f5;
  color: #2e3646;
}
```

**AFTER**:
```scss
.element {
  padding: var(--spacing-6, 24px);
  gap: var(--spacing-4, 16px);  // Note: 15px → 16px for consistency
  background-color: var(--color-grey-100, #f3f4f5);
  color: var(--color-text-primary, #2e3646);
}
```

### Step 4: Test After Changes

After cleaning each file:
1. Save the file
2. Check that Angular rebuild succeeds
3. Navigate to the component in browser
4. Verify visual appearance unchanged
5. Test component functionality

---

## Design Token Reference

### Spacing Tokens

```scss
var(--spacing-1)  // 4px
var(--spacing-2)  // 8px
var(--spacing-3)  // 12px
var(--spacing-4)  // 16px
var(--spacing-5)  // 20px
var(--spacing-6)  // 24px
var(--spacing-8)  // 32px
```

### Common Mappings

| Hardcoded | Token | Value |
|-----------|-------|-------|
| 10px | var(--spacing-3, 12px) | 12px (standardized) |
| 12px | var(--spacing-3) | 12px |
| 15px | var(--spacing-4, 16px) | 16px (standardized) |
| 16px | var(--spacing-4) | 16px |
| 20px | var(--spacing-5) | 20px |
| 24px | var(--spacing-6) | 24px |
| 32px | var(--spacing-8) | 32px |

### Color Tokens

```scss
// Backgrounds
var(--color-grey-50)      // #fafafa
var(--color-grey-100)     // #f3f4f5
var(--color-grey-600)     // Medium grey

// Text
var(--color-text-primary)   // #1f2937 or #2e3646
var(--color-text-secondary) // #374151
var(--color-text-muted)     // #6b7280

// Brand
var(--color-secondary)  // #16d3d2 (teal)
var(--color-primary)    // Primary brand color

// States
var(--color-success)  // #388e3c (green)
var(--color-error)    // #d32f2f (red)
var(--color-warning)  // #f57c00 (orange)
```

---

## Incremental Cleanup Strategy

### Priority Order

**Batch 1: High-Traffic Components** (Do First)
- dashboard/
- settings/
- menus/
- restaurant/

**Batch 2: Medium-Traffic Components**
- specials/
- manage-users/
- media-library/

**Batch 3: Lower-Traffic Components**
- help/
- reviews/
- qr-codes/

**Batch 4: Shared Components**
- shared/ (be careful - affects many pages)

### Time Estimate

- **Per File**: 5-10 minutes
- **Total (100 files)**: 8-16 hours
- **Incremental approach**: Do 5-10 files per session

### Safety Approach

**For each batch**:
1. Clean 5-10 files
2. Test build (`ng build`)
3. Navigate to affected pages
4. Verify no visual regressions
5. Commit changes
6. Continue to next batch

---

## Files Already Cleaned

- ✅ `settings/about/about.component.scss` - Duplicates removed, tokens added

---

## Files Needing Cleanup (by duplication count)

### High Duplication (Priority)

**formGroup duplicates** (25 files):
```
src/app/components/manage-users/manage-users.component.scss
src/app/components/manage-users/add-user-dialog/add-user-dialog.component.scss
src/app/components/manage-users/view-users/view-users.component.scss
src/app/components/manage-users/user-form/user-form.component.scss
src/app/components/verify-email/verify-email.component.scss
src/app/components/restaurant/edit-restaurant/edit-restaurant.component.scss
src/app/components/restaurant/add/add.component.scss
src/app/components/restaurant/restaurant-form/restaurant-form.component.scss
src/app/components/qr-codes/qr-codes.component.scss
src/app/components/forgot-password/new-password/new-password.component.scss
... (15 more files)
```

**Hardcoded #f3f4f5** (20 files):
```
src/app/components/help/help/help.component.scss
src/app/components/restaurant/view/view.component.scss
src/app/components/restaurant/edit-restaurant/edit-restaurant.component.scss
src/app/components/restaurant/add/add.component.scss
src/app/components/restaurant/restaurant-form/restaurant-form.component.scss
src/app/components/dashboard/dashboard.component.scss
src/app/components/menus/shared/menu-shared.scss
src/app/components/settings/general/general.component.scss
src/app/components/specials/edit-special/edit-special.component.scss
src/app/components/specials/add-special/add-special.component.scss
... (10 more files)
```

---

## Expected Results

### Bundle Size Reduction

**Baseline**: 196 KB  
**Target**: 157-166 KB (15-20% reduction)  
**Expected Savings**: 30-39 KB

**How**:
- Removing 133+ duplicate class definitions
- Consolidating common patterns
- Using single source for layout styles

### Maintainability

**Before**:
- Change layout pattern → Edit 52 files (.row duplicates)
- Change form spacing → Edit 25 files (.formGroup duplicates)
- Update color → Find all hardcoded values

**After**:
- Change layout pattern → Edit _layout.scss (one file)
- Change form spacing → Edit _layout.scss (one file)
- Update color → Edit design tokens (one file)

---

## Testing Strategy

### After Each Batch

1. **Build Test**:
   ```bash
   ng build
   # Should succeed with no errors
   ```

2. **Visual Test**:
   - Navigate to each affected component
   - Verify appearance unchanged
   - Check responsive behavior

3. **Bundle Size Check**:
   ```bash
   du -h dist/hungr-backend/browser/*.css
   # Should see gradual reduction
   ```

### Final Verification

After all files cleaned:

1. **Full Build**:
   ```bash
   ng build --configuration=production
   ```

2. **Bundle Analysis**:
   ```bash
   du -h dist/hungr-backend/browser/styles-*.css
   # Compare with baseline (196 KB)
   # Target: 157-166 KB
   ```

3. **Visual Regression**:
   - Navigate every page
   - Check for style differences
   - Verify responsive behavior

---

## Automation Opportunity

### Find & Replace Script (Future)

Could create script to automate common replacements:

```bash
#!/bin/bash
# Replace hardcoded values in SCSS files

# Replace common spacing
sed -i 's/:\s*24px/: var(--spacing-6, 24px)/g' $1
sed -i 's/:\s*16px/: var(--spacing-4, 16px)/g' $1
sed -i 's/:\s*12px/: var(--spacing-3, 12px)/g' $1

# Replace common colors
sed -i 's/#f3f4f5/var(--color-grey-100, #f3f4f5)/g' $1
sed -i 's/#2e3646/var(--color-text-primary, #2e3646)/g' $1
```

**Caution**: Review changes manually, some values may be intentional

---

## Next Steps

### Immediate (Completed)

- ✅ Create shared style files
- ✅ Import into main styles.scss  
- ✅ Clean 1 example file (about.component.scss)
- ✅ Verify build still works

### Remaining (62 tasks → Can be incremental)

**This Week**:
- Clean 20 high-priority files (4 hours)
- Replace hardcoded colors in those files (2 hours)
- Test and verify (1 hour)

**Next Week**:
- Clean remaining 80 files (8 hours)
- Complete design token migration (4 hours)
- Final testing and bundle measurement (2 hours)

**Or**:
- Do 5-10 files per day incrementally
- Each session: 30-60 minutes
- Complete over 2-3 weeks

---

## Quick Reference Commands

### Find Duplicates

```bash
# Find .formGroup duplicates
grep -r "\.formGroup\s*{" src/app/components --include="*.scss" -l

# Find hardcoded colors
grep -r "#f3f4f5\|#2e3646" src/app/components --include="*.scss" -l

# Count design token usage
grep -r "var(--" src/app/components --include="*.scss" | wc -l
```

### Check Build

```bash
ng build
# OR for production
ng build --configuration=production
```

### Measure Bundle Size

```bash
du -h dist/hungr-backend/browser/styles-*.css
```

---

## Success Criteria

- [ ] 0 duplicate `.formGroup` definitions (currently 25)
- [ ] 0 duplicate `.row` definitions (currently 52)
- [ ] 0 duplicate `.block` definitions (currently 23)
- [ ] < 20 hardcoded color values (currently 47+)
- [ ] < 50 hardcoded spacing values (currently 421)
- [ ] CSS bundle: 157-166 KB (currently 196 KB)
- [ ] No visual regressions
- [ ] Build successful

---

## Tips & Best Practices

### When to Extract to Shared

**Extract if**:
- Class appears in 3+ components
- Pattern is exactly the same
- Part of common UI pattern (forms, layouts, sections)

**Keep in component if**:
- Unique to that component
- Variations of a pattern
- Component-specific overrides

### How to Extend Shared Classes

**If you need slight modifications**:

```scss
// Don't redefine, extend with specificity
.formGroup {
  // Shared styles apply automatically from _layout.scss
  
  // Add component-specific additions
  margin-bottom: var(--spacing-6); // Override shared value
  
  .custom-child {
    // Component-specific child styles
  }
}
```

### Testing Each Change

1. Save file
2. Watch Angular rebuild (should succeed)
3. Refresh browser
4. Check component appearance
5. Test component functionality

**If something breaks**: Revert, investigate, fix

---

## Current Status

**Completed**:
- ✅ T043: Analysis (duplication report)
- ✅ T044: Created _layout.scss
- ✅ T045: Created _forms.scss
- ✅ T046: Created _sections.scss
- ✅ T047: Imported shared files
- ✅ T048: Cleaned about.component.scss (example)

**Remaining**: T049-T068 (20 tasks)
- Component SCSS cleanup (batches)
- Design token migration (batches)
- Final verification

**Progress**: 6/26 tasks complete (23%)

**Estimated to Complete Phase 6**: 8-16 hours (can be incremental)

---

## Bundle Size Projection

**Current**: 196 KB  
**After extracting duplicates**: ~175 KB (-11%)  
**After design token migration**: ~165 KB (-16%)  
**After full optimization**: ~160 KB (-18%)

**On Track**: Yes! Should achieve 15-20% target ✅

---

**Created**: October 21, 2025  
**Next Review**: After next batch of cleanups  
**Maintained By**: Development Team












