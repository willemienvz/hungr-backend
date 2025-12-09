# API Contract: Brevo Contact List Service

**Service**: `brevo/contactListService.ts`  
**Purpose**: Manage user subscriptions to Brevo contact lists based on preferences  
**Date**: 2025-01-27

## Interface

```typescript
interface ContactListService {
  addContactToList(
    listType: ContactListType,
    email: string,
    attributes?: Record<string, any>
  ): Promise<ContactListResult>;
  
  removeContactFromList(
    listType: ContactListType,
    email: string
  ): Promise<ContactListResult>;
  
  syncUserPreferences(
    userId: string,
    email: string,
    preferences: UserPreferences
  ): Promise<SyncResult>;
}
```

## Types

### ContactListType

```typescript
type ContactListType = 'marketing' | 'tips' | 'insights';
```

### ContactListResult

```typescript
interface ContactListResult {
  success: boolean;
  error?: string; // Error message on failure
  errorCode?: string; // Brevo API error code
  retryCount?: number; // Number of retries attempted
}
```

### UserPreferences

```typescript
interface UserPreferences {
  marketingConsent: boolean;
  tipsTutorials: boolean;
  userInsights: boolean;
}
```

### SyncResult

```typescript
interface SyncResult {
  success: boolean;
  operations: {
    marketing: ContactListResult;
    tips: ContactListResult;
    insights: ContactListResult;
  };
  errors?: string[]; // Array of error messages
}
```

## Methods

### addContactToList

**Purpose**: Add a contact to a Brevo contact list.

**Parameters**:
- `listType` (ContactListType, required): Type of contact list
- `email` (string, required): Contact email address
- `attributes` (Record<string, any>, optional): Contact attributes (e.g., FNAME, LNAME)

**Returns**: `Promise<ContactListResult>`

**Behavior**:
- Looks up contact list ID from configuration based on `listType`
- Adds contact to list via Brevo API
- Handles duplicate contacts gracefully (idempotent operation)
- Logs operation to `contact_list_logs` collection
- Implements retry logic with exponential backoff (max 3 retries)
- Returns success/failure result

**Errors**:
- `ListNotFoundError`: Contact list ID not found in configuration
- `BrevoAPIError`: Brevo API returned an error
- `InvalidEmailError`: Email address is invalid

**Example**:
```typescript
const result = await contactListService.addContactToList(
  'marketing',
  'user@example.com',
  {
    FNAME: 'John',
    LNAME: 'Doe'
  }
);

if (result.success) {
  console.log('Contact added to marketing list');
} else {
  console.error('Failed to add contact:', result.error);
}
```

### removeContactFromList

**Purpose**: Remove a contact from a Brevo contact list.

**Parameters**:
- `listType` (ContactListType, required): Type of contact list
- `email` (string, required): Contact email address

**Returns**: `Promise<ContactListResult>`

**Behavior**:
- Looks up contact list ID from configuration based on `listType`
- Removes contact from list via Brevo API
- Handles contact not found gracefully (idempotent operation)
- Logs operation to `contact_list_logs` collection
- Implements retry logic with exponential backoff (max 3 retries)
- Returns success/failure result

**Errors**:
- `ListNotFoundError`: Contact list ID not found in configuration
- `BrevoAPIError`: Brevo API returned an error
- `InvalidEmailError`: Email address is invalid

**Example**:
```typescript
const result = await contactListService.removeContactFromList(
  'marketing',
  'user@example.com'
);

if (result.success) {
  console.log('Contact removed from marketing list');
} else {
  console.error('Failed to remove contact:', result.error);
}
```

### syncUserPreferences

**Purpose**: Sync all user preferences to Brevo contact lists in a single operation.

**Parameters**:
- `userId` (string, required): User ID
- `email` (string, required): User email address
- `preferences` (UserPreferences, required): Current user preferences

**Returns**: `Promise<SyncResult>`

**Behavior**:
- Adds user to marketing list if `marketingConsent` is true, removes if false
- Adds user to tips list if `tipsTutorials` is true, removes if false
- Adds user to insights list if `userInsights` is true, removes if false
- Performs all operations independently (failures don't block other operations)
- Logs each operation to `contact_list_logs` collection
- Returns aggregated result with individual operation results

**Example**:
```typescript
const result = await contactListService.syncUserPreferences(
  userData.uid,
  userData.email,
  {
    marketingConsent: true,
    tipsTutorials: false,
    userInsights: true
  }
);

if (result.success) {
  console.log('All preferences synced successfully');
} else {
  console.error('Some operations failed:', result.errors);
}
```

## Mapping: Preferences to Contact Lists

| User Preference | Contact List Type | List ID Config Key |
|----------------|-------------------|-------------------|
| `marketingConsent` | `'marketing'` | `BREVO_LIST_MARKETING` |
| `tipsTutorials` | `'tips'` | `BREVO_LIST_TIPS` |
| `userInsights` | `'insights'` | `BREVO_LIST_INSIGHTS` |

## Error Handling

### Retry Logic

- **Initial Retry**: After 1 second
- **Second Retry**: After 2 seconds
- **Third Retry**: After 4 seconds
- **Max Retries**: 3 attempts
- **Retry Conditions**: Only retry on transient errors (5xx, network failures)

### Idempotency

- **Duplicate Add**: Brevo API handles gracefully (contact already in list)
- **Remove Not Found**: Brevo API handles gracefully (contact not in list)
- Operations are safe to retry

### Non-Blocking Behavior

- **Failures Don't Block**: Contact list operation failures don't prevent user preference updates
- **Errors Logged**: All failures logged for monitoring and manual intervention
- **Graceful Degradation**: System continues to function even if Brevo API is unavailable

## Logging

All contact list operations are logged to `contact_list_logs` collection with:
- `userId`: User ID
- `userEmail`: User email address
- `contactListType`: Type of contact list
- `listId`: Brevo contact list ID
- `operation`: 'add' | 'remove'
- `status`: 'success' | 'failure' | 'retry'
- `errorCode`: Error code (on failure)
- `errorMessage`: Error message (on failure)
- `retryCount`: Number of retries
- `timestamp`: Operation timestamp
- `context`: Additional context (preference field, old/new values)

## Testing

### Unit Tests

```typescript
describe('ContactListService', () => {
  it('should add contact to marketing list', async () => {
    const result = await contactListService.addContactToList(
      'marketing',
      'test@example.com',
      { FNAME: 'John', LNAME: 'Doe' }
    );
    expect(result.success).toBe(true);
  });
  
  it('should remove contact from marketing list', async () => {
    const result = await contactListService.removeContactFromList(
      'marketing',
      'test@example.com'
    );
    expect(result.success).toBe(true);
  });
  
  it('should sync all user preferences', async () => {
    const result = await contactListService.syncUserPreferences(
      'user123',
      'test@example.com',
      {
        marketingConsent: true,
        tipsTutorials: false,
        userInsights: true
      }
    );
    expect(result.success).toBe(true);
    expect(result.operations.marketing.success).toBe(true);
    expect(result.operations.tips.success).toBe(true);
    expect(result.operations.insights.success).toBe(true);
  });
});
```

### Integration Tests

- Test with real Brevo API (test account)
- Verify contacts added/removed in Brevo dashboard
- Test duplicate add/remove operations (idempotency)
- Test retry logic with simulated failures














