import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailVerificationData {
  email: string;
  firstName: string;
  verificationLink: string;
  verificationCode?: string;
}

export interface InvitationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  invitationToken: string;
  invitedBy: string;
  restaurantName?: string;
}

export interface WelcomeEmailData {
  email: string;
  firstName: string;
  role: string;
  restaurantName?: string;
}

export interface PasswordResetData {
  email: string;
  firstName: string;
  resetLink: string;
}

@Injectable({
  providedIn: 'root',
})
export class EnhancedEmailService {
  private readonly lambdaUrl = 'https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail';
  private readonly appName = 'Hungr';
  private readonly logoUrl = 'https://your-domain.com/assets/images/logo.png'; // Update with your actual logo URL
  private readonly supportEmail = 'support@hungr.com';

  constructor(private readonly http: HttpClient) {}

  /**
   * Send email verification with custom template
   */
  sendEmailVerification(data: EmailVerificationData): Observable<any> {
    const emailData = {
      to: data.email,
      subject: `Verify Your Email - ${this.appName}`,
      templateId: 'email-verification-template',
      templateData: {
        firstName: data.firstName,
        verificationLink: data.verificationLink,
        verificationCode: data.verificationCode,
        appName: this.appName,
        logoUrl: this.logoUrl,
        supportEmail: this.supportEmail
      }
    };

    console.log('Sending email verification:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Send team invitation with enhanced template
   */
  sendInvitationEmail(invitationData: InvitationEmailData): Observable<any> {
    const emailData = {
      to: invitationData.email,
      subject: `You're invited to join ${invitationData.restaurantName || 'our team'}!`,
      templateId: 'team-invitation-template',
      templateData: {
        firstName: invitationData.firstName,
        lastName: invitationData.lastName,
        role: this.formatRoleName(invitationData.role),
        invitedBy: invitationData.invitedBy,
        restaurantName: invitationData.restaurantName || 'Our Restaurant',
        invitationLink: this.generateInvitationLink(invitationData.invitationToken),
        expiryDays: 7,
        appName: this.appName,
        logoUrl: this.logoUrl,
        supportEmail: this.supportEmail,
        isAdmin: invitationData.role.toLowerCase() === 'admin',
        isEditor: invitationData.role.toLowerCase() === 'editor',
        isViewer: invitationData.role.toLowerCase() === 'viewer'
      }
    };

    console.log('Sending invitation email:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Send welcome email after invitation acceptance
   */
  sendWelcomeEmail(data: WelcomeEmailData): Observable<any> {
    const emailData = {
      to: data.email,
      subject: `Welcome to ${data.restaurantName || 'our team'}!`,
      templateId: 'welcome-template',
      templateData: {
        firstName: data.firstName,
        role: this.formatRoleName(data.role),
        restaurantName: data.restaurantName || 'Our Restaurant',
        dashboardLink: this.generateDashboardLink(),
        appName: this.appName,
        logoUrl: this.logoUrl,
        supportEmail: this.supportEmail,
        isAdmin: data.role.toLowerCase() === 'admin',
        isEditor: data.role.toLowerCase() === 'editor',
        isViewer: data.role.toLowerCase() === 'viewer'
      }
    };

    console.log('Sending welcome email:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(data: PasswordResetData): Observable<any> {
    const emailData = {
      to: data.email,
      subject: `Reset Your Password - ${this.appName}`,
      templateId: 'password-reset-template',
      templateData: {
        firstName: data.firstName,
        resetLink: data.resetLink,
        appName: this.appName,
        logoUrl: this.logoUrl,
        supportEmail: this.supportEmail
      }
    };

    console.log('Sending password reset email:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Send invitation reminder email
   */
  sendInvitationReminderEmail(invitationData: InvitationEmailData): Observable<any> {
    const emailData = {
      to: invitationData.email,
      subject: `Reminder: Join ${invitationData.restaurantName || 'our team'}!`,
      templateId: 'invitation-reminder-template',
      templateData: {
        firstName: invitationData.firstName,
        lastName: invitationData.lastName,
        role: this.formatRoleName(invitationData.role),
        invitedBy: invitationData.invitedBy,
        restaurantName: invitationData.restaurantName || 'Our Restaurant',
        invitationLink: this.generateInvitationLink(invitationData.invitationToken),
        expiryDays: 7,
        appName: this.appName,
        logoUrl: this.logoUrl,
        supportEmail: this.supportEmail,
        isAdmin: invitationData.role.toLowerCase() === 'admin',
        isEditor: invitationData.role.toLowerCase() === 'editor',
        isViewer: invitationData.role.toLowerCase() === 'viewer'
      }
    };

    console.log('Sending invitation reminder email:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Send invitation expiry notification
   */
  sendInvitationExpiredEmail(email: string, firstName: string, restaurantName?: string): Observable<any> {
    const emailData = {
      to: email,
      subject: `Invitation expired - ${restaurantName || 'Our Restaurant'}`,
      templateId: 'invitation-expired-template',
      templateData: {
        firstName,
        restaurantName: restaurantName || 'Our Restaurant',
        appName: this.appName,
        logoUrl: this.logoUrl,
        supportEmail: this.supportEmail
      }
    };

    console.log('Sending invitation expired email:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Format role name for display in emails
   */
  private formatRoleName(role: string): string {
    const roleNames: { [key: string]: string } = {
      admin: 'Administrator',
      editor: 'Editor',
      viewer: 'Viewer',
      custom: 'Team Member'
    };
    return roleNames[role.toLowerCase()] || 'Team Member';
  }

  /**
   * Generate invitation link with token
   */
  private generateInvitationLink(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/accept-invitation?token=${token}`;
  }

  /**
   * Generate dashboard link
   */
  private generateDashboardLink(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/dashboard`;
  }
}




