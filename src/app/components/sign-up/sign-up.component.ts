import { Component } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";
import { FormDataService } from '../../shared/services/signup/form-data.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { EmailService } from '../../shared/services/email.service';
import { ToastrService } from 'ngx-toastr';
import { PayflexService } from '../../shared/services/payflex.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent {
  formDataStep1: any;
  formDataStep2: any;
  isSaving: boolean = false;
  errorMessage: string | null = null;
  private formData = new BehaviorSubject<any>({});

  constructor(
    public authService: AuthService,
    private readonly formDataService: FormDataService,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth,
    private readonly emailService: EmailService,
    private readonly payflexService: PayflexService,
  ) {}

  onNextStep(formData: any) {
    this.formDataStep1 = formData;
    this.formDataService.updateFormData(formData);
  }

  async onNextStepStep2(formData: any) {
    this.isSaving = true;
    try {
      this.formDataStep2 = formData;
      const combinedFormData = { ...this.formDataStep1, ...formData };
      this.formDataService.updateFormData(combinedFormData);
      
      // Store form data for after payment
      localStorage.setItem('formData', JSON.stringify(combinedFormData));
      
      // Proceed with payment
      await this.onCheckout();
    } catch (error: any) {
      console.error('Error during signup:', error);
      this.toastr.error(error.message || 'Failed to complete signup');
    } finally {
      this.isSaving = false;
    }
  }

  onPreviousStep() {
    // Handle step navigation if needed
  }

  async onCheckout() {
    const formData = this.formDataService.getFormData();
    
    try {
      await this.payflexService.createOrder(120, formData);
    } catch (error) {
      console.error('Error during checkout:', error);
      this.toastr.error('Failed to initiate payment. Please try again.');
      throw error;
    }
  }
}
