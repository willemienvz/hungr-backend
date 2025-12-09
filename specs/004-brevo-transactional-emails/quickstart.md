# Quickstart: Brevo Transactional Email Integration

**Feature**: Brevo Transactional Email Integration  
**Date**: 2025-01-27

## Overview

This guide helps developers quickly understand and implement the Brevo transactional email integration. The feature replaces existing email sending mechanisms (Firebase Auth defaults, AWS Lambda) with Brevo template-based sending and implements automated campaign subscription management.

## Prerequisites

- Firebase CLI installed and authenticated
- Node.js 20+ installed
- TypeScript 4.9+ installed
- Access to Firebase project: `hungr-firebase`
- Brevo account with API key
- Brevo templates created in dashboard (verification, password reset, welcome, subscription change, generic)
- Brevo contact lists created in dashboard (marketing, tips, insights)

## Architecture Overview

```
User Registration/Preference Change
    ↓
Firestore Document Created/Updated
    ↓
Firebase Functions v2 Trigger
    ├─→ onUserCreated (users/{userId})
    │   ├─→ Send verification email via Brevo
    │   ├─→ Send welcome email via Brevo
    │   └─→ Add to contact lists (if preferences enabled)
    │
    └─→ onUserPreferencesUpdated (users/{userId})
        └─→ Sync contact lists based on preference changes
             ↓
    Brevo Service Layer
    ├─→ emailService.sendTransactionalEmail()
    └─→ contactListService.addContactToList() / removeContactFromList()
         ↓
    Brevo API
    ├─→ Transactional Emails
    └─→ Contact Lists
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd functions
npm install @getbrevo/brevo --save
npm install --save-dev @types/node
```

### Step 2: Configure Firebase Secrets

```bash
# Set Brevo API key as Firebase secret
firebase functions:secrets:set BREVO_API_KEY

# Enter your Brevo API key when prompted
```

### Step 3: Create Brevo Service Layer

Create the base Brevo service:

```typescript
// functions/src/brevo/brevoService.ts
import * as brevo from '@getbrevo/brevo';
import { defineSecret } from 'firebase-functions/params';

const brevoApiKey = defineSecret('BREVO_API_KEY');

export function getBrevoClient() {
  const apiInstance = new brevo.TransactionalEmailsApi();
  const apiKey = apiInstance.authentications['api-key'];
  apiKey.apiKey = brevoApiKey.value();
  return apiInstance;
}
```

### Step 4: Create Email Service

```typescript
// functions/src/brevo/emailService.ts
import { getBrevoClient } from './brevoService';
import * as brevo from '@getbrevo/brevo';
import * as logger from 'firebase-functions/logger';

export async function sendTransactionalEmail(
  emailType: 'verification' | 'passwordReset' | 'welcome' | 'subscriptionChange',
  recipient: string,
  templateVariables: Record<string, any>,
  templateId?: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiInstance = getBrevoClient();
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    // Get template ID from config (or use provided)
    const finalTemplateId = templateId || getTemplateId(emailType);
    
    sendSmtpEmail.templateId = finalTemplateId;
    sendSmtpEmail.to = [{ email: recipient }];
    sendSmtpEmail.params = templateVariables;
    sendSmtpEmail.sender = {
      email: 'noreply@hungr.com',
      name: 'Hungr'
    };
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    logger.info('Email sent successfully', {
      emailType,
      recipient,
      messageId: result.messageId
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    logger.error('Email sending failed', {
      emailType,
      recipient,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}
```

### Step 5: Create Contact List Service

```typescript
// functions/src/brevo/contactListService.ts
import * as brevo from '@getbrevo/brevo';
import * as logger from 'firebase-functions/logger';
import { getBrevoClient } from './brevoService';

export async function addContactToList(
  listType: 'marketing' | 'tips' | 'insights',
  email: string,
  attributes?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiInstance = new brevo.ContactsApi();
    const apiKey = apiInstance.authentications['api-key'];
    apiKey.apiKey = getBrevoApiKey();
    
    const listId = getContactListId(listType);
    
    await apiInstance.addContactToList(listId, {
      emails: [email]
    });
    
    logger.info('Contact added to list', { listType, email, listId });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to add contact to list', {
      listType,
      email,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

export async function removeContactFromList(
  listType: 'marketing' | 'tips' | 'insights',
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiInstance = new brevo.ContactsApi();
    const apiKey = apiInstance.authentications['api-key'];
    apiKey.apiKey = getBrevoApiKey();
    
    const listId = getContactListId(listType);
    
    await apiInstance.removeContactFromList(listId, {
      emails: [email]
    });
    
    logger.info('Contact removed from list', { listType, email, listId });
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to remove contact from list', {
      listType,
      email,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}
```

### Step 6: Create Firestore Triggers

