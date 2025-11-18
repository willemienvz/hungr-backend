# Media Ownership Field Strategy

**Date**: October 21, 2025  
**Purpose**: Document media ownership field conventions and migration strategy  
**Context**: Security fix requires proper owner identification on all media documents

---

## Owner Field Conventions

### Current Standard (Preferred)

**Field Name**: `userId`  
**Type**: `string`  
**Value**: Firebase Auth UID of the user who owns the media  
**Example**: `"2FMAvf5t4jYSppoc6nUMrhYTCg53"`

**Usage**:
```typescript
// When creating media documents
{
  id: mediaId,
  userId: currentUser.uid,  // ← Preferred field
  fileName: '...',
  url: '...',
  // ... other fields
}
```

---

### Legacy Field Names (Supported for Backward Compatibility)

#### 1. uploadedBy (Legacy)
**Field Name**: `uploadedBy`  
**Type**: `string`  
**Usage**: Older media documents  
**Status**: Still supported in security rules

#### 2. ownerId (Alternate)
**Field Name**: `ownerId`  
**Type**: `string`  
**Usage**: Some documents use this instead  
**Status**: Supported in security rules

---

## Security Rules Implementation

### Multi-Field Support

The Firestore security rules check **all three possible field names**:

```javascript
// Read permission
allow read: if isAuthenticated() && 
  (resource.data.userId == request.auth.uid ||      // Preferred
   resource.data.ownerId == request.auth.uid ||     // Alternate
   resource.data.uploadedBy == request.auth.uid);   // Legacy
```

**Why**: Ensures all existing documents remain accessible regardless of which field name they use.

---

## Application Code Standards

### For New Media Documents

**Always use `userId` field** when creating new media:

```typescript
// CORRECT ✅
const mediaDoc = {
  userId: currentUser.uid,  // Use userId
  // ... other fields
};

// AVOID ❌
const mediaDoc = {
  uploadedBy: currentUser.uid,  // Don't use legacy field
  // ... other fields
};
```

**Location**: `media-library.service.ts` line ~190

### For Queries

**Filter by userId in queries** (defense in depth):

```typescript
// CORRECT ✅ - App-level filtering
const query = this.mediaCollection.ref
  .where('userId', '==', currentUser.uid)
  .orderBy('uploadedAt', 'desc');

// AVOID ❌ - No filtering (relies only on rules)
const query = this.mediaCollection.ref
  .orderBy('uploadedAt', 'desc');  // Security risk if rules fail
```

**Location**: `media-library.service.ts` line ~273

**Why**: Defense in depth - filter at both application AND database level

---

## Migration Strategy

### For Existing Documents

**Current State**:
- Some documents have `userId` field
- Some have `ownerId` field  
- Some have `uploadedBy` field (legacy)
- Some may have multiple fields

**Strategy**: **No migration needed** ✅

**Reason**: Security rules support all three field names, so existing documents work as-is.

### Future Consideration

**Optional**: Standardize all documents to use `userId`

**Migration Script** (if needed):
```typescript
// Run this in Firebase Console or Cloud Function
const batch = db.batch();
const snapshot = await db.collection('media').get();

snapshot.forEach(doc => {
  const data = doc.data();
  
  // If doesn't have userId but has uploadedBy
  if (!data.userId && data.uploadedBy) {
    batch.update(doc.ref, {
      userId: data.uploadedBy  // Copy to preferred field
    });
  }
  
  // If doesn't have userId but has ownerId
  if (!data.userId && data.ownerId) {
    batch.update(doc.ref, {
      userId: data.ownerId  // Copy to preferred field
    });
  }
});

await batch.commit();
```

**When to run**: Only if you want to standardize (not required for security)

---

## Storage Path Convention

### Current Standard

**Path Structure**: `media/{userId}/{fileName}`

**Example**: `media/2FMAvf5t4jYSppoc6nUMrhYTCg53/file-123.jpg`

**Security Rules**: Storage rules verify that `{userId}` matches `request.auth.uid`

