# Implementation Plan: Subscription Management with PayFast Recurring Billing

**Branch**: `001-subscription-management` | **Date**: 2024-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-subscription-management/spec.md`

## Summary

Extend the existing PayFast recurring billing integration to provide a dedicated Billing dashboard where users can view subscription details, payment history, and manage their subscriptions (pause, edit, cancel). The backend functions are largely implemented; this plan focuses on ensuring token persistence during registration, creating a dedicated Billing UI component, and adding subscription details fetching from PayFast API.

**Key References**:
- PayFast Recurring Billing Documentation: https://developers.payfast.co.za/docs#recurring_billing
- PayFast Recurring Billing API: https://developers.payfast.co.za/api#recurring-billing

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: 
- Frontend: Angular 17+, Angular Material, AngularFire
- Backend: Firebase Functions, Firebase Admin SDK, Firestore
- External: PayFast Recurring Billing API  
**Storage**: Firestore (users, subscriptions, transactions, audit_logs collections)  
**Testing**: Jasmine/Karma (Angular), Firebase Functions emulator  
**Target Platform**: Web (Angular SPA), Firebase Cloud Functions  
**Project Type**: Web application (Angular frontend + Firebase backend)  
**Performance Goals**: 
- Subscription operations complete within 5 seconds (95th percentile)
- Billing page loads within 2 seconds
- PayFast API calls with retry logic (3 attempts with exponential backoff)  
**Constraints**: 
- Must maintain backward compatibility with existing subscription data
- PayFast API rate limits and signature requirements
- Firebase Functions timeout limits (60s default)  
**Scale/Scope**: 
- Single subscription per user
- Support for active, paused, and cancelled subscription states
- Payment history display for transaction records

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Project Structure**: Single web application (Angular + Firebase) - compliant  
✅ **Dependencies**: Standard Angular/Firebase stack - compliant  
✅ **Testing**: Unit tests for services, integration tests for functions - compliant  
✅ **Documentation**: Feature spec exists, plan being created - compliant

## Project Structure

### Documentation (this feature)

```text
specs/001-subscription-management/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/          # Quality checklists
│   └── requirements.md
└── [future: research.md, data-model.md, quickstart.md, contracts/, tasks.md]
```

### Source Code (repository root)

```text
backend/
├── functions/
│   └── src/
│       ├── index.ts                    # Export subscription functions
│       ├── payfast.ts                  # PayFast utilities (exists)
│       ├── payfastItn.ts               # ITN handler (exists, needs token save enhancement)
│       ├── pauseSubscription.ts        # ✅ Exists
│       ├── cancelSubscription.ts       # ✅ Exists
│       ├── unpauseSubscription.ts      # ✅ Exists
│       ├── updateSubscription.ts       # ✅ Exists
│       ├── getSubscriptionDetails.ts   # ⚠️ NEW: Fetch subscription from PayFast API
│       └── subscriptionUtils.ts        # ✅ Exists (retry, logging, rollback)
│
└── src/
    └── app/
        ├── components/
        │   ├── settings/
        │   │   ├── general/            # Has subscription UI (needs refactor)
        │   │   └── billing/           # ⚠️ NEW: Dedicated Billing component
        │   │       ├── billing.component.ts
        │   │       ├── billing.component.html
        │   │       ├── billing.component.scss
        │   │       └── change-subscription-dialog/  # ✅ Exists (reuse)
        │   └── unsaved-changes-dialog/ # ✅ Exists (reuse for confirmations)
        │
        ├── shared/
        │   ├── services/
        │   │   ├── subscription.service.ts        # ✅ Exists (needs getDetails method)
        │   │   ├── payfast.service.ts            # ✅ Exists
        │   │   └── auth.service.ts               # ✅ Exists
        │   └── guards/
        │       └── auth.guard.ts                  # ✅ Exists
        │
        └── app-routing.module.ts       # ⚠️ Add billing route
