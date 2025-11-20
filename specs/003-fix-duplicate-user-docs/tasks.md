# Tasks: Fix Duplicate User Documents in Sign-Up

**Input**: Design documents from `/specs/003-fix-duplicate-user-docs/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL and not explicitly requested in the feature specification. Therefore, no test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3])
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/app/` for Angular frontend, `functions/src/` for Firebase Functions backend
- Paths shown below match the actual project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification of existing infrastructure

- [x] T001 Verify Firebase project configuration and access to `hungr-firebase` project
- [x] T002 [P] Verify existing files are accessible: `functions/src/payfastItn.ts`, `src/app/components/verify-email/verify-email.component.ts`, `src/app/shared/services/auth.service.ts`
- [x] T003 [P] Review existing PayFast ITN handler logic in `functions/src/payfastItn.ts` to understand current user document creation flow
- [x] T004 [P] Review existing email verification component in `src/app/components/verify-email/verify-email.component.ts` to understand current sign-up flow

**Checkpoint**: Project structure verified and existing code reviewed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core fixes that MUST be complete before document merge logic can work correctly

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. These fixes ensure payment-created documents have correct data structure.

- [x] T005 Fix PayFast ITN handler to save payfastToken when creating new user documents in `functions/src/payfastItn.ts` (around line 454-464)
- [x] T006 Fix PayFast ITN handler subscription plan determination logic in `functions/src/payfastItn.ts` (around line 420-452) to use 'digitalMenu' for monthly recurring subscriptions instead of 'once-off'
- [x] T007 Fix PayFast ITN handler to save payfastToken when updating existing user documents in `functions/src/payfastItn.ts` (around line 614-620)
- [x] T008 Fix PayFast ITN handler to also set subscriptionType field (in addition to subscriptionPlan) for consistency in `functions/src/payfastItn.ts` (around line 614-620)

**Checkpoint**: Payment processing now saves correct data (payfastToken, 'digitalMenu' for monthly). Foundation ready for merge logic.

---

## Phase 3: User Story 1 - Prevent Duplicate User Document Creation (Priority: P1) 🎯 MVP

**Goal**: Ensure only one user document exists per email address by merging payment-created documents into Auth UID-based documents during sign-up.

**Independent Test**: Complete a sign-up flow through payment and email verification, then verify only one user document exists in Firestore with Auth UID as document ID and all expected fields merged correctly.

### Implementation for User Story 1

- [x] T009 [US1] Update `createUserAccount()` method in `src/app/components/verify-email/verify-email.component.ts` to check for existing user documents by email before creating new document
- [x] T010 [US1] Implement logic in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` to detect when existing payment document has different ID than Auth UID
- [x] T011 [US1] Implement merge logic in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` to create/update Auth UID document with existing payment document data using `set()` with `merge: true`
- [x] T012 [US1] Add preservation of all existing payment document fields during merge in `src/app/components/verify-email/verify-email.component.ts` (spread existing data before merging form data)
- [x] T013 [US1] Ensure uid field is set to Auth UID in merged document in `src/app/components/verify-email/verify-email.component.ts`
- [x] T014 [US1] Add error handling for case where existing user query returns empty in `src/app/components/verify-email/verify-email.component.ts` (fallback to standard flow)
- [x] T015 [US1] Add error handling for Firebase Auth 'email-already-in-use' error in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` with redirect to sign-in
- [x] T016 [US1] Add logging for migration operations when documents are merged from random ID to Auth UID in `src/app/components/verify-email/verify-email.component.ts` (console.log with migration details)
- [x] T017 [US1] Add user feedback toast notification when merging account data in `src/app/components/verify-email/verify-email.component.ts` (info message: "Merging account data...")

**Checkpoint**: At this point, User Story 1 should be fully functional - payment documents are merged into Auth UID documents. However, field names may not be mapped correctly yet (handled in US2).

---

## Phase 4: User Story 2 - Merge Field Mappings Correctly (Priority: P1)

**Goal**: Correctly map field names from payment documents to canonical schema and resolve conflicts between payment data and form data.

**Independent Test**: Create a payment-created user document with field names 'lastName', 'phoneNumber', 'subscriptionPlan', then complete sign-up and verify merged document uses canonical field names 'Surname', 'cellphoneNumber', 'subscriptionType' with correct values and conflict resolution applied.

### Implementation for User Story 2

- [x] T018 [US2] Create helper method `mapPaymentFieldsToCanonical()` in `src/app/components/verify-email/verify-email.component.ts` to map payment document fields to canonical schema
- [x] T019 [US2] Implement field name mapping in `mapPaymentFieldsToCanonical()` in `src/app/components/verify-email/verify-email.component.ts`: lastName → Surname, phoneNumber → cellphoneNumber
- [x] T020 [US2] Create helper method `mapSubscriptionPlan()` in `src/app/components/verify-email/verify-email.component.ts` to map subscription plan values ('once-off' stays 'once-off', monthly/recurring → 'digitalMenu')
- [x] T021 [US2] Implement subscription plan value mapping in `mapSubscriptionPlan()` in `src/app/components/verify-email/verify-email.component.ts` (map subscriptionPlan to subscriptionType, handle 'once-off' vs recurring)
- [x] T022 [US2] Implement conflict resolution in `mapPaymentFieldsToCanonical()` in `src/app/components/verify-email/verify-email.component.ts`: form data takes precedence for user-provided fields (firstName, Surname, cellphoneNumber, marketing preferences)
- [x] T023 [US2] Implement conflict resolution in `mapPaymentFieldsToCanonical()` in `src/app/components/verify-email/verify-email.component.ts`: payment data takes precedence for payment/subscription fields (subscriptionStatus, subscriptionType, payfastToken, lastPaymentDate)
- [x] T024 [US2] Update merge logic in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` to call `mapPaymentFieldsToCanonical()` and apply mapped fields during document merge
- [x] T025 [US2] Ensure payfastToken is preserved during field mapping in `mapPaymentFieldsToCanonical()` in `src/app/components/verify-email/verify-email.component.ts` (payment data takes precedence)
- [x] T026 [US2] (Optional) Update `SetUserData()` method in `src/app/shared/services/auth.service.ts` to use `merge: true` option to preserve existing fields like payfastToken when updating user documents

