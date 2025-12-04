# Research: Early Email Validation in Registration

**Feature**: Early Email Validation in Registration  
**Date**: 2025-01-27

## Research Tasks

### 1. Firebase Auth Email Availability Checking

**Task**: Research Firebase Auth API for checking email availability

**Findings**:
- Firebase Auth provides `fetchSignInMethodsForEmail(email)` method
- Returns array of sign-in methods if email exists, empty array if email is not registered
- Method is available in Angular Fire via `AngularFireAuth.fetchSignInMethodsForEmail(email)`
- Returns Promise<string[]> - non-empty array means email is in use
- Case-insensitive by default (Firebase Auth normalizes emails)
- Network errors must be handled (timeouts, connectivity issues)

**Decision**: Use `AuthService.isEmailInUse(email)` method which already exists and uses `fetchSignInMethodsForEmail`. This method returns `Promise<boolean>` and handles errors appropriately.

**Rationale**: 
- Existing method in codebase already implements the correct Firebase Auth API
- Follows DRY principle - no need to duplicate logic
- Method signature matches requirements (async, returns boolean)
- Error handling already implemented

**Alternatives Considered**:
- Direct Firestore query: Rejected - spec requires checking Firebase Auth, not Firestore
- Creating new service method: Rejected - existing method already exists and works correctly
- Real-time validation during typing: Rejected - spec requires validation only on form submission to prevent enumeration attacks

---

### 2. Angular Async Validator Pattern

**Task**: Research Angular async validator patterns for form validation

**Findings**:
- Angular reactive forms support async validators via `AsyncValidatorFn`
- Async validators return `Promise<ValidationErrors | null>` or `Observable<ValidationErrors | null>`
- Validators can be added to form controls via third parameter in `FormBuilder.group()` or `FormControl` constructor
- Async validators run after sync validators complete
- Form control shows `pending` state while async validator is running
- Validators should handle errors gracefully and return appropriate error objects

**Decision**: Create async validator `emailAvailabilityValidator` that:
- Takes `AuthService` as dependency (via factory function)
- Returns `AsyncValidatorFn` that calls `authService.isEmailInUse(email)`
- Returns `{ emailInUse: true }` if email exists, `null` if available
- Handles errors by returning `{ emailCheckFailed: true }` for network issues

**Rationale**:
- Follows Angular best practices for async validation
- Integrates seamlessly with existing reactive forms
- Provides proper error states for UI feedback
- Can be reused if needed in other forms

**Alternatives Considered**:
- Inline validation in component: Rejected - violates separation of concerns, harder to test
- Custom validator in component: Rejected - async validators should be in shared validators directory for reusability
- Synchronous validator with manual check: Rejected - Firebase Auth check is async, must use async validator

---

### 3. Form Submission Blocking Pattern

**Task**: Research how to prevent form navigation when async validation fails

**Findings**:
- Angular forms have `invalid` and `pending` states
- Form is `invalid` when any validator (sync or async) returns errors
- Form is `pending` when async validators are running
- Navigation should be blocked when form is `invalid` or `pending`
- Button should be disabled: `[disabled]="step1Form.invalid || step1Form.pending"`
- Component method should check form validity before proceeding: `if (this.step1Form.invalid) return;`

**Decision**: 
- Disable "Next" button when form is invalid or pending
- Check form validity in `onNext()` method before navigation
- Display loading indicator when form is pending (async validation in progress)
- Show error message when email is in use (from validator error)

**Rationale**:
- Standard Angular pattern for form validation
- Provides clear user feedback (disabled button, loading state, error messages)
- Prevents navigation with invalid data
- Matches existing form patterns in the codebase

**Alternatives Considered**:
- Allow navigation and check in route guard: Rejected - violates spec requirement to check on step 1
- Check only in component method: Rejected - form validation should be declarative, not imperative
- Custom navigation guard: Rejected - overcomplicated, form validation is sufficient

---

### 4. Error Message Display Pattern

**Task**: Research Angular Material error message display patterns

**Findings**:
- Angular Material form fields support `mat-error` for displaying validation errors
- Custom form input component `app-form-input` already exists and accepts `[errorMessage]` input
- Error messages should be displayed when field is `invalid` and `touched` or `dirty`
- Component already has `getFieldError()` method that handles error message display
- Error message should include actionable options (log in link, try different email)

**Decision**: 
- Extend `getFieldError()` method to handle `emailInUse` and `emailCheckFailed` errors
- Error message for `emailInUse`: "This email is already registered. [Log in] or try a different email."
- Error message for `emailCheckFailed`: "Unable to check email availability. Please try again."
- Add clickable link/button in error message that navigates to `/sign-in` route

**Rationale**:
- Uses existing error display infrastructure
- Consistent with current form validation patterns
- Provides clear, actionable feedback to users
- Matches spec requirements for error messaging

**Alternatives Considered**:
- Toast notification only: Rejected - spec requires inline error message with form field
- Separate error component: Rejected - existing error display pattern is sufficient
- Modal dialog: Rejected - too intrusive, inline error is better UX

---

### 5. Loading State Management

**Task**: Research loading state patterns for async form validation

**Findings**:
- Angular forms expose `pending` state when async validators are running
- Can check `formControl.pending` or `formGroup.pending` to show loading indicators
- Material Design provides `mat-spinner` for loading indicators
- Loading should be shown inline with form field or on submit button
- Button should be disabled during loading to prevent multiple submissions

**Decision**:
- Use `step1Form.pending` to detect async validation in progress
- Display loading spinner on "Next" button or inline with email field when pending
- Disable "Next" button when form is pending: `[disabled]="step1Form.invalid || step1Form.pending"`
- Show loading indicator in email field area when `userEmail` control is pending

**Rationale**:
- Standard Angular reactive forms pattern
- Provides clear visual feedback during async operations
- Prevents user confusion about form state
- Matches spec requirement for loading indicators

**Alternatives Considered**:
- No loading indicator: Rejected - spec requires loading feedback (FR-011)
- Full-page loading overlay: Rejected - too intrusive for form validation
- Toast notification: Rejected - inline feedback is better UX

---

### 6. Case-Insensitive Email Handling

**Task**: Research case-insensitive email validation patterns

**Findings**:
- Firebase Auth normalizes emails to lowercase automatically
- Email addresses are case-insensitive by RFC 5321 standard
- Angular email validator (`Validators.email`) is case-sensitive in pattern matching but emails themselves are case-insensitive
- Best practice: Normalize email to lowercase before validation and storage
- User input can be in any case, but should be normalized before checking

**Decision**: 
- Normalize email to lowercase before calling `isEmailInUse()`
- Use `email.toLowerCase().trim()` before validation
- Firebase Auth will handle case-insensitivity, but normalization ensures consistency

**Rationale**:
- Follows email standards (RFC 5321)
- Ensures consistent behavior regardless of user input case
- Firebase Auth handles this, but explicit normalization is clearer
- Matches spec requirement for case-insensitive checking (FR-009)

**Alternatives Considered**:
- Case-sensitive checking: Rejected - violates spec requirement and email standards
- Rely only on Firebase Auth normalization: Accepted as fallback, but explicit normalization is better

---

## Summary

All research tasks completed. Key decisions:
1. Use existing `AuthService.isEmailInUse()` method
2. Create async validator `emailAvailabilityValidator` in shared validators
3. Block form navigation when form is invalid or pending
4. Extend existing error display pattern with actionable error messages
5. Use form `pending` state for loading indicators
6. Normalize email to lowercase before validation

No unresolved clarifications remain. Ready for Phase 1 design.



