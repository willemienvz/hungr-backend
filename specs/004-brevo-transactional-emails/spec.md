# Feature Specification: Brevo Transactional Email Integration

**Feature Branch**: `004-brevo-transactional-emails`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "we need to add a way of sending all transactional emails via brevo const { onDocumentCreated } = require(\"firebase-functions/v2/firestore\"); - we also need to be able to choose templates to send with. The sign up, reset password, validate email, subscription change all need to send emails to the user via brevo, we need to override or change the sending to use a template from brevo - there would be a generic template that we'd configure as well as other templates to use."

## Clarifications

### Session 2025-01-27

- Q: When should users be added to Brevo campaigns? → A: When they opt-in during sign-up AND when they change preference to opt-in later
- Q: Which preference field(s) should trigger Brevo campaign addition? → A: marketingConsent for general campaigns, separate campaigns for tips and insights (tipsTutorials and userInsights)
- Q: How should the system handle users who opt out of campaigns? → A: Remove from corresponding campaign(s) when preference is disabled
- Q: How should users be organized in Brevo campaigns? → A: Separate contact lists for each campaign type (marketing, tips, insights)
- Q: How should the system handle existing users who already have preferences set? → A: Only add new users going forward (ignore existing preferences)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email Verification During Registration (Priority: P1)

A new user who signs up for an account receives a professional email verification message sent via Brevo using a configured template, allowing them to verify their email address and complete registration.

**Why this priority**: Email verification is critical for account security and user onboarding. Users must receive verification emails reliably to activate their accounts and access the platform.

**Independent Test**: Can be fully tested by creating a new user account and verifying that a Brevo email with the verification template is sent, contains the correct verification link, and the user can successfully verify their email address.

**Acceptance Scenarios**:

1. **Given** a new user completes the registration process, **When** the system creates their account, **Then** a verification email is automatically sent via Brevo using the email verification template, containing a valid verification link that expires after the configured time period
2. **Given** a user receives a verification email, **When** they click the verification link, **Then** their email address is marked as verified and they can access the platform
3. **Given** a verification email fails to send due to a temporary Brevo service issue, **When** the system detects the failure, **Then** the system retries sending the email according to the retry policy and logs the attempt for monitoring
4. **Given** a user requests a new verification email, **When** they trigger the resend action, **Then** a new verification email is sent via Brevo with a fresh verification link, invalidating any previous links

---

### User Story 2 - Password Reset Email Delivery (Priority: P1)

A user who forgets their password can request a password reset and receive a professional password reset email sent via Brevo using a configured template, enabling them to securely reset their password.

**Why this priority**: Password reset functionality is essential for user account recovery. Users must be able to regain access to their accounts when they forget passwords, and the reset process must be secure and reliable.

**Independent Test**: Can be fully tested by requesting a password reset and verifying that a Brevo email with the password reset template is sent, contains a valid reset link, and the user can successfully reset their password using the link.

**Acceptance Scenarios**:

1. **Given** a user requests a password reset, **When** they provide their registered email address, **Then** a password reset email is sent via Brevo using the password reset template, containing a secure reset link that expires after the configured time period
2. **Given** a user receives a password reset email, **When** they click the reset link, **Then** they are directed to a secure password reset page where they can set a new password
3. **Given** a user requests multiple password resets, **When** they receive multiple reset emails, **Then** each new reset link invalidates previous reset links for security purposes
4. **Given** a password reset email fails to send, **When** the system detects the failure, **Then** the system retries sending according to the retry policy and provides appropriate error feedback to the user

---

### User Story 3 - Welcome Email After Account Creation (Priority: P2)

A new user who successfully creates an account receives a welcome email sent via Brevo using a configured template, providing them with helpful information about getting started with the platform.

**Why this priority**: Welcome emails improve user onboarding experience and engagement. They help users understand the platform's value and guide them through initial setup steps.

**Independent Test**: Can be fully tested by creating a new user account and verifying that a welcome email is sent via Brevo using the welcome template, containing appropriate welcome content and getting started information.

**Acceptance Scenarios**:

1. **Given** a new user successfully creates an account, **When** their account is created, **Then** a welcome email is automatically sent via Brevo using the welcome template, personalized with the user's name and containing helpful onboarding information
2. **Given** a user receives a welcome email, **When** they open the email, **Then** the email displays correctly across different email clients and contains links to key platform features
3. **Given** a welcome email fails to send, **When** the system detects the failure, **Then** the failure is logged for monitoring but does not block the user's account creation process

---

### User Story 4 - Subscription Change Notifications (Priority: P2)