**Checkpoint**: At this point, User Story 2 should be fully functional - field names are correctly mapped to canonical schema and conflicts are resolved appropriately.

---

## Phase 5: User Story 3 - Update Related Data References (Priority: P1)

**Goal**: Update all subscription documents and other related data to reference the Auth UID when user document is migrated from random ID to Auth UID.

**Independent Test**: Create subscription documents linked to a random user document ID, then complete sign-up to trigger migration, and verify all subscription documents reference the new Auth UID instead of the old random ID.

### Implementation for User Story 3

- [x] T027 [US3] Implement query to find all subscriptions with userId matching old random document ID in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` (use Firestore query: collection('subscriptions').where('userId', '==', existingDocId))
- [x] T028 [US3] Implement batch write to update all subscription documents to use new Auth UID in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` (use Firestore batch() API)
- [x] T029 [US3] Add error handling for batch write failures in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` (log error but don't fail entire merge)
- [x] T030 [US3] Add logging for each subscription document updated during migration in `src/app/components/verify-email/verify-email.component.ts` (console.log with subscription ID and new userId)
- [x] T031 [US3] Add user feedback toast notification showing number of subscriptions migrated in `src/app/components/verify-email/verify-email.component.ts` (success message: "Migrated X subscription(s)")
- [x] T032 [US3] Add logging for old random ID document that should be deleted (or kept as backup) in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` (console.warn with document ID)
- [x] T033 [US3] Ensure subscription updates only happen when document ID actually changes (existingDocId !== authUid) in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts`
- [x] T034 [US3] Add handling for case where no subscriptions exist for old user ID in `createUserAccount()` in `src/app/components/verify-email/verify-email.component.ts` (skip subscription update logic gracefully)

**Checkpoint**: At this point, User Story 3 should be fully functional - subscription references are updated to use Auth UID, maintaining referential integrity.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, validation, and documentation

- [ ] T035 [P] Add comprehensive error logging throughout merge process in `src/app/components/verify-email/verify-email.component.ts` for debugging production issues
- [ ] T036 [P] Verify all console.log statements use appropriate log levels (console.log for info, console.warn for warnings, console.error for errors) in `src/app/components/verify-email/verify-email.component.ts`
- [ ] T037 [P] Review and validate all field mappings against data-model.md specification in `src/app/components/verify-email/verify-email.component.ts`
- [ ] T038 [P] Test merge operation performance to ensure it completes within 5 seconds for typical sign-ups
- [ ] T039 [P] Verify backward compatibility - ensure users without payment documents can still sign up normally
- [ ] T040 [P] Test edge cases: multiple payment documents for same email, deleted payment documents, race conditions
- [ ] T041 [P] Update inline code comments in `functions/src/payfastItn.ts` to document payfastToken saving and plan value fixes
- [ ] T042 [P] Update inline code comments in `src/app/components/verify-email/verify-email.component.ts` to document merge logic and field mapping
- [ ] T043 [P] Run quickstart.md validation - verify all implementation steps match actual code changes
- [ ] T044 [P] Manual testing: Complete full sign-up flow through payment and email verification, verify single user document with all fields merged correctly
- [ ] T045 [P] Manual testing: Verify payfastToken is present on user document after merge
- [ ] T046 [P] Manual testing: Verify subscriptionType is 'digitalMenu' for monthly subscriptions
- [ ] T047 [P] Manual testing: Verify subscriptions reference Auth UID after migration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (must complete first)
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational - no dependencies on other stories
  - User Story 2 (Phase 4): Depends on User Story 1 (merge logic must exist before field mapping)
  - User Story 3 (Phase 5): Depends on User Story 1 (merge logic must exist before subscription updates)
  - Note: US2 and US3 could potentially work in parallel if field mapping is extracted as a separate helper, but it's safer to do US2 first
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Creates the merge logic foundation
  - US2 and US3 build on top of this
- **User Story 2 (P1)**: Depends on User Story 1 completion
  - Field mapping functions are called during merge process in US1
  - Must have merge logic working first
- **User Story 3 (P1)**: Depends on User Story 1 completion
  - Subscription updates happen during merge process in US1
  - Must have merge logic working first

### Within Each User Story

- Core logic before helper functions (or helpers first if needed by core logic)
- Error handling added during implementation
- Logging added during implementation
- User feedback (toast notifications) added at end

### Parallel Opportunities

- **Setup phase**: T002, T003, T004 can run in parallel (all review tasks)
- **Foundational phase**: T005-T008 are sequential (all modify same file `payfastItn.ts`)
- **User Story 1**: Most tasks are sequential (modify same file), but T016 and T017 could be done in parallel after core merge logic
- **User Story 2**: T018-T021 can be done in parallel (creating helper functions), then T022-T026 sequentially (integration)
- **User Story 3**: T027-T034 are mostly sequential (all modify same merge flow)
- **Polish phase**: Most tasks marked [P] can run in parallel (different concerns)
- **Different user stories**: US2 and US3 cannot run in parallel with each other or before US1 (they depend on US1's merge logic)

---

## Parallel Example: User Story 2 Helper Functions

```bash
# Launch helper function creation tasks in parallel:
Task: "Create helper method mapPaymentFieldsToCanonical() in src/app/components/verify-email/verify-email.component.ts"
Task: "Create helper method mapSubscriptionPlan() in src/app/components/verify-email/verify-email.component.ts"