```

**Structure Decision**: Extend existing Angular + Firebase structure. Create new dedicated Billing component in settings, enhance existing subscription service, and add new Cloud Function for fetching subscription details from PayFast API.

## Complexity Tracking

> **No violations** - Standard web application structure with Firebase backend. All complexity is justified by business requirements.

## Phase 0: Research & Analysis

### Existing Implementation Analysis

**✅ Already Implemented:**
1. **Backend Functions** (Firebase Cloud Functions):
   - `pauseSubscription` - Pauses subscription via PayFast API
   - `cancelSubscription` - Cancels subscription via PayFast API
   - `unpauseSubscription` - Resumes paused subscription
   - `updateSubscription` - Updates subscription amount, frequency, cycles, run_date
   - All functions include: authentication, error handling, retry logic, audit logging, database rollback

2. **Frontend Service**:
   - `SubscriptionService` - Angular service with methods for all subscription operations
   - Interfaces for all response types

3. **Token Management**:
   - `getSubscriptionToken()` - Retrieves token from subscriptions or users collection
   - Token saved in subscriptions collection during ITN processing
   - Token saved in user document (via subscription update)

4. **UI Components**:
   - Subscription management UI exists in `GeneralComponent`
   - Confirmation dialogs implemented
   - Change subscription dialog exists

**⚠️ Gaps Identified:**
1. **Token Persistence**: Need to verify token is saved to user document during registration (currently saved in subscriptions, but user document may not have `payfastToken` field)
2. **Subscription Details Fetching**: No function to fetch current subscription details from PayFast API (for displaying real-time status)
3. **Dedicated Billing UI**: Subscription management is in General settings, needs dedicated Billing section
4. **Payment History**: No UI for displaying transaction history
5. **Subscription Status Display**: Need to fetch and display current subscription details from PayFast

### PayFast API Research

**Reference Documentation:**
- https://developers.payfast.co.za/docs#recurring_billing
- https://developers.payfast.co.za/api#recurring-billing

**Key API Endpoints (from existing code analysis):**
1. `PUT /subscriptions/{token}/pause` - Pause subscription (cycles parameter)
2. `PUT /subscriptions/{token}/cancel` - Cancel subscription
3. `PUT /subscriptions/{token}/unpause` - Resume subscription
4. `PATCH /subscriptions/{token}/update` - Update subscription (amount, frequency, cycles, run_date)
5. `GET /subscriptions/{token}/fetch` - ⚠️ **MISSING**: Fetch subscription details (needs implementation)

**API Requirements:**
- Authentication: merchant-id, version, timestamp headers
- Signature: MD5 hash of sorted parameters + passphrase (alphabetical sort)
- Content-Type: application/json
- Response format: `{ data: { response: {...}, message: "..." } }`

**Subscription Status Values:**
- Active: Subscription is active and billing
- Paused: Subscription is temporarily paused
- Cancelled: Subscription is permanently cancelled

## Phase 1: Design & Data Model

### Data Model Enhancements

**Existing Collections:**

1. **users** collection:
   ```typescript
   {
     uid: string;
     email: string;
     firstName: string;
     lastName: string;
     subscriptionStatus: 'active' | 'paused' | 'cancelled';
     subscriptionPlan: 'monthly' | 'quarterly' | 'bi-annual' | 'annual';
     payfastToken?: string;  // ⚠️ Ensure this is set during registration
     lastPaymentDate: Timestamp;
     updated_at: Timestamp;
   }
   ```

2. **subscriptions** collection:
   ```typescript
   {
     userId: string;
     email: string;
     status: 'active' | 'paused' | 'cancelled';
     plan: string;
     amount: number;
     recurringAmount: number;
     frequency: string; // '3' = monthly, '4' = quarterly, etc.
     cycles: string; // '0' = unlimited
     billingDate: string; // YYYY-MM-DD
     nextBillingDate: Timestamp;
     token: string; // PayFast subscription token
     paymentId: string;
     startDate: Timestamp;
     pausedAt?: Timestamp;
     cancelledAt?: Timestamp;
     created_at: Timestamp;
     updated_at: Timestamp;
   }
   ```

3. **transactions** collection (existing):
   ```typescript
   {
     m_payment_id: string;
     pf_payment_id: string;
     payment_status: string;
     amount_gross: number;
     amount_fee: number;
     amount_net: number;
     token: string;
     created_at: Timestamp;
     updated_at: Timestamp;
   }
   ```

**No schema changes needed** - existing structure supports all requirements.

### Component Design

**New Component: `BillingComponent`**

**Location**: `src/app/components/settings/billing/`

**Responsibilities**:
- Display current subscription status and details
- Show payment history
- Provide actions: Pause, Resume, Edit, Cancel
- Handle loading states and error messages

**Component Structure**:
```typescript
BillingComponent {
  // Data
  subscriptionData: SubscriptionData | null;
  paymentHistory: Transaction[];
  loading: boolean;
  error: string | null;
  
  // Methods
  loadSubscriptionDetails(): Promise<void>;
  loadPaymentHistory(): Promise<void>;
  pauseSubscription(): Promise<void>;
  resumeSubscription(): Promise<void>;
  editSubscription(): Promise<void>;
  cancelSubscription(): Promise<void>;
}
```

**Template Sections**:
1. **Subscription Overview Card**: Status, plan, amount, next billing date
2. **Payment History Table**: List of past transactions
3. **Action Buttons**: Pause/Resume, Edit, Cancel (context-aware)
4. **Loading States**: Spinners during operations
5. **Error Messages**: User-friendly error display

### Service Enhancements

**SubscriptionService** - Add method:
```typescript
getSubscriptionDetails(): Promise<SubscriptionDetailsResponse>
```

**New Cloud Function**: `getSubscriptionDetails`
- Fetches current subscription details from PayFast API
- Returns: status, amount, frequency, cycles, next billing date, etc.
- Uses same authentication/signature pattern as other functions

### Route Configuration

**Add to `app-routing.module.ts`**:
```typescript
{
  path: 'settings/billing',
  component: BillingComponent,
  data: { title: 'Billing & Subscription' },
  canActivate: [AuthGuard]
}
```

**Update Sidebar Navigation**:
- Add "Billing" link in Settings section
- Icon: `payment` or `credit_card`

## Phase 2: Implementation Tasks

### Task 1: Ensure Token Persistence During Registration

**File**: `functions/src/payfastItn.ts`

**Changes**:
- In `updateUserSubscription()`, ensure `payfastToken` is saved to user document:
  ```typescript
  await db.collection('users').doc(userId).update({
    subscriptionStatus: 'active',
    subscriptionPlan: isRecurring ? 'monthly' : 'once-off',
    payfastToken: itnData.token || itnData.tokenisation, // ⚠️ ADD THIS
    lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  });
  ```

**Testing**:
- Verify token is saved in user document after payment
- Verify token retrieval works via `getSubscriptionToken()`

### Task 2: Create Get Subscription Details Function

**New File**: `functions/src/getSubscriptionDetails.ts`

**Implementation**:
- Follow pattern from existing subscription functions
- Use PayFast API: `GET /subscriptions/{token}/fetch`
- Return subscription details: status, amount, frequency, cycles, next billing date
- Include error handling and retry logic

**Reference PayFast API**: https://developers.payfast.co.za/api#recurring-billing

**Export in**: `functions/src/index.ts`

### Task 3: Enhance Subscription Service

**File**: `src/app/shared/services/subscription.service.ts`

**Add Method**:
```typescript
getSubscriptionDetails(): Promise<SubscriptionDetailsResponse> {
  const getDetailsFn = this.functions.httpsCallable('getSubscriptionDetails');
  return firstValueFrom(getDetailsFn({})) as Promise<SubscriptionDetailsResponse>;
}
```

**Add Interface**:
```typescript
export interface SubscriptionDetailsResponse {
  success: boolean;
  data?: {
    status: string;
    amount: number;
    frequency: number;
    cycles: number;
    nextBillingDate: string;
    // ... other PayFast subscription fields
  };
  error?: { code: string; message: string; };
}
```

### Task 4: Create Billing Component

**New Files**:
- `src/app/components/settings/billing/billing.component.ts`
- `src/app/components/settings/billing/billing.component.html`
- `src/app/components/settings/billing/billing.component.scss`

**Implementation**:
- Use Angular Material components (cards, tables, buttons)
- Follow existing component patterns from GeneralComponent
- Reuse `ChangeSubscriptionDialogComponent` for edit functionality
- Reuse `UnsavedChangesDialogComponent` for confirmations
- Implement loading states and error handling
- Display subscription status with appropriate styling (active = green, paused = yellow, cancelled = red)

**Key Features**:
1. **Subscription Status Card**:
   - Current status badge
   - Plan name and amount
   - Next billing date
   - Billing frequency

2. **Payment History Table**:
   - Query `transactions` collection filtered by user
   - Display: date, amount, status, transaction ID
   - Sort by date (newest first)

3. **Action Buttons** (context-aware):
   - If active: Show "Pause" and "Edit" and "Cancel"
   - If paused: Show "Resume" and "Cancel"
   - If cancelled: Show "Subscribe" (link to sign-up)

### Task 5: Add Routing and Navigation

**File**: `src/app/app-routing.module.ts`

**Add Route**:
```typescript
{
  path: 'settings/billing',
  component: BillingComponent,
  data: { title: 'Billing & Subscription' },
}
```

**File**: `src/app/components/navigation/sidebar/sidebar.component.html`

**Add Navigation Link**:
```html
<a routerLink="/settings/billing" routerLinkActive="activeMenu">
  <i class="material-icons">payment</i>Billing
