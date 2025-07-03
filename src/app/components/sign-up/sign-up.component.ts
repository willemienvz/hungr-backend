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

  onNextStepStep2(formData: any) {
    this.formDataStep2 = formData;
    this.formDataService.updateFormData({ ...this.formDataStep1, ...formData });
    this.onCheckout();
  }

  onPreviousStep() {
    // Handle step navigation if needed
  }

  async onCheckout() {
    this.isSaving = true;
    const formData = this.formDataService.getFormData();
    localStorage.setItem('formData', JSON.stringify(formData));
    
    try {
      await this.payflexService.createOrder(120, formData);
    } catch (error) {
      console.error('Error during checkout:', error);
      this.toastr.error('Failed to initiate payment. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }
}
