# Phase 0 Research: Brevo Transactional Email Integration

**Feature**: Brevo Transactional Email Integration  
**Date**: 2025-01-27  
**Research Sources**: Context7 (Brevo API, Firebase Functions v2, Firebase Admin SDK)

## Research Summary

This document consolidates research findings for integrating Brevo as the transactional email provider and implementing campaign subscription management. Key areas researched include Brevo API integration patterns, Firebase Functions v2 Firestore triggers, secret management, and contact list operations.

---

## 1. Brevo API Integration

### 1.1 Transactional Email API

**Package**: `@getbrevo/brevo` (Node.js SDK)  
**Installation**: `npm i @getbrevo/brevo --save` or `yarn add @getbrevo/brevo`

**Key Findings**:

1. **SDK Initialization**:
   ```typescript
   const brevo = require('@getbrevo/brevo');
   let apiInstance = new brevo.TransactionalEmailsApi();
   
   let apiKey = apiInstance.authentications['api-key'];
   apiKey.apiKey = 'YOUR API KEY';
   ```

2. **Sending Transactional Emails with Templates**:
   - Use `sendTransacEmail()` method
   - Support for `templateId` (integer) - when provided, `htmlContent` and `textContent` are ignored
   - Template variables passed via `params` object
   - Supports multiple recipients, CC, BCC, reply-to, custom headers

3. **Email Object Structure**:
   ```typescript
   let sendSmtpEmail = new brevo.SendSmtpEmail();
   sendSmtpEmail.subject = "My {{params.subject}}";
   sendSmtpEmail.templateId = 59; // Template ID from Brevo dashboard
   sendSmtpEmail.sender = { "name": "John", "email": "example@example.com" };
   sendSmtpEmail.to = [{ "email": "recipient@example.com", "name": "Recipient Name" }];
   sendSmtpEmail.params = { "parameter": "My param value", "subject": "common subject" };
   sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
   ```

4. **Template Variable Substitution**:
   - Variables in templates use `{{params.variableName}}` syntax
   - All variables must be provided in the `params` object
   - Template validation errors no longer cause API failures (as of recent update)
   - Email credits not deducted for template validation errors

5. **Response Handling**:
   - Success returns `messageId` (string) - unique identifier for sent email
   - Errors return standard API error structure
   - Promise-based API (`.then()` / `.catch()`)

6. **API Endpoint**: `POST /v3/smtp/email`
   - Base URL: `https://api.brevo.com/v3`
   - Authentication: API key in header `api-key`
   - Content-Type: `application/json`

### 1.2 Contact List Management API

**Key Findings**:

1. **Adding Contacts to Lists**:
   - Endpoint: `POST /contacts/lists/{listId}/contacts`
   - Multiple methods available:
     - By email addresses: `POST /contacts/lists/{listId}/contacts` with `emails` array
     - By contact IDs: `POST /contacts/lists/{listId}/contacts` with `ids` array
     - By external IDs: `POST /contacts/lists/{listId}/contacts` with `extIds` array
   - Maximum 150 contacts per request
   - For bulk operations, use `/contacts/import` API

2. **Removing Contacts from Lists**:
   - Endpoint: `POST /contacts/lists/{listId}/contacts/remove`
   - Methods:
     - By email: `{ "emails": ["email1@example.com", "email2@example.com"] }`
     - By ID: `{ "ids": [1, 2, 3] }`
     - By external ID: `{ "extIds": ["ext132", "ext456"] }`
     - Remove all: `{ "all": true }`
   - Response includes `success` and `failure` arrays

3. **Contact Attributes**:
   - Contacts can have custom attributes (e.g., `FNAME`, `LNAME`)
   - Attributes passed in `attributes` object when creating/updating contacts
   - Attributes can be used for personalization in email templates

4. **Bulk Operations**:
   - Endpoint: `POST /contacts/lists/{listId}/contacts/bulk`
   - Supports adding, updating, or deleting multiple contacts
   - Can import from CSV file
   - Supports `updateContactIfEmpty` and `updateBy` parameters

