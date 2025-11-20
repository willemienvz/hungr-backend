import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl  } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import {  Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../shared/services/auth.service';
import { Router } from '@angular/router';
import { emailAvailabilityValidator } from '../../../shared/validators/email-availability.validator';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss'
})
export class Step1Component  implements OnInit, OnDestroy{
  step1Form: FormGroup;
  showPassword: boolean = false;
  showPasswordConf: boolean = false;
  private confirmPwdSubscription!: Subscription;
  private emailSubscription!: Subscription;
  @Output() next: EventEmitter<any> = new EventEmitter<any>();
  constructor(private router: Router, public authService: AuthService, private fb: FormBuilder, private formDataService: FormDataService,  private toastr: ToastrService) {
    this.step1Form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(10)]],
      userPwdConfrim: ['', Validators.required],
      userEmail: [
        '', 
        [Validators.required, Validators.email]
        // Async validator will be added on blur or form submission
      ],
      cellphone: ['+27', [Validators.required, this.cellphoneValidator.bind(this)]],
  }, {
      validator: this.passwordMatchValidator 
  });
  }
  ngOnInit(): void {
    const existingData = this.formDataService.getFormData();
    if (existingData) {
      this.step1Form.patchValue(existingData);
    }

    this.confirmPwdSubscription = this.step1Form.get('userPwdConfrim')!.valueChanges.subscribe(() => {
      this.passwordMatchValidator(this.step1Form);
    });
  
    this.step1Form.get('password')!.valueChanges.subscribe(() => {
      this.isPasswordValid();
    });

    // Set up debounced email validation on blur or after user stops typing
    const emailControl = this.step1Form.get('userEmail');
    if (emailControl) {
      // Clear async validation errors when user changes email
      this.emailSubscription = emailControl.valueChanges
        .pipe(
          debounceTime(800), // Wait 800ms after user stops typing
          distinctUntilChanged() // Only validate if value actually changed
        )
        .subscribe(() => {
          // Clear previous async validation errors
          const errors = emailControl.errors;
          if (errors && (errors['emailInUse'] || errors['emailCheckFailed'])) {
            const newErrors: any = { ...errors };
            delete newErrors['emailInUse'];
            delete newErrors['emailCheckFailed'];
            const hasOtherErrors = Object.keys(newErrors).length > 0;
            emailControl.setErrors(hasOtherErrors ? newErrors : null, { emitEvent: false });
          }
          
          // Only validate if field is touched (user has interacted with it)
          if (emailControl.touched && emailControl.value && !emailControl.hasError('email') && !emailControl.hasError('required')) {
            // Add async validator and trigger validation
            emailControl.setAsyncValidators([emailAvailabilityValidator(this.authService)]);
            emailControl.updateValueAndValidity();
          }
        });
    }

    this.step1Form.get('cellphone')!.valueChanges.subscribe((value) => {
      this.step1Form.get('cellphone')!.setValue(this.formatCellphone(value), { emitEvent: false });
    });
  }

  onCellphoneKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const input = event.target as HTMLInputElement;
    const currentValue = input.value || '';
    
    // Allow control keys: backspace, delete, tab, escape, enter, arrow keys, home, end
    const controlKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (controlKeys.includes(key)) {
      return;
    }
    
    // Allow Ctrl/Cmd + A, C, V, X, Z
    if (event.ctrlKey || event.metaKey) {
      if (['a', 'c', 'v', 'x', 'z'].includes(key.toLowerCase())) {
        return;
      }
    }
    
    // Get current digits count (excluding +27 and spaces)
    const digitsOnly = currentValue.replace(/\D/g, '');
    const digitsAfter27 = digitsOnly.startsWith('27') ? digitsOnly.substring(2) : digitsOnly;
    
    // Prevent if already have 9 digits after +27 (12 total)
    if (digitsAfter27.length >= 9) {
      event.preventDefault();
      return;
    }
    
    // Only allow digits
    if (!/^\d$/.test(key)) {
      event.preventDefault();
      return;
    }
  }

  onCellphonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const pastedText = event.clipboardData?.getData('text') || '';
    
    // Extract only digits from pasted text
    const digitsOnly = pastedText.replace(/\D/g, '');
    
    // Get current value and extract digits
    const currentValue = input.value || '';
    const currentDigitsOnly = currentValue.replace(/\D/g, '');
    const currentDigitsAfter27 = currentDigitsOnly.startsWith('27') ? currentDigitsOnly.substring(2) : currentDigitsOnly;
    
    // Calculate how many digits we can add (max 9 total after +27)
    const remainingSlots = 9 - currentDigitsAfter27.length;
    const digitsToAdd = digitsOnly.substring(0, remainingSlots);
    
    // Combine current digits with new digits
    let newDigits = '';
    if (currentDigitsOnly.startsWith('27')) {
      newDigits = '27' + currentDigitsAfter27 + digitsToAdd;
    } else {
      newDigits = '27' + (currentDigitsOnly.length > 0 ? currentDigitsOnly : '') + digitsToAdd;
    }
    
    // Format and set the value
    const formatted = this.formatCellphone('+' + newDigits);
    this.step1Form.get('cellphone')!.setValue(formatted);
  }

  formatCellphone(value: string): string {
    if (!value) {
      return '+27';
    }
    
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Extract digits after +27 (skip first 2 digits if they are 27, otherwise use all digits)
    let number = '';
    if (digitsOnly.startsWith('27')) {
      // If starts with 27, take digits after it (max 9 digits)
      number = digitsOnly.substring(2, 11); // Limit to 9 digits
    } else {
      // If doesn't start with 27, use all digits (max 9)
      number = digitsOnly.substring(0, 9); // Limit to 9 digits
    }
    
    // Build formatted string: +27 XX XXX XXXX
    let formatted = '+27';
    
    if (number.length > 0) {
      formatted += ' ' + number.substring(0, 2);
    }
    if (number.length > 2) {
      formatted += ' ' + number.substring(2, 5);
    }
    if (number.length > 5) {
      formatted += ' ' + number.substring(5, 9);
    }
    
    return formatted;
  }

  cellphoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = (control.value || '').replace(/\s/g, '');
    const validCellphonePattern = /^\+27\d{9}$/;
    if (!validCellphonePattern.test(value)) {
      return { invalidCellphone: true };
    }
    return null;
  }
  ngOnDestroy(): void {
    if (this.confirmPwdSubscription) {
      this.confirmPwdSubscription.unsubscribe();
    }
    if (this.emailSubscription) {
      this.emailSubscription.unsubscribe();
    }
  }
  
  onEmailBlur(): void {
    // Trigger email validation when user blurs the field
    const emailControl = this.step1Form.get('userEmail');
    if (emailControl && emailControl.value && !emailControl.hasError('email') && !emailControl.hasError('required')) {
      emailControl.markAsTouched();
      // Add async validator and trigger validation
      emailControl.setAsyncValidators([emailAvailabilityValidator(this.authService)]);
      emailControl.updateValueAndValidity();
    }
  }
  get passwordControl(): AbstractControl | null {
    return this.step1Form.get('password');
  }

  get passwordConfirm(): AbstractControl | null {
    return this.step1Form.get('userPwdConfrim');
  }

  isPasswordMismatch(): boolean {
    const passwordControl = this.step1Form.get('password');
    const passwordConfirm = this.step1Form.get('userPwdConfrim');
    return passwordControl && passwordConfirm ? passwordControl.value !== passwordConfirm.value : false;
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const passwordControl = formGroup.get('password');
    const passwordConfirm = formGroup.get('confirmPassword');

    if (passwordControl && passwordConfirm) {
      const isMismatch = passwordControl.value !== passwordConfirm.value;
      passwordConfirm.setErrors(isMismatch ? { 'mismatch': true } : null);
    }
  }
  


