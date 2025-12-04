# Tasks: Enhanced Payment Failure Handling for Subscriptions

**Input**: Design documents from `/specs/002-payment-failure-handling/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/functions/src/`, `backend/email-templates/`
- Paths shown below assume Firebase Functions structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure validation

- [ ] T001 Review existing Firebase Functions structure and dependencies in `functions/package.json`
- [ ] T002 [P] Verify Firebase Admin SDK 12.6+ and Firebase Functions 4.4+ versions in `functions/package.json`
- [ ] T003 [P] Verify AWS Lambda email service endpoint configuration and accessibility
- [ ] T004 Review existing PayFast ITN handler implementation in `functions/src/payfastItn.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Add new subscription data model fields to Firestore schema documentation in `specs/002-payment-failure-handling/data-model.md` (already documented)
- [ ] T006 [P] Create migration script or validation for backward compatibility: ensure existing subscriptions default `consecutiveFailures: 0` and `needsManualReview: false`
- [ ] T007 Verify audit logging infrastructure exists and supports new log types in `functions/src/payfastItn.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Handle All Payment Statuses Appropriately (Priority: P1) 🎯 MVP

**Goal**: System properly handles all payment statuses (PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED, unknown) without incorrectly modifying subscription states for non-terminal statuses.

**Independent Test**: Can be fully tested by simulating payment notifications with different statuses (PENDING, PROCESSING) and verifying that the system logs them appropriately without changing subscription status. This delivers complete visibility into all payment states without premature actions.

### Implementation for User Story 1

