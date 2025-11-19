import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateApiSignature, getSubscriptionToken, getPayFastConfig } from './payfast';
import { retryWithBackoff, logSubscriptionAction, DatabaseRollback } from './subscriptionUtils';

export const updateSubscription = functions.https.onCall(async (data, context) => {
  // Authenticate user
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const userId = context.auth.uid;
  const db = admin.firestore();
  const rollback = new DatabaseRollback(db);

  try {
    // Validate that at least one field is provided
    const { amount, frequency, cycles, run_date } = data;
    if (!amount && !frequency && !cycles && !run_date) {
      throw new functions.https.HttpsError('invalid-argument', 'At least one field must be provided for update (amount, frequency, cycles, or run_date).');
    }

    // Get subscription token
    const token = await getSubscriptionToken(userId, db);
    
    // Get subscription document (must be active)
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
    const subscriptionData = subscriptionDoc.data();
    const userRef = db.collection('users').doc(userId);

    // Store current states for rollback
    await rollback.storeState(subscriptionDoc.ref);
    await rollback.storeState(userRef);

    // Get PayFast configuration
    const payfastConfig = getPayFastConfig();
    const endpoint = `/subscriptions/${token}/update`;
    const timestamp = new Date().toISOString();

    // Prepare headers
    const headers = {
      'merchant-id': payfastConfig.merchantId,
      'version': 'v1',
      'timestamp': timestamp,
    };

    // Prepare body (only include provided fields)
    const body: any = {};
    const updatedFields: string[] = [];

    if (amount !== undefined && amount !== null) {
      body.amount = amount; // Amount in cents
      updatedFields.push('amount');
    }
    if (frequency !== undefined && frequency !== null) {
      body.frequency = frequency; // 3 = Monthly, 4 = Quarterly, 5 = Bi-Annual, 6 = Annual
      updatedFields.push('frequency');
    }
    if (cycles !== undefined && cycles !== null) {
      body.cycles = cycles; // Total remaining cycles
      updatedFields.push('cycles');
    }
    if (run_date !== undefined && run_date !== null) {
      body.run_date = run_date; // YYYY-MM-DD format
      updatedFields.push('run_date');
    }

    // Generate signature (includes body fields)
    const signatureData = { ...headers, ...body, passphrase: payfastConfig.passphrase };
    const signature = generateApiSignature(signatureData, payfastConfig.passphrase);

    // Make API call to PayFast with retry
    const apiCall = async () => {
      const response = await fetch(`${payfastConfig.apiHost}${endpoint}`, {
        method: 'PATCH',
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
        throw new Error(result.data.message || 'Failed to update subscription.');
      }

      return { response, result };
    };

    await retryWithBackoff(apiCall);

    // Update Firestore
    const batch = db.batch();
    
    // Prepare update data for subscriptions collection
    const subscriptionUpdate: any = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (amount !== undefined && amount !== null) {
      subscriptionUpdate.recurringAmount = amount;
    }
    if (frequency !== undefined && frequency !== null) {
      subscriptionUpdate.frequency = String(frequency);
    }
    if (cycles !== undefined && cycles !== null) {
      subscriptionUpdate.cycles = String(cycles);
    }
    if (run_date !== undefined && run_date !== null) {
      subscriptionUpdate.nextBillingDate = admin.firestore.Timestamp.fromDate(new Date(run_date));
      subscriptionUpdate.billingDate = run_date;
    }

    batch.update(subscriptionDoc.ref, subscriptionUpdate);

    // Update users collection if plan changed
    const userUpdate: any = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update subscriptionPlan if amount or frequency changed
    if (amount !== undefined || frequency !== undefined) {
      // Determine plan name based on frequency
      let planName = subscriptionData.plan || 'monthly';
      if (frequency !== undefined) {
        switch (frequency) {
          case 3:
            planName = 'monthly';
            break;
          case 4:
            planName = 'quarterly';
            break;
          case 5:
            planName = 'bi-annual';
            break;
          case 6:
            planName = 'annual';
            break;
        }
      }
      userUpdate.subscriptionPlan = planName;
    }

    batch.update(userRef, userUpdate);

    await batch.commit();

    // Clear rollback states on success
    rollback.clear();

    // Log successful action
    await logSubscriptionAction(db, 'update', userId, subscriptionId, 'success', undefined, {
      updatedFields
    });

    return {
      success: true,
      message: 'Subscription updated successfully.',
      data: {
        subscriptionId,
        status: 'active' as const,
        updatedFields
      }
    };
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    
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
    
    await logSubscriptionAction(db, 'update', userId, subscriptionId, 'failure', error.message);

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred while updating subscription.');
  }
});

