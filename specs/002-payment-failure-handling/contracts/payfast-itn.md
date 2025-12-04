# Contract: PayFast ITN Handler (Enhanced)

**Endpoint**: Firebase Cloud Function (HTTP)  
**Function Name**: `payfastItn`  
**Type**: HTTP Request Handler (onRequest)  
**File**: `functions/src/payfastItn.ts`

## Overview

Enhanced PayFast Instant Transaction Notification (ITN) handler that processes all payment statuses, tracks consecutive failures, implements grace period, sends email notifications, and flags subscriptions for manual review.

## Request Contract

### HTTP Method
- `POST` (required)
- `OPTIONS` (CORS preflight, returns 200)

### Headers
- `Content-Type: application/x-www-form-urlencoded` (PayFast standard)

### Request Body (PayFast ITN Format)

```typescript
interface PayFastItnData {
  // Standard payment fields
  m_payment_id: string;
  pf_payment_id: string; // Primary key for duplicate detection
  payment_status: string; // PENDING | PROCESSING | COMPLETE | FAILED | CANCELLED | (unknown)
  item_name: string;
  item_description?: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  name_first: string;
  name_last: string;
  email_address: string;
  merchant_id: string;
  merchant_key?: string;
  signature: string; // PayFast signature for validation
  
  // Tokenization/subscription fields
  token?: string; // PayFast subscription token
  tokenisation?: string; // Alternative token field name
  
  // Recurring billing fields (optional)
  subscription_type?: string;
  recurring_amount?: string;
  frequency?: string; // '3' = monthly, '4' = quarterly, etc.
  cycles?: string;
  billing_date?: string;
  
  [key: string]: string | undefined; // Additional PayFast fields
}
```

### Validation
1. IP address must match PayFast server IP ranges
2. Signature must be valid (MD5 hash validation)
3. Required fields: `m_payment_id`, `pf_payment_id`, `payment_status`, `amount_gross`

## Response Contract

### Success Response
- **Status**: `200 OK`
- **Body**: `"VALID"` (PayFast expects this exact string)

### Error Responses

**400 Bad Request** (Validation Failed)
- **Body**: `"VALIDATION_FAILED"` or `"INVALID_SIGNATURE"`

**405 Method Not Allowed** (Non-POST request)
- **Body**: `"Method not allowed"`

**500 Internal Server Error** (Processing Error)
- **Body**: Error message (logged, not exposed to PayFast)

## Behavior

### Payment Status Processing

| Status | Action | Subscription State Change |
|--------|--------|--------------------------|
| `PENDING` | Log to transactions | None (subscription unchanged) |
| `PROCESSING` | Log to transactions | None (subscription unchanged) |
| `COMPLETE` | Log + Process payment | Activate subscription, reset failure counter |
| `FAILED` | Log + Track failure | Track consecutive failures, apply grace period/cancellation logic |
| `CANCELLED` | Log + Cancel subscription | Cancel subscription (if token present) |
| `unknown` | Log with warning | None (subscription unchanged, flagged for review) |

### Failure Handling Logic

1. **Duplicate Detection**: Check `pf_payment_id` - if exists, return success without processing
2. **Status Logging**: Always log transaction with status (all statuses)
3. **Failure Tracking** (when `payment_status === 'FAILED'` and token present):
   - Increment `consecutiveFailures` counter
   - If `consecutiveFailures === 1`: Send first failure email, subscription remains active
   - If `consecutiveFailures === 2`: Send warning email, flag for manual review, subscription remains active
   - If `consecutiveFailures === 3`: Cancel subscription, send cancellation email, log audit
4. **Success Handling** (when `payment_status === 'COMPLETE'` and token present):
   - Reset `consecutiveFailures` to 0
   - Clear `needsManualReview` flag if set
   - Activate subscription if paused
5. **Email Notifications**: Sent asynchronously (failures don't block processing)

## Error Handling

- Duplicate notifications: Return success, log and ignore
- Invalid signatures: Return 400, log security event
- Missing subscription: Log error, continue processing (may be one-off payment)
- Email failures: Log error, continue processing (payment processing succeeds)
- Database errors: Log error, return 500 (PayFast will retry)

## Side Effects

1. **Transactions Collection**: Always creates/updates transaction record
2. **Subscriptions Collection**: Updates subscription state (only on terminal statuses)
3. **Users Collection**: Updates user `subscriptionStatus` (only on terminal statuses)
4. **Audit Logs Collection**: Creates audit log entries for significant events
5. **Email Service**: Sends email notifications (asynchronous, non-blocking)

## Testing Contract

### Test Cases
1. **PENDING Status**: Verify transaction logged, subscription unchanged
2. **PROCESSING Status**: Verify transaction logged, subscription unchanged
3. **COMPLETE Status**: Verify subscription activated, failure counter reset
4. **FAILED Status (1st)**: Verify counter increments, email sent, subscription active
5. **FAILED Status (2nd)**: Verify counter increments, warning email sent, manual review flagged
6. **FAILED Status (3rd)**: Verify subscription cancelled, cancellation email sent
7. **Unknown Status**: Verify transaction logged with warning, subscription unchanged
8. **Duplicate Notification**: Verify success returned without processing
9. **Email Failure**: Verify payment processing succeeds despite email failure



