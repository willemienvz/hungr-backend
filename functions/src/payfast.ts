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
 * Priority: subscriptions collection (active) -> users collection (payfastToken)
 */
export async function getSubscriptionToken(userId: string, db: admin.firestore.Firestore): Promise<string> {
  // First, try to get from subscriptions collection
  const subscriptionQuery = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  
  if (!subscriptionQuery.empty) {
    const token = subscriptionQuery.docs[0].data().token;
    if (token) {
      return token;
    }
  }
  
  // Fallback to users collection
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const payfastToken = userData?.payfastToken;
  
  if (!payfastToken) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Subscription token not found. Please contact support.'
    );
  }
  
  return payfastToken;
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

