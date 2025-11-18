# UX Issues Found - Media Library

**Date**: October 21, 2025  
**Context**: Discovered during security fix verification  
**Status**: Functional but poor user experience

---

## Issue 1: Delete - No Visual Feedback

**Problem**: 
- User clicks delete
- No loading indicator
- Delay before item disappears from UI
- Looks broken/unresponsive

**Expected Behavior**:
- Show loading spinner on delete button
- Immediate optimistic UI update (remove from list)
- Or show toast notification "Deleting..."
- Then confirm "Deleted successfully"

**Location**: 
- Component: `media-library.component.ts` (line ~324)
- Service: `media-library.service.ts`

**Fix Priority**: Medium (functional but confusing)

---

## Issue 2: Upload - No Visual Feedback

**Problem**:
- Modal closes immediately after upload
- Image doesn't appear in library
- Requires page refresh to see uploaded image
- Looks like upload failed

**Expected Behavior**:
- Show upload progress bar in modal
- Keep modal open until upload completes
- Show success message "Upload complete!"
- Close modal and automatically add image to library view
- OR close modal but show toast "Uploading..." → "Upload complete!"

**Location**:
- Component: `media-library.component.ts` / `image-upload-modal.component.ts`
- Service: `media-library.service.ts` (has upload progress subject but not connected to UI)

**Fix Priority**: Medium-High (users think it's broken)

**Note**: The service DOES have upload progress tracking:
```typescript
// Line 55-56
private uploadProgressSubject = new BehaviorSubject<UploadProgress | null>(null);
public uploadProgress$ = this.uploadProgressSubject.asObservable();
```

**Issue**: The UI components aren't subscribing to this observable!

---

## Issue 3: Media Library Not Refreshing After Upload

**Problem**:
- Upload completes successfully
- Media library list doesn't refresh
- Uploaded image doesn't appear
- Requires manual page refresh

**Root Cause**: Likely one of:
1. Component not subscribed to media changes
2. Upload doesn't trigger re-query of media
3. Angular change detection not triggered

**Expected Behavior**:
- After upload completes, automatically refresh media list
- New image appears immediately

**Location**:
- Component: `media-library.component.ts`
- Service: `media-library.service.ts`

**Fix Priority**: Medium (affects perceived reliability)

---

## Recommended Fixes

### Quick Wins (1-2 hours)

**Fix 1: Add Upload Progress to Modal**
```typescript
// In image-upload-modal.component.ts
ngOnInit() {
  this.mediaLibraryService.uploadProgress$.subscribe(progress => {
    if (progress) {
      this.uploadProgress = progress.progress;
      this.uploadState = progress.state;
    }
  });
}
```

**Fix 2: Refresh Media List After Upload**
```typescript
// In media-library.component.ts uploadMedia()
async uploadMedia() {
  await this.mediaLibraryService.uploadMedia(request);
  await this.loadMedia(); // Refresh the list
  this.showSuccessMessage('Media uploaded successfully!');
}
```

**Fix 3: Add Loading State to Delete Button**
```typescript
// In media-library.component.ts
async deleteMedia(mediaId: string) {
  this.deletingMediaId = mediaId; // Show spinner
  try {
    await this.mediaLibraryService.deleteMedia(mediaId);
    this.loadMedia(); // Refresh list
    this.showSuccessMessage('Media deleted successfully!');
  } finally {
    this.deletingMediaId = null;
  }
}
```

### Where These Fit in Implementation Plan

These UX issues should be addressed in:
- **Phase 7: Code Quality Audit** (T069-T081)
- Specifically: Adding loading states, error handling, user feedback

---

## Decision Needed

**What should we do about these?**

**Option A**: Fix them now (1-2 hours, improves UX immediately)  
**Option B**: Document and fix in Phase 7 (Code Audit)  
**Option C**: Create separate tickets for later

---

**Current Status**: Media library is FUNCTIONAL ✅  
**User Experience**: Suboptimal but not broken ⚠️  
**Security**: Fixed ✅












