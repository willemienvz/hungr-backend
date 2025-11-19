# Research: Enhanced Payment Failure Handling for Subscriptions

**Feature**: Enhanced Payment Failure Handling  
**Phase**: 0 - Outline & Research  
**Date**: 2024-12-20

## Research Tasks

### 1. PayFast Payment Status Handling

**Task**: Research PayFast ITN payment status values and handling patterns

**Findings**:
- PayFast sends multiple statuses: PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED
- Statuses may arrive in sequence for the same payment (PENDING → PROCESSING → COMPLETE/FAILED)
- Terminal statuses (COMPLETE, FAILED, CANCELLED) require subscription state changes
- Non-terminal statuses (PENDING, PROCESSING) should only be logged
- Unknown statuses should be logged for manual review

**Decision**: Log all statuses to transactions collection. Only process terminal statuses for subscription state changes. Non-terminal statuses update transaction record only.

**Rationale**: Provides complete audit trail while preventing premature state changes during payment processing.

**Alternatives Considered**:
- Ignore non-terminal statuses: Rejected - loses visibility into payment processing
- Process all statuses as state changes: Rejected - causes subscription state thrashing

---

### 2. Consecutive Failure Tracking

**Task**: Determine best practice for tracking consecutive payment failures

**Findings**:
- Standard practice: Maintain counter on subscription document
- Counter increments on each FAILED status
- Counter resets to 0 on COMPLETE status
- Threshold-based actions prevent subscription abuse
- Grace period (2 failures) improves user experience vs immediate action

**Decision**: Add `consecutiveFailures` numeric field to subscription documents. Increment on FAILED, reset on COMPLETE. Cancel subscription at threshold (3 failures).

**Rationale**: Simple counter provides reliable tracking. Grace period balances user experience with business protection.

**Alternatives Considered**:
- Track failures in separate collection: Rejected - adds complexity, slower queries
- Time-based failure window: Rejected - adds complexity, current approach simpler
- Immediate cancellation on first failure: Rejected - poor user experience for temporary issues

---

### 3. Email Notification Service Integration

**Task**: Research email service integration patterns for payment failure notifications

**Findings**:
- Existing system uses AWS Lambda endpoint: `https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail`
- Service uses Brevo (formerly Sendinblue) for email delivery
- Email failures should not block payment processing (FR-016, FR-017)
- Template-based emails provide consistent messaging
- Email service supports retry mechanism

**Decision**: Create dedicated Firebase Function `sendPaymentFailureEmail` that calls AWS Lambda endpoint. Use email templates for consistent messaging. Implement error handling to log failures without blocking payment processing.

**Rationale**: Reuses existing email infrastructure. Isolates email logic for maintainability. Graceful degradation ensures payment processing continues even if emails fail.

**Alternatives Considered**:
- Direct Brevo integration: Rejected - would require new API keys, existing Lambda works
- Inline email sending in payfastItn.ts: Rejected - violates separation of concerns
- Firestore trigger for emails: Rejected - adds latency, less reliable than direct calls

---

### 4. Manual Review Flagging System

**Task**: Design flagging system for subscriptions requiring support attention

**Findings**:
- Flagging at 2 failures provides early warning before cancellation
- Boolean flag (`needsManualReview`) on subscription document
- Flag should auto-clear when payment succeeds
- Support staff need visibility into flagged subscriptions
- Flag should include timestamp and reason for audit

**Decision**: Add `needsManualReview: boolean` and `manualReviewReason: string` fields to subscription documents. Set flag at 2 consecutive failures. Auto-clear on payment success. Support staff can manually clear via admin interface (future enhancement).

**Rationale**: Simple boolean flag with reason provides sufficient information. Auto-clearing reduces manual cleanup. Timestamp enables priority sorting.

**Alternatives Considered**:
- Separate collection for flagged subscriptions: Rejected - adds complexity, slower queries
- Complex scoring system: Rejected - over-engineered for current needs
- Email-only alerts to support: Rejected - requires persistent tracking mechanism

---

### 5. Grace Period Implementation

**Task**: Determine grace period logic and thresholds

**Findings**:
- Industry standard: 1-3 payment failures before action
- Current spec: 2 failures grace period, cancel on 3rd
- Grace period improves user experience for temporary issues
- Clear threshold prevents confusion

**Decision**: Implement grace period of 2 failures. Subscription remains active during grace period. 3rd failure triggers cancellation (not pausing). Grace period resets on successful payment.

**Rationale**: Balances user experience (allows time to fix issues) with business protection (automatic cancellation prevents abuse). Clear threshold (3 failures) provides predictable behavior.

**Alternatives Considered**:
- 1 failure grace period: Rejected - too aggressive, poor user experience
- 4+ failure threshold: Rejected - too lenient, increases risk
- Variable grace period per user: Rejected - adds complexity, out of scope

---

### 6. Payment Status Notification Processing

**Task**: Research duplicate notification handling and transaction ID validation

**Findings**:
- PayFast may send duplicate notifications
- Existing code checks `pf_payment_id` for duplicates
- Transaction records should track all status updates
- Status transitions should be logged sequentially

**Decision**: Maintain existing duplicate detection using `pf_payment_id`. Update transaction record with latest status. Log all status transitions in audit_logs. Only process subscription state changes once per terminal status.

**Rationale**: Existing duplicate detection works. Updating transaction record provides complete history. Audit logging enables debugging.

**Alternatives Considered**:
- Ignore duplicate notifications completely: Rejected - loses status update information
- Process every notification: Rejected - causes duplicate processing of state changes

---

## Unresolved Items

None - all research tasks completed. All technical decisions made based on existing codebase patterns and best practices.

## Implementation Notes

- All enhancements extend existing Firebase Functions patterns
- No new external services required (uses existing email service)
- Backward compatible with existing subscription documents
- Grace period logic can be tuned via configuration if needed
- Email templates can be customized via Brevo dashboard

