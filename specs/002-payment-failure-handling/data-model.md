# Data Model: Enhanced Payment Failure Handling

**Feature**: Enhanced Payment Failure Handling  
**Phase**: 1 - Design & Contracts  
**Date**: 2024-12-20

## Collection: `subscriptions`

### Enhanced Fields

The `subscriptions` collection requires the following new/updated fields for payment failure handling:

```typescript
interface Subscription {
  // Existing fields (preserved)
  userId: string;
  email: string;
  status: 'active' | 'paused' | 'cancelled';
  plan: string;
  amount: number;
  recurringAmount?: number;
  frequency?: string; // '3' = monthly, '4' = quarterly, etc.
  cycles?: string; // '0' = unlimited
  billingDate?: string; // YYYY-MM-DD
  nextBillingDate?: Timestamp;
  token: string; // PayFast subscription token
  paymentId?: string;
  startDate: Timestamp;
  pausedAt?: Timestamp;
  cancelledAt?: Timestamp;
  pauseReason?: string;
  cancellationReason?: string;
  created_at: Timestamp;
  updated_at: Timestamp;

  // NEW: Payment failure tracking fields
  consecutiveFailures: number; // Default: 0, increments on FAILED, resets on COMPLETE
  needsManualReview: boolean; // Default: false, set to true at 2 failures
  manualReviewReason?: string; // Reason for manual review flag
  manualReviewFlaggedAt?: Timestamp; // When manual review was flagged
  failureHistory?: FailureRecord[]; // Optional: Detailed failure history (for audit)
}

interface FailureRecord {
  paymentId: string; // pf_payment_id from PayFast
  failedAt: Timestamp; // When failure occurred
  consecutiveFailures: number; // Count at time of failure
  reason?: string; // Failure reason from PayFast
  amount: number; // Failed payment amount
}
```

### Field Descriptions

**consecutiveFailures** (number, default: 0)
- Tracks number of consecutive payment failures
- Increments by 1 when `payment_status === 'FAILED'`
- Resets to 0 when `payment_status === 'COMPLETE'`
- Triggers cancellation when reaches 3 (after grace period of 2)

**needsManualReview** (boolean, default: false)
- Indicates subscription requires support staff attention
- Set to `true` when `consecutiveFailures === 2` (before cancellation threshold)
- Auto-cleared to `false` when payment succeeds (`consecutiveFailures` resets)
- Can be manually cleared by support staff (future enhancement)

**manualReviewReason** (string, optional)
- Human-readable reason for manual review flag
- Format: `"Payment failed - 2 consecutive failures (payment IDs: xxx, yyy)"`
- Helps support staff understand why flag was set

**manualReviewFlaggedAt** (Timestamp, optional)
- Timestamp when manual review flag was set
- Enables sorting/filtering by urgency (older flags may need attention first)

**failureHistory** (array, optional)
- Detailed record of payment failures
- Each entry tracks: payment ID, timestamp, consecutive count, reason, amount
- Useful for audit and support purposes
- Can be truncated to last N failures to control document size

### Migration Notes

- Existing subscriptions without `consecutiveFailures` should default to 0
- Existing subscriptions without `needsManualReview` should default to false
- Existing subscriptions without `manualReviewReason` can be null/undefined
- `failureHistory` is optional - can be added incrementally or omitted for simpler implementation

---

## Collection: `transactions`

### Enhanced Fields

The `transactions` collection already captures payment notifications. Enhancements ensure all statuses are logged:

```typescript
interface Transaction {
  // Existing fields (preserved)
  m_payment_id: string;
  pf_payment_id: string; // Primary key for duplicate detection
  payment_status: string; // PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED, or unknown
  amount_gross: number;
  amount_fee: number;
  amount_net: number;
  name_first: string;
  name_last: string;
  email_address: string;
  item_name: string;
  item_description?: string;
  token?: string; // PayFast subscription token
  created_at: Timestamp;
  updated_at: Timestamp;

  // NEW: Enhanced tracking fields
  statusTransitions?: StatusTransition[]; // Optional: Track status changes for same payment
  processedForSubscription?: boolean; // Whether this transaction triggered subscription state change
  subscriptionId?: string; // Reference to subscription document (if applicable)
}

interface StatusTransition {
  fromStatus?: string; // Previous status (undefined for first notification)
  toStatus: string; // Current status
  transitionedAt: Timestamp; // When this status was received
  processed: boolean; // Whether subscription state was updated
}
```

### Field Descriptions

**statusTransitions** (array, optional)
- Tracks status progression for same payment ID
- Enables audit of complete payment lifecycle
- Format: `[{ fromStatus: 'PENDING', toStatus: 'PROCESSING', transitionedAt: ..., processed: false }]`