```javascript
match /media/{userId}/{fileName} {
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow delete: if isAuthenticated() && request.auth.uid == userId;
  allow write: if isAuthenticated() && 
    request.auth.uid == userId &&
    request.resource.size < 10 * 1024 * 1024;
}
```

**Why this structure**: Enables per-user isolation at storage level

---

## Code Review Checklist

When creating/modifying media-related code, verify:

### Media Creation
- [ ] Sets `userId` field (not `uploadedBy` or `ownerId`)
- [ ] Uses `currentUser.uid` for userId value
- [ ] Stores file in `media/{userId}/{fileName}` path

### Media Queries
- [ ] Filters by `userId` in query (defense in depth)
- [ ] Example: `.where('userId', '==', currentUser.uid)`
- [ ] Doesn't rely solely on security rules for filtering

### Media Updates
- [ ] Doesn't change ownership fields
- [ ] Preserves userId/ownerId/uploadedBy

### Media Deletion
- [ ] Deletes from both Firestore AND Storage
- [ ] Cleans up usage tracking records

---

## Security Best Practices

### 1. Defense in Depth

**Always filter at multiple levels**:
- ✅ Application code filters by userId
- ✅ Firestore rules enforce ownership
- ✅ Storage rules enforce user folders

**Never rely on only one layer**

### 2. Fail Secure

**If authentication fails**:
- Deny access (don't default to public)
- Log the attempt
- Return appropriate error to user

### 3. Least Privilege

**Users can only**:
- Read their own media
- Create media in their own name
- Update/delete their own media

**Users cannot**:
- Read other users' media
- Create media for other users
- Modify other users' media

### 4. Audit Trail

**Log security events**:
- Failed permission attempts
- Unusual access patterns
- Bulk operations

**Retention**: Per compliance requirements

---

## Testing Guidelines

### Before Deploying Rule Changes

1. ✅ Compile rules locally (`firebase emulators:start`)
2. ✅ Test in emulator with test data
3. ⏳ Verify multi-user isolation
4. ✅ Deploy to staging first (if available)
5. ✅ Monitor for errors after deployment

### After Deploying Rule Changes

1. ✅ Verify basic functionality (load, upload, delete)
2. ⏳ Test multi-user scenarios
3. ⏳ Monitor error logs for 24 hours
4. ⏳ Check user feedback

---

## Compliance Considerations

### Data Privacy

**GDPR/CCPA Requirements**:
- ✅ Users can only access their own data
- ✅ Access controls enforced at database level
- ✅ Audit trail available in Firebase logs

### Right to Deletion

**User data deletion**:
- Must delete from Firestore AND Storage
- Must clean up usage tracking
- Must remove from all references

**Implementation**: `media-library.service.ts` deleteMedia() method

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Permission denied" on media upload
- **Cause**: userId not set when creating document
- **Fix**: Ensure `userId: currentUser.uid` in document

**Issue**: "Media library is empty"
- **Cause**: Documents missing all owner fields
- **Fix**: Run audit script, add userId to documents

**Issue**: "Cannot delete media"
- **Cause**: Storage rules too restrictive
- **Fix**: Already fixed (separate delete rule)

### Debug Tools

**Audit Script**: `backend/scripts/audit-media-ownership.ts`
```bash
ts-node scripts/audit-media-ownership.ts
```

**Check Document in Console**:
1. Firebase Console → Firestore → media collection
2. Click a document
3. Verify userId/ownerId/uploadedBy field exists
4. Verify value matches user's auth.uid

---

## References

- **Security Contract**: `/specs/002-specify-scripts-bash/contracts/security.contract.js`
- **Audit Results**: `backend/SECURITY-AUDIT-RESULTS.md`
- **Vulnerability Analysis**: `backend/SECURITY-VULNERABILITY-ANALYSIS.md`
- **Deployment Log**: `backend/deployment-log.txt`

---

**Document Version**: 1.0  
**Last Updated**: October 21, 2025  
**Maintained By**: Development Team












