import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { PayflexService } from '../../shared/services/payflex.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  isSaving: boolean = false;

  constructor(
    public authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth,
    private readonly payflexService: PayflexService
  ) {}

  ngOnInit() {
    // Get stored form data
    const formDataString = localStorage.getItem('formData');
    if (!formDataString) {
      this.toastr.error('No registration data found');
      this.router.navigate(['/register-user/step1']);
      return;
    }

    const formData = JSON.parse(formDataString);

    // Create user account
    this.createUserAccount(formData);

    // Notify payment success
    this.payflexService.notifyPaymentSuccess();
  }

  private async createUserAccount(formData: any) {
    try {
      await this.authService.SignUp(
        formData.userEmail,
        formData.password,
        formData,
        formData,
        null // step3 is no longer used
      );

      // Clear stored form data
      localStorage.removeItem('formData');

      this.toastr.success('Account created successfully! Please check your email for verification.');
    } catch (error) {
      console.error('Error creating account:', error);
      this.toastr.error('Failed to create account. Please contact support.');
    }
  }

  verifyAndCreate() {
    this.isSaving = true;
    this.authService.SendVerificationMail()
      .then(() => {
        this.toastr.success('Verification email sent! Please check your inbox.');
      })
      .catch((error) => {
        this.toastr.error('Error sending verification email. Please try again.');
        console.error('Error:', error);
      })
      .finally(() => {
        this.isSaving = false;
      });
  }
}
