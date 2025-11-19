# Feature Specification: Enhanced Payment Failure Handling for Subscriptions

**Feature Branch**: `002-payment-failure-handling`  
**Created**: 2024-12-20  
**Status**: Draft  
**Input**: User description: "there are some improvements to the payment system we need to make - , there is handling for failed subscription payments, with some limitations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Handle All Payment Statuses Appropriately (Priority: P1)

The system receives payment notifications from PayFast with various statuses beyond just COMPLETE, CANCELLED, and FAILED. The system must properly handle each status type without incorrectly modifying subscription states.

**Why this priority**: Currently, the system only handles three payment statuses, which means intermediate statuses like PENDING or PROCESSING may be ignored or incorrectly processed. This could lead to inconsistent subscription states and missed payment updates. This is foundational for reliable payment processing.

**Independent Test**: Can be fully tested by simulating payment notifications with different statuses (PENDING, PROCESSING) and verifying that the system logs them appropriately without changing subscription status. This delivers complete visibility into all payment states without premature actions.

**Acceptance Scenarios**:

1. **Given** a payment notification is received with status PENDING, **When** the system processes it, **Then** the transaction is logged and subscription status remains unchanged
2. **Given** a payment notification is received with status PROCESSING, **When** the system processes it, **Then** the transaction is logged and subscription status remains unchanged
3. **Given** a payment notification is received with an unknown status, **When** the system processes it, **Then** the transaction is logged with the status for review, and subscription status remains unchanged
4. **Given** multiple notifications for the same payment with different statuses, **When** the system processes them, **Then** each status transition is logged and subscription state only changes on terminal statuses (COMPLETE, FAILED, CANCELLED)

---

### User Story 2 - Track Consecutive Payment Failures (Priority: P1)

The system tracks consecutive payment failures for each subscription and automatically cancels subscriptions after a threshold number of consecutive failures, while allowing users to recover from temporary payment issues.

**Why this priority**: Without tracking consecutive failures, the system may repeatedly pause and resume subscriptions for users with chronic payment issues, creating a poor experience and unnecessary system load. Automatic cancellation after multiple failures protects both users and the business while providing clear boundaries.

**Independent Test**: Can be fully tested by simulating multiple consecutive failed payments for a subscription and verifying that the counter increments correctly and cancellation occurs at the threshold. This delivers automatic handling of problematic subscriptions without manual intervention.

**Acceptance Scenarios**:

1. **Given** a subscription has 0 consecutive failures, **When** a payment fails, **Then** the consecutive failure counter is incremented to 1 and the subscription is not yet paused
2. **Given** a subscription has 2 consecutive failures, **When** a payment fails (making it the 3rd consecutive failure), **Then** the subscription is automatically cancelled, an audit log is created, and the user is notified
3. **Given** a subscription has consecutive failures, **When** a payment succeeds, **Then** the consecutive failure counter is reset to 0
4. **Given** a subscription is cancelled due to consecutive failures, **When** the system processes the cancellation, **Then** the cancellation reason includes the number of consecutive failures and the user receives notification

---

### User Story 3 - Implement Grace Period Before Taking Action (Priority: P2)

The system allows a grace period of 1-2 payment failures before taking action on a subscription, giving users time to resolve temporary payment issues without immediate service interruption.

**Why this priority**: Immediate action on the first failure can create unnecessary friction for users experiencing temporary issues (insufficient funds, expired card, etc.). A grace period provides a better user experience while still protecting against persistent payment problems.

**Independent Test**: Can be fully tested by simulating 1-2 payment failures and verifying that the subscription remains active, then verifying that the 3rd failure triggers cancellation. This delivers a balanced approach between user experience and payment protection.

**Acceptance Scenarios**:

1. **Given** a subscription is active, **When** the first payment fails, **Then** the transaction is logged, consecutive failure counter increments, but subscription remains active
2. **Given** a subscription has 1 consecutive failure, **When** the second payment fails, **Then** the consecutive failure counter increments to 2, but subscription remains active
3. **Given** a subscription has 2 consecutive failures (grace period exhausted), **When** the third payment fails, **Then** the subscription is cancelled (action taken) and the user is notified
4. **Given** a subscription is within the grace period, **When** a payment succeeds, **Then** the consecutive failure counter resets and the subscription remains active

