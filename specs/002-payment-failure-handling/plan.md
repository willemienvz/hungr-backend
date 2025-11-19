# Implementation Plan: Enhanced Payment Failure Handling for Subscriptions

**Branch**: `002-payment-failure-handling` | **Date**: 2024-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-payment-failure-handling/spec.md`

## Summary

Enhance the existing PayFast ITN (Instant Transaction Notification) handler to properly handle all payment statuses, track consecutive payment failures, implement a grace period, send email notifications, and flag subscriptions for manual review. The current system only handles COMPLETE, CANCELLED, and FAILED statuses, immediately pausing subscriptions on failure. This plan extends the failure handling with graceful degradation and better user communication.

**Key Technical Approach**:
- Extend `payfastItn.ts` to handle PENDING, PROCESSING, and unknown statuses
- Add consecutive failure tracking to subscription documents
- Implement grace period logic (2 failures before action)
- Create email notification function for payment failures
- Add manual review flagging system
- Enhance audit logging for all status types

## Technical Context

**Language/Version**: TypeScript 4.9+, Node.js 20  
**Primary Dependencies**: 
- Backend: Firebase Functions 4.4+, Firebase Admin SDK 12.6+, Firebase Firestore
- External: PayFast ITN webhook, AWS Lambda (email service via Brevo)  
**Storage**: Firestore (subscriptions, transactions, audit_logs, users collections)  
**Testing**: Firebase Functions emulator, Jasmine/Karma (if adding tests)  
**Target Platform**: Firebase Cloud Functions (serverless)  
**Project Type**: Web application (Firebase backend for Angular frontend)  
**Performance Goals**: 
- Payment status processing completes within 5 seconds (SC-001)
- Email notifications delivered within 1 minute (SC-003)
- Subscription cancellation within 10 seconds of 3rd failure (SC-002)  
**Constraints**: 
- Must maintain backward compatibility with existing subscription documents
- Firebase Functions timeout limits (60s default)
- AWS Lambda email service availability and rate limits
- PayFast ITN notification reliability
- No duplicate processing of payment notifications  
**Scale/Scope**: 
- All active subscriptions with recurring payments
- Support for grace period (2 failures) before cancellation (3rd failure)
- Email notifications for all payment failures
- Manual review flagging for subscriptions at risk

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Project Structure**: Extends existing Firebase Functions structure - compliant  
✅ **Dependencies**: Standard Firebase/TypeScript stack - compliant  
✅ **Testing**: Integration tests via Firebase emulator recommended - compliant  
✅ **Documentation**: Feature spec exists, plan being created - compliant  
✅ **Error Handling**: Graceful degradation, email failures don't block processing - compliant

## Project Structure

### Documentation (this feature)

```text
specs/002-payment-failure-handling/
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
│   └── src/
│       ├── index.ts                    # Export new/updated functions
│       ├── payfastItn.ts               # ⚠️ ENHANCE: Add status handling, failure tracking
│       ├── handleSubscriptionFailure.ts # ⚠️ REFACTOR: Enhanced failure handling
│       ├── sendPaymentFailureEmail.ts  # ⚠️ NEW: Email notification function
│       ├── subscriptionUtils.ts        # ✅ Exists (retry, logging utilities)
│       └── emailTemplates.ts           # ✅ Exists (may need payment failure templates)
│
└── email-templates/
    └── payment-failure.html            # ⚠️ NEW: Payment failure email template
    └── payment-cancellation.html       # ⚠️ NEW: Cancellation email template
```

**Structure Decision**: Extend existing Firebase Functions structure. Enhance `payfastItn.ts` for comprehensive status handling, refactor `handleSubscriptionFailure` with new logic, create dedicated email notification function, and add email templates for payment failure communications.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected - all enhancements align with existing architecture patterns.

---

## Phase Completion Status

### Phase 0: Outline & Research ✅ COMPLETE
- **research.md**: Created with all technical decisions documented
- All NEEDS CLARIFICATION markers resolved
- Payment status handling patterns researched
- Consecutive failure tracking approach determined
- Email service integration patterns documented
- Manual review flagging system designed
- Grace period logic defined

### Phase 1: Design & Contracts ✅ COMPLETE
- **data-model.md**: Created with subscription data model enhancements
- **contracts/**: Created API contracts for:
  - Enhanced PayFast ITN handler
  - Send Payment Failure Email function
  - Enhanced Handle Subscription Failure function
- **quickstart.md**: Created getting started guide for developers
- **Agent Context**: Updated Cursor IDE context with new technologies

### Phase 2: Tasks
- **tasks.md**: Pending - To be created by `/speckit.tasks` command
