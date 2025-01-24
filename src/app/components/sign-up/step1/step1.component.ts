import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl  } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import {  Subscription } from 'rxjs';
import { dateInFutureValidator } from '../../../shared/validators/custom-validators'; 
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss'
})
export class Step1Component  implements OnInit, OnDestroy{
  step1Form: FormGroup;
  showPassword: boolean = false;
  emailList: string[] = [];
  emailInUse: boolean = false;
  showPasswordConf: boolean = false;
  private confirmPwdSubscription!: Subscription;
  @Output() next: EventEmitter<any> = new EventEmitter<any>();
  constructor(private firestore: AngularFirestore, public authService: AuthService,private fb: FormBuilder, private formDataService: FormDataService,  private toastr: ToastrService) {
    this.step1Form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(10)]],
      userPwdConfrim: ['', Validators.required],
      userEmail: ['', [Validators.required, Validators.email, this.emailInUseValidator.bind(this)]],
      cellphone: ['', [Validators.required, this.cellphoneValidator]],
  }, {
      validator: this.passwordMatchValidator 
  });
  }
  ngOnInit(): void {
    this.getUsers();
    this.confirmPwdSubscription = this.step1Form.get('userPwdConfrim')!.valueChanges.subscribe(() => {
      this.passwordMatchValidator(this.step1Form);
    });
  
    this.step1Form.get('password')!.valueChanges.subscribe(() => {
      this.isPasswordValid();
    });

    this.step1Form.get('userEmail')!.valueChanges.subscribe((email) => {
     if (this.checkEmailInUse(email)){
      this.emailInUse = true;
     }else{
      this.emailInUse = false;
     }
    });
  }
  checkEmailInUse(email: string): boolean {
    return this.emailList.includes(email);
  }
getUsers(){
  this.firestore
  .collection('users') 
  .valueChanges()
  .pipe(
    map((users: any[]) => users.map(user => user.email)) 
  )
  .subscribe({
    next: (emails: string[]) => {
      this.emailList = emails; 
      console.log('Emails:', emails); 
    },
    error: (error) => {
      console.error('Error fetching emails:', error);
    },
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
  emailInUseValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const email = control.value;
    if (this.checkEmailInUse(email)) {
      return { emailInUse: true }; 
    }
    return null;
  }
  cellphoneValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value || '';
    const validCellphonePattern = /^\+27\s?\(?\d{2}\)?\s?\d{3}\s?\d{4}$/; // South Africa format: +27 (XX) XXX XXXX
    if (!validCellphonePattern.test(value)) {
      return { invalidCellphone: true };
    }
    return null;
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
  onNext() {
    if (this.isPasswordMismatch()) {
      this.toastr.error('Passwords do not match');
      return;
  }
  const formData = this.step1Form.value;

  this.next.emit(formData);

  }
}
