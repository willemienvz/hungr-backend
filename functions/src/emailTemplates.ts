import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Email verification template
const EMAIL_VERIFICATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email Address</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333;
            margin-top: 0;
            font-size: 24px;
        }
        .content p {
            color: #666;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            color: #6c757d;
            font-size: 14px;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Welcome to Hungr!</h1>
        </div>
        <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi {{firstName}},</p>
            <p>Thank you for signing up with Hungr! To complete your registration and start managing your restaurant's digital presence, please verify your email address.</p>
            
            <a href="{{verificationLink}}" class="button">Verify Email Address</a>
            
            <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with Hungr, please ignore this email.</p>
        </div>
        <div class="footer">
            <p><strong>Hungr</strong></p>
            <p>Your Restaurant's Digital Menu Solution</p>
            <p>If you have any questions, please contact us at support@hungr.com</p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Send custom email verification with template
 */
export const sendCustomEmailVerification = functions.https.onCall(async (data, context) => {
  const { email, firstName } = data;

  if (!email || !firstName) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and firstName are required');
  }

  try {
    // Generate custom email verification link
    const actionCodeSettings = {
      url: 'https://your-app.com/email-verified', // Update with your actual domain
      handleCodeInApp: true
    };
    
    const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // Replace template variables
    const htmlContent = EMAIL_VERIFICATION_TEMPLATE
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{verificationLink\}\}/g, verificationLink);

    // Send email using your preferred email service
    // This is a placeholder - you'll need to implement the actual email sending
    // using your AWS Lambda function or other email service
    
    return { 
      success: true, 
      message: 'Verification email sent!',
      verificationLink // For testing purposes
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }
});

/**
 * Send email with custom template using AWS Lambda
 */
export const sendEmailWithTemplate = functions.https.onCall(async (data, context) => {
  const { to, subject, templateId, templateData } = data;

  if (!to || !subject || !templateId || !templateData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required email parameters');
  }

  try {
    // Prepare email data for AWS Lambda
    const emailData = {
      to,
      subject,
      templateId,
      templateData
    };

    // Here you would call your AWS Lambda function
    // For now, we'll just log the data and return success
    console.log('Sending email with template:', emailData);
    
    // TODO: Implement actual email sending via AWS Lambda
    // const response = await fetch('https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(emailData)
    // });

    return { 
      success: true, 
      message: 'Email sent successfully!',
      emailData // For testing purposes
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});




