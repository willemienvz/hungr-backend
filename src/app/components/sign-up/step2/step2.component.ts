import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormDataService } from '../../../shared/services/signup/form-data.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss'
})
export class Step2Component {
  step2Form: FormGroup;
  showAnnual: boolean = true;
  
  @Output() previous: EventEmitter<void> = new EventEmitter<void>();
  @Output() complete: EventEmitter<void> = new EventEmitter<void>();


  constructor(private fb: FormBuilder, private formDataService: FormDataService, private authService: AuthService) {
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
 
  }
  onPrevious() {
    this.previous.emit();
  }
  onComplete() {
    const formData = this.step2Form.value;
    this.complete.emit(formData);
  }
}
