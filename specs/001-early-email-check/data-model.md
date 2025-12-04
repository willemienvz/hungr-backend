# Data Model: Early Email Validation in Registration

**Feature**: Early Email Validation in Registration  
**Date**: 2025-01-27

## Entities

### Email Validation State

**Purpose**: Represents the state of email availability validation during registration step 1.

**Fields**:
- `email` (string, required): The email address being validated
- `isChecking` (boolean): Whether an async validation check is in progress
- `isAvailable` (boolean | null): Whether email is available (true), in use (false), or unknown (null)
- `error` (string | null): Error message if validation fails or email is in use
- `lastChecked` (Date | null): Timestamp of last validation check

**State Transitions**:
1. **Initial**: `isChecking = false`, `isAvailable = null`, `error = null`
2. **Checking**: User attempts to proceed → `isChecking = true`, `isAvailable = null`
3. **Available**: Check succeeds, email not in use → `isChecking = false`, `isAvailable = true`, `error = null`
4. **In Use**: Check succeeds, email in use → `isChecking = false`, `isAvailable = false`, `error = "This email is already registered..."`
5. **Error**: Check fails (network/timeout) → `isChecking = false`, `isAvailable = null`, `error = "Unable to check email availability..."`

**Validation Rules**:
- Email must be valid format (handled by Angular `Validators.email`)
- Email must be normalized to lowercase before checking
- Email check must complete within 2 seconds (performance requirement)
- Email check must be case-insensitive

**Relationships**:
- Part of `RegistrationFormState` (step 1 form data)
- Validated against Firebase Auth user database

---

### Registration Form State (Step 1)

**Purpose**: Represents the complete state of step 1 registration form, including email validation state.

**Fields**:
- `firstName` (string, required): User's first name
- `lastName` (string, required): User's last name
- `userEmail` (string, required): User's email address (with validation state)
- `password` (string, required): User's password (min 10 characters)
- `userPwdConfrim` (string, required): Password confirmation
- `cellphone` (string, required): User's cellphone number (format: +27 XX XXX XXXX)
- `emailValidation` (EmailValidationState): Email validation state (derived from form control state)

**Validation Rules**:
- All fields required
- Email must be valid format and available (not in use)
- Password must be at least 10 characters
- Password and confirmation must match
- Cellphone must match pattern `+27\d{9}`

**State Transitions**:
1. **Empty**: Form initialized, all fields empty
2. **Filling**: User entering data, form invalid
3. **Validating**: User attempts to proceed, async email check in progress
4. **Valid**: All validations pass, can proceed to step 2
5. **Invalid**: Validation fails (email in use, format errors, etc.), cannot proceed

**Relationships**:
- Persisted via `FormDataService` (localStorage)
- Validated against Firebase Auth for email availability
- Used to create user account in step 2/3

---

## Data Flow

### Email Validation Flow

```
User enters email → Email format validation (sync) → 
User attempts to proceed → Email availability check (async) → 
  ├─ Email available → Form valid → Proceed to step 2
  ├─ Email in use → Form invalid → Show error with log in link
  └─ Check fails → Form invalid → Show error with retry option
```

### Form State Persistence

```
Step 1 form data → FormDataService.updateFormData() → 
localStorage → Preserved on validation failure → 
Available when user corrects email and retries
```

## Validation Rules Summary

### Email Field
- **Format**: Must match email pattern (Angular `Validators.email`)
- **Availability**: Must not exist in Firebase Auth (async check)
- **Case**: Normalized to lowercase before checking
- **Timing**: Checked only when user attempts to proceed (not during typing)

### Form Submission
- **Blocking**: Form submission blocked when:
  - Form is invalid (any sync validation fails)
  - Form is pending (async email check in progress)
  - Email is in use (async validation returns error)

### Error Handling
- **Network Errors**: Display user-friendly error, allow retry
- **Timeout Errors**: Display error message, allow retry
- **Email In Use**: Display error with log in link and option to try different email

## Data Sources

### Firebase Auth
- **Purpose**: Check email availability
- **Method**: `fetchSignInMethodsForEmail(email)`
- **Returns**: Array of sign-in methods (non-empty = email in use)
- **Access**: Via `AuthService.isEmailInUse(email)`

### Local Storage
- **Purpose**: Persist form data during validation failures
- **Service**: `FormDataService`
- **Key**: Form data object stored in localStorage
- **Lifetime**: Cleared after successful registration or user navigation away

## Notes

- No new database collections or documents are created by this feature
- Email validation is ephemeral - state is not persisted beyond the registration session
- Form data persistence is handled by existing `FormDataService`
- Email availability check is read-only operation against Firebase Auth



