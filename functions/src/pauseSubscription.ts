import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateApiSignature, getSubscriptionToken, getPayFastConfig } from './payfast';
import { retryWithBackoff, logSubscriptionAction, DatabaseRollback } from './subscriptionUtils';

export const pauseSubscription = functions.https.onCall(async (data, context) => {
  // Authenticate user
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const userId = context.auth.uid;
  const cyclesToPause = data.cycles || 1;
  const db = admin.firestore();
  const rollback = new DatabaseRollback(db);

  try {
    // Get subscription token
    const token = await getSubscriptionToken(userId, db);
    
    // Get subscription document
    const subscriptionQuery = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (subscriptionQuery.empty) {
      throw new functions.https.HttpsError('not-found', 'No active subscription found.');
    }
    
    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscriptionId = subscriptionDoc.id;
    const userRef = db.collection('users').doc(userId);

    // Store current states for rollback
    await rollback.storeState(subscriptionDoc.ref);
    await rollback.storeState(userRef);

    // Get PayFast configuration
    const payfastConfig = getPayFastConfig();
    const endpoint = `/subscriptions/${token}/pause`;
    const timestamp = new Date().toISOString();

    // Prepare headers
    const headers = {
      'merchant-id': payfastConfig.merchantId,
      'version': 'v1',
      'timestamp': timestamp,
    };

    // Prepare body
    const body = { cycles: cyclesToPause };

    // Generate signature (alphabetical sort)
    const signatureData = { ...headers, ...body, passphrase: payfastConfig.passphrase };
    const signature = generateApiSignature(signatureData, payfastConfig.passphrase);

    // Make API call to PayFast with retry
    const apiCall = async () => {
      const response = await fetch(`${payfastConfig.apiHost}${endpoint}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'signature': signature,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      // PayFast API returns { data: { response: {...}, message: "..." } } on success
      // or { data: { message: "error message" } } on error
      if (!response.ok) {
        throw new Error(result.data?.message || `PayFast API error: ${response.status} ${response.statusText}`);
      }

      // Check for PayFast error response structure
      if (result.data && result.data.message && !result.data.response) {
        throw new Error(result.data.message || 'Failed to pause subscription.');
      }

      return { response, result };
    };

    await retryWithBackoff(apiCall);

    // Update Firestore
    const batch = db.batch();
    
    // Update subscriptions collection
    batch.update(subscriptionDoc.ref, {
      status: 'paused',
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update users collection
    batch.update(userRef, {
      subscriptionStatus: 'paused',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Clear rollback states on success
    rollback.clear();

    // Log successful action
    await logSubscriptionAction(db, 'pause', userId, subscriptionId, 'success', undefined, {
      cycles: cyclesToPause
    });

    return {
      success: true,
      message: 'Subscription paused successfully.',
      data: {
        subscriptionId,
        status: 'paused' as const,
        pausedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    
    // Attempt rollback on failure
    try {
      await rollback.rollback();
      console.log('Database rolled back successfully');
    } catch (rollbackError) {
      console.error('Failed to rollback database changes:', rollbackError);
    }

    // Log failed action
    const subscriptionId = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get()
      .then(snap => snap.empty ? 'unknown' : snap.docs[0].id)
      .catch(() => 'unknown');
    
    await logSubscriptionAction(db, 'pause', userId, subscriptionId, 'failure', error.message);

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred while pausing subscription.');
  }
});

