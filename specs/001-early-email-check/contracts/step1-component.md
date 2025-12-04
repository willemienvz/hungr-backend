# Contract: Step1Component Email Validation

**Feature**: Early Email Validation in Registration  
**Date**: 2025-01-27  
**Type**: Angular Component Interface

## Component: Step1Component

### Modified Methods

#### `onNext(): void`
**Purpose**: Handle form submission and navigation to step 2

**Behavior**:
1. Check if form is invalid or pending
2. If invalid/pending, return early (do not navigate)
3. If valid, proceed with existing navigation logic

**Contract**:
```typescript
onNext(): void {
  // Check form validity (includes async email validation)
  if (this.step1Form.invalid || this.step1Form.pending) {
    // Form validation will show errors automatically
    return;
  }
  
  // Existing logic: save form data and navigate
  const formData = this.step1Form.value;
  formData.cellphone = formData.cellphone.replace(/\s/g, '');
  this.formDataService.updateFormData(formData);
  this.router.navigate(['/register-user/step2']);
}
```

**Preconditions**:
- Form must be valid (all sync and async validations pass)
- Form must not be pending (async validation complete)

**Postconditions**:
- Form data saved to FormDataService
- Navigation to step 2 only if validation passes

---

#### `getFieldError(fieldName: string): string`
**Purpose**: Get error message for form field

**Modified Behavior**:
- Add handling for `emailInUse` error
- Add handling for `emailCheckFailed` error

**Contract**:
```typescript
getFieldError(fieldName: string): string {
  const field = this.step1Form.get(fieldName);
  if (field && field.invalid && (field.touched || field.dirty)) {
    // Existing error handling...
    
    if (field.hasError('emailInUse')) {
      return 'This email is already registered. Log in or try a different email.';
    }
    
    if (field.hasError('emailCheckFailed')) {
      return 'Unable to check email availability. Please try again.';
    }
  }
  return '';
}
```

**Error Messages**:
- `emailInUse`: "This email is already registered. Log in or try a different email."
- `emailCheckFailed`: "Unable to check email availability. Please try again."

---

### Modified Template Bindings

#### Next Button
**Current**: `[disabled]="step1Form.invalid"`  
**Updated**: `[disabled]="step1Form.invalid || step1Form.pending"`

**Purpose**: Disable button during async email validation

---

#### Email Field Error Display
**Current**: `[errorMessage]="getFieldError('userEmail')"`  
**Updated**: Same, but `getFieldError()` now handles email validation errors

**Purpose**: Display email availability errors inline with field

---

### New Properties (Optional)

#### `isEmailChecking: boolean`
**Purpose**: Track email validation state for loading indicator

**Implementation**:
```typescript
get isEmailChecking(): boolean {
  return this.step1Form.get('userEmail')?.pending ?? false;
}
```

**Usage**: Display loading spinner when `isEmailChecking === true`

---

## Form Control Configuration

### Email Field (`userEmail`)

**Current**:
```typescript
userEmail: ['', [Validators.required, Validators.email, this.emailInUseValidator.bind(this)]]
```

**Updated**:
```typescript
userEmail: [
  '', 
  [Validators.required, Validators.email],  // Sync validators
  [emailAvailabilityValidator(this.authService)]  // Async validator
]
```

**Changes**:
- Remove inline `emailInUseValidator` (replaced with async validator)
- Remove `getUsers()` call and `emailList` property (no longer needed)
- Use shared `emailAvailabilityValidator` from validators directory

---

## Dependencies

### New Dependencies
- `emailAvailabilityValidator` from `shared/validators/email-availability.validator`

### Existing Dependencies (unchanged)
- `AuthService` (already injected)
- `FormBuilder`
- `FormDataService`
- `Router`
- `ToastrService`

---

## State Management

### Form State
- `step1Form.invalid`: Form has validation errors (sync or async)
- `step1Form.pending`: Async validation in progress
- `step1Form.get('userEmail').pending`: Email check in progress
- `step1Form.get('userEmail').hasError('emailInUse')`: Email is in use
- `step1Form.get('userEmail').hasError('emailCheckFailed')`: Email check failed

### Removed State
- `emailList: string[]` - No longer needed (using Firebase Auth directly)
- `emailInUse: boolean` - Replaced with form control error state

---

## Error Display

### Email In Use Error
- **Message**: "This email is already registered. Log in or try a different email."
- **Display**: Inline with email field via `app-form-input` component
- **Action**: User can click "Log in" link to navigate to sign-in page
- **Recovery**: User can change email and retry

### Email Check Failed Error
- **Message**: "Unable to check email availability. Please try again."
- **Display**: Inline with email field
- **Recovery**: User can attempt to proceed again (retry)

---

## Navigation

### Blocked Navigation
- Navigation to step 2 is blocked when:
  - Form is invalid (`step1Form.invalid === true`)
  - Form is pending (`step1Form.pending === true`)
  - Email is in use (`userEmail` has `emailInUse` error)

### Allowed Navigation
- Navigation to step 2 allowed when:
  - Form is valid (`step1Form.valid === true`)
  - Form is not pending (`step1Form.pending === false`)
  - All validations pass (sync and async)