5. **List Management**:
   - List IDs are integers
   - Lists must be pre-configured in Brevo dashboard
   - Operations are idempotent (safe to retry)

### 1.3 Error Handling

**Common Error Codes**:
- `400`: Bad Request (invalid parameters)
- `401`: Authentication failed (invalid API key)
- `402`: Not enough credit, plan upgrade needed
- `403`: Permission denied
- `404`: Object does not exist (template/list not found)
- `422`: Unprocessable Entity

**Best Practices**:
- Implement retry logic with exponential backoff for transient failures
- Handle rate limits (check response headers)
- Log all API errors with context
- Don't block user operations on email/contact list failures

---

## 2. Firebase Functions v2 Firestore Triggers

### 2.1 Document Creation Trigger

**Key Findings**:

1. **Import and Setup**:
   ```typescript
   import { onDocumentCreated } from "firebase-functions/v2/firestore";
   import * as logger from "firebase-functions/logger";
   ```

2. **Trigger Definition**:
   ```typescript
   export const onUserCreated = onDocumentCreated({
     document: "users/{userId}",
     region: "us-central1"
   }, async (event) => {
     const userData = event.data.data();
     const userId = event.params.userId;
     
     logger.info("New user created", { userId, userData });
     // Process user creation
   });
   ```

3. **Event Object Structure**:
   - `event.params`: Path parameters (e.g., `{ userId: "abc123" }`)
   - `event.data.data()`: Document data (for created documents)
   - `event.data.id`: Document ID

4. **Use Cases**:
   - Send welcome email on user creation
   - Initialize user-related data
   - Add user to contact lists based on initial preferences

### 2.2 Document Update Trigger

**Key Findings**:

1. **Import and Setup**:
   ```typescript
   import { onDocumentWritten } from "firebase-functions/v2/firestore";
   ```

2. **Trigger Definition**:
   ```typescript
   export const onUserUpdate = onDocumentWritten({
     document: "users/{userId}",
     region: "us-central1"
   }, async (event) => {
     const beforeData = event.data.before?.data();
     const afterData = event.data.after?.data();
     
     // Detect changes
     if (beforeData && afterData) {
       // Document updated
       if (afterData.marketingConsent !== beforeData.marketingConsent) {
         // Handle preference change
       }
     }
   });
   ```

3. **Change Detection**:
   - `event.data.before?.data()`: Data before update (null for creates)
   - `event.data.after?.data()`: Data after update (null for deletes)
   - Compare fields to detect specific changes

4. **Use Cases**:
   - Sync contact lists when preferences change
   - Audit log field changes
   - Trigger side effects on specific field updates

### 2.3 Secret Management

**Key Findings**:

1. **Defining Secrets**:
   ```typescript
   import { defineSecret } from "firebase-functions/params";
   
   const brevoApiKey = defineSecret("BREVO_API_KEY");
   ```

2. **Using Secrets in Functions**:
   ```typescript
   export const sendWelcomeEmail = onDocumentCreated({
     document: "users/{userId}",
     secrets: [brevoApiKey],
     region: "us-central1"
   }, async (event) => {
     const apiKey = brevoApiKey.value();
     // Use API key
   });
   ```

3. **Global Configuration**:
   ```typescript
   import { setGlobalOptions } from "firebase-functions/v2/options";
   
   setGlobalOptions({
     secrets: ["BREVO_API_KEY", "OTHER_SECRET"]
   });
   ```

4. **Best Practices**:
   - Never log secret values
   - Store secrets in Firebase Secret Manager
   - Access via `defineSecret()` and `.value()` method
   - Secrets must be explicitly declared in function configuration

### 2.4 Function Configuration

