import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
import cors from "cors"; 
import * as admin from "firebase-admin";

const corsHandler = cors({ origin: true }); 
admin.initializeApp(); 

const transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendBrevoEmail = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => { 
        console.log("Received request:", req.body);
        if (req.method !== "POST") {
            console.log("Invalid request method:", req.method);
            res.status(405).send("Method Not Allowed");
            return;
        }

        const { email, subject, message } = req.body;
        if (!email || !subject || !message) {
            console.error("Missing required parameters:", { email, subject, message });
            res.status(400).send({ error: "Missing required parameters." });
            return;
        }

        const mailOptions = {
            from: "Hungr <willemien@anomaly.digital>",
            to: email,
            subject: subject,
            text: message,
            html: `<p>${message}</p>`,
        };

        try {
            console.log("Sending email to:", email);
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent successfully:", info);
            res.status(200).send({ message: "Email sent successfully!" });
        } catch (error) {
            console.error("Error sending email:", error);
            res.status(500).send({ error: "Failed to send email." });
        }
    });
});

export const generateEmailVerificationLink = functions.https.onCall(
    async (request: functions.https.CallableRequest<{ email: string }>) => {
      const email = request.data.email; 
  
      if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required');
      }
  
      const actionCodeSettings = {
        url: 'https://main.d9ek0iheftizq.amplifyapp.com/confirm-email', 
        handleCodeInApp: true
      };
  
      try {
        const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
        console.log('Generated verification link:', link);
        return { link };
      } catch (error) {
        console.error('Error generating email verification link:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate verification link.');
      }
    }
  );