- [ ] T008 [US1] Enhance `processPayment()` function in `functions/src/payfastItn.ts` to log PENDING status transactions without subscription changes
- [ ] T009 [US1] Enhance `processPayment()` function in `functions/src/payfastItn.ts` to log PROCESSING status transactions without subscription changes
- [ ] T010 [US1] Add handling for unknown payment statuses in `functions/src/payfastItn.ts`: log with warning, no subscription changes
- [ ] T011 [US1] Ensure transaction logging in `processPayment()` handles all status types in `functions/src/payfastItn.ts`
- [ ] T012 [US1] Add audit log entry creation for PENDING status notifications in `functions/src/payfastItn.ts`
- [ ] T013 [US1] Add audit log entry creation for PROCESSING status notifications in `functions/src/payfastItn.ts`
- [ ] T014 [US1] Add audit log entry creation for unknown status notifications with warning flag in `functions/src/payfastItn.ts`
- [ ] T015 [US1] Update `processPayment()` to ensure subscription state only changes on terminal statuses (COMPLETE, FAILED, CANCELLED) in `functions/src/payfastItn.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - all payment statuses are logged correctly, non-terminal statuses don't change subscription state, unknown statuses are logged for review.

---

## Phase 4: User Story 2 - Track Consecutive Payment Failures (Priority: P1)

**Goal**: System tracks consecutive payment failures for each subscription and automatically cancels subscriptions after 3 consecutive failures, while allowing users to recover from temporary payment issues.

**Independent Test**: Can be fully tested by simulating multiple consecutive failed payments for a subscription and verifying that the counter increments correctly and cancellation occurs at the threshold. This delivers automatic handling of problematic subscriptions without manual intervention.

### Implementation for User Story 2

- [ ] T016 [US2] Add `consecutiveFailures` field initialization to subscription creation in `functions/src/payfastItn.ts` (default: 0)
- [ ] T017 [US2] Refactor `handleSubscriptionFailure()` function in `functions/src/payfastItn.ts` to increment `consecutiveFailures` counter on payment failure
- [ ] T018 [US2] Implement logic to reset `consecutiveFailures` to 0 on successful payment (COMPLETE status) in `functions/src/payfastItn.ts` `updateUserSubscription()` function
- [ ] T019 [US2] Add automatic subscription cancellation logic when `consecutiveFailures` reaches 3 in `functions/src/payfastItn.ts` `handleSubscriptionFailure()` function
- [ ] T020 [US2] Update subscription document with `cancellationReason` including consecutive failure count when cancelling due to failures in `functions/src/payfastItn.ts`
- [ ] T021 [US2] Update user document `subscriptionStatus` to 'cancelled' when subscription cancelled due to consecutive failures in `functions/src/payfastItn.ts`
- [ ] T022 [US2] Create audit log entry with `cancel_due_to_failures` action when subscription cancelled at threshold in `functions/src/payfastItn.ts`
- [ ] T023 [US2] Create audit log entry with `failure_tracked` action for each failure increment in `functions/src/payfastItn.ts`

**Checkpoint**: At this point, User Story 2 should be fully functional - consecutive failures are tracked, counter increments on failures, resets on success, subscriptions cancel at 3 failures with proper audit logging.

---

## Phase 5: User Story 3 - Implement Grace Period Before Taking Action (Priority: P2)

**Goal**: System allows a grace period of 1-2 payment failures before taking action on a subscription, giving users time to resolve temporary payment issues without immediate service interruption.

**Independent Test**: Can be fully tested by simulating 1-2 payment failures and verifying that the subscription remains active, then verifying that the 3rd failure triggers cancellation. This delivers a balanced approach between user experience and payment protection.

### Implementation for User Story 3

- [ ] T024 [US3] Update `handleSubscriptionFailure()` to keep subscription active (status unchanged) when `consecutiveFailures <= 2` in `functions/src/payfastItn.ts`
- [ ] T025 [US3] Ensure grace period logic only applies cancellation on 3rd failure (not 1st or 2nd) in `functions/src/payfastItn.ts` `handleSubscriptionFailure()` function
- [ ] T026 [US3] Verify subscription remains active after 1st failure (counter = 1, status = active) in `functions/src/payfastItn.ts`
- [ ] T027 [US3] Verify subscription remains active after 2nd failure (counter = 2, status = active) in `functions/src/payfastItn.ts`
- [ ] T028 [US3] Ensure grace period counter resets when payment succeeds (COMPLETE status) in `functions/src/payfastItn.ts` `updateUserSubscription()` function

**Checkpoint**: At this point, User Story 3 should be fully functional - grace period allows 2 failures before action, subscription stays active during grace period, cancellation only on 3rd failure.

---

## Phase 6: User Story 4 - Send Email Notifications for Payment Failures (Priority: P2)

**Goal**: Users receive timely email notifications when payment failures occur, providing them with information and guidance on how to resolve payment issues.

**Independent Test**: Can be fully tested by triggering payment failures and verifying that appropriate email notifications are sent at each failure stage. This delivers proactive communication and improved payment recovery rates.

### Implementation for User Story 4

- [ ] T029 [US4] Create `sendPaymentFailureEmail()` function in `functions/src/sendPaymentFailureEmail.ts` for email notification handling
- [ ] T030 [US4] Implement email type handling: 'first_failure', 'grace_period_warning', 'cancellation' in `functions/src/sendPaymentFailureEmail.ts`
- [ ] T031 [US4] Add AWS Lambda email service integration in `functions/src/sendPaymentFailureEmail.ts` (endpoint: `https://2xajnvt3eg.execute-api.us-east-1.amazonaws.com/default/sendEmail`)
- [ ] T032 [US4] Create email template `payment-failure-first.html` in `email-templates/` for first failure notifications
- [ ] T033 [US4] Create email template `payment-failure-warning.html` in `email-templates/` for grace period warning notifications
- [ ] T034 [US4] Create email template `payment-cancellation.html` in `email-templates/` for cancellation notifications
- [ ] T035 [US4] Implement `getEmailSubject()` helper function with subject lines for each email type in `functions/src/sendPaymentFailureEmail.ts`
- [ ] T036 [US4] Add user data fetching (firstName, lastName) for email personalization in `functions/src/sendPaymentFailureEmail.ts`
- [ ] T037 [US4] Integrate `sendPaymentFailureEmail()` call in `handleSubscriptionFailure()` for first failure (consecutiveFailures = 1) in `functions/src/payfastItn.ts`
- [ ] T038 [US4] Integrate `sendPaymentFailureEmail()` call in `handleSubscriptionFailure()` for grace period warning (consecutiveFailures = 2) in `functions/src/payfastItn.ts`
- [ ] T039 [US4] Integrate `sendPaymentFailureEmail()` call in `handleSubscriptionFailure()` for cancellation (consecutiveFailures = 3) in `functions/src/payfastItn.ts`
- [ ] T040 [US4] Implement error handling: email failures don't block payment processing in `functions/src/payfastItn.ts` and `functions/src/sendPaymentFailureEmail.ts`
- [ ] T041 [US4] Add audit log entry for email send attempts (success/failure) in `functions/src/sendPaymentFailureEmail.ts`
- [ ] T042 [US4] Export `sendPaymentFailureEmail` function in `functions/src/index.ts` (if needed for direct calls)

