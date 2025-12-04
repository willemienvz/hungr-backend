import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import { AuthService } from '../../../shared/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastService } from '../../../shared/services/toast.service';

import { Router } from '@angular/router';
import { PayFastService, PayFastPaymentData } from '../../../shared/services/payfast.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss'
})
export class Step2Component {
  step2Form: FormGroup;
  isSaving: boolean = false;
  private formData = new BehaviorSubject<any>({});

  constructor(
    private router: Router,
    private readonly http: HttpClient,
    private readonly fb: FormBuilder,
    private readonly formDataService: FormDataService,
    private readonly authService: AuthService,
    private readonly payfastService: PayFastService,
    private readonly auth: AngularFireAuth,
    private readonly toast: ToastService
  ) {
    this.step2Form = this.fb.group({
      billingOption: ['digitalMenu', Validators.required], // Default to digital menu option
      agreeToTerms: [false, Validators.requiredTrue],
      receiveMarketingInfo: [false],
    });
  }

  ngOnInit(): void {
    const existingData = this.formDataService.getFormData();
    if (existingData) {
      this.step2Form.patchValue(existingData);
    }
  }

  get billingOption() {
    return this.step2Form.get('billingOption');
  }

  selectBillingOption(option: string) {
    // Only allow selection of digitalMenu, not orderPay
    if (option === 'orderPay') {
      return;
    }
    
    if (this.billingOption) {
      this.billingOption.setValue(option);
      
      // Update visual selection
      const cards = document.querySelectorAll('.pricing-card');
      cards.forEach(card => {
        card.classList.remove('active');
      });
      
      const selectedCard = document.querySelector(`.pricing-card.${option === 'digitalMenu' ? 'digital-menu' : 'order-pay'}`);
      if (selectedCard) {
        selectedCard.classList.add('active');
      }
    }
  }

  onPrevious() {
    this.router.navigate(['/register-user/step1']);
  }

  async onComplete() {
    if (this.step2Form.invalid) {
      // Show validation errors
      this.toast.error('Please fill in all required fields');
      return;
    }
    
    this.isSaving = true;
    try {
      const step2Data = this.step2Form.value;
      const existingData = this.formDataService.getFormData();
      const combinedData = { ...existingData, ...step2Data };
      this.formDataService.updateFormData(combinedData);
      
      // Check if user selected orderPay (coming soon)
      if (step2Data.billingOption === 'orderPay') {
        alert('Thank you for your interest! The Order & Pay solution is coming soon.');
        this.isSaving = false;
        return;
      }
      
      // STEP 1: Create Firebase Auth account FIRST
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        combinedData.userEmail,
        combinedData.password
      );
      
      if (!userCredential.user) {
        throw new Error('Failed to create user account');
      }
      
      const authUid = userCredential.user.uid;
      
      // STEP 2: Create user document in Firestore with Auth UID
      await this.authService.SetUserData(userCredential.user, combinedData);
      
      console.log('User account and document created with UID:', authUid);
      
      // STEP 3: Store form data and Auth UID for after payment
      localStorage.setItem('formData', JSON.stringify(combinedData));
      localStorage.setItem('authUid', authUid);
      
      // STEP 4: Now redirect to PayFast (user document already exists)
      await this.onCheckout();
      
    } catch (error: any) {
      console.error('Error during signup:', error);
      this.isSaving = false;
      
      if (error.code === 'auth/email-already-in-use') {
        // User already exists - might be from previous attempt
        // Try to proceed with payment anyway (user document exists)
        await this.onCheckout();
      } else {
        this.toast.error(error.message || 'Failed to create account. Please try again.');
      }
    }
  }

  async onCheckout() {
    // User document already created, just proceed with payment
    const formData = this.formDataService.getFormData();
    
    try {
      const paymentData: PayFastPaymentData = {
        amount: 999,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.userEmail,
        cellphone: formData.cellphone,
        merchantReference: `Hungr_${formData.userEmail}_${Date.now()}`
      };
      
      await this.payfastService.createRecurringPayment(paymentData);
    } catch (error) {
      console.error('Error during checkout:', error);
      this.isSaving = false;
      throw error;
    }
  }
}
