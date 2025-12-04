# Implementation Plan: Brevo Transactional Email Integration

**Branch**: `004-brevo-transactional-emails` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-brevo-transactional-emails/spec.md`

## Summary

Integrate Brevo (formerly Sendinblue) as the transactional email provider for all user-facing emails (verification, password reset, welcome, subscription changes) and implement automated campaign subscription management based on user preferences. Replace existing email sending mechanisms (Firebase Auth default emails, AWS Lambda) with Brevo template-based sending, and automatically sync users to Brevo contact lists when they opt in to marketing communications, tips, or insights.

**Key Technical Approach**:
- Install and configure Brevo SDK (`@getbrevo/brevo`) in Firebase Functions
- Create Firebase Functions v2 triggers for user document creation and preference updates
- Implement Brevo service layer for transactional email sending with template support
- Implement Brevo contact list management for campaign subscriptions
- Add configuration management for template IDs and contact list IDs
- Implement retry logic, error handling, and logging
- Override Firebase Auth email sending to use Brevo templates

## Technical Context

**Language/Version**: TypeScript 4.9+, Node.js 20  
**Primary Dependencies**: 
- Backend: Firebase Functions 4.4+ (v2 API), Firebase Admin SDK 12.6+, Firebase Firestore
- External: Brevo API (`@getbrevo/brevo` package), Firebase Secrets for API key management  
**Storage**: Firestore (users collection for preferences, email_logs collection for audit trail)  
**Testing**: Firebase Functions emulator, unit tests for Brevo service layer  
**Target Platform**: Firebase Cloud Functions (serverless)  
**Project Type**: Web application (Firebase backend for Angular frontend)  
**Performance Goals**: 
- Transactional emails delivered within 30 seconds (SC-004)
- Contact list operations complete within 30 seconds (SC-010, SC-011)
- 98%+ email delivery success rate (SC-002)
- 98%+ contact list operation success rate (SC-012)  
**Constraints**: 
- Must maintain backward compatibility with existing user data structure
- Firebase Functions timeout limits (60s default, extendable to 540s)
- Brevo API rate limits and quota management
- Secure API key storage via Firebase Secrets
- No blocking of user-facing operations (account creation, preference updates)
- Existing users with preferences not automatically synced (FR-028)  
**Scale/Scope**: 
- All new user registrations and email verification requests
- All password reset requests
- All subscription change events
- All user preference changes (marketingConsent, tipsTutorials, userInsights)
- Support for 4 transactional email types + 3 campaign contact lists

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Project Structure**: Extends existing Firebase Functions structure - compliant  
✅ **Dependencies**: Standard Firebase/TypeScript stack with external API integration - compliant  
✅ **Testing**: Integration tests via Firebase emulator recommended - compliant  
✅ **Documentation**: Feature spec exists, plan being created - compliant  
✅ **Error Handling**: Graceful degradation, email/contact list failures don't block user operations - compliant  
✅ **Security**: API keys stored in Firebase Secrets, not in code - compliant

## Project Structure

### Documentation (this feature)

```text
specs/004-brevo-transactional-emails/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
├── checklists/          # Quality checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── functions/
│   ├── package.json                    # ⚠️ UPDATE: Add @getbrevo/brevo dependency
│   └── src/
│       ├── index.ts                    # ⚠️ UPDATE: Export new Brevo functions
│       ├── brevo/
│       │   ├── brevoService.ts         # ⚠️ NEW: Core Brevo API service
│       │   ├── emailService.ts         # ⚠️ NEW: Transactional email sending
│       │   ├── contactListService.ts   # ⚠️ NEW: Contact list management
│       │   └── config.ts               # ⚠️ NEW: Template/list ID configuration
│       ├── triggers/
│       │   ├── userCreated.ts          # ⚠️ NEW: Firestore trigger for user creation
│       │   └── userPreferencesUpdated.ts # ⚠️ NEW: Firestore trigger for preference changes
│       ├── emailTemplates.ts           # ⚠️ REFACTOR: Update to use Brevo service
│       └── subscriptionUtils.ts        # ✅ Exists (may need email integration)
│
└── email-templates/                    # ✅ Exists (reference for Brevo template setup)
    ├── base-template.html
    ├── email-verification.html
    ├── password-reset.html
    ├── welcome.html
    └── brevo-template-config.md        # ✅ Exists (update with new template IDs)
