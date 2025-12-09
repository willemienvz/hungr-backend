/**
 * Brevo Service - Base API Client
 * 
 * Initializes and provides the Brevo API client with authentication.
 * Handles API key management via Firebase Secrets.
 */

import * as brevo from '@getbrevo/brevo';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';

// Define secret for Brevo API key
const brevoApiKey = defineSecret('BREVO_API_KEY');

/**
 * Get Brevo API key from Firebase Secrets
 */
export function getBrevoApiKey(): string {
  return brevoApiKey.value();
}

/**
 * Initialize Brevo Transactional Emails API client
 */
export function getTransactionalEmailsApi(): brevo.TransactionalEmailsApi {
  const apiInstance = new brevo.TransactionalEmailsApi();
  const apiKey = apiInstance.authentications['api-key'];
  apiKey.apiKey = getBrevoApiKey();
  return apiInstance;
}

/**
 * Initialize Brevo Contacts API client
 */
export function getContactsApi(): brevo.ContactsApi {
  const apiInstance = new brevo.ContactsApi();
  const apiKey = apiInstance.authentications['api-key'];
  apiKey.apiKey = getBrevoApiKey();
  return apiInstance;
}

/**
 * Retry helper with exponential backoff
 * 
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries (default: 3)
 * @param initialDelay Initial delay in milliseconds (default: 1000)
 * @returns Promise with result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except rate limits
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        if (error.statusCode === 429) {
          // Rate limit - retry with longer delay
          const delay = initialDelay * Math.pow(2, attempt) * 2; // Double delay for rate limits
          if (attempt < maxRetries) {
            logger.warn(`Rate limited, retrying after ${delay}ms`, { attempt: attempt + 1, maxRetries });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // Other client errors - don't retry
          throw error;
        }
      }
      
      // Retry on server errors (5xx) and network errors
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        const maxDelay = 10000; // Max 10 seconds
        const actualDelay = Math.min(delay, maxDelay);
        
        logger.warn(`Retrying after ${actualDelay}ms`, { 
          attempt: attempt + 1, 
          maxRetries,
          error: error.message 
        });
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Export secret for use in Firebase Functions
 */
export { brevoApiKey };














