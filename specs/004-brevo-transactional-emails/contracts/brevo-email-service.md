# API Contract: Brevo Email Service

**Service**: `brevo/emailService.ts`  
**Purpose**: Send transactional emails via Brevo API using templates  
**Date**: 2025-01-27

## Interface

```typescript
interface EmailService {
  sendTransactionalEmail(
    emailType: EmailType,
    recipient: string,
    templateVariables: Record<string, any>,
    templateId?: number
  ): Promise<EmailResult>;
  
  sendVerificationEmail(
    userEmail: string,
    verificationLink: string,
    userName?: string
  ): Promise<EmailResult>;
  
  sendPasswordResetEmail(
    userEmail: string,
    resetLink: string,
    userName?: string
  ): Promise<EmailResult>;
  
  sendWelcomeEmail(
    userEmail: string,
    userName?: string
  ): Promise<EmailResult>;
  
  sendSubscriptionChangeEmail(
    userEmail: string,
    subscriptionDetails: SubscriptionChangeDetails
  ): Promise<EmailResult>;
}
```

## Types

### EmailType

```typescript
type EmailType = 'verification' | 'passwordReset' | 'welcome' | 'subscriptionChange';
```

### EmailResult

```typescript
interface EmailResult {
  success: boolean;
  messageId?: string; // Brevo message ID on success
  error?: string; // Error message on failure
  errorCode?: string; // Brevo API error code
  retryCount?: number; // Number of retries attempted
}
```

### SubscriptionChangeDetails

```typescript
interface SubscriptionChangeDetails {
  firstName?: string;
  oldPlan?: string;
  newPlan?: string;
  oldAmount?: number;
  newAmount?: number;
  effectiveDate?: string; // ISO date string
  billingFrequency?: string;
}
```

## Methods

### sendTransactionalEmail

**Purpose**: Generic method to send transactional emails using Brevo templates.

**Parameters**:
- `emailType` (EmailType, required): Type of email to send
- `recipient` (string, required): Recipient email address
- `templateVariables` (Record<string, any>, required): Variables to substitute in template
- `templateId` (number, optional): Override template ID (uses default if not provided)

**Returns**: `Promise<EmailResult>`

**Behavior**:
- Looks up template ID from configuration based on `emailType`
- Falls back to generic template if specific template not found
- Substitutes template variables
- Sends email via Brevo API
- Logs operation to `email_logs` collection
- Implements retry logic with exponential backoff (max 3 retries)
- Returns success/failure result

**Errors**:
- `TemplateNotFoundError`: Template ID not found in configuration
- `BrevoAPIError`: Brevo API returned an error
- `InvalidRecipientError`: Recipient email is invalid

**Example**:
```typescript
const result = await emailService.sendTransactionalEmail(
  'verification',
  'user@example.com',
  {
    firstName: 'John',
    verificationLink: 'https://app.hungr.com/verify?token=abc123'
  }
);

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### sendVerificationEmail

**Purpose**: Send email verification email to new users.

**Parameters**:
- `userEmail` (string, required): User's email address
- `verificationLink` (string, required): Email verification link (from Firebase Auth)
- `userName` (string, optional): User's first name for personalization

**Returns**: `Promise<EmailResult>`

**Behavior**:
- Uses verification template ID from configuration
- Passes `firstName` and `verificationLink` as template variables
- Sends email via `sendTransactionalEmail`
- Logs to `email_logs` with `emailType: 'verification'`

**Example**:
```typescript
const verificationLink = await admin.auth().generateEmailVerificationLink(
  userEmail,
  { url: 'https://app.hungr.com/email-verified' }
);

await emailService.sendVerificationEmail(
  userEmail,
  verificationLink,
  userData.firstName
);
```

### sendPasswordResetEmail

**Purpose**: Send password reset email to users.

**Parameters**:
- `userEmail` (string, required): User's email address
- `resetLink` (string, required): Password reset link (from Firebase Auth)
- `userName` (string, optional): User's first name for personalization

**Returns**: `Promise<EmailResult>`

**Behavior**:
- Uses password reset template ID from configuration
- Passes `firstName` and `resetLink` as template variables
- Sends email via `sendTransactionalEmail`
- Logs to `email_logs` with `emailType: 'passwordReset'`

**Example**:
```typescript
const resetLink = await admin.auth().generatePasswordResetLink(
  userEmail,
  { url: 'https://app.hungr.com/reset-password' }
);

await emailService.sendPasswordResetEmail(
  userEmail,
  resetLink,
  userData.firstName
);
```

### sendWelcomeEmail

**Purpose**: Send welcome email to new users after account creation.

**Parameters**:
- `userEmail` (string, required): User's email address
- `userName` (string, optional): User's first name for personalization

**Returns**: `Promise<EmailResult>`

**Behavior**:
- Uses welcome template ID from configuration
- Passes `firstName` as template variable
- Sends email via `sendTransactionalEmail`
- Logs to `email_logs` with `emailType: 'welcome'`

**Example**:
```typescript
await emailService.sendWelcomeEmail(
  userData.email,
  userData.firstName
);
```

### sendSubscriptionChangeEmail

**Purpose**: Send notification email when user's subscription changes.

**Parameters**:
- `userEmail` (string, required): User's email address
- `subscriptionDetails` (SubscriptionChangeDetails, required): Subscription change information

**Returns**: `Promise<EmailResult>`

**Behavior**:
- Uses subscription change template ID from configuration
- Passes subscription details as template variables
- Sends email via `sendTransactionalEmail`
- Logs to `email_logs` with `emailType: 'subscriptionChange'`

**Example**:
```typescript
await emailService.sendSubscriptionChangeEmail(
  userData.email,
  {
    firstName: userData.firstName,
    oldPlan: 'basic',
    newPlan: 'premium',
    oldAmount: 29.99,
    newAmount: 49.99,
    effectiveDate: '2025-02-01',
    billingFrequency: 'monthly'
  }
);
```

## Error Handling

### Retry Logic

- **Initial Retry**: After 1 second
- **Second Retry**: After 2 seconds
- **Third Retry**: After 4 seconds
- **Max Retries**: 3 attempts
- **Retry Conditions**: Only retry on transient errors (5xx, network failures)

### Fallback Behavior

- **Template Not Found**: Falls back to generic template
- **API Unavailable**: Logs error, returns failure (non-blocking)
- **Invalid Recipient**: Returns failure immediately (no retry)

## Logging

All email operations are logged to `email_logs` collection with:
- `userId`: User ID (if available)
- `emailType`: Type of email
- `recipient`: Recipient email
- `templateId`: Template ID used
- `status`: 'success' | 'failure' | 'retry'
- `messageId`: Brevo message ID (on success)
- `errorCode`: Error code (on failure)
- `errorMessage`: Error message (on failure)
- `retryCount`: Number of retries
- `timestamp`: Operation timestamp

## Testing

### Unit Tests

```typescript
describe('EmailService', () => {
  it('should send verification email successfully', async () => {
    const result = await emailService.sendVerificationEmail(
      'test@example.com',
      'https://app.hungr.com/verify?token=abc',
      'John'
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
  
  it('should fall back to generic template if specific template not found', async () => {
    // Mock template not found error
    const result = await emailService.sendTransactionalEmail(
      'verification',
      'test@example.com',
      { firstName: 'John' }
    );
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

- Test with real Brevo API (test account)
- Verify email delivery
- Validate template variable substitution
- Test retry logic with simulated failures












