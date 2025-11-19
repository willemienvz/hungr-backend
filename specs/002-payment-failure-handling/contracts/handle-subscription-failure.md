# Contract: Handle Subscription Failure (Enhanced)

**Function Name**: `handleSubscriptionFailure` (Internal)  
**Type**: Internal Function (not exported)  
**File**: `functions/src/payfastItn.ts`

## Overview

Enhanced internal function that handles payment failures with grace period logic, consecutive failure tracking, email notifications, and manual review flagging. Replaces existing simple pause-on-failure logic.

## Function Signature

```typescript
async function handleSubscriptionFailure(
  itnData: PayFastItnData
): Promise<void>
```

## Input Contract

### Parameters

```typescript
interface PayFastItnData {
  // Required fields for failure handling
  token: string; // PayFast subscription token (or tokenisation)
  pf_payment_id: string; // Payment ID for tracking
  payment_status: 'FAILED'; // Must be FAILED status
  email_address: string; // User email for notifications
  amount_gross: string; // Failed payment amount
  item_description?: string; // Failure reason (optional)
  
  // Additional PayFast fields may be present
  [key: string]: string | undefined;
}
```

## Behavior Contract

### Failure Tracking Logic

1. **Find Subscription**: Query by `token` (handle both `token` and `tokenisation` fields)
2. **Increment Counter**: Increase `consecutiveFailures` by 1
3. **Apply Grace Period**: 
   - If `consecutiveFailures <= 2`: Keep subscription active (grace period)
   - If `consecutiveFailures === 3`: Cancel subscription (threshold reached)

### State Transitions

| Consecutive Failures | Subscription Status | Email Sent | Manual Review Flagged |
|---------------------|-------------------|------------|---------------------|
| 1 | `active` (unchanged) | `first_failure` | No |
| 2 | `active` (unchanged) | `grace_period_warning` | Yes |
| 3 | `cancelled` | `cancellation` | Yes (already set) |

### Updates Per Failure Count

**First Failure (consecutiveFailures = 1)**
- Update: `consecutiveFailures = 1`, `updated_at`
- Subscription status: Unchanged (remains `active`)
- Email: Send `first_failure` email
- Audit log: `failure_tracked`

**Second Failure (consecutiveFailures = 2)**
- Update: `consecutiveFailures = 2`, `needsManualReview = true`, `manualReviewReason = "Payment failed - 2 consecutive failures..."`, `manualReviewFlaggedAt = now`, `updated_at`
- Subscription status: Unchanged (remains `active`)
- Email: Send `grace_period_warning` email
- Audit logs: `failure_tracked`, `flag_manual_review`

**Third Failure (consecutiveFailures = 3)**
- Update: `consecutiveFailures = 3`, `status = 'cancelled'`, `cancelledAt = now`, `cancellationReason = "Cancelled due to 3 consecutive payment failures..."`, `updated_at`
- User document: Update `subscriptionStatus = 'cancelled'`
- Email: Send `cancellation` email
- Audit logs: `failure_tracked`, `cancel_due_to_failures`

## Output Contract

### Return Value
- `Promise<void>` - No return value (throws on error)

### Exceptions

```typescript
// Subscription not found
if (subscriptionQuery.empty) {
  console.error('Subscription not found for token:', token);
  return; // Early return, no exception (may be one-off payment)
}

// Database errors
catch (error) {
  console.error('Error handling subscription failure:', error);
  throw error; // Propagate error to caller
}
```

## Error Handling

1. **Subscription Not Found**: Log error, return early (no exception) - may be one-off payment
2. **Database Update Failures**: Log error, throw exception (caller handles retry)
3. **Email Send Failures**: Log error, continue processing (payment tracking succeeds)
4. **Invalid Token**: Log error, return early (no exception)

## Side Effects

1. **Subscriptions Collection**: Updates failure counter, status, flags
2. **Users Collection**: Updates subscription status (only on cancellation)
3. **Audit Logs Collection**: Creates audit entries for tracking and actions
4. **Email Service**: Sends notification emails (non-blocking)

## Failure History Tracking (Optional)

If `failureHistory` array is implemented:

```typescript
// Add failure record to history
const failureRecord: FailureRecord = {
  paymentId: itnData.pf_payment_id,
  failedAt: admin.firestore.FieldValue.serverTimestamp(),
  consecutiveFailures: newConsecutiveFailures,
  reason: itnData.item_description || 'Payment failed',
  amount: parseFloat(itnData.amount_gross)
};

// Update subscription with history
await subscriptionDoc.ref.update({
  // ... other updates
  failureHistory: admin.firestore.FieldValue.arrayUnion(failureRecord)
});
```

Note: History tracking is optional - can be omitted for simpler implementation.

## Testing Contract

### Test Cases

1. **First Failure**: Verify counter = 1, status = active, email sent
2. **Second Failure**: Verify counter = 2, manual review flagged, warning email sent
3. **Third Failure**: Verify subscription cancelled, cancellation email sent
4. **Subscription Not Found**: Verify early return, no exception
5. **Email Failure**: Verify payment tracking succeeds despite email failure
6. **Database Failure**: Verify exception thrown, error logged
7. **Counter Reset Test**: Verify counter resets when payment succeeds (tested in success handler)

## Integration Points

- Called from: `processPayment()` in `payfastItn.ts`
- Calls: `sendPaymentFailureEmail()` for notifications
- Updates: `subscriptions`, `users`, `audit_logs` collections
- Depends on: Firestore database, email service availability

