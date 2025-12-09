# Data Model: Brevo Transactional Email Integration

**Feature**: Brevo Transactional Email Integration  
**Phase**: 1 - Design & Contracts  
**Date**: 2025-01-27

## Overview

This document defines the data structures for email logging, contact list operation tracking, and configuration management for the Brevo transactional email integration feature.

---

## Collection: `email_logs`

### Purpose

Audit trail for all transactional email sending attempts via Brevo API. Enables monitoring, troubleshooting, and compliance tracking.

### Schema

```typescript
interface EmailLog {
  id: string; // Auto-generated document ID
  userId: string; // User ID (if available)
  emailType: EmailType; // 'verification' | 'passwordReset' | 'welcome' | 'subscriptionChange'
  recipient: string; // Recipient email address
  templateId: number; // Brevo template ID used
  templateVariables?: Record<string, any>; // Variables passed to template (sanitized, no sensitive data)
  status: 'success' | 'failure' | 'retry'; // Operation status
  messageId?: string; // Brevo message ID (on success)
  errorCode?: string; // Error code from Brevo API
  errorMessage?: string; // Human-readable error message
  retryCount: number; // Number of retry attempts (default: 0)
  timestamp: Timestamp; // When the email was sent/attempted
  createdAt: Timestamp; // Document creation timestamp
  updatedAt?: Timestamp; // Last update timestamp (for retries)
}
```

### Field Descriptions

**emailType** (string, required)
- Type of transactional email: `'verification'`, `'passwordReset'`, `'welcome'`, `'subscriptionChange'`
- Used for filtering and analytics

**recipient** (string, required)
- Email address of the recipient
- Used for troubleshooting and audit purposes

**templateId** (number, required)
- Brevo template ID that was used for sending
- Falls back to generic template ID if specific template unavailable

**templateVariables** (object, optional)
- Key-value pairs of variables passed to Brevo template
- **Security Note**: Exclude sensitive data (passwords, tokens, full verification links)
- Include only: user name, partial link identifiers, subscription plan names

**status** (string, required)
- `'success'`: Email sent successfully
- `'failure'`: Final failure after all retries
- `'retry'`: Retry attempt (intermediate state)

**messageId** (string, optional)
- Brevo message ID returned on successful send
- Format: `"xxxxxxxxxxxxx.xxxxxxxxxx.1@smtp-relay.mailin.fr"`
- Used for tracking and support queries

**errorCode** (string, optional)
- Brevo API error code (e.g., `'invalid_parameter'`, `'document_not_found'`)
- Used for error categorization and monitoring

**errorMessage** (string, optional)
- Human-readable error message from Brevo API
- Used for troubleshooting and support

**retryCount** (number, default: 0)
- Number of retry attempts made
- Increments on each retry
- Maximum: 3 retries

**timestamp** (Timestamp, required)
- When the email sending operation occurred
- Used for time-based queries and analytics

### Indexes

```typescript
// Composite index for querying by user and email type
email_logs: [userId, emailType, timestamp]

// Index for querying failures
email_logs: [status, timestamp]

// Index for querying by recipient (support queries)
email_logs: [recipient, timestamp]
```

### Example Document

```json
{
  "id": "email_log_abc123",
  "userId": "user_xyz789",
  "emailType": "verification",
  "recipient": "user@example.com",
  "templateId": 123,
  "templateVariables": {
    "firstName": "John",
    "verificationLink": "https://app.hungr.com/verify?token=***"
  },
  "status": "success",
  "messageId": "xxxxxxxxxxxxx.xxxxxxxxxx.1@smtp-relay.mailin.fr",
  "retryCount": 0,
  "timestamp": "2025-01-27T10:30:00Z",
  "createdAt": "2025-01-27T10:30:00Z"
}
```

---

## Collection: `contact_list_logs`

### Purpose

Audit trail for all Brevo contact list operations (add/remove). Tracks campaign subscription management for compliance and troubleshooting.

### Schema

