# Feature Specification: Fix Duplicate User Documents in Sign-Up

**Feature Branch**: `003-fix-duplicate-user-docs`  
**Created**: 2025-01-20  
**Status**: Draft  
**Input**: User description: "we have several issues with the sign up. For some reason we're getting two different documents being made for the users collection. One (tRjzOcfOF7bvctkCSmqQ) looks like this: created_at November 19, 2025 at 6:00:26 PM UTC+2 (timestamp) email \"kb@kosoftgo.com\" (string) firstName \"KB\" (string) lastName \"RED TEST\" (string) lastPaymentDate November 19, 2025 at 6:00:27 PM UTC+2 (timestamp) phoneNumber \"\" (string) subscriptionPlan \"once-off\" (string) subscriptionStatus \"active\" (string) updated_at November 19, 2025 at 6:00:27 PM UTC+2. Another is being created: (MggImfUcLTZ0RmMyIf3REOQ082) Surname \"RED TEST\" (string) aboutUsDisplayed false (boolean) accountType \"admin\" (string) cardHolderName \"\" (string) cardNumber \"\" (string) cellphoneNumber \"+27123456789\" (string) cvv 0 (number) email \"kb@kosoftgo.com\" (string) emailVerified false (boolean) expiryDate \"\" (string) firstName \"KB\" (string) marketingConsent false (boolean) parentId \"\" (string) subscriptionType \"digitalMenu\" (string) tipsTutorials false (boolean) uid \"MggImfUcLTZ0RmMyIf3REOQ082\" (string) userInsights false"

## Clarifications

### Session 2025-01-20

- Q: Should payfastToken be saved on user document for billing access? → A: Yes - payfastToken MUST be saved on user document (not just subscriptions/transactions) to enable users to access billing history and edit billing details. Token is required for subscription management operations.
- Q: What should the subscription plan value be for monthly subscriptions? → A: Monthly subscriptions must use 'digitalMenu' as the subscription plan/subscriptionType value, not 'once-off'. The 'once-off' value should only be used for one-time payments.

## User Scenarios & Testing

### User Story 1 - Prevent Duplicate User Document Creation (Priority: P1)

During the sign-up process, when a user completes payment via PayFast and then verifies their email, the system creates two separate user documents in the users collection instead of one unified document. This causes data fragmentation, inconsistent user profiles, and potential data loss.

**Why this priority**: This is a critical data integrity issue that affects user experience, subscription management, and system reliability. Users expect a single, consistent profile record.

**Independent Test**: Can be fully tested by completing a sign-up flow through payment and email verification, then verifying only one user document exists with all expected fields merged correctly.

**Acceptance Scenarios**:

1. **Given** a user completes payment via PayFast ITN and a user document is created with a random document ID, **When** the user verifies their email and completes sign-up, **Then** the system must merge the existing payment-created document with the new Auth UID-based document, creating a single unified document using the Firebase Auth UID as the document ID.

2. **Given** a user document was created during payment processing with payment-related fields (subscriptionStatus, subscriptionPlan, lastPaymentDate, payfastToken), **When** the user completes email verification and sign-up, **Then** all payment-related data must be preserved in the merged document, payfastToken must be saved on the user document for billing access, and subscription references must be updated to use the Auth UID.

3. **Given** a user completes sign-up without a pre-existing payment document, **When** the system creates the user document, **Then** only one document should be created using the Firebase Auth UID as the document ID.

4. **Given** a user document exists with payment data but the document ID doesn't match the Firebase Auth UID, **When** the user completes sign-up, **Then** the system must migrate all data to the Auth UID-based document, update all related subscriptions to reference the new user ID, and optionally remove the old document after verification.

---

### User Story 2 - Merge Field Mappings Correctly (Priority: P1)

The two user documents created use different field names for the same data (e.g., "lastName" vs "Surname", "subscriptionPlan" vs "subscriptionType"). The system must correctly map and merge these fields into a single consistent schema.

**Why this priority**: Incorrect field mapping leads to data loss or incorrect values, affecting user profiles and subscription management.

**Independent Test**: Can be tested by creating a user document with one field schema, then completing sign-up with different field names, and verifying all fields are correctly mapped and merged.

**Acceptance Scenarios**:

1. **Given** a payment-created user document contains "lastName", "subscriptionPlan", "phoneNumber", **When** the sign-up process creates a document with "Surname", "subscriptionType", "cellphoneNumber", **Then** the merged document must use the consistent schema (Surname, subscriptionType, cellphoneNumber) while preserving all values from both sources.

2. **Given** conflicting values exist between the payment document and sign-up form data (e.g., different phone numbers), **When** merging documents, **Then** form data should take precedence for user-provided fields (firstName, lastName, cellphoneNumber), while payment data takes precedence for payment/subscription fields (subscriptionStatus, subscriptionPlan, payfastToken).

---

### User Story 3 - Update Related Data References (Priority: P1)

When migrating a user document from a random ID to the Auth UID, all related data (subscriptions, transactions, etc.) must be updated to reference the new user ID to maintain referential integrity.

**Why this priority**: Broken references cause subscription management failures, payment processing issues, and data inconsistency across the system.

**Independent Test**: Can be tested by creating subscriptions and transactions linked to a random user ID, then completing sign-up to trigger migration, and verifying all related documents reference the new Auth UID.

**Acceptance Scenarios**:

1. **Given** subscriptions exist with userId referencing a random document ID, **When** a user document is migrated to use Auth UID, **Then** all subscription documents must be updated to use the new userId.