---

### User Story 4 - Send Email Notifications for Payment Failures (Priority: P2)

Users receive timely email notifications when payment failures occur, providing them with information and guidance on how to resolve payment issues.

**Why this priority**: Users may not be aware of payment failures until they lose access to services. Proactive email notifications help users resolve issues quickly, reduce support tickets, and improve customer satisfaction. Communication is essential for payment recovery.

**Independent Test**: Can be fully tested by triggering payment failures and verifying that appropriate email notifications are sent at each failure stage. This delivers proactive communication and improved payment recovery rates.

**Acceptance Scenarios**:

1. **Given** a subscription payment fails for the first time, **When** the failure is processed, **Then** the user receives an email notification with payment failure details and instructions to update payment method
2. **Given** a subscription payment fails within the grace period, **When** the failure is processed, **Then** the user receives a warning email indicating remaining grace attempts
3. **Given** a subscription is cancelled due to consecutive failures, **When** the cancellation occurs, **Then** the user receives an email notification explaining the cancellation and options to resubscribe
4. **Given** email notification sending fails, **When** the system handles the error, **Then** the payment failure processing continues and the email failure is logged for retry

---

### User Story 5 - Flag Subscriptions Requiring Manual Review (Priority: P3)

The system automatically flags subscriptions that have experienced multiple payment failures or other payment-related issues for manual review by support staff.

**Why this priority**: Some payment issues may require human intervention (fraud detection, account verification, payment method validation). Flagging problematic subscriptions helps support staff prioritize their work and provides better customer service for edge cases.

**Independent Test**: Can be fully tested by creating subscriptions with multiple failures and verifying that they are flagged for manual review. This delivers a mechanism for support teams to identify and address problematic subscriptions proactively.

**Acceptance Scenarios**:

1. **Given** a subscription reaches the threshold for consecutive failures (before cancellation), **When** the failure is processed, **Then** the subscription is flagged for manual review
2. **Given** a subscription is flagged for manual review, **When** support staff access the subscription, **Then** they can see the review flag, failure history, and reason for flagging
3. **Given** a subscription is flagged for manual review, **When** support staff resolves the issue or determines no action is needed, **Then** they can clear the manual review flag
4. **Given** a subscription has been flagged for manual review, **When** a payment succeeds and the consecutive failure counter resets, **Then** the manual review flag is automatically cleared

---

### Edge Cases

- What happens when a payment notification is received with both PENDING and then FAILED status for the same transaction?
- How does the system handle retry attempts from PayFast for the same failed payment?
- What happens when a user updates their payment method during the grace period?
- How does the system handle rapid consecutive failure notifications (race conditions)?
- What happens when email notifications are disabled or bounce back?
- How does the system handle subscriptions that have been manually unpaused during the grace period?
- What happens when a payment succeeds but the success notification arrives after failure notifications?
- How does the system handle payment failures for subscriptions that are already paused for other reasons?
- What happens when the consecutive failure counter reaches the cancellation threshold on a subscription that was manually paused?
- How does the system handle manual review flags when a subscription is cancelled for reasons other than payment failure?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST log all payment status notifications (PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED, and any unknown statuses) to the transactions collection
- **FR-002**: System MUST maintain the current subscription status when processing PENDING payment notifications (no status change)
- **FR-003**: System MUST maintain the current subscription status when processing PROCESSING payment notifications (no status change)
- **FR-004**: System MUST track a consecutive failure counter for each subscription, incrementing on each failed payment
- **FR-005**: System MUST reset the consecutive failure counter to 0 when a payment succeeds
- **FR-006**: System MUST allow 2 payment failures (grace period) before taking action on a subscription
- **FR-007**: System MUST automatically cancel a subscription after the 3rd consecutive payment failure
- **FR-008**: System MUST send an email notification to the user when the first payment failure occurs
- **FR-009**: System MUST send an email notification to the user when their subscription is cancelled due to consecutive payment failures
- **FR-010**: System MUST send a warning email notification when a payment fails within the grace period, indicating remaining grace attempts
- **FR-011**: System MUST flag subscriptions for manual review when they reach 2 consecutive failures (before cancellation)
- **FR-012**: System MUST automatically clear the manual review flag when a payment succeeds and consecutive failures reset
- **FR-013**: System MUST store the cancellationReason with consecutive failure count when cancelling due to payment failures
- **FR-014**: System MUST create an audit log entry for each payment status received, including the status type
- **FR-015**: System MUST create an audit log entry when a subscription is flagged for manual review
- **FR-016**: System MUST continue processing payment failures even if email notification sending fails
- **FR-017**: System MUST log email notification failures for retry or manual review
- **FR-018**: System MUST handle retry attempts from PayFast by recognizing duplicate payment notifications based on transaction ID
- **FR-019**: System MUST prevent duplicate processing of the same payment notification
- **FR-020**: System MUST maintain subscription status history for audit purposes when status changes due to payment failures
- **FR-021**: System MUST allow support staff to view and clear manual review flags on subscriptions

