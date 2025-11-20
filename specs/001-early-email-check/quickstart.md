# Quickstart: Early Email Validation in Registration

**Feature**: Early Email Validation in Registration  
**Date**: 2025-01-27

## Overview

This guide helps developers quickly understand and implement early email validation in the registration step 1 component. The feature validates email availability when users attempt to proceed to step 2, preventing duplicate registrations and improving user experience.

## Prerequisites

- Angular 17+ installed
- Firebase project configured
- Access to `AuthService` with `isEmailInUse()` method
- Understanding of Angular reactive forms and async validators

## Architecture Overview

```
User attempts to proceed to step 2
    ↓
Step1Component.onNext()
    ↓
Form validation (sync + async)
    ↓
emailAvailabilityValidator (async)
    ↓
AuthService.isEmailInUse(email)
    ↓
Firebase Auth.fetchSignInMethodsForEmail(email)
    ↓
Return validation result
    ├─ Email available → Allow navigation
    ├─ Email in use → Block navigation, show error
    └─ Check failed → Block navigation, show error
```

## Implementation Steps

### Step 1: Create Email Availability Validator

**File**: `src/app/shared/validators/email-availability.validator.ts`

```typescript
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { AuthService } from '../services/auth.service';

export function emailAvailabilityValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    const email = control.value;
    
    // Don't validate if email is empty or invalid format (handled by sync validators)
    if (!email || !control.hasError('email')) {
      return Promise.resolve(null);
    }
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check email availability
    return authService.isEmailInUse(normalizedEmail)
      .then(isInUse => {
        if (isInUse) {
          return { emailInUse: true };
        }
        return null;
      })
      .catch(error => {
        console.error('Error checking email availability:', error);
        return { emailCheckFailed: true };
      });
  };
}
```

---

### Step 2: Update Step1Component

**File**: `src/app/components/sign-up/step1/step1.component.ts`

#### 2.1 Import Validator

```typescript
import { emailAvailabilityValidator } from '../../../shared/validators/email-availability.validator';
```

#### 2.2 Update Form Configuration

**Remove**:
- `emailList: string[] = []`
- `emailInUse: boolean = false`
- `getUsers()` method
- `emailInUseValidator` method
- `checkEmailInUse()` method
- `getUsers()` call in `ngOnInit()`
- `userEmail` valueChanges subscription

**Update form group**:
```typescript
this.step1Form = this.fb.group({
  firstName: ['', Validators.required],
  lastName: ['', Validators.required],
  password: ['', [Validators.required, Validators.minLength(10)]],
  userPwdConfrim: ['', Validators.required],
  userEmail: [
    '', 
    [Validators.required, Validators.email],
    [emailAvailabilityValidator(this.authService)]  // Async validator
  ],
  cellphone: ['+27', [Validators.required, this.cellphoneValidator.bind(this)]],
}, {
  validator: this.passwordMatchValidator 
});
```

#### 2.3 Update onNext() Method

```typescript
onNext() {
  // Check form validity (includes async email validation)
  if (this.step1Form.invalid || this.step1Form.pending) {
    // Form validation will show errors automatically
    return;
  }
  
  if (this.isPasswordMismatch()) {
    this.toastr.error('Passwords do not match');
    return;
  }
  
  const formData = this.step1Form.value;
  formData.cellphone = formData.cellphone.replace(/\s/g, '');
  this.formDataService.updateFormData(formData);
  this.router.navigate(['/register-user/step2']);
}
```

#### 2.4 Update getFieldError() Method

```typescript
getFieldError(fieldName: string): string {
  const field = this.step1Form.get(fieldName);
  if (field && field.invalid && (field.touched || field.dirty)) {
    if (field.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required.`;
    }
    if (field.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (field.hasError('emailInUse')) {
      return 'This email is already registered. Log in or try a different email.';
    }
    if (field.hasError('emailCheckFailed')) {
      return 'Unable to check email availability. Please try again.';
    }
    if (field.hasError('invalidCellphone')) {
      return 'Enter a valid cellphone number (e.g., +27 12 234 5678).';
    }
    if (field.hasError('minlength')) {
      return 'Password must be at least 10 characters long.';
    }
    if (field.hasError('mismatch') && fieldName === 'userPwdConfrim') {
      return 'Passwords do not match.';
    }
  }
  return '';
}
```

---

### Step 3: Update Template

**File**: `src/app/components/sign-up/step1/step1.component.html`

#### 3.1 Update Next Button

**Change**:
```html
<button (click)="onNext()" class="hungr-btn hungr-btn-primary" [disabled]="step1Form.invalid">Next</button>
```

**To**:
```html
<button (click)="onNext()" class="hungr-btn hungr-btn-primary" [disabled]="step1Form.invalid || step1Form.pending">
  <span *ngIf="step1Form.pending">Checking...</span>
  <span *ngIf="!step1Form.pending">Next</span>
