# API Contract: Firestore Triggers

**Services**: `triggers/userCreated.ts`, `triggers/userPreferencesUpdated.ts`  
**Purpose**: Firestore document triggers for user creation and preference updates  
**Date**: 2025-01-27

## Trigger: onUserCreated

**File**: `triggers/userCreated.ts`  
**Trigger Type**: `onDocumentCreated`  
**Document Path**: `users/{userId}`

### Purpose

Triggered when a new user document is created in Firestore. Sends verification and welcome emails via Brevo and adds user to contact lists based on initial preferences.

### Configuration

```typescript
export const onUserCreated = onDocumentCreated(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (event) => {
    // Handler implementation
  }
);
```

### Event Object

```typescript
interface UserCreatedEvent {
  params: {
    userId: string; // Document ID (user UID)
  };
  data: {
    data(): UserData; // User document data
    id: string; // Document ID
  };
}
```

### UserData Structure

```typescript
interface UserData {
  email: string;
  firstName?: string;
  Surname?: string;
  marketingConsent?: boolean;
  tipsTutorials?: boolean;
  userInsights?: boolean;
  emailVerified?: boolean;
  // ... other user fields
}
```

### Behavior

1. **Extract User Data**:
   - Get user email, name, and preferences from document
   - Validate required fields (email)

2. **Generate Verification Link**:
   - Use `admin.auth().generateEmailVerificationLink()`
   - Configure action code settings for redirect URL

3. **Send Verification Email**:
   - Call `emailService.sendVerificationEmail()`
   - Pass user email, verification link, and name
   - Log to `email_logs` collection

4. **Send Welcome Email**:
   - Call `emailService.sendWelcomeEmail()`
   - Pass user email and name
   - Log to `email_logs` collection

5. **Sync Contact Lists**:
   - If `marketingConsent` is true, add to marketing list
   - If `tipsTutorials` is true, add to tips list
   - If `userInsights` is true, add to insights list
   - Log each operation to `contact_list_logs` collection

6. **Error Handling**:
   - All operations are non-blocking
   - Failures are logged but don't prevent user creation
   - Errors don't throw (allow user document creation to succeed)

### Example Implementation

```typescript
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
      await emailService.sendVerificationEmail(
        userData.email,
        verificationLink,
        userData.firstName
      );
      
      // Send welcome email
      await emailService.sendWelcomeEmail(
        userData.email,
        userData.firstName
      );
      
      // Sync contact lists
      if (userData.marketingConsent) {
        await contactListService.addContactToList('marketing', userData.email, {
          FNAME: userData.firstName,
          LNAME: userData.Surname
        });
      }
      
      if (userData.tipsTutorials) {
        await contactListService.addContactToList('tips', userData.email);
      }
      
      if (userData.userInsights) {
        await contactListService.addContactToList('insights', userData.email);
      }
      
      logger.info('User creation processing complete', { userId });
    } catch (error: any) {
      logger.error('Error processing user creation', {
        userId,
        error: error.message
      });
      // Don't throw - allow user creation to succeed
    }
  }
);
```

### Error Scenarios

- **Email Sending Fails**: Logged, user creation still succeeds
- **Contact List Operation Fails**: Logged, user creation still succeeds
- **Verification Link Generation Fails**: Logged, user creation still succeeds
- **Missing Required Fields**: Logged, skip email operations

---

## Trigger: onUserPreferencesUpdated

**File**: `triggers/userPreferencesUpdated.ts`  
**Trigger Type**: `onDocumentWritten`  
**Document Path**: `users/{userId}`

### Purpose

Triggered when a user document is updated in Firestore. Detects changes to marketing preferences and syncs contact lists accordingly.

### Configuration

```typescript
export const onUserPreferencesUpdated = onDocumentWritten(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (event) => {
    // Handler implementation
  }
);
```

### Event Object

```typescript
interface UserPreferencesUpdatedEvent {
  params: {
    userId: string; // Document ID (user UID)
  };
  data: {
    before?: {
      data(): UserData; // User data before update
    };
    after?: {
      data(): UserData; // User data after update
    };
  };
}
```

### Behavior

1. **Detect Document Type**:
   - Skip if `before` is null (document created)
   - Skip if `after` is null (document deleted)
   - Process only if both exist (document updated)

2. **Detect Preference Changes**:
   - Compare `marketingConsent` before/after
   - Compare `tipsTutorials` before/after
   - Compare `userInsights` before/after

