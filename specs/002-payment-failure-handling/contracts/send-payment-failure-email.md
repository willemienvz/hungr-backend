# Contract: Send Payment Failure Email

**Endpoint**: Firebase Cloud Function (Callable)  
**Function Name**: `sendPaymentFailureEmail`  
**Type**: Callable Function (onCall)  
**File**: `functions/src/sendPaymentFailureEmail.ts`

## Overview

Internal Firebase Function that sends payment failure email notifications via AWS Lambda email service. Designed to be called from ITN handler or other payment processing functions.

## Request Contract

### Callable Function Input

```typescript
interface SendPaymentFailureEmailRequest {
  email: string; // User email address
  emailType: 'first_failure' | 'grace_period_warning' | 'cancellation';
  subscriptionData: {
    subscriptionId: string;
    userId: string;
    plan: string;
    amount: number;
    consecutiveFailures: number;
    remainingGraceAttempts?: number; // Only for grace_period_warning
  };
  paymentData: {
    paymentId: string;
    failedAt: string; // ISO timestamp
    amount: number;
    reason?: string; // Failure reason from PayFast
  };
}
```

### Validation
- `email`: Valid email address format
- `emailType`: Must be one of the three valid types
- `subscriptionData.subscriptionId`: Required
- `subscriptionData.userId`: Required

## Response Contract

### Success Response

```typescript
interface SendPaymentFailureEmailResponse {
  success: true;
  message: string; // e.g., "Email sent successfully"
  emailData?: any; // For testing/debugging
}
```

### Error Response

```typescript
interface SendPaymentFailureEmailError {
  success: false;
  error: {
    code: string; // 'invalid-argument' | 'not-found' | 'internal'
    message: string; // Human-readable error message
  };
}
```

### Error Codes
- `invalid-argument`: Missing or invalid required fields
- `not-found`: User or subscription not found
- `internal`: Email service failure or unexpected error

## Behavior

### Email Type Handling

**first_failure** (First Payment Failure)
- Template: `payment-failure-first.html`
- Content: Payment failed, instructions to update payment method
- Subject: "Payment Failed - Action Required"

**grace_period_warning** (Second Failure - Grace Period)
- Template: `payment-failure-warning.html`
- Content: Payment failed again, remaining grace attempts, urgency warning
- Subject: "Payment Failed Again - [X] Attempts Remaining"

**cancellation** (Third Failure - Cancelled)
- Template: `payment-cancellation.html`
- Content: Subscription cancelled due to consecutive failures, resubscribe option
- Subject: "Subscription Cancelled - Payment Failed"

### Email Service Integration

1. Calls AWS Lambda endpoint: `https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail`
2. Payload format:
```typescript
{
  to: string;
  subject: string;
  templateId: string; // Brevo template ID
  templateData: {
    firstName?: string;
    lastName?: string;
    subscriptionPlan: string;
    amount: number;
    paymentId: string;
    failedAt: string;
    consecutiveFailures: number;
    remainingGraceAttempts?: number;
    supportEmail: string;
    appName: string;
    logoUrl?: string;
    [key: string]: any; // Additional template variables
  }
}
```

### Error Handling

- Email service failures: Log error, return failure (does not throw - caller handles)
- Invalid email addresses: Return `invalid-argument` error
- Missing user data: Return `not-found` error
- Network timeouts: Retry once (or fail gracefully if retry fails)

## Side Effects

1. **AWS Lambda Email Service**: Sends email via Brevo
2. **Audit Logs**: Logs email send attempts (success/failure)
3. **No Database Changes**: Email sending does not modify Firestore

## Usage Example

```typescript
// Called from payfastItn.ts handleSubscriptionFailure
const emailResult = await sendPaymentFailureEmail({
  email: userEmail,
  emailType: 'first_failure',
  subscriptionData: {
    subscriptionId: subscription.id,
    userId: userId,
    plan: subscription.plan,
    amount: subscription.amount,
    consecutiveFailures: 1
  },
  paymentData: {
    paymentId: itnData.pf_payment_id,
    failedAt: new Date().toISOString(),
    amount: parseFloat(itnData.amount_gross),
    reason: itnData.item_description
  }
});

// Email failures don't block payment processing
if (!emailResult.success) {
  console.error('Failed to send payment failure email:', emailResult.error);
  // Continue processing - don't throw
}
```

## Testing Contract

### Test Cases
1. **First Failure Email**: Verify correct template, all data populated
2. **Grace Period Warning**: Verify remaining attempts calculation
3. **Cancellation Email**: Verify cancellation reason included
4. **Email Service Failure**: Verify error logged, function returns failure (doesn't throw)
5. **Invalid Email**: Verify validation error returned
6. **Missing User Data**: Verify not-found error returned

