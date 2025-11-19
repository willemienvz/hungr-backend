import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateApiSignature, getSubscriptionToken, getPayFastConfig } from './payfast';
import { retryWithBackoff, logSubscriptionAction } from './subscriptionUtils';

export const getSubscriptionDetails = functions.https.onCall(async (data, context) => {
  // Authenticate user
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();

  try {
    // Get subscription token - handle case where user has no subscription
    let token: string;
    try {
      token = await getSubscriptionToken(userId, db);
    } catch (tokenError: any) {
      // If token not found, return a response indicating no subscription
      if (tokenError?.code === 'failed-precondition') {
        console.log(`No subscription token found for user ${userId}`);
        return {
          success: false,
          message: 'No active subscription found.',
          data: null,
          error: {
            code: 'no-subscription',
            message: 'You do not have an active subscription. Please subscribe to access this feature.'
          }
        };
      }
      // Re-throw other errors
      throw tokenError;
    }
    
    // Get subscription document from Firestore (for fallback data)
    // Try with orderBy first, but fallback to simple query if index not ready
    let subscriptionQuery;
    try {
      subscriptionQuery = await db.collection('subscriptions')
        .where('userId', '==', userId)
        .orderBy('updated_at', 'desc')
        .limit(1)
        .get();
    } catch (indexError: any) {
      // If index error, try without orderBy
      if (indexError.code === 9 || indexError.message?.includes('index')) {
        console.log('Index not ready, using simple query');
        subscriptionQuery = await db.collection('subscriptions')
          .where('userId', '==', userId)
          .limit(10)
          .get();
        
        // Sort manually by updated_at if available
        const docs = subscriptionQuery.docs.sort((a, b) => {
          const aTime = a.data().updated_at?.toMillis?.() || 0;
          const bTime = b.data().updated_at?.toMillis?.() || 0;
          return bTime - aTime;
        });
        subscriptionQuery = {
          empty: docs.length === 0,
          docs: docs.slice(0, 1)
        } as any;
      } else {
        throw indexError;
      }
    }
    
    let subscriptionDoc = null;
    let subscriptionId = 'unknown';
    
    if (!subscriptionQuery.empty) {
      subscriptionDoc = subscriptionQuery.docs[0];
      subscriptionId = subscriptionDoc.id;
    }

    // Get PayFast configuration
    const payfastConfig = getPayFastConfig();
    const endpoint = `/subscriptions/${token}/fetch`;
    const timestamp = new Date().toISOString();

    // Prepare headers (no body for fetch)
    const headers = {
      'merchant-id': payfastConfig.merchantId,
      'version': 'v1',
      'timestamp': timestamp,
    };

    // Generate signature (headers only, no body)
    const signatureData = { ...headers, passphrase: payfastConfig.passphrase };
    const signature = generateApiSignature(signatureData, payfastConfig.passphrase);

    // Make API call to PayFast with retry
    const apiCall = async () => {
      const response = await fetch(`${payfastConfig.apiHost}${endpoint}`, {
        method: 'GET',
        headers: {
          ...headers,
          'signature': signature,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      // PayFast API returns { data: { response: {...}, message: "..." } } on success
      // or { data: { message: "error message" } } on error
      if (!response.ok) {
        throw new Error(result.data?.message || `PayFast API error: ${response.status} ${response.statusText}`);
      }

      // Check for PayFast error response structure
      if (result.data && result.data.message && !result.data.response) {
        throw new Error(result.data.message || 'Failed to fetch subscription details.');
      }

      return { response, result };
    };

    const { result } = await retryWithBackoff(apiCall);

    // Extract subscription details from PayFast response
    const payfastData = result.data?.response || {};
    
    // Combine PayFast data with Firestore data for complete subscription info
    const subscriptionDetails = {
      // From PayFast API
      token: token,
      status: payfastData.status || subscriptionDoc?.data()?.status || 'unknown',
      amount: payfastData.amount || subscriptionDoc?.data()?.recurringAmount || subscriptionDoc?.data()?.amount || 0,
      frequency: payfastData.frequency || subscriptionDoc?.data()?.frequency || '3',
      cycles: payfastData.cycles || subscriptionDoc?.data()?.cycles || '0',
      run_date: payfastData.run_date || subscriptionDoc?.data()?.billingDate || null,
      nextBillingDate: payfastData.run_date ? new Date(payfastData.run_date).toISOString() : 
                       (subscriptionDoc?.data()?.nextBillingDate?.toDate ? 
                        subscriptionDoc.data().nextBillingDate.toDate().toISOString() : 
                        subscriptionDoc?.data()?.nextBillingDate || null),
      // From Firestore (additional metadata)
      subscriptionId: subscriptionId,
      plan: subscriptionDoc?.data()?.plan || 'monthly',
      startDate: subscriptionDoc?.data()?.startDate?.toDate ? 
                 subscriptionDoc.data().startDate.toDate().toISOString() : 
                 subscriptionDoc?.data()?.startDate || null,
      pausedAt: subscriptionDoc?.data()?.pausedAt?.toDate ? 
                subscriptionDoc.data().pausedAt.toDate().toISOString() : 
                subscriptionDoc?.data()?.pausedAt || null,
      cancelledAt: subscriptionDoc?.data()?.cancelledAt?.toDate ? 
                   subscriptionDoc.data().cancelledAt.toDate().toISOString() : 
                   subscriptionDoc?.data()?.cancelledAt || null,
    };

    // Log successful action
    await logSubscriptionAction(db, 'fetch', userId, subscriptionId, 'success');

    return {
      success: true,
      message: 'Subscription details retrieved successfully.',
      data: subscriptionDetails
    };
  } catch (error: any) {
    console.error('Error fetching subscription details:', error);
    
    // Log failed action
    const subscriptionId = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get()
      .then(snap => snap.empty ? 'unknown' : snap.docs[0].id)
      .catch(() => 'unknown');
    
    await logSubscriptionAction(db, 'fetch', userId, subscriptionId, 'failure', error.message);

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred while fetching subscription details.');
  }
});

