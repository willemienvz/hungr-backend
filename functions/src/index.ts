import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { reviews } from './reviews';
import { backfill } from './backfill';
import { payfastItn } from './payfastItn';
import { sendCustomEmailVerification, sendEmailWithTemplate } from './emailTemplates';

// Initialize Firebase Admin SDK once
try { admin.app(); } catch { admin.initializeApp(); }

export const testEmailFunction = functions.https.onRequest((req, res) => {
  res.send('✔️ Function deployed and working!');
});

// Export review functions
export const createReview = reviews.createReview;
export const getReviews = reviews.getReviews;
export const updateReview = reviews.updateReview;
export const deleteReview = reviews.deleteReview;

// Optional callable to backfill analytics aggregates by date range
export const backfillAnalytics = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    // Simple admin check: require custom claim or list membership as needed
    const uid = context.auth.uid;
    const user = await admin.auth().getUser(uid);
    const isAdmin = user.customClaims && (user.customClaims['admin'] === true);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const startDate = data?.startDate as string | undefined; // 'YYYY-MM-DD'
    const endDate = data?.endDate as string | undefined;     // 'YYYY-MM-DD'
    const dryRun = Boolean(data?.dryRun);
    const result = await backfill.runBackfill({ startDate, endDate, dryRun });
    return result;
  });

// Export PayFast ITN handler
export { payfastItn };

// Export email template functions
export { sendCustomEmailVerification, sendEmailWithTemplate };

// Export subscription management functions
export { pauseSubscription } from './pauseSubscription';
export { cancelSubscription } from './cancelSubscription';
export { unpauseSubscription } from './unpauseSubscription';
export { updateSubscription } from './updateSubscription';
export { getSubscriptionDetails } from './getSubscriptionDetails';
export { getPaymentHistory } from './getPaymentHistory';

