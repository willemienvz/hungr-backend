import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateApiSignature, getSubscriptionToken, getPayFastConfig, formatPayFastTimestamp } from './payfast';
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
      if (tokenError?.code === 'failed-precondition' || tokenError?.code === 'not-found') {
        console.log(`No subscription token found for user ${userId}:`, tokenError.message);
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
      // Log and re-throw other errors
      console.error(`Error getting subscription token for user ${userId}:`, tokenError);
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
    
    // If no subscription found by userId, try by email as fallback
    if (subscriptionQuery.empty) {
      console.log(`No subscription found by userId ${userId}, trying email fallback`);
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userEmail = userDoc.data()?.email;
          if (userEmail) {
            const emailQuery = await db.collection('subscriptions')
              .where('email', '==', userEmail)
              .limit(10)
              .get();
            
            if (!emailQuery.empty) {
              // Sort by updated_at manually
              const sorted = emailQuery.docs.sort((a, b) => {
                const aTime = a.data().updated_at?.toMillis?.() || 0;
                const bTime = b.data().updated_at?.toMillis?.() || 0;
                return bTime - aTime;
              });
              subscriptionDoc = sorted[0];
              subscriptionId = subscriptionDoc.id;
              
              // Update subscription to add userId if missing
              const subData = subscriptionDoc.data();
              if (!subData.userId) {
                try {
                  await subscriptionDoc.ref.update({ userId: userId });
                  console.log(`Updated subscription ${subscriptionId} with userId ${userId}`);
                } catch (updateError) {
                  console.warn(`Failed to update subscription with userId:`, updateError);
                }
              }
            }
          }
        }
      } catch (emailQueryError) {
        console.warn('Failed to query subscriptions by email:', emailQueryError);
      }
    } else {
      subscriptionDoc = subscriptionQuery.docs[0];
      subscriptionId = subscriptionDoc.id;
    }

    // Get PayFast configuration
    const payfastConfig = getPayFastConfig();
    const endpoint = `/subscriptions/${token}/fetch`;
    const timestamp = formatPayFastTimestamp();

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
      try {
        const apiUrl = payfastConfig.getApiUrl(endpoint);
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            ...headers,
            'signature': signature,
            'Content-Type': 'application/json'
          }
        });

        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error(`Failed to parse PayFast response as JSON. Status: ${response.status}, Body: ${text}`);
          throw new Error(`Invalid JSON response from PayFast API: ${response.status} ${response.statusText}`);
        }

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
      } catch (fetchError: any) {
        console.error(`PayFast API call failed:`, fetchError);
        throw fetchError;
      }
    };

    let result;
    try {
      const apiResult = await retryWithBackoff(apiCall);
      result = apiResult.result;
    } catch (apiError: any) {
      console.error(`Failed to fetch subscription details from PayFast after retries:`, apiError);
      // If PayFast API fails, return data from Firestore only
      if (subscriptionDoc) {
        const subData = subscriptionDoc.data();
        // Normalize status from Firestore
        const firestoreStatus = subData?.status 
          ? String(subData.status).toLowerCase() 
          : 'unknown';
        
        // Normalize amount from Firestore - if > 1000, assume cents and convert to rands
        const firestoreAmount = subData?.recurringAmount || subData?.amount || 0;
        const normalizedAmount = firestoreAmount > 1000 ? firestoreAmount / 100 : firestoreAmount;
        
        return {
          success: true,
          message: 'Subscription details retrieved from Firestore (PayFast API unavailable).',
          data: {
            token: token,
            status: firestoreStatus,
            amount: normalizedAmount,
            frequency: subData?.frequency || '3',
            cycles: subData?.cycles || '0',
            run_date: subData?.billingDate || null,
            nextBillingDate: subData?.nextBillingDate?.toDate ? 
                             subData.nextBillingDate.toDate().toISOString() : 
                             subData?.nextBillingDate || null,
            subscriptionId: subscriptionId,
            plan: subData?.plan || 'monthly',
            startDate: subData?.startDate?.toDate ? 
                      subData.startDate.toDate().toISOString() : 
                      subData?.startDate || null,
            pausedAt: subData?.pausedAt?.toDate ? 
                      subData.pausedAt.toDate().toISOString() : 
                      subData?.pausedAt || null,
            cancelledAt: subData?.cancelledAt?.toDate ? 
                         subData.cancelledAt.toDate().toISOString() : 
                         subData?.cancelledAt || null,
          }
        };
      }
      throw new functions.https.HttpsError('internal', `Failed to fetch subscription details: ${apiError.message}`);
    }

    // Extract subscription details from PayFast response
    const payfastData = result.data?.response || {};
    
    // Normalize status - PayFast might return number (1 = active) or string
    let normalizedStatus = 'unknown';
    if (payfastData.status !== undefined && payfastData.status !== null) {
      if (typeof payfastData.status === 'number') {
        normalizedStatus = payfastData.status === 1 ? 'active' : String(payfastData.status);
      } else {
        normalizedStatus = String(payfastData.status).toLowerCase();
      }
    } else if (subscriptionDoc?.data()?.status) {
      normalizedStatus = String(subscriptionDoc.data().status).toLowerCase();
    }
    
    // Normalize amount - PayFast returns in rands (999 = R999.00), but might be string "999.00"
    // Firestore might have it in cents (99900) or rands (999)
    let normalizedAmount = 0;
    if (payfastData.amount !== undefined && payfastData.amount !== null) {
      normalizedAmount = typeof payfastData.amount === 'string' 
        ? parseFloat(payfastData.amount) 
        : payfastData.amount;
    } else {
      const firestoreAmount = subscriptionDoc?.data()?.recurringAmount || subscriptionDoc?.data()?.amount || 0;
      // If amount is > 1000, assume it's in cents and convert to rands
      normalizedAmount = firestoreAmount > 1000 ? firestoreAmount / 100 : firestoreAmount;
    }
    
    // Combine PayFast data with Firestore data for complete subscription info
    const subscriptionDetails = {
      // From PayFast API
      token: token,
      status: normalizedStatus,
      amount: normalizedAmount,
      frequency: payfastData.frequency || subscriptionDoc?.data()?.frequency || '3',
      cycles: payfastData.cycles || subscriptionDoc?.data()?.cycles || '0',
      run_date: payfastData.run_date || subscriptionDoc?.data()?.billingDate || null,
      nextBillingDate: payfastData.run_date ? new Date(payfastData.run_date).toISOString() : 
                       (subscriptionDoc?.data()?.nextBillingDate?.toDate ? 
                        subscriptionDoc?.data()?.nextBillingDate.toDate().toISOString() : 
                        subscriptionDoc?.data()?.nextBillingDate || null),
      // From Firestore (additional metadata)
      subscriptionId: subscriptionId,
      plan: subscriptionDoc?.data()?.plan || 'monthly',
      startDate: subscriptionDoc?.data()?.startDate?.toDate ? 
                 subscriptionDoc?.data()?.startDate.toDate().toISOString() : 
                 subscriptionDoc?.data()?.startDate || null,
      pausedAt: subscriptionDoc?.data()?.pausedAt?.toDate ? 
                subscriptionDoc?.data()?.pausedAt.toDate().toISOString() : 
                subscriptionDoc?.data()?.pausedAt || null,
      cancelledAt: subscriptionDoc?.data()?.cancelledAt?.toDate ? 
                   subscriptionDoc?.data()?.cancelledAt.toDate().toISOString() : 
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
    
    // Log failed action (try to get subscriptionId, but don't fail if query fails)
    let subscriptionId = 'unknown';
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userEmail = userDoc.data()?.email;
        if (userEmail) {
          // Try by email first (in case subscription doesn't have userId)
          const emailQuery = await db.collection('subscriptions')
            .where('email', '==', userEmail)
            .limit(1)
            .get();
          if (!emailQuery.empty) {
            subscriptionId = emailQuery.docs[0].id;
          } else {
            // Try by userId
            const userIdQuery = await db.collection('subscriptions')
              .where('userId', '==', userId)
              .limit(1)
              .get();
            if (!userIdQuery.empty) {
              subscriptionId = userIdQuery.docs[0].id;
            }
          }
        }
      }
    } catch (queryError) {
      console.warn('Failed to get subscriptionId for logging:', queryError);
    }
    
    try {
      await logSubscriptionAction(db, 'fetch', userId, subscriptionId, 'failure', error.message);
    } catch (logError) {
      console.error('Failed to log subscription action:', logError);
    }

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred while fetching subscription details.');
  }
});