```typescript
interface ContactListLog {
  id: string; // Auto-generated document ID
  userId: string; // User ID
  userEmail: string; // User email address
  contactListType: ContactListType; // 'marketing' | 'tips' | 'insights'
  listId: number; // Brevo contact list ID
  operation: 'add' | 'remove'; // Operation type
  status: 'success' | 'failure' | 'retry'; // Operation status
  errorCode?: string; // Brevo API error code
  errorMessage?: string; // Human-readable error message
  retryCount: number; // Number of retry attempts (default: 0)
  timestamp: Timestamp; // When the operation occurred
  createdAt: Timestamp; // Document creation timestamp
  updatedAt?: Timestamp; // Last update timestamp (for retries)
  context?: {
    preferenceField: string; // 'marketingConsent' | 'tipsTutorials' | 'userInsights'
    previousValue?: boolean; // Previous preference value
    newValue?: boolean; // New preference value
  }; // Context about what triggered the operation
}
```

### Field Descriptions

**contactListType** (string, required)
- Type of contact list: `'marketing'`, `'tips'`, `'insights'`
- Maps to user preference fields

**listId** (number, required)
- Brevo contact list ID
- Pre-configured in Brevo dashboard

**operation** (string, required)
- `'add'`: Adding contact to list
- `'remove'`: Removing contact from list

**status** (string, required)
- `'success'`: Operation completed successfully
- `'failure'`: Final failure after all retries
- `'retry'`: Retry attempt (intermediate state)

**context** (object, optional)
- Additional context about the operation
- `preferenceField`: Which user preference triggered the operation
- `previousValue` / `newValue`: Preference values for audit trail

### Indexes

```typescript
// Composite index for querying by user and list type
contact_list_logs: [userId, contactListType, timestamp]

// Index for querying failures
contact_list_logs: [status, timestamp]

// Index for querying by email (support queries)
contact_list_logs: [userEmail, timestamp]
```

### Example Document

```json
{
  "id": "contact_log_def456",
  "userId": "user_xyz789",
  "userEmail": "user@example.com",
  "contactListType": "marketing",
  "listId": 65,
  "operation": "add",
  "status": "success",
  "retryCount": 0,
  "timestamp": "2025-01-27T10:30:00Z",
  "createdAt": "2025-01-27T10:30:00Z",
  "context": {
    "preferenceField": "marketingConsent",
    "previousValue": false,
    "newValue": true
  }
}
```

---

## Collection: `brevo_config` (Optional - Alternative to Environment Variables)

### Purpose

Stores Brevo template and contact list IDs in Firestore. Allows runtime configuration updates without redeployment. Alternative to environment variables.

### Schema

```typescript
interface BrevoConfig {
  id: string; // Document ID: 'templates' or 'contactLists'
  templates: {
    verification: number; // Template ID for email verification
    passwordReset: number; // Template ID for password reset
    welcome: number; // Template ID for welcome email
    subscriptionChange: number; // Template ID for subscription change
    generic: number; // Fallback generic template ID
  };
  contactLists: {
    marketing: number; // Contact list ID for marketing
    tips: number; // Contact list ID for tips and tutorials
    insights: number; // Contact list ID for user insights
  };
  sender: {
    email: string; // Sender email address
    name: string; // Sender name
  };
  updatedAt: Timestamp; // Last update timestamp
  updatedBy: string; // User ID who updated (if applicable)
}
```

### Field Descriptions

**templates** (object, required)
- Mapping of email types to Brevo template IDs
- All template IDs must be integers
- `generic` is required as fallback

**contactLists** (object, required)
- Mapping of contact list types to Brevo list IDs
- All list IDs must be integers

**sender** (object, required)
- Default sender information for emails
- Email must be verified in Brevo dashboard

### Example Document

```json
{
  "id": "templates",
  "templates": {
    "verification": 123,
    "passwordReset": 124,
    "welcome": 125,
    "subscriptionChange": 126,
    "generic": 127
  },
  "contactLists": {
    "marketing": 65,
    "tips": 66,
    "insights": 67
  },
  "sender": {
    "email": "noreply@hungr.com",
    "name": "Hungr"
  },
  "updatedAt": "2025-01-27T10:00:00Z"
}
```

