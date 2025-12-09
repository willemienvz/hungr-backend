/**
 * Password Reset Email Function
 * 
 * Callable Firebase Function that generates a password reset link
 * and sends it via Brevo transactional email.
 */

import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { brevoApiKey } from './brevoService';
import { sendPasswordResetEmail } from './emailService';

/**
 * Rate limiting: Track last password reset request per email
 */
const lastResetRequest = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Callable function to send password reset email
 */
export const sendPasswordResetEmailFunction = onCall(
  {
    secrets: [brevoApiKey],
    region: 'us-central1',
  },
  async (request) => {
    const { email } = request.data;

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    // Rate limiting: Check if email was requested recently
    const lastRequest = lastResetRequest.get(email);
    const now = Date.now();
    
    if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
      logger.warn('Password reset rate limit exceeded', {
        email,
        remainingSeconds,
      });
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting another password reset.`);
    }

    try {
      // Get user by email
      let user;
      try {
        user = await admin.auth().getUserByEmail(email);
      } catch (error: any) {
        // Don't reveal if email exists or not (security best practice)
        logger.info('Password reset requested for non-existent email', { email });
        // Still update rate limit to prevent email enumeration
        lastResetRequest.set(email, now);
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Get user document for firstName
      const userDoc = await admin.firestore().doc(`users/${user.uid}`).get();
      const userData = userDoc.data();
      const firstName = (userData?.firstName as string) || 'User';

      // Generate password reset link
      const actionCodeSettings = {
        url: 'https://app.hungr.com/reset-password',
        handleCodeInApp: true,
      };

      const resetLink = await admin
        .auth()
        .generatePasswordResetLink(email, actionCodeSettings);

      // Send password reset email via Brevo
      const emailResult = await sendPasswordResetEmail(
        email,
        resetLink,
        firstName,
        user.uid
      );

      // Update rate limit
      lastResetRequest.set(email, now);

      if (emailResult.success) {
        logger.info('Password reset email sent', {
          userId: user.uid,
          email,
        });
        return {
          success: true,
          message: 'Password reset email sent successfully.',
        };
      } else {
        logger.error('Failed to send password reset email', {
          userId: user.uid,
          email,
          error: emailResult.errorMessage,
        });
        // Still return success to user (don't reveal email sending failure)
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }
    } catch (error: any) {
      logger.error('Error in password reset function', {
        email,
        error: error.message,
      });
      throw new Error('An error occurred while processing your request. Please try again later.');
    }
  }
);














