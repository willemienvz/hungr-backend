import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InvitationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  invitationToken: string;
  invitedBy: string;
  restaurantName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private readonly firebaseFunctionUrl =
    'https://us-central1-hungr-firebase.cloudfunctions.net/sendBrevoEmail';
  private readonly lambdaUrl =
    'https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail';

  constructor(private readonly http: HttpClient) { }

  /*  sendConfirmationEmail(email: string, name: string) {
    return this.http.post(this.firebaseFunctionUrl, {
      email,
      name,
    });
  } */

  sendConfirmationEmail(email: string, name: string): Observable<any> {
    console.log('test');
    return this.http.post(this.lambdaUrl, {
      email,
      name,
    });
  }

  /**
   * Send invitation email to new team member
   */
  sendInvitationEmail(invitationData: InvitationEmailData): Observable<any> {
    const emailData = {
      to: invitationData.email,
      subject: `You're invited to join ${invitationData.restaurantName || 'our team'}!`,
      templateId: 'team-invitation-template', // Updated template ID
      templateData: {
        firstName: invitationData.firstName,
        lastName: invitationData.lastName,
        role: this.formatRoleName(invitationData.role),
        invitedBy: invitationData.invitedBy,
        restaurantName: invitationData.restaurantName || 'Our Restaurant',
        invitationLink: this.generateInvitationLink(invitationData.invitationToken),
        expiryDays: 7,
        appName: 'Hungr',
        logoUrl: 'https://your-domain.com/assets/images/logo.png', // Update with your actual logo URL
        supportEmail: 'support@hungr.com',
        isAdmin: invitationData.role.toLowerCase() === 'admin',
        isEditor: invitationData.role.toLowerCase() === 'editor',
        isViewer: invitationData.role.toLowerCase() === 'viewer'
      }
    };

    console.log('Sending invitation email:', emailData);
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
        expiryDays: 7
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
        restaurantName: restaurantName || 'Our Restaurant'
      }
    };

    console.log('Sending invitation expired email:', emailData);
    return this.http.post(this.lambdaUrl, emailData);
  }

  /**
   * Send welcome email to new team member after they accept invitation
   */
  sendWelcomeEmail(email: string, firstName: string, role: string, restaurantName?: string): Observable<any> {
    const emailData = {
      to: email,
      subject: `Welcome to ${restaurantName || 'our team'}!`,
      templateId: 'welcome-template',
      templateData: {
        firstName,
        role: this.formatRoleName(role),
        restaurantName: restaurantName || 'Our Restaurant',
        dashboardLink: this.generateDashboardLink(),
        appName: 'Hungr',
        logoUrl: 'https://your-domain.com/assets/images/logo.png', // Update with your actual logo URL
        supportEmail: 'support@hungr.com',
        isAdmin: role.toLowerCase() === 'admin',
        isEditor: role.toLowerCase() === 'editor',
        isViewer: role.toLowerCase() === 'viewer'
      }
    };

    console.log('Sending welcome email:', emailData);
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
    // This should match your frontend invitation acceptance route
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
