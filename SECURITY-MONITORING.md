# Security Monitoring - Media Library

**Purpose**: Monitor media library security and detect anomalous access patterns  
**Created**: October 21, 2025  
**Context**: Post-security-fix monitoring strategy

---

## Monitoring Strategy

### Firebase Console Monitoring (Built-in)

**Location**: https://console.firebase.google.com/project/hungr-firebase

#### 1. Firestore Usage Tab

**Navigate to**: Firestore Database → Usage

**Monitor**:
- **Read operations**: Should be steady, not spiking
- **Write operations**: Correlates with user uploads/deletes
- **Permission denied errors**: Should be near-zero

**Alert Threshold**:
- 🟢 Green: < 5 permission denied/hour
- 🟡 Yellow: 5-20 permission denied/hour
- 🔴 Red: > 20 permission denied/hour (investigate immediately)

#### 2. Storage Usage Tab

**Navigate to**: Storage → Usage

**Monitor**:
- **Download operations**: User media access
- **Upload operations**: New media files
- **Delete operations**: Media removal

**Normal Patterns**:
- Uploads/deletes relatively rare
- Downloads more frequent (viewing media)

---

## Error Patterns to Watch For

### Pattern 1: Permission Denied Spike

**Indicator**: Sudden increase in `PERMISSION_DENIED` errors

**Possible Causes**:
1. Media documents missing userId field (legacy data)
2. Application code not setting userId on create
3. User attempting to access another user's media (expected, not alarming)

**Action**:
- Check Firebase Console logs for specific error messages
- Run audit script: `ts-node scripts/audit-media-ownership.ts`
- Review recent code changes

---

### Pattern 2: Failed Uploads

**Indicator**: Users reporting upload failures, no media created

**Possible Causes**:
1. Create permission too restrictive
2. Application not setting userId correctly
3. Storage size/type restrictions

**Action**:
- Check browser console for specific errors
- Verify application sets userId on document creation
- Check Storage rules for restrictions

---

### Pattern 3: Failed Deletes

**Indicator**: Users reporting delete doesn't work

**Possible Causes**:
1. Delete permission issue
2. Orphaned storage files
3. Usage tracking issues

**Action**:
- Check if Firestore doc deleted but Storage file remains
- Verify delete permission syntax
- Check media_usage collection cleanup

---

## Firebase Logs Analysis

### View Logs

**Firebase Console** → **Functions** (if using Cloud Functions) → **Logs**  
Or **Firestore** → **Rules** → **View logs**

### What to Look For

**Permission Denied Errors**:
```
Error: Permission denied at /media/{docId}
```

**Frequency Analysis**:
- Occasional denials: Normal (users might try to access shared links)
- Constant denials: Problem (investigate)

**User Patterns**:
- Same user getting many denials: Possible attack attempt
- Different users occasional denials: Normal security enforcement

---

## Application-Level Monitoring

### Client-Side Error Tracking (If Implemented)

**Recommended**: Integrate error tracking service (Sentry, LogRocket, etc.)

**Track**:
- Firebase permission errors
- Upload failures
- Delete failures
- Media loading issues

**Example Integration**:
```typescript
// In media-library.service.ts
try {
  await this.uploadMedia(request);
} catch (error) {
  // Log to monitoring service
  errorTracker.captureException(error, {
    context: 'media-upload',
    userId: currentUser.uid,
    mediaId: request.id
  });
  throw error;
}
```

---

## Automated Alerts (Future Enhancement)

### Firebase Cloud Functions (Optional)

**Create function to monitor Firestore usage**:

```typescript
// functions/src/monitoring.ts
export const monitorMediaAccess = functions.firestore
  .document('media/{mediaId}')
  .onWrite(async (change, context) => {
    // Log access patterns
    const before = change.before.data();
    const after = change.after.data();
    
    // Alert on suspicious activity
    if (unusualPattern(before, after)) {
      await sendAlert('Unusual media access pattern detected');
    }
  });
```

**Alerts for**:
- Bulk deletions (> 10 in short time)
- Access attempts on non-existent documents
- Repeated permission denials

---

## Manual Monitoring Schedule

### Daily (First Week After Deployment)

**Time**: 5 minutes/day

**Check**:
- Firebase Console → Firestore → Usage
- Look for error rate spikes
- Verify normal operation

**Report**: Log any anomalies

### Weekly (Ongoing)