isLengthValid(): boolean {
    const passwordControl = this.passwordControl;
    return passwordControl ? passwordControl.value.length >= 10 : false;
}

isUppercaseValid(): boolean {
    const passwordControl = this.passwordControl;
    return passwordControl ? /[A-Z]/.test(passwordControl.value) : false;
}

isSpecialCharValid(): boolean {
    const passwordControl = this.passwordControl;
    return passwordControl ? /[!@#$%^&*(),.?":{}|<>]/.test(passwordControl.value) : false;
}

isLowercaseValid(): boolean {
    const passwordControl = this.passwordControl;
    return passwordControl ? /[a-z]/.test(passwordControl.value) : false;
}

isNumberValid(): boolean {
    const passwordControl = this.passwordControl;
    return passwordControl ? /\d/.test(passwordControl.value) : false;
}

isPasswordValid(): boolean {
    return this.isLengthValid() && this.isUppercaseValid() && this.isSpecialCharValid()
        && this.isLowercaseValid() && this.isNumberValid();
}

togglePasswordVisibility(): void {
  this.showPassword = !this.showPassword;
}

togglePasswordConfirmVisibility(): void {
  this.showPasswordConf = !this.showPasswordConf;
}

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
      return 'This email is already registered. Sign in or try a different email.';
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

private getFieldLabel(fieldName: string): string {
  const labels: { [key: string]: string } = {
    'firstName': 'First name',
    'lastName': 'Surname',
    'userEmail': 'Email',
    'cellphone': 'Cellphone number',
    'password': 'Password',
    'userPwdConfrim': 'Confirm Password'
  };
  return labels[fieldName] || fieldName;
}
  async onNext() {
    // Mark all fields as touched to show validation errors
    Object.keys(this.step1Form.controls).forEach(key => {
      this.step1Form.get(key)?.markAsTouched();
    });
    
    // Trigger async validation for email field if it has a value
    const emailControl = this.step1Form.get('userEmail');
    if (emailControl && emailControl.value && !emailControl.hasError('email') && !emailControl.hasError('required')) {
      // Mark as dirty and touched to ensure validation runs
      emailControl.markAsDirty();
      emailControl.markAsTouched();
      // Add async validator and trigger validation
      emailControl.setAsyncValidators([emailAvailabilityValidator(this.authService)]);
      emailControl.updateValueAndValidity();
    }
    
    // Wait for async validation to complete
    let waitCount = 0;
    while (this.step1Form.pending && waitCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
    
    // Also wait for email control specifically
    if (emailControl) {
      waitCount = 0;
      while (emailControl.pending && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
    }
    
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
}
