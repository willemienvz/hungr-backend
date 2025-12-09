/**
 * Brevo Contact List Service
 * 
 * Handles adding and removing contacts from Brevo contact lists
 * for campaign subscription management based on user preferences.
 */

import * as brevo from '@getbrevo/brevo';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getContactsApi, retryWithBackoff } from './brevoService';
import { getContactListId, ContactListType, validateContactListId } from './config';

/**
 * Contact list operation result
 */
export interface ContactListResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Contact list log entry for Firestore
 */
interface ContactListLog {
  userId: string;
  userEmail: string;
  contactListType: ContactListType;
  listId: number;
  operation: 'add' | 'remove';
  status: 'success' | 'failure' | 'retry';
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  timestamp: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  context?: {
    preferenceField: string;
    previousValue?: boolean;
    newValue?: boolean;
  };
}

/**
 * Add contact to Brevo contact list
 * 
 * @param contactListType Type of contact list
 * @param userEmail User email address
 * @param attributes Contact attributes (e.g., firstName)
 * @param userId User ID for logging
 * @param context Optional context about what triggered the operation
 * @returns Promise with operation result
 */
export async function addContactToList(
  contactListType: ContactListType,
  userEmail: string,
  attributes: { firstName?: string; lastName?: string } = {},
  userId: string,
  context?: {
    preferenceField: string;
    previousValue?: boolean;
    newValue?: boolean;
  }
): Promise<ContactListResult> {
  let listId: number;
  let retryCount = 0;
  const timestamp = admin.firestore.Timestamp.now();

  try {
    // Get contact list ID
    listId = await getContactListId(contactListType);
    
    // Validate list ID
    if (!validateContactListId(listId)) {
      throw new Error(`Invalid contact list ID: ${listId}`);
    }

    // Prepare contact attributes
    const contactAttributes: Record<string, any> = {};
    if (attributes.firstName) {
      contactAttributes.FNAME = attributes.firstName;
    }
    if (attributes.lastName) {
      contactAttributes.LNAME = attributes.lastName;
    }

    // Log initial attempt
    await logContactListOperation({
      userId,
      userEmail,
      contactListType,
      listId,
      operation: 'add',
      status: 'retry',
      retryCount: 0,
      timestamp,
      createdAt: timestamp,
      context,
    });

    // Add contact with retry logic
    await retryWithBackoff(async () => {
      retryCount++;
      const apiInstance = getContactsApi();
      
      // Create or update contact first
      const createContact = new brevo.CreateContact();
      createContact.email = userEmail;
      createContact.attributes = contactAttributes;
      createContact.listIds = [listId];
      createContact.updateEnabled = true; // Update if contact already exists
      
      await apiInstance.createContact(createContact);
    }, 3, 1000);

    // Success - log and return
    await logContactListOperation({
      userId,
      userEmail,
      contactListType,
      listId,
      operation: 'add',
      status: 'success',
      retryCount: retryCount - 1, // Subtract 1 because last attempt succeeded
      timestamp,
      createdAt: timestamp,
      context,
    });

    logger.info('Contact added to list successfully', {
      contactListType,
      userEmail,
      listId,
    });

    return { success: true };
  } catch (error: any) {
    // Failure - log and return error
    const errorResult: ContactListResult = {
      success: false,
      errorCode: error.statusCode?.toString() || error.code || 'unknown',
      errorMessage: error.message || 'Unknown error',
    };

    await logContactListOperation({
      userId,
      userEmail,
      contactListType,
      listId: listId || 0,
      operation: 'add',
      status: 'failure',
      errorCode: errorResult.errorCode,
      errorMessage: errorResult.errorMessage,
      retryCount,
      timestamp,
      createdAt: timestamp,
      context,
    });

    logger.error('Failed to add contact to list', {
      contactListType,
      userEmail,
      listId: listId || 0,
      error: error.message,
      errorCode: errorResult.errorCode,
      retryCount,
    });

    return errorResult;
  }
}

/**
 * Remove contact from Brevo contact list
 * 
 * @param contactListType Type of contact list
 * @param userEmail User email address
 * @param userId User ID for logging
 * @param context Optional context about what triggered the operation
 * @returns Promise with operation result
 */
export async function removeContactFromList(
  contactListType: ContactListType,
  userEmail: string,
  userId: string,
  context?: {
    preferenceField: string;
    previousValue?: boolean;
    newValue?: boolean;
  }
): Promise<ContactListResult> {
  let listId: number;
  let retryCount = 0;
  const timestamp = admin.firestore.Timestamp.now();

  try {
    // Get contact list ID
    listId = await getContactListId(contactListType);
    
    // Validate list ID
    if (!validateContactListId(listId)) {
      throw new Error(`Invalid contact list ID: ${listId}`);
    }

    // Log initial attempt
    await logContactListOperation({
      userId,
      userEmail,
      contactListType,
      listId,
      operation: 'remove',
      status: 'retry',
      retryCount: 0,
      timestamp,
      createdAt: timestamp,
      context,
    });

    // Remove contact with retry logic
    await retryWithBackoff(async () => {
      retryCount++;
      const apiInstance = getContactsApi();
      
      const removeContact = new brevo.RemoveContactFromList();
      removeContact.emails = [userEmail];
      
      await apiInstance.removeContactFromList(listId, removeContact);
    }, 3, 1000);

    // Success - log and return
    await logContactListOperation({
      userId,
      userEmail,
      contactListType,
      listId,
      operation: 'remove',
      status: 'success',
      retryCount: retryCount - 1, // Subtract 1 because last attempt succeeded
      timestamp,
      createdAt: timestamp,
      context,
    });

    logger.info('Contact removed from list successfully', {
      contactListType,
      userEmail,
      listId,
    });

    return { success: true };
  } catch (error: any) {
    // Check if error is because contact doesn't exist (not a real error)
    if (error.statusCode === 404 || error.message?.includes('not found')) {
      // Contact not in list - treat as success
      await logContactListOperation({
        userId,
        userEmail,
        contactListType,
        listId: listId || 0,
        operation: 'remove',
        status: 'success',
        retryCount: 0,
        timestamp,
        createdAt: timestamp,
        context,
      });

      logger.info('Contact not in list (already removed)', {
        contactListType,
        userEmail,
        listId: listId || 0,
      });

      return { success: true };
    }

    // Failure - log and return error
    const errorResult: ContactListResult = {
      success: false,
      errorCode: error.statusCode?.toString() || error.code || 'unknown',
      errorMessage: error.message || 'Unknown error',
    };

    await logContactListOperation({
      userId,
      userEmail,
      contactListType,
      listId: listId || 0,
      operation: 'remove',
      status: 'failure',
      errorCode: errorResult.errorCode,
      errorMessage: errorResult.errorMessage,
      retryCount,
      timestamp,
      createdAt: timestamp,
      context,
    });

    logger.error('Failed to remove contact from list', {
      contactListType,
      userEmail,
      listId: listId || 0,
      error: error.message,
      errorCode: errorResult.errorCode,
      retryCount,
    });

    return errorResult;
  }
}

/**
 * Log contact list operation to Firestore
 */
async function logContactListOperation(logData: ContactListLog): Promise<void> {
  try {
    await admin.firestore().collection('contact_list_logs').add(logData);
  } catch (error) {
    // Don't throw - logging failure shouldn't break contact list operations
    logger.error('Failed to log contact list operation', { error, logData });
  }
}