**Checkpoint**: At this point, User Story 4 should be fully functional - email notifications sent at each failure stage, email failures don't block payment processing, all email types implemented with proper templates.

---

## Phase 7: User Story 5 - Flag Subscriptions Requiring Manual Review (Priority: P3)

**Goal**: System automatically flags subscriptions that have experienced multiple payment failures or other payment-related issues for manual review by support staff.

**Independent Test**: Can be fully tested by creating subscriptions with multiple failures and verifying that they are flagged for manual review. This delivers a mechanism for support teams to identify and address problematic subscriptions proactively.

### Implementation for User Story 5

- [ ] T043 [US5] Add `needsManualReview` field initialization to subscription creation in `functions/src/payfastItn.ts` (default: false)
- [ ] T044 [US5] Add `manualReviewReason` field to subscription data model in `functions/src/payfastItn.ts`
- [ ] T045 [US5] Add `manualReviewFlaggedAt` timestamp field to subscription data model in `functions/src/payfastItn.ts`
- [ ] T046 [US5] Implement logic to set `needsManualReview = true` when `consecutiveFailures === 2` in `functions/src/payfastItn.ts` `handleSubscriptionFailure()` function
- [ ] T047 [US5] Set `manualReviewReason` with payment IDs and failure count when flagging for review in `functions/src/payfastItn.ts`
- [ ] T048 [US5] Set `manualReviewFlaggedAt` timestamp when flagging subscription for manual review in `functions/src/payfastItn.ts`
- [ ] T049 [US5] Create audit log entry with `flag_manual_review` action when subscription flagged in `functions/src/payfastItn.ts`
- [ ] T050 [US5] Implement auto-clear logic: reset `needsManualReview = false` when payment succeeds and `consecutiveFailures` resets in `functions/src/payfastItn.ts` `updateUserSubscription()` function
- [ ] T051 [US5] Clear `manualReviewReason` and `manualReviewFlaggedAt` fields when manual review flag is auto-cleared in `functions/src/payfastItn.ts`
- [ ] T052 [US5] Create audit log entry with `clear_manual_review` action when flag auto-cleared on payment success in `functions/src/payfastItn.ts`

**Checkpoint**: At this point, User Story 5 should be fully functional - subscriptions flagged at 2 failures, flags auto-clear on payment success, proper audit logging for flag operations.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T053 [P] Update `functions/src/index.ts` to export any new functions if needed
- [ ] T054 [P] Add comprehensive error handling for all edge cases (duplicate notifications, missing subscriptions, email failures) in `functions/src/payfastItn.ts`
- [ ] T055 Add validation for `consecutiveFailures` counter (must be >= 0) in subscription updates
- [ ] T056 [P] Add logging for all status transitions and failure tracking events in `functions/src/payfastItn.ts`
- [ ] T057 [P] Update documentation comments in `functions/src/payfastItn.ts` to reflect enhanced failure handling logic
- [ ] T058 [P] Verify backward compatibility: existing subscriptions without new fields work correctly
- [ ] T059 Run quickstart.md validation checklist from `specs/002-payment-failure-handling/quickstart.md`
- [ ] T060 [P] Test all payment status scenarios (PENDING, PROCESSING, COMPLETE, FAILED, CANCELLED, unknown) end-to-end
- [ ] T061 [P] Test consecutive failure tracking: 1st failure → 2nd failure → 3rd cancellation
- [ ] T062 [P] Test grace period: verify subscription stays active during 1st and 2nd failures
- [ ] T063 [P] Test email notifications for all three failure stages
- [ ] T064 [P] Test manual review flagging at 2 failures and auto-clear on success
- [ ] T065 Test duplicate notification handling (same `pf_payment_id` processed only once)
- [ ] T066 Test error scenarios: email service failure, missing subscription, invalid data

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - **MVP Scope**: Complete User Story 1 for basic status handling
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 (needs status handling)
  - Implements failure tracking and cancellation logic
- **User Story 3 (P2)**: Can start after US2 (depends on failure tracking from US2)
  - Implements grace period logic using failure counter
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Can be partially parallel with US2
  - Email function can be created independently, but integrates with US2/US3 failure handling
- **User Story 5 (P3)**: Can start after US2 (depends on failure tracking counter)
  - Uses consecutive failure counter to flag for review

