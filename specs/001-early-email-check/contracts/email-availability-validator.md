# Contract: Email Availability Validator

**Feature**: Early Email Validation in Registration  
**Date**: 2025-01-27  
**Type**: Angular Async Validator

## Interface

```typescript
import { AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';

/**
 * Async validator factory that checks if an email is already registered.
 * 
 * @param authService - AuthService instance for checking email availability
 * @returns AsyncValidatorFn that validates email availability
 */
export function emailAvailabilityValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    // Implementation
  };
}
```

## Behavior

### Input
- `control: AbstractControl` - Form control containing email value

### Output
- `Promise<ValidationErrors | null>`
  - Returns `{ emailInUse: true }` if email is already registered
  - Returns `{ emailCheckFailed: true }` if check fails due to network/error
  - Returns `null` if email is available (not in use)

### Validation Rules
1. If email is empty or invalid format, validator should not run (handled by sync validators)
2. Email is normalized to lowercase before checking
3. Validator calls `authService.isEmailInUse(email.toLowerCase().trim())`
4. Errors are handled gracefully - network failures return `emailCheckFailed` error

### Error Codes
- `emailInUse`: Email address is already registered in Firebase Auth
- `emailCheckFailed`: Unable to check email availability (network error, timeout, etc.)

## Usage Example

```typescript
import { FormBuilder, Validators } from '@angular/forms';
import { emailAvailabilityValidator } from '../../../shared/validators/email-availability.validator';

constructor(
  private fb: FormBuilder,
  private authService: AuthService
) {
  this.step1Form = this.fb.group({
    userEmail: [
      '', 
      [Validators.required, Validators.email],
      [emailAvailabilityValidator(this.authService)]
    ]
  });
}
```

## Dependencies
- `AuthService.isEmailInUse(email: string): Promise<boolean>`
- Angular Forms (`@angular/forms`)

## Error Handling
- Network errors: Returns `{ emailCheckFailed: true }`
- Timeout errors: Returns `{ emailCheckFailed: true }`
- Invalid email format: Should not be called (sync validator handles this)

## Performance
- Must complete within 2 seconds for 95% of requests (spec requirement)
- Should not block UI thread (async operation)

