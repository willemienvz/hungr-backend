# Tasks: Brevo Transactional Email Integration

**Input**: Design documents from `/specs/004-brevo-transactional-emails/`
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

- [x] T001 Review existing Firebase Functions structure and dependencies in `functions/package.json`
- [x] T002 [P] Verify Firebase Admin SDK 12.6+ and Firebase Functions 4.4+ versions in `functions/package.json`
- [x] T003 [P] Review existing email sending mechanisms in `functions/src/emailTemplates.ts` and `src/app/shared/services/email.service.ts`
- [x] T004 Review existing user data model and preference fields (`marketingConsent`, `tipsTutorials`, `userInsights`) in `src/app/shared/services/user.ts`
- [x] T005 [P] Verify Firebase Secrets configuration and access in Firebase project

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Install Brevo SDK package: `npm install @getbrevo/brevo --save` in `functions/` directory
- [ ] T007 [P] Configure Firebase Secret for Brevo API key: `firebase functions:secrets:set BREVO_API_KEY` (enter API key when prompted)
- [x] T008 [P] Create directory structure: `functions/src/brevo/` for Brevo service layer
- [x] T009 [P] Create directory structure: `functions/src/triggers/` for Firestore triggers
- [x] T010 Create base Brevo service client in `functions/src/brevo/brevoService.ts` with API key initialization using `defineSecret`
- [x] T011 Create configuration manager in `functions/src/brevo/config.ts` for template IDs and contact list IDs (environment variables or Firestore config)
- [ ] T012 [P] Set up environment variables or Firestore config document for Brevo template IDs (verification, passwordReset, welcome, subscriptionChange, generic)
- [ ] T013 [P] Set up environment variables or Firestore config document for Brevo contact list IDs (marketing, tips, insights)
- [x] T014 Create Firestore collections structure documentation: `email_logs` and `contact_list_logs` collections (schemas defined in data-model.md)
- [ ] T015 [P] Create Firestore indexes for `email_logs` collection: `[userId, emailType, timestamp]`, `[status, timestamp]`, `[recipient, timestamp]`
- [ ] T016 [P] Create Firestore indexes for `contact_list_logs` collection: `[userId, contactListType, timestamp]`, `[status, timestamp]`, `[userEmail, timestamp]`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Email Verification During Registration (Priority: P1) 🎯 MVP

**Goal**: A new user who signs up for an account receives a professional email verification message sent via Brevo using a configured template, allowing them to verify their email address and complete registration.

**Independent Test**: Can be fully tested by creating a new user account and verifying that a Brevo email with the verification template is sent, contains the correct verification link, and the user can successfully verify their email address.

### Implementation for User Story 1

