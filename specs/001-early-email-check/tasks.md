# Tasks: Early Email Validation in Registration

**Input**: Design documents from `/specs/001-early-email-check/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL and not explicitly requested in the feature specification. Test tasks are not included, but manual testing scenarios are documented in quickstart.md.

**Organization**: Tasks are organized by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1])
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/app/` at repository root
- Paths shown below assume Angular web application structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Note**: This is an existing Angular project. Setup tasks are minimal as the project structure already exists.

- [X] T001 Verify Angular 17+ and required dependencies are installed (check package.json)
- [X] T002 [P] Verify Firebase Auth configuration is accessible in src/app/shared/services/auth.service.ts
- [X] T003 [P] Verify shared validators directory exists at src/app/shared/validators/ (create if missing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Note**: This feature uses existing infrastructure (AuthService, FormBuilder, Router). Foundational tasks verify these are available.

- [X] T004 Verify AuthService.isEmailInUse() method exists and works correctly in src/app/shared/services/auth.service.ts
- [X] T005 Verify Step1Component exists and is accessible at src/app/components/sign-up/step1/step1.component.ts
- [X] T006 Verify FormDataService exists for form data persistence in src/app/shared/services/signup/form-data.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Email Validation on Registration Step 1 (Priority: P1) 🎯 MVP

**Goal**: A new user attempting to register with an email address that is already registered should be notified when they attempt to proceed from step 1 to step 2, and prevented from proceeding to subsequent steps.

**Independent Test**: Can be fully tested by attempting to proceed to step 2 with an existing email address and verifying that the system prevents progression, displays an appropriate error message, and allows correction without losing other entered data.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create emailAvailabilityValidator async validator function in src/app/shared/validators/email-availability.validator.ts
- [X] T008 [US1] Import emailAvailabilityValidator in src/app/components/sign-up/step1/step1.component.ts
- [X] T009 [US1] Remove emailList property and getUsers() method from Step1Component in src/app/components/sign-up/step1/step1.component.ts
- [X] T010 [US1] Remove emailInUseValidator and checkEmailInUse methods from Step1Component in src/app/components/sign-up/step1/step1.component.ts
- [X] T011 [US1] Remove userEmail valueChanges subscription from ngOnInit() in src/app/components/sign-up/step1/step1.component.ts
- [X] T012 [US1] Update step1Form form group to use emailAvailabilityValidator as async validator for userEmail field in src/app/components/sign-up/step1/step1.component.ts
- [X] T013 [US1] Update onNext() method to check form validity and pending state before navigation in src/app/components/sign-up/step1/step1.component.ts
- [X] T014 [US1] Update getFieldError() method to handle emailInUse and emailCheckFailed errors in src/app/components/sign-up/step1/step1.component.ts
- [X] T014a [US1] Ensure error message clears automatically when userEmail field value changes to a valid email in src/app/components/sign-up/step1/step1.component.ts
- [X] T015 [US1] Update Next button disabled binding to include pending state in src/app/components/sign-up/step1/step1.component.html
- [X] T016 [US1] Add loading indicator text to Next button when form is pending in src/app/components/sign-up/step1/step1.component.html
- [X] T017 [US1] Add optional loading indicator for email field when userEmail control is pending in src/app/components/sign-up/step1/step1.component.html
- [X] T017a [US1] Implement clickable sign-in link in error message that navigates to /sign-in route in src/app/components/sign-up/step1/step1.component.html

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users attempting to register with duplicate emails will be blocked at step 1 with appropriate error messages.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [X] T018 [P] Verify error message displays correctly with clickable sign-in link in src/app/components/sign-up/step1/step1.component.html
- [X] T019 [P] Verify form data preservation when email validation fails in src/app/components/sign-up/step1/step1.component.ts
- [X] T020 [P] Verify case-insensitive email handling in emailAvailabilityValidator in src/app/shared/validators/email-availability.validator.ts
- [X] T021 [P] Verify network error handling displays appropriate error message in src/app/shared/validators/email-availability.validator.ts
- [X] T022 Code cleanup: Remove any unused imports or commented code from Step1Component in src/app/components/sign-up/step1/step1.component.ts
- [X] T023 [P] Run manual testing scenarios from quickstart.md to validate all acceptance criteria
- [X] T024 [P] Verify email check completes within 2 seconds for 95% of requests (performance requirement)
- [X] T025 [P] Verify loading states and button disabling work correctly during async validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **Polish (Phase 4)**: Depends on User Story 1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within User Story 1

- T007 (Create validator) must complete before T008 (Import validator)
- T008-T012 (Component updates) can be done in sequence
- T013-T014a (Component updates) can be done in sequence
- T015-T017a (Template updates) can be done after component updates
- All component modifications (T008-T014a) should be completed before template updates (T015-T017a)

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel (different files)
- **Phase 2**: T004, T005, and T006 can run in parallel (verification tasks, different files)
- **Phase 3**: 
  - T007 (Create validator) can be done independently
  - T009-T011 (Removal tasks) can be done in parallel (same file but different methods/properties)
  - T015-T017 (Template updates) can be done in parallel (same file but different sections)
- **Phase 4**: T018-T021 and T023-T025 can run in parallel (verification tasks)

---

## Parallel Example: User Story 1

```bash
# After T007 (validator created), these can be done in parallel:
# Task T009: Remove emailList property
# Task T010: Remove emailInUseValidator method
# Task T011: Remove valueChanges subscription

# After component updates complete, these template tasks can be done in parallel:
# Task T015: Update button disabled binding
# Task T016: Add loading text to button
# Task T017: Add loading indicator for email field
# Task T017a: Implement clickable sign-in link in error message
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify project structure)
2. Complete Phase 2: Foundational (verify existing infrastructure)
3. Complete Phase 3: User Story 1 (implement email validation)
4. **STOP and VALIDATE**: Test User Story 1 independently using manual testing scenarios
5. Complete Phase 4: Polish (final validation and cleanup)
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Each task adds value incrementally

### Task Execution Order

**Recommended sequence for User Story 1**:

1. **T007**: Create validator (foundation)
2. **T008**: Import validator
3. **T009-T011**: Remove old code (cleanup)
4. **T012**: Update form configuration (core change)
5. **T013**: Update onNext() method (navigation blocking)
6. **T014**: Update error handling (user feedback)
7. **T014a**: Ensure error clearing on email change (FR-004)
8. **T015-T017a**: Update template (UI feedback including sign-in link)

---

## Notes

- [P] tasks = different files, no dependencies
- [US1] label maps task to User Story 1 for traceability
- User Story 1 should be independently completable and testable
- Commit after each task or logical group (e.g., after T007, after T012, after T014)
- Stop at checkpoint to validate story independently
- Manual testing scenarios are documented in quickstart.md
- Avoid: modifying other components, changing registration flow structure, adding real-time validation during typing

---

## Task Summary

**Total Tasks**: 27
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 3 tasks
- **Phase 3 (User Story 1)**: 13 tasks
- **Phase 4 (Polish)**: 8 tasks

**Task Count per User Story**:
- **User Story 1**: 13 implementation tasks

**Parallel Opportunities Identified**: 
- Phase 1: 2 parallel tasks
- Phase 2: 3 parallel tasks
- Phase 3: Multiple parallel opportunities within component and template updates
- Phase 4: 6 parallel verification tasks

**Independent Test Criteria for User Story 1**: 
- Attempt to proceed to step 2 with existing email address
- Verify system prevents progression
- Verify appropriate error message displays
- Verify form data is preserved
- Verify user can correct email and retry

**Suggested MVP Scope**: 
- User Story 1 (P1) only - This is the complete MVP as it's the only user story defined in the specification