A user who changes their subscription plan receives a notification email sent via Brevo using a configured template, informing them of the subscription change details and any relevant billing information.

**Why this priority**: Subscription change notifications are important for transparency and user trust. Users need to be informed about changes to their subscription, billing amounts, and plan features.

**Independent Test**: Can be fully tested by changing a user's subscription plan and verifying that a subscription change email is sent via Brevo using the subscription change template, containing accurate information about the change.

**Acceptance Scenarios**:

1. **Given** a user successfully changes their subscription plan, **When** the subscription change is processed, **Then** a subscription change notification email is sent via Brevo using the subscription change template, containing details about the old plan, new plan, billing changes, and effective date
2. **Given** a user's subscription is automatically updated (e.g., due to payment processing), **When** the update occurs, **Then** a subscription change email is sent via Brevo informing them of the automatic update
3. **Given** a subscription change email fails to send, **When** the system detects the failure, **Then** the failure is logged for monitoring but does not block the subscription change process

---

### User Story 5 - Template Selection and Configuration (Priority: P3)

System administrators can configure which Brevo templates are used for different transactional email types, allowing customization of email content and branding while maintaining a consistent user experience.

**Why this priority**: Template configuration enables branding consistency and content management. Administrators need the ability to customize email templates without code changes, and the system should support both a generic template and specific templates for different email types.

**Independent Test**: Can be fully tested by configuring template mappings for different email types and verifying that emails are sent using the correct configured templates with proper variable substitution.

**Acceptance Scenarios**:

1. **Given** an administrator configures template mappings, **When** they specify which Brevo template ID to use for each email type (verification, password reset, welcome, subscription change), **Then** the system uses the specified templates when sending emails of those types
2. **Given** a generic template is configured as a fallback, **When** a specific template is not configured for an email type or a template lookup fails, **Then** the system uses the generic template to ensure emails are still sent
3. **Given** template variables are provided for an email, **When** the email is sent via Brevo, **Then** all template variables are correctly substituted with actual values (e.g., user name, verification link, reset link)
4. **Given** a configured template ID does not exist in Brevo, **When** the system attempts to send an email using that template, **Then** the system falls back to the generic template and logs an error for administrator review

---

### User Story 6 - Marketing Campaign Subscription Management (Priority: P2)

A user who opts in to receive marketing communications, tips, or insights during sign-up or in settings is automatically added to the corresponding Brevo contact lists, and users who opt out are removed from those lists, ensuring their preferences are respected.

**Why this priority**: Campaign subscription management ensures users receive only the communications they've consented to, improving user experience and compliance with email marketing regulations. It maintains synchronization between user preferences and Brevo contact lists.

**Independent Test**: Can be fully tested by enabling/disabling user preferences (marketingConsent, tipsTutorials, userInsights) and verifying that users are added to or removed from the corresponding Brevo contact lists accordingly.

**Acceptance Scenarios**:

1. **Given** a new user opts in to receive marketing information during sign-up (receiveMarketingInfo is true), **When** their account is created, **Then** they are added to the Brevo marketing contact list if marketingConsent is enabled
2. **Given** a user opts in to receive tips and tutorials (tipsTutorials is enabled) during sign-up or in settings, **When** the preference is saved, **Then** they are added to the Brevo tips and tutorials contact list
3. **Given** a user opts in to receive user insights (userInsights is enabled) during sign-up or in settings, **When** the preference is saved, **Then** they are added to the Brevo user insights contact list
4. **Given** a user changes their marketingConsent preference from enabled to disabled in settings, **When** the preference is saved, **Then** they are removed from the Brevo marketing contact list
5. **Given** a user changes their tipsTutorials or userInsights preference from enabled to disabled, **When** the preference is saved, **Then** they are removed from the corresponding Brevo contact list
6. **Given** a user is added to or removed from a Brevo contact list, **When** the operation completes, **Then** the operation is logged for monitoring and any failures are handled gracefully without blocking user preference updates

---

### Edge Cases

