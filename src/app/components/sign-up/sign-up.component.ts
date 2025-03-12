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
  currentStep: number = 1;
  formDataStep1: any;
  formDataStep2: any;
  formDataStep3: any;
  isSaving: boolean = false;
  errorMessage: string | null = null;
  private formData = new BehaviorSubject<any>({});
  

  constructor(
    public authService: AuthService,
    private readonly formDataService: FormDataService,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth, private readonly emailService: EmailService,
    private readonly payflexService: PayflexService,
  ) {}


  onNextStep(formData: any) {
    this.formDataStep1 = formData;
    this.formDataService.updateFormData(formData);
    this.currentStep++;
  }

  onNextStepStep2(formData: any) {
    this.formDataStep2 = formData;
    this.formDataService.updateFormData({ ...this.formDataStep1, ...formData });
    this.onCheckout();
  }

  onPreviousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }


  async onCheckout() {
    this.isSaving = true;
    this.formData = this.formDataService.getFormData();
    localStorage.setItem('formData', JSON.stringify(this.formData))
    try {
      await this.payflexService.createOrder(120, this.formData);
    } catch (error) {
      console.error('Error during checkout:', error);
    } finally {
      this.isSaving = false; 
    }
  }


  onCompleteStep3(formData: any) {
    this.formDataStep3 = formData;

    console.log('Form Data from Step 1:', this.formDataStep1);
    console.log('Form Data from Step 2:', this.formDataStep2);
    console.log('Form Data from Step 3:', this.formDataStep3);

   this.authService.SignUp(
      this.formDataStep1.userEmail,
      this.formDataStep1.password,
      this.formDataStep1, this.formDataStep2,
      this.formDataStep3
    );

    //this.signup(this.formDataStep1.userEmail, this.formDataStep1.password, this.formDataStep1.firstName);
  }

 /*  async signup(email: string, password: string, name: string) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
  
      if (user) {
        await user.updateProfile({
          displayName: name
        });
  
        const confirmationLink = `https://your-angular-app.com/confirm-email?uid=${user.uid}`;


        this.emailService.sendConfirmationEmail(email, confirmationLink, name).subscribe({
          next: () => {
            this.authService.SetUserData(user, this.formDataStep1, this.formDataStep2, this.formDataStep3);
            alert('Confirmation email sent!')
            this.toastr.success('Confirmation email sent!');
          },
          error: (err) =>
            this.toastr.success('Error sending email:', err)
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
    }
  } */
  

  onSkipStep3() {
    console.log('Form Data from Step 1:', this.formDataStep1);
    console.log('Form Data from Step 2:', this.formDataStep2);
  //  this.signup(this.formDataStep1.userEmail, this.formDataStep1.password, this.formDataStep1.firstName);
  }
}