```

**Structure Decision**: Create dedicated `brevo/` module for all Brevo-related functionality (service layer, email sending, contact list management, configuration). Create `triggers/` directory for Firebase Functions v2 Firestore triggers. Keep existing email template HTML files as reference for Brevo template setup. Maintain separation of concerns: service layer handles API calls, triggers handle Firestore events, configuration centralizes template/list IDs.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected - all enhancements align with existing architecture patterns. The addition of Brevo SDK and new service layer follows standard dependency injection and separation of concerns principles.

---

## Phase Completion Status

- [x] **Phase 0: Research** - Brevo API integration patterns, Firebase Functions v2 triggers, template configuration (Complete - see `research.md`)
- [x] **Phase 1: Design** - Service layer architecture, data model, API contracts, error handling strategy (Complete - see `data-model.md`, `quickstart.md`, `contracts/`)
- [x] **Phase 2: Tasks** - Detailed task breakdown (Complete - see `tasks.md`)

---

## Phase 0: Research

*Research questions and findings will be documented in `research.md`*

### Research Areas

1. **Brevo API Integration**
   - Brevo SDK (`@getbrevo/brevo`) installation and initialization
   - Transactional email API (`sendTransacEmail`) usage patterns
   - Template variable substitution syntax and best practices
   - Contact list API (`addContact`, `removeContact`) usage
   - API authentication with API keys
   - Rate limits and quota management
   - Error response handling and retry strategies

2. **Firebase Functions v2 Firestore Triggers**
   - `onDocumentCreated` trigger syntax and configuration
   - `onDocumentUpdated` trigger for preference changes
   - Secret management with `defineSecret` for API keys
   - Trigger region configuration and performance
   - Error handling and retry behavior in triggers

3. **Email Template Configuration**
   - Brevo template creation and ID management
   - Template variable naming conventions
   - Fallback template strategy
   - Template versioning and updates

4. **Contact List Management**
   - Brevo contact list creation and ID management
   - Adding/removing contacts with attributes
   - Handling duplicate contacts (idempotency)
   - Contact list synchronization strategies

5. **Integration with Existing Systems**
   - Overriding Firebase Auth email sending
   - Integration with existing subscription change handlers
   - User preference field structure (`marketingConsent`, `tipsTutorials`, `userInsights`)
   - Sign-up flow integration points

6. **Error Handling and Observability**
   - Logging strategies for email sending and contact list operations
   - Retry logic with exponential backoff
   - Monitoring and alerting for failures
   - Audit trail for compliance

---

## Phase 1: Design

*Design artifacts will be documented in `data-model.md`, `quickstart.md`, and `contracts/`*

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                          │
│  - Sign-up form (receiveMarketingInfo)                      │
│  - Settings page (marketingConsent, tipsTutorials, etc.)   │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ Firestore Updates
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Functions v2 Triggers                   │
│  ┌────────────────────┐  ┌──────────────────────────────┐ │
│  │ userCreated         │  │ userPreferencesUpdated       │ │
│  │ (onDocumentCreated) │  │ (onDocumentUpdated)          │ │
│  └──────────┬──────────┘  └──────────────┬───────────────┘ │
│             │                            │                  │
│             └────────────┬───────────────┘                  │
│                          ▼                                  │
│              ┌─────────────────────┐                       │
│              │   Brevo Service      │                       │
│              │   (brevoService.ts)  │                       │
│              └──────────┬───────────┘                       │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Email       │ │ Contact List │ │ Config       │         │
│  │ Service     │ │ Service      │ │ Manager      │         │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘         │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
    ┌─────────────────────────────────────────────┐
    │            Brevo API                        │
    │  - Transactional Emails                     │
    │  - Contact Lists                            │
    └─────────────────────────────────────────────┘
```

### Key Components

1. **Brevo Service Layer** (`brevo/brevoService.ts`)
   - Initializes Brevo API client with secret API key
   - Provides base methods for API calls
   - Handles authentication and error transformation
   - Implements retry logic with exponential backoff

2. **Email Service** (`brevo/emailService.ts`)
   - Sends transactional emails using Brevo templates
   - Handles template variable substitution
   - Implements fallback to generic template
   - Logs email sending attempts and results

3. **Contact List Service** (`brevo/contactListService.ts`)
   - Adds/removes contacts from Brevo contact lists
   - Handles duplicate contact scenarios (idempotent)
   - Maps user preferences to contact lists
   - Logs contact list operations