**Note**: This collection is optional. Configuration can also be managed via environment variables or Firebase config. Choose based on deployment strategy.

---

## User Document Extensions

### Existing Fields (No Changes Required)

The user document already contains the following fields that are used by this feature:

```typescript
interface User {
  uid: string;
  email: string;
  firstName: string;
  Surname: string;
  marketingConsent: boolean; // Used for marketing contact list
  tipsTutorials: boolean; // Used for tips contact list
  userInsights: boolean; // Used for insights contact list
  emailVerified: boolean;
  // ... other existing fields
}
```

### No New Fields Required

This feature does not require adding new fields to the user document. All necessary data already exists.

---

## Type Definitions

### EmailType

```typescript
type EmailType = 'verification' | 'passwordReset' | 'welcome' | 'subscriptionChange';
```

### ContactListType

```typescript
type ContactListType = 'marketing' | 'tips' | 'insights';
```

### EmailStatus

```typescript
type EmailStatus = 'success' | 'failure' | 'retry';
```

### ContactListOperation

```typescript
type ContactListOperation = 'add' | 'remove';
```

---

## Data Retention

### Recommended Retention Policies

1. **email_logs**:
   - Retain for 90 days for operational monitoring
   - Archive older logs for compliance (if required)
   - Delete after 1 year (unless compliance requires longer)

2. **contact_list_logs**:
   - Retain for 1 year for compliance (email marketing regulations)
   - Archive older logs if needed for audit
   - Delete after 2 years (unless compliance requires longer)

### Implementation

Retention can be implemented via:
- Scheduled Cloud Function to delete old documents
- Firestore TTL (Time To Live) policies (if supported)
- Manual cleanup scripts

---

## Migration Notes

### Initial Setup

1. **email_logs collection**:
   - No migration needed (new collection)
   - Will be populated as emails are sent

2. **contact_list_logs collection**:
   - No migration needed (new collection)
   - Will be populated as preferences change

3. **brevo_config collection** (if used):
   - Create initial document with template/list IDs
   - Update via admin interface or script

### Backward Compatibility

- No changes to existing user documents
- No changes to existing collections
- All new functionality is additive

---

## Security Considerations

### Data Privacy

1. **Email Addresses**:
   - Stored in logs for audit purposes
   - Required for email delivery
   - Access restricted to admin users only

2. **Template Variables**:
   - Exclude sensitive data (passwords, full tokens)
   - Store only necessary personalization data
   - Sanitize before logging

3. **Access Control**:
   - Logs collections: Admin read-only access
   - Config collection: Admin read/write access
   - User documents: Existing access rules apply

### Firestore Rules

```javascript
// email_logs - Admin only
match /email_logs/{logId} {
  allow read: if request.auth != null && isAdmin();
  allow write: if false; // Only Cloud Functions can write
}

// contact_list_logs - Admin only
match /contact_list_logs/{logId} {
  allow read: if request.auth != null && isAdmin();
  allow write: if false; // Only Cloud Functions can write
}

// brevo_config - Admin only
match /brevo_config/{configId} {
  allow read: if request.auth != null && isAdmin();
  allow write: if request.auth != null && isAdmin();
}
```

---

## Performance Considerations

### Query Optimization

1. **Indexes**:
   - Create composite indexes for common query patterns
   - Index on `timestamp` for time-based queries
   - Index on `status` for filtering failures

2. **Pagination**:
   - Use Firestore pagination for large result sets
   - Limit queries to reasonable time ranges
   - Use `limit()` to prevent large reads

3. **Collection Size**:
   - Monitor collection growth
   - Implement retention policies
   - Consider archiving old logs

### Write Performance

- Log writes are asynchronous (don't block email sending)
- Batch writes when possible
- Use Firestore batch operations for multiple logs