3. **Sync Contact Lists**:
   - **marketingConsent**: Add if true, remove if false (changed from previous)
   - **tipsTutorials**: Add if true, remove if false (changed from previous)
   - **userInsights**: Add if true, remove if false (changed from previous)

4. **Log Operations**:
   - Log each contact list operation to `contact_list_logs`
   - Include context (preference field, old/new values)

5. **Error Handling**:
   - All operations are non-blocking
   - Failures are logged but don't prevent preference updates
   - Errors don't throw (allow preference update to succeed)

### Example Implementation

```typescript
export const onUserPreferencesUpdated = onDocumentWritten(
  {
    document: 'users/{userId}',
    secrets: [brevoApiKey],
    region: 'us-central1'
  },
  async (event) => {
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();
    
    // Skip creates and deletes
    if (!beforeData || !afterData) {
      return;
    }
    
    const userEmail = afterData.email;
    const userId = event.params.userId;
    
    logger.info('User preferences updated', { userId });
    
    try {
      // Check marketingConsent changes
      if (beforeData.marketingConsent !== afterData.marketingConsent) {
        if (afterData.marketingConsent) {
          await contactListService.addContactToList('marketing', userEmail, {
            FNAME: afterData.firstName,
            LNAME: afterData.Surname
          });
        } else {
          await contactListService.removeContactFromList('marketing', userEmail);
        }
      }
      
      // Check tipsTutorials changes
      if (beforeData.tipsTutorials !== afterData.tipsTutorials) {
        if (afterData.tipsTutorials) {
          await contactListService.addContactToList('tips', userEmail);
        } else {
          await contactListService.removeContactFromList('tips', userEmail);
        }
      }
      
      // Check userInsights changes
      if (beforeData.userInsights !== afterData.userInsights) {
        if (afterData.userInsights) {
          await contactListService.addContactToList('insights', userEmail);
        } else {
          await contactListService.removeContactFromList('insights', userEmail);
        }
      }
      
      logger.info('User preferences synced to Brevo', { userId });
    } catch (error: any) {
      logger.error('Error syncing user preferences', {
        userId,
        error: error.message
      });
      // Don't throw - allow preference update to succeed
    }
  }
);
```

### Change Detection Logic

```typescript
// Only process if value actually changed
if (beforeData.marketingConsent !== afterData.marketingConsent) {
  // Process change
}

// Skip if value unchanged
if (beforeData.marketingConsent === afterData.marketingConsent) {
  // Skip (no change)
}
```

### Error Scenarios

- **Contact List Operation Fails**: Logged, preference update still succeeds
- **Missing Email**: Logged, skip contact list operations
- **Invalid List ID**: Logged, skip operation (fallback to generic if configured)

---

## Common Patterns

### Non-Blocking Operations

All email and contact list operations are non-blocking:

```typescript
try {
  await emailService.sendVerificationEmail(...);
} catch (error) {
  logger.error('Email failed', error);
  // Don't throw - allow operation to continue
}
```

### Logging Pattern

All operations log to Firestore collections:

```typescript
await admin.firestore().collection('email_logs').add({
  userId,
  emailType: 'verification',
  recipient: userEmail,
  status: 'success',
  messageId: result.messageId,
  timestamp: admin.firestore.FieldValue.serverTimestamp()
});
```

### Retry Logic

Retry logic is handled in service layer, not in triggers:

```typescript
// Service layer handles retries
const result = await emailService.sendTransactionalEmail(...);

// Trigger just logs the result
if (!result.success) {
  logger.error('Email failed after retries', result.error);
}
```

## Testing

### Unit Tests

```typescript
describe('onUserCreated', () => {
  it('should send verification and welcome emails', async () => {
    // Mock Firestore event
    const event = createMockEvent({
      userId: 'user123',
      userData: {
        email: 'test@example.com',
        firstName: 'John',
        marketingConsent: true
      }
    });
    
    await onUserCreated(event);
    
    // Verify emails sent
    expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
  });
});

describe('onUserPreferencesUpdated', () => {
  it('should sync contact lists on preference change', async () => {
    // Mock Firestore event with before/after data
    const event = createMockUpdateEvent({
      userId: 'user123',
      before: { marketingConsent: false },
      after: { marketingConsent: true, email: 'test@example.com' }
    });
    
    await onUserPreferencesUpdated(event);
    
    // Verify contact added
    expect(contactListService.addContactToList).toHaveBeenCalledWith(
      'marketing',
      'test@example.com'
    );
  });
});
```

### Integration Tests

- Test with Firebase Emulator
- Create/update user documents
- Verify triggers execute
- Check email_logs and contact_list_logs collections












