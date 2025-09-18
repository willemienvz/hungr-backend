# Email Template System

This directory contains the email templates and configuration for the Hungr application's email system.

## Overview

The email system uses:
- **HTML Templates**: Professional, responsive email templates
- **AWS Lambda + Brevo**: For sending transactional emails
- **Firebase Functions**: For custom email verification
- **Template Variables**: Dynamic content insertion

## Files

### HTML Templates
- `base-template.html` - Base template with common styling
- `email-verification.html` - Email verification template
- `team-invitation.html` - Team invitation template
- `welcome.html` - Welcome email template
- `password-reset.html` - Password reset template

### Configuration
- `brevo-template-config.md` - Brevo setup instructions
- `README.md` - This file

## Setup Instructions

### 1. Configure Brevo Templates

1. Log into your Brevo account
2. Go to Campaigns > Email Templates
3. Create templates with the following IDs:
   - `email-verification-template`
   - `team-invitation-template`
   - `welcome-template`
   - `password-reset-template`
   - `invitation-reminder-template`
   - `invitation-expired-template`

4. Copy the HTML content from the corresponding template files
5. Configure template variables as described in `brevo-template-config.md`

### 2. Update Configuration

Update the following in your email services:

```typescript
// In enhanced-email.service.ts and email.service.ts
private readonly logoUrl = 'https://your-domain.com/assets/images/logo.png'; // Update with your actual logo URL
private readonly supportEmail = 'support@hungr.com'; // Update with your support email
```

### 3. Deploy Firebase Functions

```bash
cd backend/functions
npm run build
firebase deploy --only functions
```

### 4. Test Email Templates

Use the test component to verify email functionality:

```typescript
// Add to your app module
import { TestEmailComponent } from './components/test-email/test-email.component';

// Add to declarations
declarations: [TestEmailComponent, ...]
```

## Usage

### Using Enhanced Email Service

```typescript
import { EnhancedEmailService } from './shared/services/enhanced-email.service';

constructor(private emailService: EnhancedEmailService) {}

// Send email verification
const verificationData = {
  email: 'user@example.com',
  firstName: 'John',
  verificationLink: 'https://app.com/verify?token=123',
  verificationCode: '123456'
};
this.emailService.sendEmailVerification(verificationData).subscribe();

// Send team invitation
const invitationData = {
  email: 'user@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'editor',
  invitationToken: 'token123',
  invitedBy: 'John Admin',
  restaurantName: 'My Restaurant'
};
this.emailService.sendInvitationEmail(invitationData).subscribe();
```

### Using Firebase Functions

```typescript
import { AngularFireFunctions } from '@angular/fire/compat/functions';

constructor(private functions: AngularFireFunctions) {}

// Send custom email verification
const sendEmailVerification = this.functions.httpsCallable('sendCustomEmailVerification');
sendEmailVerification({
  email: 'user@example.com',
  firstName: 'John'
}).subscribe();
```

## Template Variables

### Common Variables
- `{{appName}}` - Application name
- `{{logoUrl}}` - Logo image URL
- `{{supportEmail}}` - Support email address

### Email Verification
- `{{firstName}}` - User's first name
- `{{verificationLink}}` - Verification link
- `{{verificationCode}}` - Verification code

### Team Invitation
- `{{firstName}}` - Invited user's first name
- `{{lastName}}` - Invited user's last name
- `{{role}}` - User role
- `{{invitedBy}}` - Inviter's name
- `{{restaurantName}}` - Restaurant name
- `{{invitationLink}}` - Invitation link
- `{{expiryDays}}` - Days until expiry
- `{{isAdmin}}` - Boolean for admin role
- `{{isEditor}}` - Boolean for editor role
- `{{isViewer}}` - Boolean for viewer role

### Welcome Email
- `{{firstName}}` - User's first name
- `{{role}}` - User role
- `{{restaurantName}}` - Restaurant name
- `{{dashboardLink}}` - Dashboard link
- `{{isAdmin}}` - Boolean for admin role
- `{{isEditor}}` - Boolean for editor role
- `{{isViewer}}` - Boolean for viewer role

### Password Reset
- `{{firstName}}` - User's first name
- `{{resetLink}}` - Password reset link

## Customization

### Styling
- Modify CSS in the HTML template files
- Update colors, fonts, and layout
- Ensure responsive design for mobile devices

### Branding
- Update logo URL in email services
- Customize app name and support email
- Add your brand colors and styling

### Content
- Modify email content and messaging
- Add or remove template variables
- Update links and call-to-action buttons

## Testing

### Local Testing
1. Use the test component to send test emails
2. Check email rendering in different clients
3. Verify all links and buttons work

### Production Testing
1. Send test emails to real addresses
2. Check spam folder and deliverability
3. Monitor email open and click rates

## Troubleshooting

### Common Issues
- **Templates not found**: Check template IDs match exactly
- **Variables not replaced**: Verify variable names and syntax
- **Styling issues**: Test across different email clients
- **Links not working**: Check URL generation and routing

### Debug Steps
1. Check browser console for errors
2. Verify AWS Lambda function logs
3. Test email sending manually
4. Check Brevo template configuration

## Support

For issues with email templates:
1. Check the troubleshooting section
2. Review Brevo documentation
3. Test with the provided test component
4. Contact support if needed




