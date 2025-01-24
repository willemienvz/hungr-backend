import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";
import { FormDataService } from '../../shared/services/signup/form-data.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit {
  currentStep: number = 1;
  formDataStep1: any;
  formDataStep2: any;
  formDataStep3: any;
  errorMessage: string | null = null;

  constructor(
    public authService: AuthService,
    private formDataService: FormDataService
  ) {}

  ngOnInit() {}

  onNextStep(formData: any) {
    this.formDataStep1 = formData;
    this.formDataService.updateFormData(formData);
    this.currentStep++;
  }

  onNextStepStep2(formData: any) {
    this.formDataStep2 = formData;
    this.formDataService.updateFormData({ ...this.formDataStep1, ...formData });
    this.currentStep++;
  }

  onPreviousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onCompleteStep3(formData: any) {
    this.formDataStep3 = formData;

    console.log('Form Data from Step 1:', this.formDataStep1);
    console.log('Form Data from Step 2:', this.formDataStep2);
    console.log('Form Data from Step 3:', this.formDataStep3);

    // Send all form data to the AuthService for final submission
    this.authService.SignUp(
      this.formDataStep1.userEmail,
      this.formDataStep1.password,
      this.formDataStep1, this.formDataStep2,
      this.formDataStep3
    );
  }

  onSkipStep3() {
    console.log('Form Data from Step 1:', this.formDataStep1);
    console.log('Form Data from Step 2:', this.formDataStep2);

    this.authService.SignUp(
      this.formDataStep1.userEmail,
      this.formDataStep1.password,
      this.formDataStep1, this.formDataStep2,
      this.formDataStep3 
    );
  }
}