**Time**: 10 minutes/week

**Check**:
- Review error logs for patterns
- Check storage usage growth
- Verify no security incidents reported

**Report**: Weekly status update

### Monthly (Audit)

**Time**: 30 minutes/month

**Activities**:
- Run ownership audit script
- Review security rules for needed updates
- Check compliance with privacy regulations
- Update documentation if needed

---

## Incident Response Plan

### If Permission Denied Spike Detected

**Immediate (< 5 minutes)**:
1. Check Firebase Console logs for specific errors
2. Identify affected users/documents
3. Determine if widespread or isolated

**Short-term (< 30 minutes)**:
1. Run audit script to check document health
2. Review recent deployments/code changes
3. Check if application code changed

**Resolution**:
- If isolated: Help specific user
- If widespread: Consider rules adjustment or rollback
- Document incident and resolution

### If Security Breach Suspected

**Immediate**:
1. Check Firestore audit logs
2. Identify compromised accounts
3. Review access patterns

**Containment**:
1. Revoke compromised user sessions
2. Review and tighten rules if needed
3. Notify affected users (if data accessed)

**Recovery**:
1. Patch vulnerability
2. Audit all media access
3. Update security documentation

---

## Metrics to Track

### Security Metrics

**Daily**:
- Permission denied count
- Failed upload attempts
- Failed delete attempts

**Weekly**:
- Total media documents
- Documents per user (average)
- Storage usage per user

**Monthly**:
- Security incidents
- Rule change history
- Compliance audit results

### Performance Metrics

**Track Correlation**:
- Are security rules affecting query performance?
- Any degradation in media library load times?
- Storage access times reasonable?

**Baseline**:
- Media library load: < 2 seconds
- Upload: < 5 seconds for 1MB file
- Delete: < 1 second

---

## Firebase Console Quick Links

**Your Project**: `hungr-firebase`

**Key Pages**:
- Firestore Usage: https://console.firebase.google.com/project/hungr-firebase/firestore/usage
- Storage Usage: https://console.firebase.google.com/project/hungr-firebase/storage
- Authentication: https://console.firebase.google.com/project/hungr-firebase/authentication/users
- Firestore Data: https://console.firebase.google.com/project/hungr-firebase/firestore/data

---

## Tools Available

### Audit Script

**File**: `backend/scripts/audit-media-ownership.ts`

**Purpose**: Check all media documents for owner fields

**Usage**:
```bash
cd backend
ts-node scripts/audit-media-ownership.ts
```

**Output**: Report showing which documents have which owner fields

**When to Run**:
- After major deployments
- If permission errors increase
- Monthly audit
- Before rule changes

---

### Backup Files

**Location**: `backend/firestore.rules.backup-*`

**Purpose**: Quick rollback if issues detected

**Usage**:
```bash
cd backend
ls firestore.rules.backup-*
cp firestore.rules.backup-YYYYMMDD-HHMMSS firestore.rules
firebase deploy --only firestore:rules
```

---

## Success Indicators

### Good Health Signs ✅

- Permission denied errors < 5/hour
- Media uploads succeed > 95%
- Media deletes succeed > 95%
- No user complaints
- Normal storage growth
- Query performance unchanged

### Warning Signs ⚠️

- Permission denied errors 5-20/hour
- Occasional upload/delete failures
- Specific users reporting issues
- Unusual access patterns

### Critical Issues 🚨

- Permission denied errors > 20/hour
- Widespread upload/delete failures
- Multiple users reporting missing media
- Suspected unauthorized access
- Data privacy breach

---

## Contact Information

### For Security Incidents

**Primary**: Development Team Lead  
**Escalation**: Security Team  
**Emergency**: On-call engineer

### For Questions

**Technical**: Development Team  
**Compliance**: Legal/Compliance Team  
**User Support**: Support Team

---

## Appendix: Monitoring Queries

### Check Recent Permission Errors

**Firebase Console** → **Firestore** → **Indexes** → **Composite Indexes**

Look for failed query patterns.

### Check Media Growth Rate

**Firebase Console** → **Storage** → **Files**

Monitor: `media/` folder size over time

**Normal**: Steady growth correlating with user activity  
**Abnormal**: Sudden spikes or unexpected growth

---

**Monitoring Plan**: ACTIVE  
**Review Date**: 24 hours post-deployment (Oct 22, 2025)  
**Next Audit**: Weekly spot checks