### Within Each User Story

- Implementation tasks follow logical flow: data model → service logic → integration → testing
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: Tasks T002-T003 can run in parallel (different verification areas)
- **User Story 1**: Tasks T008-T014 can be worked on in parallel (different status handlers in same file, but sequential edits safer)
- **User Story 2**: Tasks T016-T023 can be worked on sequentially (builds on previous logic)
- **User Story 3**: Tasks T024-T028 build on US2, must be sequential
- **User Story 4**: 
  - Templates T032-T034 can be created in parallel
  - Email function T029-T036 can be developed independently
  - Integration tasks T037-T041 depend on email function completion
- **User Story 5**: Tasks T043-T052 build on US2, mostly sequential
- **Polish Phase**: Many tasks T053-T066 can run in parallel (different areas)

---

## Parallel Example: User Story 4 (Email Notifications)

```bash
# Launch email templates in parallel:
Task T032: Create email template payment-failure-first.html in email-templates/
Task T033: Create email template payment-failure-warning.html in email-templates/
Task T034: Create email template payment-cancellation.html in email-templates/

# After templates, develop email function:
Task T029: Create sendPaymentFailureEmail() function in functions/src/sendPaymentFailureEmail.ts
Task T030: Implement email type handling
Task T031: Add AWS Lambda email service integration
Task T035: Implement getEmailSubject() helper function
Task T036: Add user data fetching for personalization
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Handle All Payment Statuses)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Deliverable**: System logs all payment statuses correctly, non-terminal statuses don't change subscription state.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Failure tracking!)
4. Add User Story 3 → Test independently → Deploy/Demo (Grace period!)
5. Add User Story 4 → Test independently → Deploy/Demo (Email notifications!)
6. Add User Story 5 → Test independently → Deploy/Demo (Manual review!)
7. Polish phase → Final testing → Production ready

### Parallel Team Strategy

With multiple developers:

1. **Developer A**: Setup + Foundational + User Story 1 (status handling)
2. **Developer B**: User Story 4 (email notifications) - can start after Foundational
3. **Developer C**: User Story 2 (failure tracking) - can start after US1
4. Once US2 complete: **Developer C** works on US3 (grace period) + US5 (manual review)
5. Integration: All developers integrate their components

### Recommended Execution Order

**Sequential (Single Developer)**:
1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: User Story 1 (MVP)
4. Phase 4: User Story 2 (failure tracking)
5. Phase 6: User Story 4 (email) - can start after US2 integration points defined
6. Phase 5: User Story 3 (grace period) - uses US2 counter
7. Phase 7: User Story 5 (manual review) - uses US2 counter
8. Phase 8: Polish

**Parallel (Multiple Developers)**:
1. All: Phase 1-2 together
2. **Dev A**: US1 → US2 → US3 → US5 (payment processing flow)
3. **Dev B**: US4 (email) - parallel with Dev A after Phase 2
4. **Dev C**: Polish phase testing - parallel after US1-4 complete

---

## Notes

- [P] tasks = different files or areas, minimal dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group (e.g., after each user story phase)
- Stop at any checkpoint to validate story independently
- Avoid: modifying same file concurrently without coordination, breaking backward compatibility
- **Backward Compatibility**: Existing subscriptions without new fields must continue to work (defaults: `consecutiveFailures: 0`, `needsManualReview: false`)
- **Error Handling**: Email failures must never block payment processing - always continue even if email fails
- **Duplicate Prevention**: Existing duplicate detection via `pf_payment_id` must be preserved

---

## Task Summary

- **Total Tasks**: 66 tasks
- **Setup Tasks**: 4 tasks (Phase 1)
- **Foundational Tasks**: 3 tasks (Phase 2)
- **User Story 1 Tasks**: 8 tasks (Phase 3)
- **User Story 2 Tasks**: 8 tasks (Phase 4)
- **User Story 3 Tasks**: 5 tasks (Phase 5)
- **User Story 4 Tasks**: 14 tasks (Phase 6)
- **User Story 5 Tasks**: 10 tasks (Phase 7)
- **Polish Tasks**: 14 tasks (Phase 8)
- **Parallel Opportunities**: ~20 tasks can run in parallel (marked with [P])

**MVP Scope**: Phases 1-3 (User Story 1) = 15 tasks for basic payment status handling

**Full Feature Scope**: All 66 tasks for complete payment failure handling with grace period, emails, and manual review flagging



