import { Component } from '@angular/core';
import { EnhancedEmailService, EmailVerificationData, InvitationEmailData, WelcomeEmailData, PasswordResetData } from '../../shared/services/enhanced-email.service';

@Component({
  selector: 'app-test-email',
  template: `
    <div class="container mt-5">
      <h2>Email Template Testing</h2>
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Test Email Verification</h5>
              <button class="btn btn-primary" (click)="testEmailVerification()" [disabled]="isLoading">
                {{ isLoading ? 'Sending...' : 'Send Test Verification Email' }}
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Test Team Invitation</h5>
              <button class="btn btn-primary" (click)="testTeamInvitation()" [disabled]="isLoading">
                {{ isLoading ? 'Sending...' : 'Send Test Invitation Email' }}
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Test Welcome Email</h5>
              <button class="btn btn-primary" (click)="testWelcomeEmail()" [disabled]="isLoading">
                {{ isLoading ? 'Sending...' : 'Send Test Welcome Email' }}
              </button>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Test Password Reset</h5>
              <button class="btn btn-primary" (click)="testPasswordReset()" [disabled]="isLoading">
                {{ isLoading ? 'Sending...' : 'Send Test Password Reset Email' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div *ngIf="error" class="alert alert-danger mt-3">
        <strong>Error:</strong> {{ error }}
      </div>
      <div *ngIf="success" class="alert alert-success mt-3">
        <strong>Success:</strong> {{ success }}
      </div>
    </div>
  `,
  styles: [`
    .card {
      margin-bottom: 20px;
    }
    .btn {
      width: 100%;
    }
  `]
})
export class TestEmailComponent {
  isLoading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private emailService: EnhancedEmailService) {}

  async testEmailVerification() {
    this.isLoading = true;
    this.error = null;
    this.success = null;

    const testData: EmailVerificationData = {
      email: 'test@example.com', // Replace with your test email
      firstName: 'John',
      verificationLink: 'https://your-app.com/verify?token=test123',
      verificationCode: '123456'
    };

    try {
      await this.emailService.sendEmailVerification(testData).toPromise();
      this.success = 'Email verification test sent successfully!';
    } catch (error: any) {
      this.error = `Failed to send email verification: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async testTeamInvitation() {
    this.isLoading = true;
    this.error = null;
    this.success = null;

    const testData: InvitationEmailData = {
      email: 'test@example.com', // Replace with your test email
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'editor',
      invitationToken: 'test-token-123',
      invitedBy: 'John Admin',
      restaurantName: 'Test Restaurant'
    };

    try {
      await this.emailService.sendInvitationEmail(testData).toPromise();
      this.success = 'Team invitation test sent successfully!';
    } catch (error: any) {
      this.error = `Failed to send team invitation: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async testWelcomeEmail() {
    this.isLoading = true;
    this.error = null;
    this.success = null;

    const testData: WelcomeEmailData = {
      email: 'test@example.com', // Replace with your test email
      firstName: 'Jane',
      role: 'editor',
      restaurantName: 'Test Restaurant'
    };

    try {
      await this.emailService.sendWelcomeEmail(testData).toPromise();
      this.success = 'Welcome email test sent successfully!';
    } catch (error: any) {
      this.error = `Failed to send welcome email: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async testPasswordReset() {
    this.isLoading = true;
    this.error = null;
    this.success = null;

    const testData: PasswordResetData = {
      email: 'test@example.com', // Replace with your test email
      firstName: 'John',
      resetLink: 'https://your-app.com/reset-password?token=test123'
    };

    try {
      await this.emailService.sendPasswordResetEmail(testData).toPromise();
      this.success = 'Password reset email test sent successfully!';
    } catch (error: any) {
      this.error = `Failed to send password reset email: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }
}




