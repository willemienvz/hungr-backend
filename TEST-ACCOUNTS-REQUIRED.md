# Test Accounts Required for Security Testing

**Created**: October 21, 2025  
**Purpose**: Media library security isolation testing

## Requirement

For Phase 2 (Critical Security Fix), we need **minimum 2 test user accounts** to verify:
- User A cannot access User B's media
- Firestore rules properly enforce user isolation
- Direct Firestore queries are filtered by userId

## Test Accounts Needed

### Account 1 (Test User A)
- Email: `test-user-a@example.com` (or your test domain)
- Role: Standard user
- Purpose: Upload media, verify ownership

### Account 2 (Test User B)  
- Email: `test-user-b@example.com` (or your test domain)
- Role: Standard user
- Purpose: Attempt to access User A's media (should fail)

## Where to Create

These accounts should be created in:
1. **Firebase Emulator** (for local testing - Phase 2, T012)
2. **Staging Environment** (if exists - Phase 2, T013)
3. **Production** (for final verification - Phase 2, T016)

## Testing Workflow

1. Sign in as User A
2. Upload media file
3. Note media document ID
4. Sign out
5. Sign in as User B
6. Attempt to query/access User A's media
7. **Expected Result**: User B sees 0 of User A's media documents

## Status

- [ ] Firebase Emulator test accounts created
- [ ] Staging test accounts created (if applicable)
- [ ] Production test accounts created (if applicable)

**Note**: These accounts will be used extensively in Phase 2 (T007-T016) for security testing.