- What happens when Brevo API is temporarily unavailable? The system should implement retry logic with exponential backoff, queue failed emails for retry, and log failures for monitoring. After maximum retries, the system should notify administrators.
- How does the system handle invalid or expired Brevo API keys? The system should validate API key configuration on startup, detect authentication failures immediately, and prevent email sending with clear error logging until the key is corrected.
- What happens when a Brevo template is deleted or modified externally? The system should detect template not found errors, fall back to the generic template, and log warnings for administrator review.
- How does the system handle email sending rate limits from Brevo? The system should respect Brevo rate limits, implement queuing for emails that exceed limits, and monitor sending rates to prevent service disruption.
- What happens when template variables are missing or malformed? The system should validate required template variables before sending, use default values for optional variables, and log warnings when variables are missing.
- How does the system handle duplicate email sends (e.g., user triggers multiple password resets quickly)? The system should implement rate limiting per user per email type, prevent duplicate sends within a short time window, and provide appropriate feedback to users.
- What happens when a user's email address is invalid or bounces? The system should handle bounce notifications from Brevo, mark invalid email addresses appropriately, and prevent further emails to bounced addresses until the issue is resolved.
- What happens when a user is already in a Brevo contact list and opts in again? The system should handle duplicate contact additions gracefully (idempotent operation) without errors
- What happens when Brevo contact list operations fail (e.g., list doesn't exist, API error)? The system should log the failure for monitoring but not block user preference updates, and retry the operation according to retry policy
- How does the system handle users who change their email address? The system should update their contact information in Brevo contact lists and maintain their subscription preferences
- What happens when a user opts in to multiple campaign types simultaneously? The system should add them to all corresponding Brevo contact lists independently

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST send all transactional emails (email verification, password reset, welcome, subscription change) via Brevo API
- **FR-002**: System MUST support template-based email sending using Brevo template IDs configured for each email type
- **FR-003**: System MUST provide a generic/fallback Brevo template that is used when a specific template is not configured or unavailable
- **FR-004**: System MUST allow configuration of which Brevo template ID to use for each transactional email type (verification, password reset, welcome, subscription change)
- **FR-005**: System MUST substitute template variables with actual values when sending emails via Brevo templates (e.g., user name, verification links, reset links, subscription details)
- **FR-006**: System MUST send email verification emails via Brevo when new user accounts are created
- **FR-007**: System MUST send password reset emails via Brevo when users request password resets
- **FR-008**: System MUST send welcome emails via Brevo when new user accounts are successfully created
- **FR-009**: System MUST send subscription change notification emails via Brevo when user subscription plans are modified
- **FR-010**: System MUST implement retry logic with exponential backoff when Brevo API calls fail due to temporary service issues
- **FR-011**: System MUST log all email sending attempts, successes, and failures for monitoring and troubleshooting
- **FR-012**: System MUST handle Brevo API authentication securely using secret management (e.g., Firebase secrets)
- **FR-013**: System MUST validate that required template variables are provided before attempting to send emails
- **FR-014**: System MUST fall back to the generic template when a configured template ID is not found or unavailable in Brevo
- **FR-015**: System MUST prevent sending duplicate emails within a short time window (e.g., multiple password resets within 5 minutes) to the same user for the same email type
- **FR-016**: System MUST handle email bounce notifications from Brevo and prevent further emails to addresses that have bounced
- **FR-017**: System MUST respect Brevo rate limits and implement queuing when rate limits are approached
- **FR-018**: System MUST override or replace existing email sending mechanisms (e.g., Firebase Auth default emails, AWS Lambda email service) with Brevo template-based sending for all specified transactional email types
- **FR-019**: System MUST add users to Brevo contact lists when they opt in to receive marketing communications, tips, or insights during sign-up or when they change preferences in settings
- **FR-020**: System MUST maintain separate Brevo contact lists for marketing communications (marketingConsent), tips and tutorials (tipsTutorials), and user insights (userInsights)
- **FR-021**: System MUST add users to the marketing contact list when marketingConsent preference is enabled (during sign-up or preference change)
- **FR-022**: System MUST add users to the tips and tutorials contact list when tipsTutorials preference is enabled (during sign-up or preference change)
- **FR-023**: System MUST add users to the user insights contact list when userInsights preference is enabled (during sign-up or preference change)
- **FR-024**: System MUST remove users from corresponding Brevo contact lists when they opt out (disable the corresponding preference)
- **FR-025**: System MUST sync user preferences with Brevo contact lists based on existing user preference fields (marketingConsent, tipsTutorials, userInsights) from sign-up and settings pages
- **FR-026**: System MUST handle Brevo contact list operations (add/remove) gracefully without blocking user preference updates if operations fail
- **FR-027**: System MUST log all contact list add/remove operations for monitoring and troubleshooting
- **FR-028**: System MUST only add new users to Brevo contact lists going forward (existing users with preferences set before implementation are not automatically synced)

### Key Entities *(include if feature involves data)*

- **Email Template Configuration**: Mapping of email types (verification, password reset, welcome, subscription change) to Brevo template IDs, with a fallback generic template configuration
- **Email Send Request**: Request to send a transactional email containing recipient information, email type, template variables, and optional template override
- **Email Send Log**: Record of email sending attempts including recipient, email type, template used, send status (success/failure), timestamp, and error details if applicable
- **Brevo Template Variables**: Dynamic values substituted into Brevo templates such as user name, verification links, reset links, subscription details, and other personalized content
- **User Marketing Preferences**: User preference fields (marketingConsent, tipsTutorials, userInsights) that determine subscription to Brevo contact lists, stored in user documents and updated during sign-up and in settings
- **Brevo Contact List Configuration**: Mapping of user preference types to Brevo contact list IDs (marketing contact list, tips and tutorials contact list, user insights contact list)
- **Campaign Subscription Log**: Record of contact list add/remove operations including user email, contact list type, operation type (add/remove), status (success/failure), timestamp, and error details if applicable

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of transactional emails (verification, password reset, welcome, subscription change) are sent via Brevo using configured templates
- **SC-002**: Email delivery success rate is at least 98% under normal operating conditions (excluding invalid email addresses and user-initiated blocks)
- **SC-003**: Email sending failures due to Brevo API issues are automatically retried and 95% of initially failed emails are successfully delivered after retry
- **SC-004**: All transactional emails are delivered to users within 30 seconds of the triggering event (account creation, password reset request, subscription change) under normal network conditions
- **SC-005**: Template variable substitution accuracy is 100% (all variables are correctly replaced with actual values)
- **SC-006**: System fallback to generic template occurs in less than 1 second when a specific template is unavailable
- **SC-007**: Support tickets related to missing or undelivered transactional emails decrease by at least 70% compared to the previous email system
- **SC-008**: Email bounce rate remains below 2% (excluding invalid email addresses entered by users)
- **SC-009**: All email sending operations complete without blocking user-facing operations (account creation, password reset requests, subscription changes)
- **SC-010**: 100% of users who opt in to marketing communications, tips, or insights are added to the corresponding Brevo contact lists within 30 seconds of preference being saved
- **SC-011**: 100% of users who opt out are removed from corresponding Brevo contact lists within 30 seconds of preference being saved
- **SC-012**: Contact list add/remove operations succeed for at least 98% of attempts under normal operating conditions
- **SC-013**: Contact list operations complete without blocking user preference updates (failures are logged but do not prevent preference changes)

## Assumptions

- Brevo API credentials (API key) will be securely stored and managed using Firebase secrets or similar secure secret management
- Brevo templates will be pre-configured in the Brevo dashboard with appropriate template IDs
- Template variables follow Brevo's variable syntax and naming conventions
- Users have valid email addresses that can receive emails
- Brevo service availability is generally high (99%+ uptime), but the system must handle temporary outages gracefully
- Email verification links and password reset links are generated by Firebase Auth or the existing authentication system
- Subscription change events are triggered by existing subscription management functionality
- The system has network connectivity to Brevo API endpoints
- Brevo account has sufficient sending quota/limits for expected email volume
- Brevo contact lists (marketing, tips and tutorials, user insights) are pre-configured in the Brevo dashboard with known list IDs
- User preference fields (marketingConsent, tipsTutorials, userInsights) are already implemented in the user data model and settings interface
- Contact list operations (add/remove) are idempotent and can be safely retried if they fail

## Dependencies

- Brevo API access and valid API credentials
- Existing user authentication system (Firebase Auth) for generating verification and reset links
- Existing subscription management system for detecting subscription changes
- Firebase Functions v2 for implementing email sending triggers
- Secure secret management system (Firebase secrets) for storing Brevo API key
- Existing user data structure containing email addresses, names, subscription information, and marketing preferences (marketingConsent, tipsTutorials, userInsights)
- Brevo account with configured email templates (verification, password reset, welcome, subscription change, and generic fallback)
- Brevo account with pre-configured contact lists (marketing contact list, tips and tutorials contact list, user insights contact list)

## Out of Scope

- Creating or editing Brevo email templates through the application interface (templates are managed in Brevo dashboard)
- Sending marketing or promotional campaign emails (campaign emails are sent via Brevo dashboard; this feature only manages contact list subscriptions)
- Email analytics and tracking beyond basic delivery status (detailed analytics available in Brevo dashboard)
- Custom email content editing within the application (content is managed via Brevo templates)
- Multi-language email template support (assumes single language or language handled via separate templates)
- Email scheduling or delayed sending (all transactional emails are sent immediately upon triggering events)
- User preferences for email frequency or opting out of transactional emails (transactional emails are required for account functionality)
- Backfilling existing users with preferences set before implementation (only new users and preference changes after implementation are synced to Brevo contact lists)
