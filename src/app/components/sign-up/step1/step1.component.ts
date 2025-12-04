import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl  } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import {  Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastService } from '../../../shared/services/toast.service';
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
  constructor(private router: Router, public authService: AuthService, private fb: FormBuilder, private formDataService: FormDataService,  private toast: ToastService) {
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
      cellphone: ['+27', Validators.required],
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
      this.toast.error('Passwords do not match');
      return;
    }
    const formData = this.step1Form.value;
    formData.cellphone = formData.cellphone.replace(/\s/g, '');
    this.formDataService.updateFormData(formData);
    this.router.navigate(['/register-user/step2']);
  }
}
