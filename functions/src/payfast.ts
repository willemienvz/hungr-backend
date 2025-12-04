import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Formats timestamp for PayFast API
 * PayFast requires format: YYYY-MM-DDTHH:MM:SS[+HH:MM]
 * Example: 2025-11-20T13:38:21+02:00
 */
export function formatPayFastTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // Get timezone offset in format +HH:MM or -HH:MM
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset <= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
}

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
  
  console.log(`No token found in subscriptions collection for user ${userId}, trying email fallback`);
  
  // Strategy 2: Get user document to get email, then query subscriptions by email
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    console.error(`User document ${userId} does not exist`);
    throw new functions.https.HttpsError(
      'not-found',
      'User document not found.'
    );
  }
  
  const userData = userDoc.data();
  const userEmail = userData?.email;
  
  // Try querying subscriptions by email (in case subscription was created without userId)
  if (userEmail) {
    try {
      const emailSubscriptionQuery = await db.collection('subscriptions')
        .where('email', '==', userEmail)
        .limit(10)
        .get();
      
      // Look for subscription with token
      for (const doc of emailSubscriptionQuery.docs) {
        const subData = doc.data();
        const token = subData.token;
        if (token) {
          console.log(`Found token in subscription ${doc.id} by email for user ${userId}`);
          
          // Update subscription to add userId if missing (for future queries)
          if (!subData.userId) {
            try {
              await doc.ref.update({ userId: userId });
              console.log(`Updated subscription ${doc.id} with userId ${userId}`);
            } catch (updateError) {
              console.warn(`Failed to update subscription ${doc.id} with userId:`, updateError);
              // Continue anyway - we have the token
            }
          }
          
          return token;
        }
      }
    } catch (emailQueryError) {
      console.warn(`Failed to query subscriptions by email:`, emailQueryError);
      // Continue to next strategy
    }
  }
  
  // Strategy 3: Fallback to users collection payfastToken
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
  getApiUrl: (endpoint: string) => string;
} {
  const baseApiHost = 'https://api.payfast.co.za';
  
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
        apiHost: baseApiHost,
        getApiUrl: (endpoint: string) => {
          const url = `${baseApiHost}${endpoint}`;
          return sandbox ? `${url}?testing=true` : url;
        }
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
    apiHost: baseApiHost,
    getApiUrl: (endpoint: string) => {
      const url = `${baseApiHost}${endpoint}`;
      return sandbox ? `${url}?testing=true` : url;
    }
  };
}

