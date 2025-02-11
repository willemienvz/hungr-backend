const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure Nodemailer with your email provider's SMTP settings
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your-email@gmail.com",
    pass: "your-email-password"
  }
});

// Function to send custom email verification link
exports.sendCustomVerificationEmail = functions.https.onCall(async (data, context) => {
  const email = data.email;

  try {
    // Generate custom email verification link
    const actionCodeSettings = {
      url: "https://your-app.com/email-verified", // Redirect after verification
      handleCodeInApp: true
    };
    
    const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // Customize email content
    const mailOptions = {
      from: "Your App <your-email@gmail.com>",
      to: email,
      subject: "Verify Your Email",
      html: `
        <p>Hello,</p>
        <p>Thank you for signing up. Please verify your email by clicking the link below:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>If you didn't sign up, please ignore this email.</p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return { success: true, message: "Verification email sent!" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
