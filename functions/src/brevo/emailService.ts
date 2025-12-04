/**
 * Brevo Email Service
 * 
 * Handles transactional email sending via Brevo API with template support,
 * retry logic, error handling, and logging.
 */

import * as brevo from '@getbrevo/brevo';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getTransactionalEmailsApi, retryWithBackoff } from './brevoService';
import { getTemplateId, getSenderConfig, EmailType, validateTemplateId } from './config';

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  templateId: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Email log entry for Firestore
 */
interface EmailLog {
  userId?: string;
  emailType: EmailType;
  recipient: string;
  templateId: number;
  templateVariables?: Record<string, any>;
  status: 'success' | 'failure' | 'retry';
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  timestamp: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

/**
 * Send transactional email using Brevo template
 * 
 * @param emailType Type of email to send
 * @param recipient Recipient email address
 * @param templateVariables Variables to substitute in template
 * @param userId Optional user ID for logging
 * @returns Promise with email result
 */
export async function sendTransactionalEmail(
  emailType: EmailType,
  recipient: string,
  templateVariables: Record<string, any> = {},
  userId?: string
): Promise<EmailResult> {
  let templateId: number;
  let retryCount = 0;
  const timestamp = admin.firestore.Timestamp.now();

  try {
    // Get template ID with fallback to generic
    templateId = await getTemplateId(emailType);
    
    // Validate template ID
    if (!validateTemplateId(templateId)) {
      throw new Error(`Invalid template ID: ${templateId}`);
    }

    // Get sender configuration
    const sender = await getSenderConfig();

    // Prepare email data
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.templateId = templateId;
    sendSmtpEmail.sender = {
      name: sender.name,
      email: sender.email,
    };
    sendSmtpEmail.to = [{ email: recipient }];
    sendSmtpEmail.params = templateVariables;

    // Log initial attempt
    await logEmailAttempt({
      userId,
      emailType,
      recipient,
      templateId,
      templateVariables: sanitizeTemplateVariables(templateVariables),
      status: 'retry',
      retryCount: 0,
      timestamp,
      createdAt: timestamp,
    });

    // Send email with retry logic
    const result = await retryWithBackoff(async () => {
      retryCount++;
      const apiInstance = getTransactionalEmailsApi();
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      return response;
    }, 3, 1000);

    // Success - log and return
    const successResult: EmailResult = {
      success: true,
      messageId: result.messageId,
      templateId,
    };

    await logEmailAttempt({
      userId,
      emailType,
      recipient,
      templateId,
      templateVariables: sanitizeTemplateVariables(templateVariables),
      status: 'success',
      messageId: result.messageId,
      retryCount: retryCount - 1, // Subtract 1 because last attempt succeeded
      timestamp,
      createdAt: timestamp,
    });

    logger.info('Email sent successfully', {
      emailType,
      recipient,
      templateId,
      messageId: result.messageId,
    });

    return successResult;
  } catch (error: any) {
    // Failure - log and return error
    const errorResult: EmailResult = {
      success: false,
      templateId: templateId || 0,
      errorCode: error.statusCode?.toString() || error.code || 'unknown',
      errorMessage: error.message || 'Unknown error',
    };

    await logEmailAttempt({
      userId,
      emailType,
      recipient,
      templateId: templateId || 0,
      templateVariables: sanitizeTemplateVariables(templateVariables),
      status: 'failure',
      errorCode: errorResult.errorCode,
      errorMessage: errorResult.errorMessage,
      retryCount,
      timestamp,
      createdAt: timestamp,
    });

    logger.error('Email sending failed', {
      emailType,
      recipient,
      templateId: templateId || 0,
      error: error.message,
      errorCode: errorResult.errorCode,
      retryCount,
    });

    return errorResult;
  }
}

/**
 * Send verification email
 * 
 * @param userEmail User email address
 * @param verificationLink Verification link
 * @param userName User's first name
 * @param userId Optional user ID for logging
 * @returns Promise with email result
 */
export async function sendVerificationEmail(
  userEmail: string,
  verificationLink: string,
  userName: string,
  userId?: string
): Promise<EmailResult> {
  return sendTransactionalEmail(
    'verification',
    userEmail,
    {
      firstName: userName,
      verificationLink,
    },
    userId
  );
}

/**
 * Send password reset email
 * 
 * @param userEmail User email address
 * @param resetLink Password reset link
 * @param userName User's first name
 * @param userId Optional user ID for logging
 * @returns Promise with email result
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  resetLink: string,
  userName: string,
  userId?: string
): Promise<EmailResult> {
  return sendTransactionalEmail(
    'passwordReset',
    userEmail,
    {
      firstName: userName,
      resetLink,
    },
    userId
  );
}

/**
 * Send welcome email
 * 
 * @param userEmail User email address
 * @param userName User's first name
 * @param userId Optional user ID for logging
 * @returns Promise with email result
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  userId?: string
): Promise<EmailResult> {
  return sendTransactionalEmail(
    'welcome',
    userEmail,
    {
      firstName: userName,
    },
    userId
  );
}

/**
 * Send subscription change email
 * 
 * @param userEmail User email address
 * @param subscriptionDetails Subscription change details
 * @param userId Optional user ID for logging
 * @returns Promise with email result
 */
export async function sendSubscriptionChangeEmail(
  userEmail: string,
  subscriptionDetails: {
    firstName: string;
    oldPlan?: string;
    newPlan: string;
    effectiveDate?: string;
    billingChange?: string;
  },
  userId?: string
): Promise<EmailResult> {
  return sendTransactionalEmail(
    'subscriptionChange',
    userEmail,
    {
      firstName: subscriptionDetails.firstName,
      oldPlan: subscriptionDetails.oldPlan || 'N/A',
      newPlan: subscriptionDetails.newPlan,
      effectiveDate: subscriptionDetails.effectiveDate || new Date().toISOString(),
      billingChange: subscriptionDetails.billingChange || 'No change',
    },
    userId
  );
}

/**
 * Log email attempt to Firestore
 */
async function logEmailAttempt(logData: EmailLog): Promise<void> {
  try {
    await admin.firestore().collection('email_logs').add(logData);
  } catch (error) {
    // Don't throw - logging failure shouldn't break email sending
    logger.error('Failed to log email attempt', { error, logData });
  }
}

/**
 * Sanitize template variables before logging
 * Removes sensitive data like full verification links
 */
function sanitizeTemplateVariables(vars: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(vars)) {
    if (key.toLowerCase().includes('link') && typeof value === 'string') {
      // Only log partial link for security
      sanitized[key] = value.substring(0, 50) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}