</a>
```

**File**: `src/app/shared/config/breadcrumb-config.ts`

**Add Breadcrumb Label**:
```typescript
'settings/billing': 'Billing & Subscription'
```

### Task 6: Refactor General Component (Optional)

**File**: `src/app/components/settings/general/general.component.ts`

**Considerations**:
- Remove subscription management UI from General settings (move to Billing)
- Keep only account/profile settings in General
- Or: Keep subscription quick actions but link to full Billing page

**Decision**: Keep minimal subscription info in General (status only), link to Billing for full management.

### Task 7: Payment History Service Method

**Enhancement**: Add method to fetch payment history

**File**: `src/app/shared/services/subscription.service.ts` (or create `transaction.service.ts`)

**Method**:
```typescript
getPaymentHistory(limit: number = 10): Observable<Transaction[]>
```

**Implementation**:
- Query Firestore `transactions` collection
- Filter by current user (via email or userId lookup)
- Order by `created_at` descending
- Return Observable for real-time updates

## Phase 3: Testing Strategy

### Unit Tests

**SubscriptionService**:
- Test `getSubscriptionDetails()` method
- Test error handling for API failures

**BillingComponent**:
- Test component initialization
- Test subscription loading
- Test action button visibility based on status
- Test error message display

### Integration Tests

**Cloud Functions**:
- Test `getSubscriptionDetails` with valid token
- Test `getSubscriptionDetails` with invalid token
- Test error handling and retry logic

**End-to-End Flow**:
1. User completes registration → token saved
2. User navigates to Billing → subscription details displayed
3. User pauses subscription → status updates
4. User resumes subscription → status updates
5. User edits subscription → changes reflected
6. User cancels subscription → status updates

### Manual Testing Checklist

- [ ] Token is saved to user document during registration
- [ ] Billing page loads subscription details correctly
- [ ] Payment history displays past transactions
- [ ] Pause subscription works and status updates
- [ ] Resume subscription works and status updates
- [ ] Edit subscription works and changes are saved
- [ ] Cancel subscription works and status updates
- [ ] Error messages display for API failures
- [ ] Loading states show during operations
- [ ] Confirmation dialogs appear for destructive actions
- [ ] Navigation link works in sidebar
- [ ] Breadcrumbs display correctly

## Phase 4: Deployment Considerations

### Environment Configuration

**Firebase Functions Config** (already configured):
```bash
firebase functions:config:set payfast.merchant_id="..." payfast.merchant_key="..." payfast.passphrase="..." payfast.sandbox="true"
```

### Database Indexes

**Required Firestore Indexes** (verify these exist):
- `transactions` collection: `email_address` (ascending), `created_at` (descending)
- `subscriptions` collection: `userId` (ascending), `status` (ascending)
- `users` collection: `email` (ascending) - for payment history lookup

### Security Rules

**Firestore Rules** (verify):
- Users can only read their own subscription data
- Users can only read their own transaction history
- Only Cloud Functions can write to subscriptions/transactions

### Monitoring & Logging

**Existing Audit Logging**:
- All subscription actions logged to `audit_logs` collection
- Includes: action type, userId, subscriptionId, result, timestamp

**Enhancements**:
- Monitor PayFast API response times
- Alert on high failure rates
- Track subscription status changes

## Dependencies & Prerequisites

### External Dependencies
- PayFast Recurring Billing API access
- Valid PayFast merchant credentials
- PayFast API documentation (referenced URLs)

### Internal Dependencies
- Existing subscription management functions (✅ complete)
- Existing subscription service (✅ complete)
- Angular Material components
- Firebase Authentication
- Firestore database

### Code Dependencies
- `payfast.ts` - PayFast utilities
- `subscriptionUtils.ts` - Retry logic and audit logging
- `ChangeSubscriptionDialogComponent` - Reuse for edit
- `UnsavedChangesDialogComponent` - Reuse for confirmations

## Risk Assessment

### Technical Risks

1. **PayFast API Changes**: Low risk - API is stable, but monitor for updates
   - Mitigation: Reference official documentation, implement versioning in API calls

2. **Token Retrieval Failure**: Medium risk - If token not saved correctly
   - Mitigation: Verify token persistence in Task 1, add fallback logic

3. **API Rate Limiting**: Low risk - Retry logic already implemented
   - Mitigation: Exponential backoff, monitor API usage

### Business Risks

1. **User Confusion**: Low risk - Clear UI and confirmations
   - Mitigation: User testing, clear messaging

2. **Data Inconsistency**: Medium risk - Between Firestore and PayFast
   - Mitigation: Sync on page load, handle discrepancies gracefully

## Success Metrics

**Technical Metrics**:
- Subscription operations complete within 5 seconds (95th percentile)
- Billing page loads within 2 seconds
- API call success rate > 95%

**User Metrics**:
- Users can complete subscription management without support
- Payment history displays correctly
- No data loss during subscription operations

## Next Steps

1. **Review this plan** with team
2. **Verify PayFast API documentation** for `GET /subscriptions/{token}/fetch` endpoint
3. **Create implementation tasks** using `/speckit.tasks` command
4. **Begin implementation** starting with Task 1 (token persistence)

## References

- **PayFast Recurring Billing Documentation**: https://developers.payfast.co.za/docs#recurring_billing
- **PayFast Recurring Billing API**: https://developers.payfast.co.za/api#recurring-billing
- **Feature Specification**: [spec.md](./spec.md)
- **Existing Code**:
  - `functions/src/pauseSubscription.ts`
  - `functions/src/cancelSubscription.ts`
  - `functions/src/updateSubscription.ts`
  - `functions/src/unpauseSubscription.ts`
  - `src/app/shared/services/subscription.service.ts`
  - `src/app/components/settings/general/general.component.ts`



