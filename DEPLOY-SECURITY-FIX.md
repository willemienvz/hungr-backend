# Security Fix Deployment Instructions

**Date**: October 21, 2025  
**Purpose**: Deploy Firestore security rules fix for media library isolation  
**Severity**: CRITICAL - Cross-user data access vulnerability

---

## Pre-Deployment Checklist

- [x] Security vulnerability analyzed
- [x] Firestore rules updated in `backend/firestore.rules`
- [x] Backup created: `firestore.rules.backup-*`
- [x] Audit script created: `backend/scripts/audit-media-ownership.ts`
- [ ] **YOU ARE HERE** → Rules tested in emulator
- [ ] Rules deployed to production
- [ ] Multi-user verification complete

---

## Step 1: Optional - Run Media Ownership Audit

**Purpose**: Verify all media documents have owner fields

```bash
# Install TypeScript dependencies if needed
npm install --save-dev ts-node @types/node

# Run audit script
cd backend
ts-node scripts/audit-media-ownership.ts
```

**Expected Output**:
- "✅ SUCCESS: All documents have at least one owner field"
- OR "⚠️ WARNING: Some documents are missing owner fields!"

**If WARNING appears**:
- Some media documents don't have userId/ownerId/uploadedBy fields
- These will become inaccessible after deployment
- Need to run migration before deploying (contact dev team)

**If SUCCESS**:
- Safe to proceed with deployment ✅

---

## Step 2: Test in Firebase Emulator (RECOMMENDED)

**Purpose**: Verify rules work correctly before production deployment

### 2a. Start Firebase Emulator

```bash
cd backend
firebase emulators:start
```

