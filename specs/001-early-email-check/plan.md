# Implementation Plan: Early Email Validation in Registration

**Branch**: `001-early-email-check` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-early-email-check/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement email availability validation on step 1 of the registration process to prevent users from proceeding to step 2 if their email is already registered. The validation will occur when the user attempts to proceed to step 2 (not during typing) to prevent email enumeration attacks. The system will use Firebase Auth's `fetchSignInMethodsForEmail` API to check email availability and display a user-friendly error message with options to log in or try a different email.

## Technical Context

**Language/Version**: TypeScript 5.2.2, Angular 17.0.0  
**Primary Dependencies**: Angular Forms, Angular Fire (@angular/fire ^17.0.1), Firebase Auth, Angular Material, ngx-toastr  
**Storage**: Firebase Auth (for email checking), Firestore (for user data persistence)  
**Testing**: Jasmine, Karma (Angular testing framework)  
**Target Platform**: Web browser (Angular web application)  
**Project Type**: Web application (Angular SPA)  
**Performance Goals**: Email availability checks complete within 2 seconds for 95% of requests under normal network conditions  
**Constraints**: Must prevent email enumeration attacks (check only on form submission), must preserve form data on validation failure, must handle network errors gracefully  
**Scale/Scope**: Restaurant management dashboard with user registration flow; email validation on single registration step

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: The constitution file (`.specify/memory/constitution.md`) appears to be a template and has not been customized for this project. No specific constitution gates are defined. Proceeding with standard Angular/Firebase best practices.

## Project Structure

### Documentation (this feature)

```text
specs/001-early-email-check/
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
│   └── sign-up/
│       └── step1/
│           ├── step1.component.ts      # Main component (modify)
│           ├── step1.component.html    # Template (modify)
│           └── step1.component.scss    # Styles (modify if needed)
├── shared/
│   ├── services/
│   │   └── auth.service.ts             # AuthService (already has isEmailInUse method)
│   └── validators/
│       └── email-availability.validator.ts  # New async validator (create)
└── environments/
    └── environment.ts                   # Environment config (if needed)

tests/
└── (Angular test files co-located with components)
```

**Structure Decision**: This is a web application using Angular 17. The feature modifies the existing `step1` component in the sign-up flow. A new async validator will be created in the shared validators directory. The existing `AuthService.isEmailInUse()` method will be used for email checking.

## Complexity Tracking

> **No violations identified** - This feature follows standard Angular patterns and uses existing infrastructure.
