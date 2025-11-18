# Brevo Email Template Configuration

This document explains how to set up the email templates in Brevo (formerly Sendinblue) for your Hungr application.

## Template IDs

You need to create the following templates in your Brevo account:

1. **email-verification-template** - For email verification during registration
2. **team-invitation-template** - For team member invitations
3. **welcome-template** - For welcome emails after invitation acceptance
4. **password-reset-template** - For password reset emails
5. **invitation-reminder-template** - For invitation reminders
6. **invitation-expired-template** - For expired invitation notifications

## Template Variables

Each template uses the following variables:

### Common Variables
- `{{appName}}` - Application name (Hungr)
- `{{logoUrl}}` - URL to your logo image
- `{{supportEmail}}` - Support email address

### Email Verification Template
- `{{firstName}}` - User's first name
- `{{verificationLink}}` - Email verification link
- `{{verificationCode}}` - Verification code (optional)

### Team Invitation Template
- `{{firstName}}` - Invited user's first name
- `{{lastName}}` - Invited user's last name
- `{{role}}` - User role (Administrator, Editor, Viewer)
- `{{invitedBy}}` - Name of person who sent invitation
- `{{restaurantName}}` - Restaurant name
- `{{invitationLink}}` - Invitation acceptance link
- `{{expiryDays}}` - Number of days until expiry
- `{{isAdmin}}` - Boolean for admin role
- `{{isEditor}}` - Boolean for editor role
- `{{isViewer}}` - Boolean for viewer role

### Welcome Template
- `{{firstName}}` - User's first name
- `{{role}}` - User role
- `{{restaurantName}}` - Restaurant name
- `{{dashboardLink}}` - Link to dashboard
- `{{isAdmin}}` - Boolean for admin role
- `{{isEditor}}` - Boolean for editor role
- `{{isViewer}}` - Boolean for viewer role

### Password Reset Template
- `{{firstName}}` - User's first name
- `{{resetLink}}` - Password reset link

## Setup Instructions

1. **Log into Brevo Dashboard**
   - Go to https://app.brevo.com/
   - Navigate to Campaigns > Email Templates

2. **Create Templates**
   - Click "Create a new template"
   - Choose "Drag & Drop Editor" or "HTML Editor"
   - Copy the HTML content from the corresponding template files
   - Set the template name to match the template ID (e.g., "email-verification-template")

3. **Configure Template Variables**
   - In the template editor, you can use the variables listed above
   - Brevo will automatically replace these with actual values when sending

4. **Test Templates**
   - Use Brevo's preview feature to test templates
   - Send test emails to verify formatting and functionality

5. **Update AWS Lambda Function**
   - Make sure your AWS Lambda function is configured to use these template IDs
   - Update the template IDs in your email service if needed

## Template Files

The HTML templates are located in:
- `/backend/email-templates/email-verification.html`
- `/backend/email-templates/team-invitation.html`
- `/backend/email-templates/welcome.html`
- `/backend/email-templates/password-reset.html`
- `/backend/email-templates/base-template.html`

## Customization

You can customize the templates by:
1. Modifying the HTML files in the email-templates directory
2. Updating the corresponding templates in Brevo
3. Adjusting colors, fonts, and layout to match your brand
4. Adding your logo and branding elements

## Testing

To test the email templates:
1. Use the test functions in your application
2. Send test emails through Brevo's interface
3. Check email rendering across different email clients
4. Verify all links and buttons work correctly

## Troubleshooting

Common issues:
- **Templates not found**: Ensure template IDs match exactly
- **Variables not replaced**: Check variable names and syntax
- **Styling issues**: Test across different email clients
- **Links not working**: Verify URL generation and routing




