import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import { AuthService } from '../../../shared/services/auth.service';
import { HttpClient } from '@angular/common/http';

import { Router } from '@angular/router';
import { PayflexService } from '../../../shared/services/payflex.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss'
})
export class Step2Component {
  step2Form: FormGroup;
  showAnnual: boolean = true;
  isSaving: boolean = false;
  private formData = new BehaviorSubject<any>({});

  constructor(
    private router: Router,
    private readonly http: HttpClient,
    private readonly fb: FormBuilder,
    private readonly formDataService: FormDataService,
    private readonly authService: AuthService,
    private readonly payflexService: PayflexService
  ) {
    this.step2Form = this.fb.group({
      billingOption: ['annual1', Validators.required],
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
    if (this.billingOption) {
      this.billingOption.setValue(option);
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
    
    this.onCheckout();
  }

  async onCheckout() {
    this.isSaving = true;
    try {
      const formData = this.formDataService.getFormData();
      await this.payflexService.createOrder(120, formData);
    } catch (error) {
      console.error('Error during checkout:', error);
      this.isSaving = false;
    }
  }
}
