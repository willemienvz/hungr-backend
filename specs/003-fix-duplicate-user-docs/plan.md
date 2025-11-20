# Implementation Plan: Fix Duplicate User Documents in Sign-Up

**Branch**: `003-fix-duplicate-user-docs` | **Date**: 2025-01-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fix-duplicate-user-docs/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix the duplicate user document creation issue during sign-up where two separate user documents are created in the users collection - one with a random ID from PayFast ITN payment processing, and another with Firebase Auth UID from email verification. The solution will merge these documents, preserve all payment data including payfastToken, map field names correctly, update subscription references, and ensure monthly subscriptions use 'digitalMenu' instead of 'once-off'. This fixes data fragmentation, ensures billing history access, and maintains referential integrity across subscriptions and transactions.

## Technical Context

**Language/Version**: TypeScript 5.2.2, Angular 17.0.0, Node.js (Firebase Functions)  
**Primary Dependencies**: Angular Fire (@angular/fire ^17.0.1), Firebase Auth, Firestore, Firebase Functions, Firebase Admin SDK  
**Storage**: Firestore (users, subscriptions, transactions collections)  
**Testing**: Jasmine, Karma (Angular testing framework), Firebase Functions testing  
**Target Platform**: Web browser (Angular SPA) + Firebase Cloud Functions (Node.js)  
**Project Type**: Web application (Angular SPA with Firebase backend)  
**Performance Goals**: Document merge operations complete within 5 seconds for 95% of sign-up operations  
**Constraints**: Must preserve all payment data during merge, must maintain backward compatibility, must handle race conditions, must update all related document references atomically where possible  
**Scale/Scope**: Restaurant management dashboard with user registration, payment processing, and subscription management; fix affects sign-up flow and payment processing integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: The constitution file (`.specify/memory/constitution.md`) appears to be a template and has not been customized for this project. No specific constitution gates are defined. Proceeding with standard Angular/Firebase best practices.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-duplicate-user-docs/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/
├── components/
│   └── verify-email/
│       └── verify-email.component.ts      # Email verification component (modify - merge logic)
│
functions/src/
├── payfastItn.ts                          # PayFast ITN handler (modify - user creation, payfastToken saving, plan value)
└── payfast.ts                             # PayFast utilities (may need updates for token retrieval)

src/app/shared/
└── services/
    └── auth.service.ts                     # AuthService with SetUserData method (modify - merge logic, field mapping)
```

**Structure Decision**: This is a web application using Angular 17 with Firebase Functions backend. The feature modifies existing components and services:
- `verify-email.component.ts`: Add logic to check for existing payment-created user documents and merge them
- `payfastItn.ts`: Ensure payfastToken is saved when creating user documents, fix subscription plan value ('digitalMenu' for monthly)
- `auth.service.ts`: Update SetUserData to handle merge operations and field mapping
- No new files needed - changes to existing sign-up and payment processing flows

## Complexity Tracking

> **No violations identified** - This feature follows standard Angular/Firebase patterns and uses existing infrastructure. The merge logic is a standard data migration pattern with proper conflict resolution.
