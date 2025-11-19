import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getPaymentHistory = functions.https.onCall(async (data, context) => {
  // Authenticate user
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const userId = context.auth.uid;
  const limit = data?.limit || 10;
  const db = admin.firestore();

  try {
    // Get user's email from auth token
    const user = await admin.auth().getUser(userId);
    const userEmail = user.email;

    if (!userEmail) {
      throw new functions.https.HttpsError('failed-precondition', 'User email not found.');
    }

    // Query transactions by email (server-side, bypasses security rules)
    const transactionsQuery = await db.collection('transactions')
      .where('email_address', '==', userEmail)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const transactions = transactionsQuery.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamps to ISO strings for client-side date handling
      const created_at = data.created_at?.toDate ? data.created_at.toDate().toISOString() : 
                        (data.created_at instanceof admin.firestore.Timestamp ? 
                         data.created_at.toDate().toISOString() : 
                         data.created_at || null);
      const updated_at = data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : 
                        (data.updated_at instanceof admin.firestore.Timestamp ? 
                         data.updated_at.toDate().toISOString() : 
                         data.updated_at || null);
      
      return {
        id: doc.id,
        ...data,
        created_at,
        updated_at
      };
    });

    return {
      success: true,
      data: transactions
    };
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    
    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred while fetching payment history.');
  }
});