- [x] T017 [US1] Create email service interface in `functions/src/brevo/emailService.ts` with `sendTransactionalEmail()` method
- [x] T018 [US1] Implement `sendTransactionalEmail()` method in `functions/src/brevo/emailService.ts` with Brevo API integration, template ID lookup, and variable substitution
- [x] T019 [US1] Implement template fallback logic in `functions/src/brevo/emailService.ts`: fall back to generic template if specific template not found
- [x] T020 [US1] Implement retry logic with exponential backoff (max 3 retries) in `functions/src/brevo/emailService.ts` for transient Brevo API failures
- [x] T021 [US1] Create `sendVerificationEmail()` method in `functions/src/brevo/emailService.ts` that calls `sendTransactionalEmail()` with verification template
- [x] T022 [US1] Create Firestore trigger `onUserCreated` in `functions/src/triggers/userCreated.ts` using `onDocumentCreated` for `users/{userId}` path
- [x] T023 [US1] Implement verification link generation in `functions/src/triggers/userCreated.ts` using `admin.auth().generateEmailVerificationLink()`
- [x] T024 [US1] Integrate `sendVerificationEmail()` call in `onUserCreated` trigger in `functions/src/triggers/userCreated.ts`
- [x] T025 [US1] Implement email logging to `email_logs` collection in `functions/src/brevo/emailService.ts` with status, messageId, and error details
- [x] T026 [US1] Add error handling in `onUserCreated` trigger: email failures don't block user creation in `functions/src/triggers/userCreated.ts`
- [x] T027 [US1] Export `onUserCreated` trigger in `functions/src/index.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - new users receive verification emails via Brevo, emails are logged, failures don't block account creation.

---

## Phase 4: User Story 2 - Password Reset Email Delivery (Priority: P1)

**Goal**: A user who forgets their password can request a password reset and receive a professional password reset email sent via Brevo using a configured template, enabling them to securely reset their password.

**Independent Test**: Can be fully tested by requesting a password reset and verifying that a Brevo email with the password reset template is sent, contains a valid reset link, and the user can successfully reset their password using the link.

### Implementation for User Story 2

- [x] T028 [US2] Create `sendPasswordResetEmail()` method in `functions/src/brevo/emailService.ts` that calls `sendTransactionalEmail()` with password reset template
- [x] T029 [US2] Create callable Firebase Function `sendPasswordResetEmail` in `functions/src/emailTemplates.ts` (or new file) that generates reset link and calls email service
- [x] T030 [US2] Implement password reset link generation in callable function using `admin.auth().generatePasswordResetLink()`
- [x] T031 [US2] Integrate Brevo email service call in password reset function (replace existing AWS Lambda or Firebase Auth default)
- [ ] T032 [US2] Update frontend password reset request to call new Brevo-based function in `src/app/components/forgot-password/` (if needed)
- [x] T033 [US2] Add email logging for password reset emails to `email_logs` collection with `emailType: 'passwordReset'`
- [x] T034 [US2] Implement rate limiting for password reset requests (prevent duplicate sends within 5 minutes) in password reset function
- [x] T035 [US2] Export password reset function in `functions/src/index.ts`

**Checkpoint**: At this point, User Story 2 should be fully functional - password reset requests send Brevo emails, rate limiting prevents abuse, emails are logged.

---

## Phase 5: User Story 3 - Welcome Email After Account Creation (Priority: P2)

**Goal**: A new user who successfully creates an account receives a welcome email sent via Brevo using a configured template, providing them with helpful information about getting started with the platform.

**Independent Test**: Can be fully tested by creating a new user account and verifying that a welcome email is sent via Brevo using the welcome template, containing appropriate welcome content and getting started information.

### Implementation for User Story 3

- [x] T036 [US3] Create `sendWelcomeEmail()` method in `functions/src/brevo/emailService.ts` that calls `sendTransactionalEmail()` with welcome template
- [x] T037 [US3] Integrate `sendWelcomeEmail()` call in `onUserCreated` trigger in `functions/src/triggers/userCreated.ts` (after verification email)
- [x] T038 [US3] Add email logging for welcome emails to `email_logs` collection with `emailType: 'welcome'`
- [x] T039 [US3] Ensure welcome email failures don't block user creation in `functions/src/triggers/userCreated.ts`

**Checkpoint**: At this point, User Story 3 should be fully functional - new users receive welcome emails via Brevo after account creation.

---

## Phase 6: User Story 4 - Subscription Change Notifications (Priority: P2)

**Goal**: A user who changes their subscription plan receives a notification email sent via Brevo using a configured template, informing them of the subscription change details and any relevant billing information.

**Independent Test**: Can be fully tested by changing a user's subscription plan and verifying that a subscription change email is sent via Brevo using the subscription change template, containing accurate information about the change.

### Implementation for User Story 4

- [x] T040 [US4] Create `sendSubscriptionChangeEmail()` method in `functions/src/brevo/emailService.ts` that calls `sendTransactionalEmail()` with subscription change template
- [x] T041 [US4] Integrate `sendSubscriptionChangeEmail()` call in `functions/src/updateSubscription.ts` after successful subscription update
- [x] T042 [US4] Extract subscription change details (old plan, new plan, billing changes, effective date) in `functions/src/updateSubscription.ts` for email template variables
- [x] T043 [US4] Integrate `sendSubscriptionChangeEmail()` call in `functions/src/payfastItn.ts` when subscription is automatically updated via payment processing
- [x] T044 [US4] Add email logging for subscription change emails to `email_logs` collection with `emailType: 'subscriptionChange'`
- [x] T045 [US4] Ensure subscription change email failures don't block subscription updates in `functions/src/updateSubscription.ts` and `functions/src/payfastItn.ts`

**Checkpoint**: At this point, User Story 4 should be fully functional - subscription changes trigger Brevo notification emails with accurate details.

---

## Phase 7: User Story 5 - Template Selection and Configuration (Priority: P3)

**Goal**: System administrators can configure which Brevo templates are used for different transactional email types, allowing customization of email content and branding while maintaining a consistent user experience.

**Independent Test**: Can be fully tested by configuring template mappings for different email types and verifying that emails are sent using the correct configured templates with proper variable substitution.

### Implementation for User Story 5

- [ ] T046 [US5] Enhance configuration manager in `functions/src/brevo/config.ts` to support template ID overrides per email type
- [ ] T047 [US5] Implement template ID validation in `functions/src/brevo/config.ts`: verify template IDs are valid integers
- [ ] T048 [US5] Add template fallback chain logic in `functions/src/brevo/emailService.ts`: specific template → generic template → error
- [ ] T049 [US5] Implement template variable validation in `functions/src/brevo/emailService.ts`: ensure required variables are provided before sending
- [ ] T050 [US5] Add logging for template selection (which template ID was used) in `functions/src/brevo/emailService.ts`
- [ ] T051 [US5] Add error logging when template not found: log warning and fall back to generic template in `functions/src/brevo/emailService.ts`

**Checkpoint**: At this point, User Story 5 should be fully functional - template configuration is flexible, fallback works correctly, variable validation ensures emails send successfully.

---

## Phase 8: User Story 6 - Marketing Campaign Subscription Management (Priority: P2)

**Goal**: A user who opts in to receive marketing communications, tips, or insights during sign-up or in settings is automatically added to the corresponding Brevo contact lists, and users who opt out are removed from those lists, ensuring their preferences are respected.

**Independent Test**: Can be fully tested by enabling/disabling user preferences (marketingConsent, tipsTutorials, userInsights) and verifying that users are added to or removed from the corresponding Brevo contact lists accordingly.

### Implementation for User Story 6

- [x] T052 [US6] Create contact list service interface in `functions/src/brevo/contactListService.ts` with `addContactToList()` and `removeContactFromList()` methods
- [x] T053 [US6] Implement `addContactToList()` method in `functions/src/brevo/contactListService.ts` using Brevo Contacts API with email and attributes
- [x] T054 [US6] Implement `removeContactFromList()` method in `functions/src/brevo/contactListService.ts` using Brevo Contacts API
- [x] T055 [US6] Implement retry logic with exponential backoff (max 3 retries) in `functions/src/brevo/contactListService.ts` for transient Brevo API failures
- [x] T056 [US6] Implement contact list operation logging to `contact_list_logs` collection in `functions/src/brevo/contactListService.ts` with status, operation type, and error details
- [x] T057 [US6] Integrate contact list add operations in `onUserCreated` trigger in `functions/src/triggers/userCreated.ts`: add to marketing list if `marketingConsent` is true
- [x] T058 [US6] Integrate contact list add operations in `onUserCreated` trigger: add to tips list if `tipsTutorials` is true
- [x] T059 [US6] Integrate contact list add operations in `onUserCreated` trigger: add to insights list if `userInsights` is true
- [x] T060 [US6] Create Firestore trigger `onUserPreferencesUpdated` in `functions/src/triggers/userPreferencesUpdated.ts` using `onDocumentWritten` for `users/{userId}` path
- [x] T061 [US6] Implement preference change detection in `onUserPreferencesUpdated` trigger: compare `marketingConsent` before/after values
- [x] T062 [US6] Implement preference change detection in `onUserPreferencesUpdated` trigger: compare `tipsTutorials` before/after values
- [x] T063 [US6] Implement preference change detection in `onUserPreferencesUpdated` trigger: compare `userInsights` before/after values
- [x] T064 [US6] Integrate contact list sync in `onUserPreferencesUpdated` trigger: add/remove from marketing list based on `marketingConsent` changes
- [x] T065 [US6] Integrate contact list sync in `onUserPreferencesUpdated` trigger: add/remove from tips list based on `tipsTutorials` changes
- [x] T066 [US6] Integrate contact list sync in `onUserPreferencesUpdated` trigger: add/remove from insights list based on `userInsights` changes
- [x] T067 [US6] Add context logging in `contact_list_logs`: include preference field name and old/new values in `functions/src/brevo/contactListService.ts`
- [x] T068 [US6] Ensure contact list operation failures don't block user preference updates in `functions/src/triggers/userPreferencesUpdated.ts`
- [x] T069 [US6] Export `onUserPreferencesUpdated` trigger in `functions/src/index.ts`

**Checkpoint**: At this point, User Story 6 should be fully functional - user preferences automatically sync to Brevo contact lists, operations are logged, failures don't block preference updates.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, error handling, monitoring, and documentation

- [x] T070 [P] Update `functions/src/index.ts` to export all new Brevo-related functions and triggers
- [ ] T071 [P] Implement comprehensive error handling across all Brevo service methods: catch and log all Brevo API errors
- [ ] T072 [P] Add structured logging using `firebase-functions/logger` throughout all Brevo service methods and triggers
- [ ] T073 [P] Implement email bounce handling: detect bounce notifications from Brevo and prevent further emails to bounced addresses (future enhancement - log for now)
- [ ] T074 [P] Add monitoring and alerting setup: configure alerts for high email failure rates or contact list operation failures
- [ ] T075 [P] Update `email-templates/brevo-template-config.md` with actual template IDs after templates are created in Brevo dashboard
- [ ] T076 [P] Create deployment documentation: update README or create deployment guide with Brevo setup steps
- [ ] T077 [P] Update existing email service calls in frontend to use new Brevo-based functions (if any direct calls exist)
- [ ] T078 [P] Remove or deprecate old email sending mechanisms (AWS Lambda, Firebase Auth defaults) after Brevo integration is verified
- [ ] T079 [P] Run quickstart.md validation: verify all steps in quickstart guide work correctly
- [ ] T080 [P] Code cleanup and refactoring: ensure consistent error handling patterns across all Brevo services
- [ ] T081 [P] Add JSDoc comments to all public methods in Brevo service layer for better IDE support and documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses email service from US1
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses email service from US1, integrates with US1 trigger
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses email service from US1
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Enhances email service from US1
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Independent contact list service, uses same trigger pattern as US1

### Within Each User Story

- Email service methods before trigger implementations
- Service layer before trigger integration
- Core implementation before logging
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- Different user stories can be worked on in parallel by different team members
- Polish tasks marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Email Verification)
4. Complete Phase 4: User Story 2 (Password Reset)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Email Verification MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Password Reset added)
4. Add User Story 3 → Test independently → Deploy/Demo (Welcome emails)
5. Add User Story 4 → Test independently → Deploy/Demo (Subscription notifications)
6. Add User Story 6 → Test independently → Deploy/Demo (Campaign management)
7. Add User Story 5 → Test independently → Deploy/Demo (Template configuration)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Email Verification)
   - Developer B: User Story 2 (Password Reset) - can start after T017-T020 complete
   - Developer C: User Story 6 (Campaign Management) - independent service
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Email service (US1) is foundational for US2, US3, US4, US5 - complete T017-T020 before starting other email stories
- Contact list service (US6) is independent - can be developed in parallel with email stories

