import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * PayFast API signature generation utility
 * Uses alphabetical sort for Management API (different from form POST)
 */
export function generateApiSignature(data: { [key: string]: any }, passphrase: string): string {
  // Combine data with passphrase
  const requestData = { ...data, passphrase };
  
  // Sort all keys alphabetically
  const sortedKeys = Object.keys(requestData).sort();
  
  // Create parameter string with URL encoding
  const paramString = sortedKeys
    .map(key => {
      const value = encodeURIComponent(String(requestData[key as keyof typeof requestData])).replace(/%20/g, '+');
      // Convert hex to uppercase as required by PayFast
      const upperEncoded = value.replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase());
      return `${key}=${upperEncoded}`;
    })
    .join('&');
  
  // Generate MD5 hash (lowercase)
  const hash = crypto.createHash('md5').update(paramString).digest('hex');
  
  return hash;
}

/**
 * Retrieves subscription token for a user with fallback logic
 * Priority: subscriptions collection (any status with token) -> users collection (payfastToken)
 */
export async function getSubscriptionToken(userId: string, db: admin.firestore.Firestore): Promise<string> {
  // Strategy 1: Try subscriptions collection with index
  let subscriptionQuery;
  try {
    subscriptionQuery = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .orderBy('updated_at', 'desc')
      .limit(10) // Get multiple to find one with a token
      .get();
    
    console.log(`Found ${subscriptionQuery.docs.length} subscription(s) for user ${userId}`);
  } catch (indexError: any) {
    // Index not ready - try simple query without orderBy
    if (indexError.code === 9 || indexError.message?.includes('index')) {
      console.log(`Index not ready for user ${userId}, using simple query`);
      subscriptionQuery = await db.collection('subscriptions')
        .where('userId', '==', userId)
        .limit(50)
        .get();
      
      // Manual sort by updated_at
      const docs = subscriptionQuery.docs.sort((a, b) => {
        const aTime = a.data().updated_at?.toMillis?.() || 0;
        const bTime = b.data().updated_at?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      subscriptionQuery = {
        empty: docs.length === 0,
        docs: docs.slice(0, 10)
      } as any;
      
      console.log(`Found ${docs.length} subscription(s) after manual sort for user ${userId}`);
    } else {
      throw indexError;
    }
  }
  
  // Look for the first subscription with a token (regardless of status)
  for (const doc of subscriptionQuery.docs) {
    const token = doc.data().token;
    if (token) {
      console.log(`Found token in subscription ${doc.id} for user ${userId}`);
      return token;
    }
  }
  
  console.log(`No token found in subscriptions collection for user ${userId}, checking user document`);
  
  // Strategy 2: Fallback to users collection (fast lookup, no index needed)
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    console.error(`User document ${userId} does not exist`);
    throw new functions.https.HttpsError(
      'not-found',
      'User document not found.'
    );
  }
  
  const userData = userDoc.data();
  const payfastToken = userData?.payfastToken;
  
  if (payfastToken) {
    console.log(`Found token in user document for user ${userId}`);
    return payfastToken;
  }
  
  // No token found anywhere
  console.error(`No subscription token found for user ${userId} in subscriptions or users collection`);
  throw new functions.https.HttpsError(
    'failed-precondition',
    'Subscription token not found. Please contact support.'
  );
}

/**
 * Gets PayFast configuration from Firebase Functions config or environment
 * Uses functions.config() for production, with fallback to hardcoded values for development
 */
export function getPayFastConfig(): {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  sandbox: boolean;
  apiHost: string;
} {
  try {
    // Try to get from Firebase Functions config (production)
    const config = functions.config().payfast;
    if (config && config.merchant_id && config.merchant_key && config.passphrase) {
      const sandbox = config.sandbox === 'true' || config.sandbox === true;
      return {
        merchantId: config.merchant_id,
        merchantKey: config.merchant_key,
        passphrase: config.passphrase,
        sandbox,
        apiHost: sandbox 
          ? 'https://api.sandbox.payfast.co.za'
          : 'https://api.payfast.co.za'
      };
    }
  } catch (error) {
    // Config not set, use fallback for development
    console.warn('PayFast config not found in functions.config(), using fallback values');
  }
  
  // Fallback to hardcoded values (development only)
  // TODO: Configure these in Firebase Functions config for production:
  // firebase functions:config:set payfast.merchant_id="..." payfast.merchant_key="..." payfast.passphrase="..." payfast.sandbox="true"
  const sandbox = true; // Default to sandbox for development
  return {
    merchantId: '10013557',
    merchantKey: 'nn7rftlml9ki3',
    passphrase: 'T3st1ngT3st1ng',
    sandbox,
    apiHost: sandbox 
      ? 'https://api.sandbox.payfast.co.za'
      : 'https://api.payfast.co.za'
  };
}

