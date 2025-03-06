import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import { AuthService } from '../../../shared/services/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

declare var YocoSDK: any;

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss'
})
export class Step2Component {
  step2Form: FormGroup;
  showAnnual: boolean = true;
  yoco: any;
  apiUrl = 'https://ev4ztvc49k.execute-api.us-east-1.amazonaws.com/prod';
  @Output() previous: EventEmitter<void> = new EventEmitter<void>();
  @Output() next: EventEmitter<void> = new EventEmitter<void>();


  constructor(private readonly http: HttpClient, private readonly fb: FormBuilder, private readonly formDataService: FormDataService, private readonly authService: AuthService) {
    this.step2Form = this.fb.group({
      billingOption: [null, Validators.required],
      agreeToTerms: [false, Validators.requiredTrue],  
      receiveMarketingInfo: [false]  
    });
  }

  get billingOption() {
    return this.step2Form.get('billingOption');
  }

  selectBillingOption(option: string) {
    if (this.billingOption) {
      this.billingOption.setValue(option);
    }
  }

  ngOnInit(): void {
    this.yoco = new YocoSDK({
      publicKey: environment.yoko.publicKey
    });
  }
  onPrevious() {
    this.previous.emit();
  }
  onComplete() {
    this.startPayment('monthly');
    const formData = this.step2Form.value;
    //this.next.emit(formData);
  }

  startPayment(subscriptionType: 'monthly' | 'annual') {
    const amount = subscriptionType === 'monthly' ? 200 : 1000;
  
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
  
    this.http.post<{ checkoutUrl: string }>(
      `${this.apiUrl}/createYocoCheckout`,
      JSON.stringify({
        amount: amount,
        currency: 'ZAR',
        reference: `sub_${subscriptionType}_${new Date().getTime()}`,
      }), 
      { headers } 
    ).subscribe({
      next: (response) => {
        console.log('✅ Response:', response);
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
        }
      },
      error: (err) => {
        console.error('❌ Payment request failed:', err);
      }
    });
  }
  
  
  
}
