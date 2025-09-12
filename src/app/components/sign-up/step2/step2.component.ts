import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import { AuthService } from '../../../shared/services/auth.service';
import { HttpClient } from '@angular/common/http';

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
    private readonly payfastService: PayFastService
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

  onComplete() {
    const step2Data = this.step2Form.value;
    
    // Get existing data from step 1
    const existingData = this.formDataService.getFormData();
    
    // Merge step 2 data with existing data
    const combinedData = { ...existingData, ...step2Data };
    
    // Update form data service with merged data
    this.formDataService.updateFormData(combinedData);
    
    // Store complete form data in localStorage
    localStorage.setItem('formData', JSON.stringify(combinedData));
    
    // Check if user selected the order & pay option (coming soon)
    if (step2Data.billingOption === 'orderPay') {
      // Navigate to a coming soon page or show a notification
      alert('Thank you for your interest! The Order & Pay solution is coming soon. We will notify you when it becomes available.');
      return;
    }
    
    this.onCheckout();
  }

  async onCheckout() {
    this.isSaving = true;
    try {
      const formData = this.formDataService.getFormData();
      
      // Create PayFast payment data for R999/month recurring billing
      const paymentData: PayFastPaymentData = {
        amount: 999, // R999 per month
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
    }
  }
}
