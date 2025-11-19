# Tasks: Subscription Management with PayFast Recurring Billing

**Input**: Design documents from `/specs/001-subscription-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are not explicitly requested in the specification, so test tasks are not included. Focus is on implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `functions/src/` (backend), `src/app/` (frontend)
- Paths shown below follow the Angular + Firebase structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Note**: Most infrastructure already exists. This phase focuses on ensuring prerequisites are met.

- [X] T001 Verify PayFast API credentials are configured in Firebase Functions config
- [X] T002 [P] Verify Firestore indexes exist for transactions and subscriptions collections
- [X] T003 [P] Verify Firestore security rules allow users to read their own subscription and transaction data

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [US1] Ensure PayFast token is saved to user document during registration in functions/src/payfastItn.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Save PayFast Token After Registration (Priority: P1) 🎯 MVP

**Goal**: Ensure PayFast subscription token is automatically captured and stored in the user's Firebase profile when payment is processed during registration.

**Independent Test**: Complete a user registration with payment and verify the token is stored in both the subscriptions collection and the user document. Verify token can be retrieved via `getSubscriptionToken()` function.

### Implementation for User Story 1

- [X] T005 [US1] Update updateUserSubscription function in functions/src/payfastItn.ts to save payfastToken field to user document
- [X] T006 [US1] Verify token persistence by checking user document after ITN processing in functions/src/payfastItn.ts
- [X] T007 [US1] Add error handling for token save failures in functions/src/payfastItn.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - tokens are saved during registration and can be retrieved for subscription management

---

## Phase 4: User Story 2 - View Subscription Details in Billing Dashboard (Priority: P1) 🎯 MVP

**Goal**: Create a dedicated Billing section in settings where users can view their subscription status, plan details, billing amount, next billing date, and payment history.

**Independent Test**: Log in as a user with an active subscription, navigate to the Billing section, and verify all subscription information and payment history are displayed correctly.

### Implementation for User Story 2

- [X] T008 [P] [US2] Create getSubscriptionDetails Cloud Function in functions/src/getSubscriptionDetails.ts following PayFast API pattern
- [X] T009 [US2] Export getSubscriptionDetails function in functions/src/index.ts
- [X] T010 [P] [US2] Add getSubscriptionDetails method to SubscriptionService in src/app/shared/services/subscription.service.ts
- [X] T011 [US2] Add SubscriptionDetailsResponse interface to SubscriptionService in src/app/shared/services/subscription.service.ts
- [X] T012 [P] [US2] Add getPaymentHistory method to SubscriptionService in src/app/shared/services/subscription.service.ts (or create transaction.service.ts)
- [X] T013 [US2] Create BillingComponent TypeScript file in src/app/components/settings/billing/billing.component.ts
- [X] T014 [P] [US2] Create BillingComponent HTML template in src/app/components/settings/billing/billing.component.html
- [X] T015 [P] [US2] Create BillingComponent SCSS styles in src/app/components/settings/billing/billing.component.scss
- [X] T016 [US2] Implement subscription details loading logic in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T017 [US2] Implement payment history loading logic in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T018 [US2] Add subscription status card UI in BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T019 [US2] Add payment history table UI in BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T020 [US2] Add loading states and error handling in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T021 [US2] Add billing route to app-routing.module.ts in src/app/app-routing.module.ts
- [X] T022 [P] [US2] Add Billing navigation link to sidebar in src/app/components/navigation/sidebar/sidebar.component.html
- [X] T023 [P] [US2] Add billing breadcrumb label in src/app/shared/config/breadcrumb-config.ts

**Checkpoint**: At this point, User Story 2 should be fully functional - users can view their subscription details and payment history in the Billing dashboard

---

## Phase 5: User Story 3 - Pause Subscription (Priority: P2)

**Goal**: Users can temporarily pause their active subscription through the Billing dashboard, preventing future billing cycles while maintaining subscription configuration.

**Independent Test**: Pause an active subscription through the Billing UI and verify that the subscription status updates to paused, no future billing occurs, and resume option is available.

### Implementation for User Story 3

**Note**: Backend function `pauseSubscription` already exists. This phase integrates it into the Billing UI.

- [X] T024 [US3] Add pauseSubscription method call in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T025 [US3] Add pause subscription button to BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T026 [US3] Add confirmation dialog for pause action in BillingComponent in src/app/components/settings/billing/billing.component.ts (reuse UnsavedChangesDialogComponent)
- [X] T027 [US3] Add loading state for pause operation in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T028 [US3] Add error handling for pause operation failures in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T029 [US3] Refresh subscription details after successful pause in BillingComponent in src/app/components/settings/billing/billing.component.ts

**Checkpoint**: At this point, User Story 3 should be fully functional - users can pause their subscription through the Billing UI

---

## Phase 6: User Story 4 - Edit Subscription Details (Priority: P2)

**Goal**: Users can modify their subscription through the Billing dashboard, such as changing the billing amount, frequency, or other subscription parameters.

**Independent Test**: Edit subscription details through the Billing UI and verify that changes are saved via PayFast API and reflected in the subscription information display.

### Implementation for User Story 4

**Note**: Backend function `updateSubscription` already exists. ChangeSubscriptionDialogComponent already exists. This phase integrates them into the Billing UI.

- [X] T030 [US4] Add editSubscription method call in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T031 [US4] Add edit subscription button to BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T032 [US4] Integrate ChangeSubscriptionDialogComponent for edit functionality in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T033 [US4] Add validation for edit form inputs in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T034 [US4] Add loading state for edit operation in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T035 [US4] Add error handling for edit operation failures in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T036 [US4] Refresh subscription details after successful edit in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T037 [US4] Handle paused subscription edit scenario (require resume or auto-resume) in BillingComponent in src/app/components/settings/billing/billing.component.ts

**Checkpoint**: At this point, User Story 4 should be fully functional - users can edit their subscription through the Billing UI

---

## Phase 7: User Story 5 - Cancel Subscription (Priority: P3)

**Goal**: Users can permanently cancel their subscription through the Billing dashboard, terminating all future billing cycles.

**Independent Test**: Cancel a subscription through the Billing UI and verify that the subscription is canceled via PayFast API, future billing is stopped, and cancellation status is displayed.

### Implementation for User Story 5

**Note**: Backend function `cancelSubscription` already exists. This phase integrates it into the Billing UI.

- [X] T038 [US5] Add cancelSubscription method call in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T039 [US5] Add cancel subscription button to BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T040 [US5] Add confirmation dialog for cancel action with clear cancellation information in BillingComponent in src/app/components/settings/billing/billing.component.ts (reuse UnsavedChangesDialogComponent)
- [X] T041 [US5] Add loading state for cancel operation in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T042 [US5] Add error handling for cancel operation failures in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T043 [US5] Refresh subscription details after successful cancel in BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T044 [US5] Add resubscribe option for cancelled subscriptions in BillingComponent template in src/app/components/settings/billing/billing.component.html

**Checkpoint**: At this point, User Story 5 should be fully functional - users can cancel their subscription through the Billing UI

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final refinements

- [X] T045 [P] Add context-aware action button visibility logic in BillingComponent in src/app/components/settings/billing/billing.component.ts (show pause/edit/cancel based on status)
- [X] T046 [P] Add subscription status badge styling (active=green, paused=yellow, cancelled=red) in BillingComponent in src/app/components/settings/billing/billing.component.scss
- [X] T047 [P] Add resume subscription functionality integration in BillingComponent in src/app/components/settings/billing/billing.component.ts (backend function exists)
- [X] T048 [P] Add resume subscription button to BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T049 Refactor GeneralComponent to remove or minimize subscription UI in src/app/components/settings/general/general.component.ts (optional - keep minimal status or link to Billing)
- [X] T050 [P] Add empty state messaging for users with no active subscription in BillingComponent template in src/app/components/settings/billing/billing.component.html
- [X] T051 [P] Verify all subscription management operations are logged to audit_logs collection (already implemented in backend functions)
- [X] T052 [P] Add responsive design for BillingComponent on mobile devices in src/app/components/settings/billing/billing.component.scss
- [X] T053 Code cleanup and refactoring of BillingComponent in src/app/components/settings/billing/billing.component.ts
- [X] T054 Documentation updates - ensure code comments explain PayFast API integration patterns

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) can start after Foundational
  - User Story 2 (P1) can start after Foundational (can run parallel with US1)
  - User Stories 3, 4, 5 (P2, P2, P3) depend on User Story 2 completion (need Billing UI)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories, but provides UI foundation for US3, US4, US5
- **User Story 3 (P2)**: Depends on User Story 2 completion (needs Billing UI)
- **User Story 4 (P2)**: Depends on User Story 2 completion (needs Billing UI)
- **User Story 5 (P3)**: Depends on User Story 2 completion (needs Billing UI)

### Within Each User Story

- Backend functions before frontend integration
- Service methods before component methods
- Component logic before template updates
- Core implementation before error handling and polish
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All setup tasks marked [P] can run in parallel
- **Phase 2**: Single task (T004) - no parallelization
- **Phase 3 (US1)**: All tasks can run sequentially (same file)
- **Phase 4 (US2)**: 
  - T008, T010, T012, T014, T015, T022, T023 can run in parallel (different files)
  - T009 depends on T008
  - T013, T016, T017, T020 depend on T010, T012
  - T018, T019 depend on T014
  - T021 depends on T013
- **Phase 5 (US3)**: T024-T029 can run sequentially (same component)
- **Phase 6 (US4)**: T030-T037 can run sequentially (same component)
- **Phase 7 (US5)**: T038-T044 can run sequentially (same component)
- **Phase 8**: All tasks marked [P] can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch backend and frontend service tasks in parallel:
Task: "Create getSubscriptionDetails Cloud Function in functions/src/getSubscriptionDetails.ts"
Task: "Add getSubscriptionDetails method to SubscriptionService in src/app/shared/services/subscription.service.ts"
Task: "Add getPaymentHistory method to SubscriptionService in src/app/shared/services/subscription.service.ts"
Task: "Create BillingComponent HTML template in src/app/components/settings/billing/billing.component.html"
Task: "Create BillingComponent SCSS styles in src/app/components/settings/billing/billing.component.scss"
Task: "Add Billing navigation link to sidebar in src/app/components/navigation/sidebar/sidebar.component.html"
Task: "Add billing breadcrumb label in src/app/shared/config/breadcrumb-config.ts"

# Then proceed with dependent tasks:
Task: "Export getSubscriptionDetails function in functions/src/index.ts" (depends on getSubscriptionDetails.ts)
Task: "Create BillingComponent TypeScript file" (depends on service methods)
Task: "Add billing route to app-routing.module.ts" (depends on component creation)
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Token persistence)
4. Complete Phase 4: User Story 2 (Billing dashboard with view-only)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

**MVP Delivers**: Users can register, tokens are saved, and users can view their subscription details and payment history.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Token persistence working)
3. Add User Story 2 → Test independently → Deploy/Demo (View subscription - MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo (Pause functionality)
5. Add User Story 4 → Test independently → Deploy/Demo (Edit functionality)
6. Add User Story 5 → Test independently → Deploy/Demo (Cancel functionality)
7. Add Polish phase → Final refinements

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (token persistence)
   - Developer B: User Story 2 (Billing UI - can start after T008-T015 complete)
3. Once User Story 2 is done:
   - Developer A: User Story 3 (Pause)
   - Developer B: User Story 4 (Edit)
   - Developer C: User Story 5 (Cancel)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Backend functions (pause, cancel, unpause, update) already exist - focus on UI integration
- Reuse existing components: ChangeSubscriptionDialogComponent, UnsavedChangesDialogComponent
- Reference PayFast API documentation: https://developers.payfast.co.za/api#recurring-billing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 54

**Tasks per User Story**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 1 task
- Phase 3 (US1 - Token Persistence): 3 tasks
- Phase 4 (US2 - View Subscription): 16 tasks
- Phase 5 (US3 - Pause): 6 tasks
- Phase 6 (US4 - Edit): 8 tasks
- Phase 7 (US5 - Cancel): 7 tasks
- Phase 8 (Polish): 10 tasks

**Parallel Opportunities**: 20+ tasks can run in parallel across different files

**Suggested MVP Scope**: Phases 1-4 (Setup + Foundational + US1 + US2) = 23 tasks

**Independent Test Criteria**:
- **US1**: Complete registration → verify token in user document → retrieve via getSubscriptionToken()
- **US2**: Navigate to Billing → view subscription details → view payment history
- **US3**: Click pause → confirm → verify status updates → verify resume option appears
- **US4**: Click edit → modify details → save → verify changes reflected
- **US5**: Click cancel → confirm → verify status updates → verify resubscribe option appears

