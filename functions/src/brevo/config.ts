/**
 * Brevo Configuration Manager
 * 
 * Manages template IDs and contact list IDs for Brevo integration.
 * Configuration can be provided via environment variables or Firestore config document.
 */

import * as admin from 'firebase-admin';

/**
 * Email template type definitions
 */
export type EmailType = 'verification' | 'passwordReset' | 'welcome' | 'subscriptionChange';

/**
 * Contact list type definitions
 */
export type ContactListType = 'marketing' | 'tips' | 'insights';

/**
 * Brevo configuration interface
 */
export interface BrevoConfig {
  templates: {
    verification: number;
    passwordReset: number;
    welcome: number;
    subscriptionChange: number;
    generic: number; // Fallback template
  };
  contactLists: {
    marketing: number;
    tips: number;
    insights: number;
  };
  sender: {
    email: string;
    name: string;
  };
}

/**
 * Default configuration (from environment variables)
 */
const getDefaultConfig = (): BrevoConfig => {
  return {
    templates: {
      verification: parseInt(process.env.BREVO_TEMPLATE_VERIFICATION || '0'),
      passwordReset: parseInt(process.env.BREVO_TEMPLATE_PASSWORD_RESET || '0'),
      welcome: parseInt(process.env.BREVO_TEMPLATE_WELCOME || '0'),
      subscriptionChange: parseInt(process.env.BREVO_TEMPLATE_SUBSCRIPTION_CHANGE || '0'),
      generic: parseInt(process.env.BREVO_TEMPLATE_GENERIC || '0'),
    },
    contactLists: {
      marketing: parseInt(process.env.BREVO_LIST_MARKETING || '0'),
      tips: parseInt(process.env.BREVO_LIST_TIPS || '0'),
      insights: parseInt(process.env.BREVO_LIST_INSIGHTS || '0'),
    },
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@hungr.com',
      name: process.env.BREVO_SENDER_NAME || 'Hungr',
    },
  };
};

/**
 * Get template ID for email type
 * Falls back to generic template if specific template not found
 */
export async function getTemplateId(emailType: EmailType): Promise<number> {
  const config = await getConfig();
  const templateId = config.templates[emailType];
  
  // If specific template is not configured, fall back to generic
  if (!templateId || templateId === 0) {
    if (config.templates.generic && config.templates.generic !== 0) {
      return config.templates.generic;
    }
    throw new Error(`No template configured for ${emailType} and no generic template available`);
  }
  
  return templateId;
}

/**
 * Get contact list ID for contact list type
 */
export async function getContactListId(contactListType: ContactListType): Promise<number> {
  const config = await getConfig();
  const listId = config.contactLists[contactListType];
  
  if (!listId || listId === 0) {
    throw new Error(`No contact list configured for ${contactListType}`);
  }
  
  return listId;
}

/**
 * Get sender configuration
 */
export async function getSenderConfig(): Promise<{ email: string; name: string }> {
  const config = await getConfig();
  return config.sender;
}

/**
 * Get full Brevo configuration
 * Checks Firestore config document first, then falls back to environment variables
 */
let cachedConfig: BrevoConfig | null = null;
let configCacheTime: number = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getConfig(): Promise<BrevoConfig> {
  // Return cached config if still valid
  if (cachedConfig && Date.now() - configCacheTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    // Try to get config from Firestore
    const configDoc = await admin.firestore().doc('brevo_config/templates').get();
    
    if (configDoc.exists) {
      const firestoreConfig = configDoc.data() as BrevoConfig;
      cachedConfig = firestoreConfig;
      configCacheTime = Date.now();
      return firestoreConfig;
    }
  } catch (error) {
    // If Firestore read fails, fall back to environment variables
    console.warn('Failed to read Brevo config from Firestore, using environment variables', error);
  }

  // Fall back to environment variables
  cachedConfig = getDefaultConfig();
  configCacheTime = Date.now();
  return cachedConfig;
}

/**
 * Validate template ID is a valid integer
 */
export function validateTemplateId(templateId: number): boolean {
  return Number.isInteger(templateId) && templateId > 0;
}

/**
 * Validate contact list ID is a valid integer
 */
export function validateContactListId(listId: number): boolean {
  return Number.isInteger(listId) && listId > 0;
}












