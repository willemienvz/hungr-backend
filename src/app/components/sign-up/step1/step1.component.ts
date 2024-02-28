import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl  } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss'
})
export class Step1Component  implements OnInit, OnDestroy{
  step1Form: FormGroup;
  private confirmPwdSubscription!: Subscription;
  @Output() next: EventEmitter<void> = new EventEmitter<void>();
  constructor(private fb: FormBuilder, private formDataService: FormDataService) {
    this.step1Form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      password: ['', Validators.required],
      userPwdConfrim: ['', Validators.required],
  }, {
      validator: this.passwordMatchValidator 
  });
  }
  ngOnInit(): void {
    this.confirmPwdSubscription = this.step1Form.get('userPwdConfrim')!.valueChanges.subscribe(() => {
      this.passwordMatchValidator(this.step1Form);
    });
  }


  ngOnDestroy(): void {
    if (this.confirmPwdSubscription) {
      this.confirmPwdSubscription.unsubscribe();
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
    console.log('passwordControl', passwordControl?.value);
    console.log('passwordConfirm', passwordConfirm?.value);
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
  onNext() {
    if (this.isPasswordMismatch()) {
      // Handle the case where passwords don't match (e.g., display an error message)
      console.error('Passwords do not match');
      return;
  }
    this.formDataService.updateFormData(this.step1Form.value);
    this.next.emit();
  }
}