# These can be developed independently as separate methods
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Verify payment documents are merged into Auth UID documents
   - Verify only one document exists per email
   - Note: Field names may not be mapped correctly yet (US2)
5. Deploy/demo if ready (basic merge working)

### Incremental Delivery (Recommended)

1. Complete Setup + Foundational → Foundation ready (payfastToken saved, plan values correct)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: merge works, field names may be inconsistent)
3. Add User Story 2 → Test independently → Deploy/Demo (Field mapping complete)
4. Add User Story 3 → Test independently → Deploy/Demo (Subscription references updated)
5. Add Polish → Final validation → Deploy (Production ready)

### Sequential Strategy (Safest for This Feature)

Given the tight coupling between stories:

1. Team completes Setup + Foundational together
2. Complete User Story 1 (merge foundation)
3. Complete User Story 2 (field mapping) - builds on US1
4. Complete User Story 3 (subscription updates) - builds on US1
5. Complete Polish phase

**Rationale**: These stories are tightly coupled - US2 and US3 modify the merge logic from US1. Sequential implementation reduces risk of integration issues.

---

## Notes

- [P] tasks = different files or independent helper functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after completion
- Commit after each phase or logical group of tasks
- Stop at any checkpoint to validate story independently
- Key files to modify:
  - `functions/src/payfastItn.ts` (PayFast ITN handler - foundational fixes)
  - `src/app/components/verify-email/verify-email.component.ts` (Email verification - merge logic, field mapping, subscription updates)
  - `src/app/shared/services/auth.service.ts` (Optional - minor update for consistency)
- Avoid: making changes to multiple stories simultaneously, skipping foundational phase
- Critical success factors:
  - PayfastToken must be saved during payment processing (Foundational)
  - Subscription plan must be 'digitalMenu' for monthly (Foundational)
  - Merge logic must preserve all payment data (US1)
  - Field mapping must work correctly (US2)
  - Subscription references must be updated (US3)