4. **Configuration Manager** (`brevo/config.ts`)
   - Manages template ID mappings (verification, password reset, welcome, subscription change, generic)
   - Manages contact list ID mappings (marketing, tips, insights)
   - Provides configuration validation
   - Supports environment-based configuration

5. **Firestore Triggers**
   - `userCreated`: Triggers on `users/{userId}` document creation
     - Sends verification email via Brevo
     - Sends welcome email via Brevo
     - Adds user to contact lists based on initial preferences
   - `userPreferencesUpdated`: Triggers on user document updates
     - Detects changes to `marketingConsent`, `tipsTutorials`, `userInsights`
     - Adds/removes user from corresponding contact lists

6. **Integration Points**
   - Override Firebase Auth email verification (use custom function instead of `sendEmailVerification`)
   - Override password reset email (use custom function instead of `sendPasswordResetEmail`)
   - Integrate with subscription change handlers (`updateSubscription.ts`, `payfastItn.ts`)
   - Integrate with settings page preference updates

### Data Model Changes

**New Collections**:
- `email_logs`: Audit trail for email sending
  - `userId`, `emailType`, `templateId`, `recipient`, `status`, `timestamp`, `errorDetails`
- `contact_list_logs`: Audit trail for contact list operations
  - `userId`, `contactListType`, `operation` (add/remove), `status`, `timestamp`, `errorDetails`

**User Document Fields** (already exist, no changes needed):
- `marketingConsent`: boolean
- `tipsTutorials`: boolean
- `userInsights`: boolean
- `email`: string
- `firstName`: string

### API Contracts

**Brevo Email Service**:
- `sendTransactionalEmail(emailType, recipient, templateVariables)`: Promise<EmailResult>
- `sendVerificationEmail(userEmail, verificationLink, userName)`: Promise<EmailResult>
- `sendPasswordResetEmail(userEmail, resetLink, userName)`: Promise<EmailResult>
- `sendWelcomeEmail(userEmail, userName)`: Promise<EmailResult>
- `sendSubscriptionChangeEmail(userEmail, subscriptionDetails)`: Promise<EmailResult>

**Brevo Contact List Service**:
- `addContactToList(contactListType, userEmail, attributes)`: Promise<ContactListResult>
- `removeContactFromList(contactListType, userEmail)`: Promise<ContactListResult>
- `syncUserPreferences(userId, preferences)`: Promise<SyncResult>

### Error Handling Strategy

1. **Retry Logic**: Exponential backoff for transient Brevo API failures
   - Initial retry after 1 second
   - Max 3 retries
   - Max delay: 10 seconds

2. **Fallback Behavior**:
   - Template not found → Use generic template
   - Contact list not found → Log error, don't block user operation
   - API unavailable → Queue for retry, log for monitoring

3. **Non-Blocking Operations**:
   - Email sending failures don't block account creation
   - Contact list operation failures don't block preference updates
   - All failures logged for monitoring and manual intervention

4. **Error Logging**:
   - All operations logged to Firestore (`email_logs`, `contact_list_logs`)
   - Console logging for debugging
   - Error details include: error code, message, timestamp, context

### Security Considerations

1. **API Key Management**:
   - Brevo API key stored in Firebase Secrets
   - Accessed via `defineSecret` in Firebase Functions v2
   - Never exposed in code or logs

2. **Data Privacy**:
   - User email addresses sent to Brevo (required for email delivery)
   - User names sent to Brevo (for personalization)
   - No sensitive data (passwords, payment info) sent to Brevo

3. **Access Control**:
   - Triggers only fire on authenticated user document changes
   - No direct API access from frontend
   - All operations server-side only

---

## Implementation Phases

### Phase 0: Research (Current)
- Research Brevo API integration patterns
- Research Firebase Functions v2 trigger syntax
- Document findings in `research.md`

### Phase 1: Design (Next)
- Design service layer architecture
- Define data models and API contracts
- Create quickstart guide
- Document in `data-model.md`, `quickstart.md`, `contracts/`

### Phase 2: Implementation (After Phase 1)
- Install Brevo SDK
- Implement Brevo service layer
- Implement Firestore triggers
- Integrate with existing systems
- Add logging and error handling
- Test and deploy

---

## Next Steps

1. Complete Phase 0 research and document findings
2. Proceed to Phase 1 design with service layer architecture
3. Create detailed task breakdown via `/speckit.tasks` after design phase