```typescript
// functions/src/triggers/userCreated.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { sendTransactionalEmail } from '../brevo/emailService';
import { addContactToList } from '../brevo/contactListService';

const brevoApiKey = defineSecret('BREVO_API_KEY');

export const onUserCreated = onDocumentCreated(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1'
  },
  async (event) => {
    const userData = event.data.data();
    const userId = event.params.userId;
    
    logger.info('New user created', { userId, email: userData.email });
    
    try {
      // Generate verification link
      const verificationLink = await admin.auth().generateEmailVerificationLink(
        userData.email,
        {
          url: 'https://hungr.com/email-verified',
          handleCodeInApp: true
        }
      );
      
      // Send verification email
      await sendTransactionalEmail(
        'verification',
        userData.email,
        {
          firstName: userData.firstName || 'User',
          verificationLink
        }
      );
      
      // Send welcome email
      await sendTransactionalEmail(
        'welcome',
        userData.email,
        {
          firstName: userData.firstName || 'User'
        }
      );
      
      // Add to contact lists based on preferences
      if (userData.marketingConsent) {
        await addContactToList('marketing', userData.email, {
          FNAME: userData.firstName,
          LNAME: userData.Surname
        });
      }
      
      if (userData.tipsTutorials) {
        await addContactToList('tips', userData.email);
      }
      
      if (userData.userInsights) {
        await addContactToList('insights', userData.email);
      }
      
      logger.info('User creation processing complete', { userId });
    } catch (error: any) {
      logger.error('Error processing user creation', {
        userId,
        error: error.message
      });
      // Don't throw - allow user creation to succeed even if emails fail
    }
  }
);
```

### Step 7: Create Preference Update Trigger

```typescript
// functions/src/triggers/userPreferencesUpdated.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { addContactToList, removeContactFromList } from '../brevo/contactListService';

const brevoApiKey = defineSecret('BREVO_API_KEY');

export const onUserPreferencesUpdated = onDocumentWritten(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1'
  },
  async (event) => {
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();
    
    if (!beforeData || !afterData) {
      return; // Skip creates and deletes
    }
    
    const userEmail = afterData.email;
    const userId = event.params.userId;
    
    // Check marketingConsent changes
    if (beforeData.marketingConsent !== afterData.marketingConsent) {
      if (afterData.marketingConsent) {
        await addContactToList('marketing', userEmail, {
          FNAME: afterData.firstName,
          LNAME: afterData.Surname
        });
      } else {
        await removeContactFromList('marketing', userEmail);
      }
    }
    
    // Check tipsTutorials changes
    if (beforeData.tipsTutorials !== afterData.tipsTutorials) {
      if (afterData.tipsTutorials) {
        await addContactToList('tips', userEmail);
      } else {
        await removeContactFromList('tips', userEmail);
      }
    }
    
    // Check userInsights changes
    if (beforeData.userInsights !== afterData.userInsights) {
      if (afterData.userInsights) {
        await addContactToList('insights', userEmail);
      } else {
        await removeContactFromList('insights', userEmail);
      }
    }
    
    logger.info('User preferences synced to Brevo', { userId });
  }
);
```

### Step 8: Export Functions

```typescript
// functions/src/index.ts
export { onUserCreated } from './triggers/userCreated';
export { onUserPreferencesUpdated } from './triggers/userPreferencesUpdated';
```

### Step 9: Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Testing

### Local Testing

1. **Start Firebase Emulator**:
   ```bash
   firebase emulators:start
   ```

2. **Create Test User Document**:
   ```typescript
   // In emulator console or test script
   await admin.firestore().collection('users').doc('test-user').set({
     email: 'test@example.com',
     firstName: 'Test',
     Surname: 'User',
     marketingConsent: true,
     tipsTutorials: false,
     userInsights: true
   });
   ```

3. **Verify Trigger Execution**:
   - Check emulator logs for trigger execution
   - Verify email logs in Firestore
   - Check contact list logs

### Production Testing

1. **Test Email Sending**:
   - Create a test user account
   - Verify emails are received
   - Check email_logs collection

2. **Test Contact List Sync**:
   - Update user preferences in settings
   - Verify contacts added/removed in Brevo dashboard
   - Check contact_list_logs collection

## Configuration

### Template IDs

Set template IDs in environment variables or Firestore config:

```typescript
// Environment variables (recommended)
process.env.BREVO_TEMPLATE_VERIFICATION = "123";
process.env.BREVO_TEMPLATE_PASSWORD_RESET = "124";
process.env.BREVO_TEMPLATE_WELCOME = "125";
process.env.BREVO_TEMPLATE_SUBSCRIPTION_CHANGE = "126";
process.env.BREVO_TEMPLATE_GENERIC = "127";
```

### Contact List IDs

```typescript
process.env.BREVO_LIST_MARKETING = "65";
process.env.BREVO_LIST_TIPS = "66";
process.env.BREVO_LIST_INSIGHTS = "67";
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**:
   - Verify secret is set: `firebase functions:secrets:access BREVO_API_KEY`
   - Check function has `secrets: [brevoApiKey]` in configuration

2. **Template Not Found**:
   - Verify template ID exists in Brevo dashboard
   - Check template is active
   - System will fall back to generic template

3. **Contact List Not Found**:
   - Verify list ID exists in Brevo dashboard
   - Check list is active
   - Operation will fail gracefully (logged, not blocking)

4. **Emails Not Received**:
   - Check email_logs collection for status
   - Verify recipient email is valid
   - Check Brevo dashboard for delivery status
   - Verify sender email is verified in Brevo

## Next Steps

1. Set up Brevo templates in dashboard
2. Create contact lists in Brevo dashboard
3. Configure template and list IDs
4. Deploy functions
5. Test end-to-end flow
6. Monitor email_logs and contact_list_logs collections