### Key Entities *(include if feature involves data)*

- **Consecutive Failure Counter**: A numeric field on each subscription tracking the number of consecutive payment failures, increments on failure, resets to 0 on success, triggers automatic cancellation at threshold (cancel at 3)
- **Grace Period**: A configurable period allowing a specified number of payment failures (default: 2) before taking action, provides user-friendly failure handling for temporary issues
- **Manual Review Flag**: A boolean field on subscriptions indicating they require support staff attention, automatically set when thresholds are reached, manually cleared by support, automatically cleared on payment success
- **Payment Status Notification**: Payment status updates from PayFast (PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED), each logged to transactions collection, processed according to status type rules
- **Failure History**: A record of payment failures including dates, amounts, failure reasons, and consecutive failure count at the time of each failure, used for audit and support purposes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of payment status notifications (PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED) are logged to the transactions collection within 5 seconds of receipt
- **SC-002**: Subscriptions are automatically cancelled after 3 consecutive failures in 100% of cases within 10 seconds of the 3rd failure (grace period respected)
- **SC-003**: 95% of email notifications for payment failures are successfully delivered within 1 minute of the failure event
- **SC-004**: 100% of subscriptions reaching 2 consecutive failures are flagged for manual review within 5 seconds
- **SC-005**: The consecutive failure counter accurately reflects the number of consecutive failures in 100% of subscription records
- **SC-006**: Payment success notifications reset the consecutive failure counter within 5 seconds in 100% of cases
- **SC-007**: Support staff can identify and access subscriptions flagged for manual review within 30 seconds using filtering/search
- **SC-008**: Zero duplicate payment notifications are processed (all duplicates recognized and ignored)
- **SC-009**: Payment failure handling completes without errors for 99% of failure notifications received

## Assumptions

- PayFast payment notifications include sufficient transaction identifiers to prevent duplicate processing
- Email service is available and configured for sending payment failure notifications
- Users have valid email addresses in their profile for receiving notifications
- Payment failure notifications are received in a timely manner (within expected payment processing windows)
- Support staff have access to subscription management interfaces to review flagged subscriptions
- The grace period of 2 failures is appropriate for the business model and user payment patterns
- Automatic cancellation after 3 consecutive failures aligns with business policies and user expectations
- PayFast may send multiple status notifications for the same payment as status progresses (PENDING → PROCESSING → COMPLETE/FAILED)
- Users understand that payment failures may result in service interruption after the grace period
- Payment method updates by users during grace period will resolve subsequent payment attempts
- Email delivery failures do not prevent payment failure processing from completing

## Dependencies

- Existing PayFast ITN (Instant Transaction Notification) handler infrastructure
- Email notification service or function for sending payment failure emails
- Subscription and transaction data structures in Firestore
- Audit logging infrastructure for tracking payment status changes
- Support dashboard or interface for viewing manually flagged subscriptions (may need enhancement)
- PayFast payment notification reliability and delivery mechanisms

## Out of Scope

- Automatic retry of failed payments by the system (PayFast handles retries)
- Changing payment methods through the failure notification process (handled separately in subscription management)
- Refund processing for failed payments (handled by PayFast and manual processes)
- Real-time webhook notifications to users about payment status (email-only notification)
- Automated fraud detection based on payment failure patterns
- Payment failure analytics and reporting dashboards (basic logging only)
- Custom grace period configurations per user or subscription tier (single system-wide grace period)
- Payment failure prediction or proactive outreach before failures occur
- Integration with external payment recovery services
