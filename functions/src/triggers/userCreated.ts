/**
 * Firestore Trigger: User Created
 * 
 * Triggers when a new user document is created in the users collection.
 * Sends verification email, welcome email, and adds user to contact lists
 * based on initial preferences.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { brevoApiKey } from '../brevo/brevoService';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
} from '../brevo/emailService';
import {
  addContactToList,
} from '../brevo/contactListService';

/**
 * Trigger on user document creation
 */
export const onUserCreated = onDocumentCreated(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1',
  },
  async (event) => {
    const userData = event.data?.data();
    const userId = event.params.userId;

    if (!userData) {
      logger.warn('User created trigger fired but no user data found', { userId });
      return;
    }

    logger.info('New user created', { userId, email: userData.email });

    const userEmail = userData.email as string;
    const firstName = (userData.firstName as string) || 'User';
    const marketingConsent = Boolean(userData.marketingConsent);
    const tipsTutorials = Boolean(userData.tipsTutorials);
    const userInsights = Boolean(userData.userInsights);

    // Send verification email (non-blocking)
    try {
      const actionCodeSettings = {
        url: 'https://app.hungr.com/email-verified',
        handleCodeInApp: true,
      };

      const verificationLink = await admin
        .auth()
        .generateEmailVerificationLink(userEmail, actionCodeSettings);

      await sendVerificationEmail(userEmail, verificationLink, firstName, userId);
      logger.info('Verification email sent', { userId, email: userEmail });
    } catch (error: any) {
      // Don't block user creation if email fails
      logger.error('Failed to send verification email', {
        userId,
        email: userEmail,
        error: error.message,
      });
    }

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(userEmail, firstName, userId);
      logger.info('Welcome email sent', { userId, email: userEmail });
    } catch (error: any) {
      // Don't block user creation if email fails
      logger.error('Failed to send welcome email', {
        userId,
        email: userEmail,
        error: error.message,
      });
    }

    // Add user to contact lists based on preferences (non-blocking)
    const contactListPromises: Promise<void>[] = [];

    if (marketingConsent) {
      contactListPromises.push(
        addContactToList(
          'marketing',
          userEmail,
          { firstName },
          userId,
          {
            preferenceField: 'marketingConsent',
            newValue: true,
          }
        ).catch((error) => {
          logger.error('Failed to add user to marketing list', {
            userId,
            email: userEmail,
            error: error.message,
          });
        })
      );
    }

    if (tipsTutorials) {
      contactListPromises.push(
        addContactToList(
          'tips',
          userEmail,
          { firstName },
          userId,
          {
            preferenceField: 'tipsTutorials',
            newValue: true,
          }
        ).catch((error) => {
          logger.error('Failed to add user to tips list', {
            userId,
            email: userEmail,
            error: error.message,
          });
        })
      );
    }

    if (userInsights) {
      contactListPromises.push(
        addContactToList(
          'insights',
          userEmail,
          { firstName },
          userId,
          {
            preferenceField: 'userInsights',
            newValue: true,
          }
        ).catch((error) => {
          logger.error('Failed to add user to insights list', {
            userId,
            email: userEmail,
            error: error.message,
          });
        })
      );
    }

    // Wait for all contact list operations (but don't fail if they do)
    await Promise.allSettled(contactListPromises);

    logger.info('User creation processing complete', { userId, email: userEmail });
  }
);