**Key Options**:
- `region`: Deployment region (e.g., "us-central1")
- `memory`: Memory allocation (e.g., "256MiB", "512MiB")
- `timeoutSeconds`: Function timeout (default 60s, max 540s)
- `maxInstances`: Maximum concurrent instances
- `minInstances`: Minimum warm instances
- `concurrency`: Concurrent requests per instance
- `secrets`: Array of secret names
- `retry`: Boolean for automatic retries

---

## 3. Firebase Admin SDK - Email Link Generation

### 3.1 Email Verification Links

**Key Findings**:

1. **Method**: `admin.auth().generateEmailVerificationLink(email, actionCodeSettings?)`
2. **Usage**:
   ```typescript
   const actionCodeSettings = {
     url: "https://your-app.com/email-verified",
     handleCodeInApp: true
   };
   
   const verificationLink = await admin.auth().generateEmailVerificationLink(
     userEmail,
     actionCodeSettings
   );
   ```

3. **ActionCodeSettings**:
   - `url`: Required - Redirect URL after verification
   - `handleCodeInApp`: Boolean - Handle code in app vs redirect
   - `android`: Optional - Android-specific settings
   - `ios`: Optional - iOS-specific settings
   - `linkDomain`: Optional - Firebase Dynamic Links domain

### 3.2 Password Reset Links

**Key Findings**:

1. **Method**: `admin.auth().generatePasswordResetLink(email, actionCodeSettings?)`
2. **Usage**:
   ```typescript
   const resetLink = await admin.auth().generatePasswordResetLink(
     userEmail,
     {
       url: "https://your-app.com/reset-password",
       handleCodeInApp: true
     }
   );
   ```

3. **Security Considerations**:
   - Links expire after configured time period
   - Each new reset link invalidates previous links
   - Links are single-use

---

## 4. Integration Patterns

### 4.1 Service Layer Architecture

**Recommended Structure**:
```
functions/src/brevo/
├── brevoService.ts      # Base Brevo API client initialization
├── emailService.ts      # Transactional email sending
├── contactListService.ts # Contact list management
└── config.ts            # Template/list ID configuration
```

**Benefits**:
- Separation of concerns
- Reusable service methods
- Centralized error handling
- Easier testing and mocking

### 4.2 Error Handling Strategy

**Recommended Approach**:

1. **Retry Logic**:
   - Exponential backoff: 1s, 2s, 4s, 8s
   - Maximum 3 retries
   - Only retry on transient errors (5xx, network failures)

2. **Fallback Behavior**:
   - Template not found → Use generic template
   - Contact list not found → Log error, don't block operation
   - API unavailable → Queue for retry, log for monitoring

3. **Non-Blocking Operations**:
   - Email failures don't block account creation
   - Contact list failures don't block preference updates
   - All failures logged for monitoring

### 4.3 Logging Strategy

**Recommended Approach**:

1. **Structured Logging**:
   ```typescript
   import * as logger from "firebase-functions/logger";
   
   logger.info("Email sent successfully", {
     emailType: "verification",
     recipient: userEmail,
     templateId: 123,
     messageId: result.messageId
   });
   ```

2. **Audit Trail**:
   - Log all email sending attempts to Firestore (`email_logs` collection)
   - Log all contact list operations (`contact_list_logs` collection)
   - Include: timestamp, status, error details, context

3. **Error Logging**:
   ```typescript
   logger.error("Email sending failed", {
     emailType: "verification",
     recipient: userEmail,
     error: error.message,
     errorCode: error.code,
     stack: error.stack
   });
   ```

---

## 5. Configuration Management

### 5.1 Template ID Configuration

**Recommended Approach**:

1. **Environment-Based Configuration**:
   ```typescript
   // config.ts
   export const BREVO_CONFIG = {
     templates: {
       verification: parseInt(process.env.BREVO_TEMPLATE_VERIFICATION || "0"),
       passwordReset: parseInt(process.env.BREVO_TEMPLATE_PASSWORD_RESET || "0"),
       welcome: parseInt(process.env.BREVO_TEMPLATE_WELCOME || "0"),
       subscriptionChange: parseInt(process.env.BREVO_TEMPLATE_SUBSCRIPTION_CHANGE || "0"),
       generic: parseInt(process.env.BREVO_TEMPLATE_GENERIC || "0")
     },
     contactLists: {
       marketing: parseInt(process.env.BREVO_LIST_MARKETING || "0"),
       tips: parseInt(process.env.BREVO_LIST_TIPS || "0"),
       insights: parseInt(process.env.BREVO_LIST_INSIGHTS || "0")
     }
   };
   ```

