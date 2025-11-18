# Troubleshooting: Upload and Delete Issues

**Issue**: Media library loads but upload and delete operations fail  
**After**: Security fix deployment (Oct 21, 2025)

---

## 🔍 Step 1: Check Browser Console for Errors

**Do this RIGHT NOW**:

1. **Open browser** with your hungr app
2. **Press F12** to open Developer Tools
3. **Click "Console" tab**
4. **Try to upload** a file
5. **Look for RED error messages**

### What to Look For

**Error Type 1: Permission Denied (Firestore)**
```
FirebaseError: Missing or insufficient permissions
  at media/{docId}
```
**Meaning**: Firestore document rules issue  
**Solution**: See "Fix 1" below

**Error Type 2: Permission Denied (Storage)**
```
FirebaseError: storage/unauthorized
  User does not have permission to access 'media/...'
```
**Meaning**: Storage rules issue  
**Solution**: See "Fix 2" below

**Error Type 3: Missing Field Error**
```
Error: userId is required
Error: Document missing ownership field
```
**Meaning**: App not setting userId when creating  
**Solution**: See "Fix 3" below

**Other Errors**:
- Network errors → Check internet connection
- Size limit → File too large (max 10MB)
- File type → Must be an image

---

## 📋 Step 2: What Exact Error Did You See?

**Copy the error message from console and check below**:

---

## 🔧 Fix 1: Firestore Permission Issue

**If error says**: "Missing or insufficient permissions" on Firestore

**Problem**: The application might not be setting userId field when creating media documents

**Quick Check**:
```bash
# Check what the app is trying to create
# Look in browser console Network tab → Firestore requests
```

**Temporary Fix** (rollback read restriction):
```bash
cd /home/kb/Projects/hungr/backend

# Edit firestore.rules line 36-39
# Change back to:
#   allow read: if isAuthenticated();
# But keep create/delete rules strict

firebase deploy --only firestore:rules
```

---

## 🔧 Fix 2: Storage Permission Issue  

**If error says**: "storage/unauthorized"

**Problem**: Storage path doesn't match rules or userId mismatch

**Check Storage Path**: Should be `media/{userId}/{fileName}`

**Your app might be using**:
- ❌ `media/{fileName}` (missing userId folder)
- ❌ `media/all/{fileName}` (wrong structure)
- ✅ `media/{actual-user-id}/{fileName}` (correct)

**Where to check**: Look at the upload code in media-library.service.ts

**Quick Fix**: Make storage rules more permissive temporarily:
```javascript
// In storage.rules, ADD this before the specific rules:
match /media/{allPaths=**} {
  allow read, write: if isAuthenticated();
}
```

Then redeploy:
```bash
firebase deploy --only storage:rules
```

---

## 🔧 Fix 3: Application Code Issue

**If no Firebase errors but upload still fails**:

**Check**: Is the app code setting userId when creating documents?

**File to check**: `backend/src/app/shared/services/media-library.service.ts`

**Look for upload function** and verify it includes:
```typescript
{
  userId: currentUser.uid,  // ← This MUST be present
  fileName: ...,
  url: ...,
  // ... other fields
}
```

---

## 🚨 Immediate Rollback (If Needed)

**If nothing works and you need media library working NOW**:

```bash
cd /home/kb/Projects/hungr/backend

# Rollback Firestore rules
cp firestore.rules.backup-* firestore.rules
firebase deploy --only firestore:rules

# App should work again (but security vulnerability returns)
```

---

## 📊 Diagnostic Information Needed

**Please provide**:

1. **Exact error message** from browser console:
```
[Paste error here]
```

2. **When does it fail?**
- [ ] On upload (before file is selected)
- [ ] During upload (file uploading)
- [ ] After upload (document creation)
- [ ] On delete (when clicking delete button)

3. **Network tab info**:
- Open DevTools → Network tab
- Try upload
- Look for failed requests (red)
- What endpoint failed? Firestore or Storage?

---

## 🔍 Advanced Diagnostics

### Check Existing Media Documents

1. Go to **Firebase Console**
2. Click **Firestore Database**
3. Navigate to **media collection**
4. Click on one of your media documents
5. **Check fields**:
   - Does it have `userId`?
   - Does it have `ownerId`?
   - Does it have `uploadedBy`?
   - Does the value match your auth.uid?

### Check Auth UID

1. In browser console, type:
```javascript
firebase.auth().currentUser.uid
```
2. **Copy the value**
3. **Compare** with userId in your media documents
4. **Should match exactly**

---

## 🎯 Most Likely Issues

### Issue 1: Read Rules Too Strict (Most Common)

**Symptom**: Can't see media library OR upload fails

**Why**: The read rule change might be affecting queries

**Test**:
```bash
# Temporarily make read more permissive
# Edit firestore.rules line 36 to:
allow read: if isAuthenticated();

# Redeploy
firebase deploy --only firestore:rules

# Try again - does it work now?
```

**If YES**: The issue is with how we restricted read access. Need to adjust the query logic.

### Issue 2: userId Not Set on Creation

**Symptom**: Upload fails with permission error

**Why**: App might not be setting userId when creating document

**Check**: media-library.service.ts upload function

**Fix**: Ensure upload code sets:
```typescript
userId: this.authService.currentUser.uid
```

### Issue 3: Storage Path Mismatch

**Symptom**: File uploads but document creation fails (or vice versa)

**Why**: Storage rules expect `media/{userId}/{fileName}` but app uses different path

**Check**: Storage upload path in code

---

## 💡 Quick Test: Does Delete Work on OLD Media?

**Try this**:
1. Find media that was uploaded BEFORE the security fix
2. Try to delete it
3. **Does it work?**

**If YES**: Problem is with NEW uploads (creation rule issue)  
**If NO**: Problem is with ownership check (delete rule issue)

---

## 📞 What to Do Next

**Please provide**:
1. Exact error from browser console
2. Answer: Can you delete OLD media (uploaded before fix)?
3. Firebase Console: Do your media docs have userId field?

**Then I can**:
- Give you exact fix for the specific issue
- Or provide rollback command if needed
- Or adjust the rules precisely

---

**Current Status**: Investigating upload/delete failure  
**Security Fix**: Still active (may need adjustment)  
**Action**: Gather diagnostic info above












