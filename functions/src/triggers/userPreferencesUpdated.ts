/**
 * Firestore Trigger: User Preferences Updated
 * 
 * Triggers when a user document is updated in the users collection.
 * Detects changes to marketingConsent, tipsTutorials, and userInsights preferences
 * and syncs them to Brevo contact lists.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { brevoApiKey } from '../brevo/brevoService';
import {
  addContactToList,
  removeContactFromList,
} from '../brevo/contactListService';

/**
 * Trigger on user document update
 */
export const onUserPreferencesUpdated = onDocumentWritten(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1',
  },
  async (event) => {
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();
    const userId = event.params.userId;

    // Only process updates (not creates or deletes)
    if (!beforeData || !afterData) {
      return;
    }

    logger.info('User document updated', { userId });

    const userEmail = (afterData.email as string) || '';
    const firstName = (afterData.firstName as string) || 'User';

    // Track preference changes
    const preferenceChanges: Array<{
      field: 'marketingConsent' | 'tipsTutorials' | 'userInsights';
      contactListType: 'marketing' | 'tips' | 'insights';
      oldValue: boolean;
      newValue: boolean;
    }> = [];

    // Check marketingConsent
    const oldMarketingConsent = Boolean(beforeData.marketingConsent);
    const newMarketingConsent = Boolean(afterData.marketingConsent);
    if (oldMarketingConsent !== newMarketingConsent) {
      preferenceChanges.push({
        field: 'marketingConsent',
        contactListType: 'marketing',
        oldValue: oldMarketingConsent,
        newValue: newMarketingConsent,
      });
    }

    // Check tipsTutorials
    const oldTipsTutorials = Boolean(beforeData.tipsTutorials);
    const newTipsTutorials = Boolean(afterData.tipsTutorials);
    if (oldTipsTutorials !== newTipsTutorials) {
      preferenceChanges.push({
        field: 'tipsTutorials',
        contactListType: 'tips',
        oldValue: oldTipsTutorials,
        newValue: newTipsTutorials,
      });
    }

    // Check userInsights
    const oldUserInsights = Boolean(beforeData.userInsights);
    const newUserInsights = Boolean(afterData.userInsights);
    if (oldUserInsights !== newUserInsights) {
      preferenceChanges.push({
        field: 'userInsights',
        contactListType: 'insights',
        oldValue: oldUserInsights,
        newValue: newUserInsights,
      });
    }

    // If no preference changes, exit early
    if (preferenceChanges.length === 0) {
      return;
    }

    logger.info('Preference changes detected', {
      userId,
      changes: preferenceChanges.length,
    });

    // Process each preference change
    const syncPromises = preferenceChanges.map(async (change) => {
      try {
        if (change.newValue) {
          // Add to contact list
          await addContactToList(
            change.contactListType,
            userEmail,
            { firstName },
            userId,
            {
              preferenceField: change.field,
              previousValue: change.oldValue,
              newValue: change.newValue,
            }
          );
          logger.info('User added to contact list', {
            userId,
            contactListType: change.contactListType,
            preferenceField: change.field,
          });
        } else {
          // Remove from contact list
          await removeContactFromList(
            change.contactListType,
            userEmail,
            userId,
            {
              preferenceField: change.field,
              previousValue: change.oldValue,
              newValue: change.newValue,
            }
          );
          logger.info('User removed from contact list', {
            userId,
            contactListType: change.contactListType,
            preferenceField: change.field,
          });
        }
      } catch (error: any) {
        // Don't block preference update if contact list sync fails
        logger.error('Failed to sync contact list', {
          userId,
          contactListType: change.contactListType,
          preferenceField: change.field,
          error: error.message,
        });
      }
    });

    // Wait for all sync operations (but don't fail if they do)
    await Promise.allSettled(syncPromises);

    logger.info('Preference update processing complete', {
      userId,
      changesProcessed: preferenceChanges.length,
    });
  }
);