**processedForSubscription** (boolean, optional)
- Indicates whether this transaction triggered a subscription state change
- `true` only for terminal statuses (COMPLETE, FAILED, CANCELLED) that changed subscription
- Helps identify which transactions caused actions vs. just logging

**subscriptionId** (string, optional)
- Reference to subscription document if this transaction is subscription-related
- Populated when `token` is present
- Enables efficient querying of transactions by subscription

---

## Collection: `audit_logs`

### Enhanced Logging

The `audit_logs` collection should log all payment status notifications and subscription state changes:

```typescript
interface AuditLog {
  // Existing fields (preserved)
  type: string; // 'subscription_management', 'payment_processing', etc.
  action: string; // 'status_received', 'failure_tracked', 'cancel', 'flag_manual_review', etc.
  userId?: string;
  subscriptionId?: string;
  result: 'success' | 'failure';
  source: string; // 'payfast_itn', 'manual', etc.
  metadata?: {
    payment_id?: string;
    payment_status?: string;
    consecutive_failures?: number;
    reason?: string;
    [key: string]: any;
  };
  timestamp: Timestamp;
  createdAt: string; // ISO timestamp string
}
```

### New Audit Actions

- `status_received`: Logged for every payment status notification (PENDING, PROCESSING, etc.)
- `failure_tracked`: Logged when consecutive failure counter increments
- `grace_period_active`: Logged when failure occurs within grace period (1-2 failures)
- `cancel_due_to_failures`: Logged when subscription cancelled due to 3 consecutive failures
- `flag_manual_review`: Logged when subscription flagged for manual review
- `clear_manual_review`: Logged when manual review flag cleared (auto or manual)
- `failure_counter_reset`: Logged when consecutive failure counter resets on successful payment

---

## Collection: `users`

### No Schema Changes Required

The `users` collection does not require schema changes for this feature. Subscription status updates continue to update:
- `subscriptionStatus`: 'active' | 'paused' | 'cancelled'
- `updated_at`: Timestamp

Note: Manual review flags are tracked on subscription documents, not user documents, to keep subscription-specific metadata together.

---

## Data Integrity Rules

1. **Consecutive Failure Counter**
   - Must be >= 0
   - Must reset to 0 on successful payment (COMPLETE status)
   - Must not exceed cancellation threshold (3) for active subscriptions

2. **Manual Review Flag**
   - `needsManualReview === true` should have `manualReviewReason` populated
   - `needsManualReview === true` should have `manualReviewFlaggedAt` populated
   - Flag should be cleared when `consecutiveFailures` resets to 0

3. **Transaction Duplicates**
   - Same `pf_payment_id` should not process subscription state changes multiple times
   - Transaction records should be updated (not duplicated) for same payment ID

4. **Subscription Status Consistency**
   - Subscription with `consecutiveFailures >= 3` should have `status === 'cancelled'`
   - Subscription with `status === 'cancelled'` due to failures should have `cancellationReason` populated

---

## Index Requirements

### Firestore Composite Indexes

No new composite indexes required for this feature. Existing indexes support queries:
- Subscriptions by `token` (for finding subscriptions by PayFast token)
- Transactions by `pf_payment_id` (for duplicate detection)
- Subscriptions by `status` (for querying active subscriptions)
- Subscriptions by `userId` (for user subscription lookup)

### Potential Future Indexes

If manual review flagging requires queries:
- Index on `subscriptions.needsManualReview` (simple field index)
- Composite index: `subscriptions(needsManualReview, manualReviewFlaggedAt)` (for sorting flagged subscriptions)

These can be added if support dashboard requires filtering/sorting by manual review flags.

---

## Validation Rules

### Subscription Document Validation

```typescript
// Pseudo-validation logic
function validateSubscription(subscription: Subscription): boolean {
  // consecutiveFailures must be non-negative
  if (subscription.consecutiveFailures < 0) return false;

  // If needsManualReview is true, reason must be provided
  if (subscription.needsManualReview && !subscription.manualReviewReason) return false;

  // If cancelled due to failures, consecutiveFailures should be >= 3
  if (subscription.status === 'cancelled' && 
      subscription.cancellationReason?.includes('consecutive failures') &&
      subscription.consecutiveFailures < 3) {
    // Warning: May indicate manual cancellation or counter reset after cancellation
  }

  return true;
}
```

### Transaction Document Validation

```typescript
// Pseudo-validation logic
function validateTransaction(transaction: Transaction): boolean {
  // pf_payment_id is required for duplicate detection
  if (!transaction.pf_payment_id) return false;

  // payment_status must be a recognized status
  const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'CANCELLED'];
  // Allow unknown statuses but log them
  if (validStatuses.includes(transaction.payment_status)) return true;
  
  // Unknown status is valid but should be logged for review
  console.warn('Unknown payment status:', transaction.payment_status);
  return true;
}
```



