import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { PayFastService } from '../../shared/services/payfast.service';

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
    private readonly payfastService: PayFastService
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
    this.payfastService.notifyPaymentSuccess();
  }

  private async createUserAccount(formData: any) {
    try {
      // Check if user already exists in Firestore (created by ITN)
      const existingUser = await this.authService.getUserByEmail(formData.userEmail);
      
      if (existingUser) {
        // User exists in Firestore, create Firebase Auth account
        const userCredential = await this.auth.createUserWithEmailAndPassword(
          formData.userEmail,
          formData.password
        );

        if (userCredential.user) {
          // Send verification email
          await userCredential.user.sendEmailVerification();
          
          // Update existing user profile with additional data
          await this.authService.SetUserData(userCredential.user, formData);

          // Clear stored form data
          localStorage.removeItem('formData');

          this.toastr.success('Account created successfully! Please check your email for verification.');
        }
      } else {
        // Create new user account (original flow)
        const userCredential = await this.auth.createUserWithEmailAndPassword(
          formData.userEmail,
          formData.password
        );

        if (userCredential.user) {
          // Send verification email
          await userCredential.user.sendEmailVerification();
          
          // Update user profile with additional data
          await this.authService.SetUserData(userCredential.user, formData);

          // Clear stored form data
          localStorage.removeItem('formData');

          this.toastr.success('Account created successfully! Please check your email for verification.');
        }
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      this.toastr.error(error.message || 'Failed to create account. Please contact support.');
    }
  }

  async verifyAndCreate() {
    this.isSaving = true;
    try {
      const user = await this.auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        this.toastr.success('Verification email sent! Please check your inbox.');
      } else {
        this.toastr.error('No user found. Please try signing in again.');
      }
    } catch (error: any) {
      this.toastr.error(error.message || 'Error sending verification email. Please try again.');
      console.error('Error:', error);
    } finally {
      this.isSaving = false;
    }
  }
}