2. **Given** audit logs or other related documents reference the old user document ID, **When** migration occurs, **Then** these references should be updated if possible, or at minimum, the migration should be logged for manual review if auto-update isn't feasible.

---

### Edge Cases

- What happens when multiple payment documents exist for the same email before sign-up?
- How does the system handle sign-up if the payment document was deleted or doesn't exist?
- What happens if email verification happens before payment processing completes?
- How does the system handle race conditions where payment ITN and email verification happen simultaneously?
- What happens if the user document migration fails partway through (e.g., subscription updates succeed but document migration fails)?
- How does the system handle users who sign up without completing payment first?

## Requirements

### Functional Requirements

- **FR-001**: System MUST check for existing user documents by email before creating a new document during sign-up.

- **FR-002**: System MUST use Firebase Auth UID as the document ID for all user documents in the users collection.

- **FR-003**: System MUST merge existing payment-created user documents with sign-up data when both exist for the same email.

- **FR-004**: System MUST preserve all payment-related data (subscriptionStatus, subscriptionPlan, payfastToken, lastPaymentDate) when merging documents.

- **FR-012**: System MUST save payfastToken on the user document during merge operations to enable users to access billing history and edit billing details. Token must not only exist in subscriptions/transactions collections but also be directly accessible on the user document.

- **FR-013**: System MUST set subscription plan/subscriptionType to 'digitalMenu' for monthly recurring subscriptions, not 'once-off'. The 'once-off' value should only be used for one-time payments, not recurring subscriptions.

- **FR-005**: System MUST map field names correctly during merge (lastName → Surname, subscriptionPlan → subscriptionType, phoneNumber → cellphoneNumber).

- **FR-006**: System MUST update all subscription documents to use the Auth UID when migrating a user document from random ID to Auth UID.

- **FR-007**: System MUST handle conflict resolution: form data takes precedence for user-provided fields (firstName, lastName, cellphoneNumber, marketing preferences), payment data takes precedence for payment/subscription fields.

- **FR-008**: System MUST prevent duplicate document creation by ensuring only one user document exists per email address at any time.

- **FR-009**: System MUST log migration operations for audit purposes when documents are migrated from random ID to Auth UID.

- **FR-010**: System MUST handle edge cases where payment document doesn't exist or sign-up happens without payment.

- **FR-011**: System MUST remove or mark for deletion the old random ID document after successful migration and verification, unless business rules require retention for audit purposes.

### Key Entities

- **User Document**: Represents a user account in the users collection. Must have a consistent schema with fields: uid, email, firstName, Surname, cellphoneNumber, subscriptionStatus, subscriptionPlan/subscriptionType (set to 'digitalMenu' for monthly subscriptions, 'once-off' for one-time payments), payfastToken (required for billing history access and subscription management), emailVerified, accountType, and other user preferences. Document ID must match the Firebase Auth UID.

- **Payment Document**: A temporary user document created during payment processing with a random document ID. Contains payment-specific fields: subscriptionStatus, subscriptionPlan, lastPaymentDate, and payment metadata.

- **Subscription Document**: References a user via userId field. Must be updated when user document ID changes during migration.

- **Migration Operation**: The process of consolidating payment-created and sign-up-created documents into a single Auth UID-based document, including data merging, field mapping, and reference updates.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of sign-up operations result in exactly one user document per email address in the users collection.

- **SC-002**: 100% of user documents use the authenticated user's unique identifier as the document ID within 1 minute of sign-up completion.

- **SC-003**: 100% of payment-related data (subscriptionStatus, subscriptionPlan, payfastToken) is preserved during document merging operations.

- **SC-008**: 100% of user documents have payfastToken saved directly on the document after merge operations, enabling users to access billing history and edit billing details without requiring token lookup from subscriptions collection.

- **SC-009**: 100% of monthly recurring subscriptions have subscriptionType/subscriptionPlan set to 'digitalMenu', not 'once-off'.

- **SC-004**: 100% of subscription documents reference the correct Auth UID-based user document after migration (zero broken references).

- **SC-005**: System prevents duplicate document creation with zero duplicate documents created after fix deployment.

- **SC-006**: All related data references (subscriptions, transactions where applicable) are updated correctly during migration, with zero data loss.

- **SC-007**: Document merging operations complete successfully in under 5 seconds for 95% of sign-up operations.

## Assumptions

- Existing payment processing flow creates user documents with random IDs via `db.collection('users').add()`.

- Sign-up flow creates user documents using Auth UID via `afs.doc('users/${user.uid}').set()`.

- Both document creation paths can occur for the same user (payment first, then sign-up).

- Field name inconsistencies (lastName vs Surname, subscriptionPlan vs subscriptionType) need to be standardized during merge.

- All user documents should ultimately use Firebase Auth UID as document ID for consistency and security.

- Payment data should be preserved as the source of truth for subscription information.

- Form data should be the source of truth for user-provided personal information.

- Migration should be atomic where possible, but partial failures should be logged and recoverable.

## Dependencies

- Firebase Auth service for obtaining user UID.

- Firestore database access for reading, writing, and updating user and subscription documents.

- PayFast ITN handler that creates initial user documents during payment processing.

- Email verification component that triggers user document creation during sign-up.

- Subscription service/document structure that references users via userId field.

## Out of Scope

- Migrating existing duplicate documents that were created before this fix (separate migration task).

- Changes to the payment processing flow that creates the initial document (handled separately if needed).

- Changes to the user document schema structure (handled via field mapping during merge).

- Handling duplicate documents created through other means (e.g., direct database writes, admin tools).