This will start:
- Firestore Emulator (usually on port 8080)
- Emulator UI (usually on http://localhost:4000)

### 2b. Test Scenarios

**Test 1: Media Library Loads**
1. Open your application pointing to emulator
2. Sign in as a test user
3. Navigate to Media Library
4. Upload a test image
5. **Expected**: Media uploads successfully
6. **Expected**: Media appears in library

**Test 2: User Isolation (CRITICAL)**
1. Note the media document ID from Test 1
2. Sign out
3. Create second test user (or sign in as different user)
4. Navigate to Media Library
5. **Expected**: User 2 sees ZERO of User 1's media
6. **Expected**: If User 2 tries to query directly, gets empty result

**Test 3: Query Functionality**
1. Sign in as User 1
2. Upload multiple media files
3. Use filters (if available)
4. Use sorting (if available)
5. **Expected**: All queries work correctly
6. **Expected**: orderBy still functions

### 2c. Stop Emulator

```bash
# Press Ctrl+C to stop emulator
```

**If any tests fail**:
- STOP - Do not deploy to production
- Review the error messages
- Check the rules syntax
- Consult with dev team

**If all tests pass**:
- Proceed to deployment ✅

---

## Step 3: Deploy to Production

**⚠️ WARNING**: This will update security rules for ALL users in production

### 3a. Verify Current Firebase Project

```bash
cd backend
firebase use
```

**Expected output**: Should show your production project name

**If wrong project**:
```bash
firebase use <your-production-project-id>
```

### 3b. Deploy Firestore Rules Only

```bash
firebase deploy --only firestore:rules
```

**Expected output**:
```
=== Deploying to '<your-project>'...

i  deploying firestore
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!
```

**Deployment takes effect**: Immediately (rules are applied within seconds)

---

## Step 4: Post-Deployment Verification

### 4a. Immediate Health Check (Within 5 minutes)

1. **Open your production application**
2. **Sign in as yourself**
3. **Navigate to Media Library**
4. **Expected**: Your media loads correctly
5. **Upload a new media file**
6. **Expected**: Upload succeeds
7. **Check browser console**
8. **Expected**: No permission denied errors

**If media library is empty or errors appear**:
- Check Firebase Console → Firestore → Data → media collection
- Check browser console for specific error messages
- Proceed to rollback if critical

### 4b. Multi-User Isolation Test (Within 15 minutes)

**You need 2 test accounts for this**:

**As User A**:
1. Sign in to production
2. Upload a test media file
3. Note the file name
4. Sign out

**As User B**:
1. Sign in to production (different account)
2. Navigate to Media Library
3. **CRITICAL CHECK**: Can you see User A's media file?
   - **Expected**: NO - You should only see your own media
   - **If YES**: PROBLEM - Isolation not working, investigate immediately

**As User A** (again):
1. Sign in again
2. Navigate to Media Library
3. **Expected**: Your test file is still there and accessible

### 4c. Monitor Error Logs (Next 1-2 hours)

**Firebase Console → Functions → Logs** (or wherever your logs are):

Watch for:
- ❌ Increased "permission-denied" errors
- ❌ Failed media queries
- ❌ Upload failures

**Normal behavior**:
- Existing media queries work
- New uploads work
- Each user sees only their own media

---

## Step 5: Rollback Procedure (If Needed)

**If anything goes wrong**, you can immediately rollback:

### Quick Rollback

```bash
cd backend

# Use the backup file
cp firestore.rules.backup-YYYYMMDD-HHMMSS firestore.rules

# Redeploy old rules
firebase deploy --only firestore:rules --force
```

**Or restore from git** (if committed):
```bash
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules
```

**Rollback takes effect**: Immediately (within seconds)

---

## Success Criteria

Mark deployment as successful when ALL of these are true:

- [ ] Emulator tests passed (if run)
- [ ] Deployment completed without errors
- [ ] Media library loads for existing users
- [ ] New media uploads work
- [ ] Multi-user isolation verified (User A can't see User B's media)
- [ ] No spike in permission denied errors
- [ ] No user complaints about missing media
- [ ] System operates normally for 24 hours

---

## What the Fix Does

### Before (Vulnerable)
```javascript
// Line 35 - TOO PERMISSIVE
allow read: if isAuthenticated();
```
**Problem**: ANY authenticated user can read ALL media documents

### After (Secure)
```javascript
// Lines 36-39 - PROPERLY RESTRICTED
allow read: if isAuthenticated() && 
  (resource.data.userId == request.auth.uid ||
   resource.data.ownerId == request.auth.uid ||
   resource.data.uploadedBy == request.auth.uid);
```
**Solution**: Users can ONLY read media they own

---

## Technical Notes

### Why This Works

1. **Authentication still required**: `isAuthenticated()`
2. **Ownership verified**: Checks userId, ownerId, or uploadedBy
3. **Backward compatible**: Supports multiple field names
4. **Query compatible**: Works with orderBy when app filters by userId

### Application Code Already Filters

The app (media-library.service.ts, lines 273-276) already filters:
```typescript
let query1 = this.mediaCollection.ref.where('userId', '==', user.uid);
```

**So why the rule change?**
- **Defense in depth**: Rules enforce at database level
- **Prevents bypassing**: Users can't bypass app and query directly
- **Security best practice**: Never rely only on app-level filtering

---

## Contact / Escalation

If you encounter issues:

1. **Check this document first** - Most issues covered here
2. **Check Firebase Console logs** - Look for specific errors
3. **Rollback if critical** - Use procedure above
4. **Document the issue** - Screenshots, error messages
5. **Consult dev team** - Share documentation

---

## Post-Deployment Tasks

After successful deployment:

- [ ] Update `specs/002-specify-scripts-bash/tasks.md` - Mark T012-T016 complete
- [ ] Document deployment date/time
- [ ] Archive deployment logs
- [ ] Schedule 24-hour check-in
- [ ] Update security audit documentation

---

**Deployment prepared by**: AI Assistant  
**Deployment date**: October 21, 2025  
**Deployed by**: [Your name]  
**Deployment time**: [Fill in]  
**Verification completed**: [Fill in]  
**Status**: [Success / Rollback / In Progress]