2. **Firestore Configuration** (Alternative):
   - Store template/list IDs in Firestore config document
   - Allows runtime updates without redeployment
   - Requires additional Firestore read

### 5.2 Sender Configuration

**Key Findings**:
- Sender email must be verified in Brevo dashboard
- Sender name is optional but recommended
- Reply-to can be different from sender
- Sender information can be set per email or in template

---

## 6. Rate Limits and Quota Management

### 6.1 Brevo API Limits

**Key Findings**:
- Rate limits vary by plan
- Check response headers for rate limit information
- Implement queuing for high-volume scenarios
- Monitor quota usage via Brevo dashboard

### 6.2 Best Practices

1. **Rate Limiting**:
   - Implement exponential backoff
   - Queue emails when approaching limits
   - Monitor sending rates

2. **Quota Management**:
   - Track email credits usage
   - Set up alerts for low quota
   - Plan for quota upgrades if needed

---

## 7. Testing Strategy

### 7.1 Local Testing

**Key Findings**:
- Use Firebase Functions emulator
- Mock Brevo API for unit tests
- Test trigger logic with sample Firestore documents

### 7.2 Integration Testing

**Key Findings**:
- Test with real Brevo API (test account)
- Verify email delivery
- Test contact list operations
- Validate template variable substitution

---

## 8. Security Considerations

### 8.1 API Key Management

**Key Findings**:
- Store API key in Firebase Secrets (never in code)
- Use `defineSecret()` for access
- Rotate keys periodically
- Never log API keys

### 8.2 Data Privacy

**Key Findings**:
- Only send necessary user data to Brevo
- Email addresses required for delivery
- User names for personalization
- No sensitive data (passwords, payment info)

---

## 9. Implementation Recommendations

### 9.1 Phase 1: Core Email Sending

1. Install `@getbrevo/brevo` package
2. Create `brevoService.ts` with API client initialization
3. Create `emailService.ts` with transactional email methods
4. Implement template-based email sending
5. Add error handling and retry logic

### 9.2 Phase 2: Firestore Triggers

1. Create `userCreated` trigger for welcome/verification emails
2. Create `userPreferencesUpdated` trigger for contact list sync
3. Integrate with existing user creation flow
4. Test trigger execution and error handling

### 9.3 Phase 3: Contact List Management

1. Create `contactListService.ts` with add/remove methods
2. Implement preference-based list management
3. Add logging and audit trail
4. Test contact list operations

### 9.4 Phase 4: Integration and Override

1. Override Firebase Auth email sending
2. Integrate with subscription change handlers
3. Update existing email service calls
4. End-to-end testing

---

## 10. Open Questions and Next Steps

### 10.1 Questions to Resolve

1. **Template IDs**: Need to obtain actual template IDs from Brevo dashboard
2. **Contact List IDs**: Need to obtain actual list IDs from Brevo dashboard
3. **Sender Configuration**: Determine sender email and name
4. **Rate Limits**: Confirm Brevo plan limits and quota
5. **Error Monitoring**: Set up alerting for email failures

### 10.2 Next Steps

1. Set up Brevo account and create templates
2. Create contact lists in Brevo dashboard
3. Obtain template and list IDs
4. Configure Firebase Secrets with API key
5. Proceed to Phase 1 design (data models, API contracts)

---

## References

- Brevo API Documentation: https://developers.brevo.com
- Brevo Node.js SDK: https://github.com/getbrevo/brevo-node
- Firebase Functions v2: https://firebase.google.com/docs/functions
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup














