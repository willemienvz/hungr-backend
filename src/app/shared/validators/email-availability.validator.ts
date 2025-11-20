import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { AuthService } from '../services/auth.service';

/**
 * Async validator factory that checks if an email is already registered.
 * 
 * @param authService - AuthService instance for checking email availability
 * @returns AsyncValidatorFn that validates email availability
 */
export function emailAvailabilityValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Promise<ValidationErrors | null> | null => {
    const email = control.value;
    
    // Don't validate if email is empty
    if (!email || !email.trim()) {
      return Promise.resolve(null);
    }
    
    // Don't validate if email format is invalid (let sync validators handle this)
    // Check if control has email format error from sync validators
    if (control.hasError('email') || control.hasError('required')) {
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
        console.error('EmailAvailabilityValidator: Error checking email availability:', error);
        return { emailCheckFailed: true };
      });
  };
}