</button>
```

#### 3.2 Add Loading Indicator (Optional)

Add loading indicator to email field area:

```html
<app-form-input
  label="Email"
  type="email"
  placeholder="email@address.co.za"
  [required]="true"
  [errorMessage]="getFieldError('userEmail')"
  formControlName="userEmail">
</app-form-input>
<div *ngIf="step1Form.get('userEmail')?.pending" class="email-checking-indicator">
  <mat-spinner diameter="20"></mat-spinner>
  <span>Checking email availability...</span>
</div>
```

---

### Step 4: Add Log In Link to Error Message (Optional Enhancement)

If you want to add a clickable "Log in" link in the error message, you can:

1. Create a custom error message component, or
2. Modify the error message to include a router link

**Simple approach** - Update error message display:

```html
<div *ngIf="getFieldError('userEmail')" class="email-error-message">
  <span>{{ getFieldError('userEmail') }}</span>
  <a *ngIf="step1Form.get('userEmail')?.hasError('emailInUse')" 
     routerLink="/sign-in" 
     class="log-in-link">
    Log in
  </a>
</div>
```

---

## Testing

### Manual Testing

1. **Email Available**:
   - Enter a new email address
   - Click "Next"
   - Should proceed to step 2

2. **Email In Use**:
   - Enter an email that's already registered
   - Click "Next"
   - Should show error: "This email is already registered. Log in or try a different email."
   - Should not navigate to step 2

3. **Network Error**:
   - Disconnect network
   - Enter email and click "Next"
   - Should show error: "Unable to check email availability. Please try again."
   - Should not navigate to step 2

4. **Loading State**:
   - Enter email and click "Next"
   - Button should show "Checking..." and be disabled
   - Loading indicator should appear (if implemented)

5. **Form Data Preservation**:
   - Fill all fields
   - Enter duplicate email
   - Click "Next" (validation fails)
   - Change email to available one
   - All other fields should still be filled

### Unit Testing

Test the async validator:

```typescript
describe('emailAvailabilityValidator', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let validator: AsyncValidatorFn;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['isEmailInUse']);
    validator = emailAvailabilityValidator(authService);
  });

  it('should return null if email is available', async () => {
    authService.isEmailInUse.and.returnValue(Promise.resolve(false));
    const control = new FormControl('new@example.com');
    const result = await validator(control);
    expect(result).toBeNull();
  });

  it('should return emailInUse error if email exists', async () => {
    authService.isEmailInUse.and.returnValue(Promise.resolve(true));
    const control = new FormControl('existing@example.com');
    const result = await validator(control);
    expect(result).toEqual({ emailInUse: true });
  });

  it('should return emailCheckFailed on error', async () => {
    authService.isEmailInUse.and.returnValue(Promise.reject(new Error('Network error')));
    const control = new FormControl('test@example.com');
    const result = await validator(control);
    expect(result).toEqual({ emailCheckFailed: true });
  });
});
```

---

## Common Issues

### Issue: Validator runs on empty email

**Solution**: Validator should check if email is empty or invalid format before running:

```typescript
if (!email || control.hasError('email')) {
  return Promise.resolve(null);
}
```

### Issue: Form allows navigation during async validation

**Solution**: Check both `invalid` and `pending` states:

```typescript
if (this.step1Form.invalid || this.step1Form.pending) {
  return;
}
```

### Issue: Error message doesn't show

**Solution**: Ensure field is `touched` or `dirty`:

```typescript
if (field && field.invalid && (field.touched || field.dirty)) {
  // Show error
}
```

---

## Performance Considerations

- Email check should complete within 2 seconds (spec requirement)
- Validator only runs when user attempts to proceed (not during typing)
- Firebase Auth `fetchSignInMethodsForEmail` is optimized for this use case
- No need to cache email list (direct Firebase Auth check is efficient)

---

## Next Steps

After implementation:
1. Test all scenarios (available, in use, network error)
2. Verify form data preservation on validation failure
3. Test loading states and button disabling
4. Verify error messages display correctly
5. Test navigation blocking behavior

