import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as CryptoJS from 'crypto-js';

// PayFast configuration
const PAYFAST_CONFIG = {
  merchantId: '10013557',
  merchantKey: 'nn7rftlml9ki3',
  passphrase: 'T3st1ngT3st1ng',
  // PayFast server IP ranges for validation
  allowedIps: [
    '197.97.154.0/24',
    '41.74.179.0/24',
    '41.74.180.0/24'
  ]
};

interface PayFastItnData {
  // Standard payment fields
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  name_first: string;
  name_last: string;
  email_address: string;
  merchant_id: string;
  merchant_key?: string;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
  cell_number?: string;
  amount?: string;
  token: string;
  signature: string;
  
  // Tokenization fields
  tokenisation?: string; // For token-based notifications
  
  // Recurring billing fields
  subscription_type?: string; // For recurring billing
  recurring_amount?: string; // For recurring billing
  frequency?: string; // For recurring billing
  cycles?: string; // For recurring billing
  billing_date?: string; // For recurring billing
  //token_notification_url?: string; // For recurring billing
  
  [key: string]: string | undefined;
}

/**
 * PayFast ITN (Instant Transaction Notification) Handler
 * This function processes payment notifications from PayFast
 */
export const payfastItn = functions.https.onRequest(async (req, res) => {
  try {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    console.log('PayFast ITN received:', JSON.stringify(req.body, null, 2));

    const itnData: PayFastItnData = req.body;

    // Validate the ITN data
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const validationResult = await validateItn(itnData, clientIp);
    
    if (!validationResult.isValid) {
      console.error('ITN validation failed:', validationResult.error);
      res.status(400).send('VALIDATION_FAILED');
      return;
    }

    // Process the payment
    const processResult = await processPayment(itnData);
    
    if (processResult.success) {
      console.log('Payment processed successfully:', itnData.m_payment_id);
      res.status(200).send('VALID');
    } else {
      console.error('Payment processing failed:', processResult.error);
      res.status(500).send('PROCESSING_FAILED');
    }

  } catch (error) {
    console.error('ITN handler error:', error);
    res.status(500).send('INTERNAL_ERROR');
  }
});

/**
 * Validates PayFast ITN data
 */
async function validateItn(itnData: PayFastItnData, clientIp: string): Promise<{isValid: boolean, error?: string}> {
  try {
    console.log('Starting ITN validation...');
    console.log('Client IP:', clientIp);
    console.log('ITN Data keys:', Object.keys(itnData));
    
    // 1. Validate merchant ID
    console.log('Validating merchant ID:', itnData.merchant_id, 'Expected:', PAYFAST_CONFIG.merchantId);
    if (itnData.merchant_id !== PAYFAST_CONFIG.merchantId) {
      console.error('Merchant ID validation failed');
      return { isValid: false, error: 'Invalid merchant ID' };
    }

    // 2. Validate signature
    console.log('Validating signature...');
    const signatureValid = validateSignature(itnData);
    if (!signatureValid) {
      console.error('Signature validation failed');
      return { isValid: false, error: 'Invalid signature' };
    }

    // 3. Validate IP address (optional but recommended)
    if (!isValidPayFastIp(clientIp)) {
      console.warn('ITN from non-PayFast IP:', clientIp);
      // Note: In production, you might want to be stricter about this
    }

    // 4. Validate required fields
    const requiredFields = ['m_payment_id', 'pf_payment_id', 'payment_status', 'amount_gross'];
    for (const field of requiredFields) {
      if (!itnData[field]) {
        console.error('Missing required field:', field);
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }
    
    // 5. For recurring billing, validate token exists
    if (itnData.subscription_type === '1' && !itnData.token && !itnData.tokenisation) {
      console.error('Missing token for subscription payment');
      return { isValid: false, error: 'Missing token for subscription payment' };
    }

    console.log('ITN validation successful');
    return { isValid: true };

  } catch (error) {
    console.error('Validation error:', error);
    return { isValid: false, error: `Validation error: ${error}` };
  }
}

/**
 * Validates PayFast signature
 */
function validateSignature(itnData: PayFastItnData): boolean {
  try {
    const receivedSignature = itnData.signature;
    
    // Remove signature from data for validation
    const { signature, ...dataForValidation } = itnData;
    
    // Generate parameter string
    const paramString = createParameterString(dataForValidation);
    const signatureString = paramString + `&passphrase=${payfastUrlEncode(PAYFAST_CONFIG.passphrase)}`;
    
    // Debug logging
    console.log('PayFast ITN Signature Validation:');
    console.log('Input Data:', JSON.stringify(dataForValidation, null, 2));
    console.log('Parameter String:', paramString);
    console.log('Full Signature String:', signatureString);
    console.log('Received Signature:', receivedSignature);
    
    // Generate expected signature (lowercase)
    const expectedSignature = CryptoJS.MD5(signatureString).toString().toLowerCase();
    console.log('Expected Signature:', expectedSignature);
    console.log('Signatures Match:', receivedSignature === expectedSignature);
    
    return receivedSignature === expectedSignature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Creates parameter string for signature validation
 * PayFast ITN data uses the exact order from the ITN payload and includes empty fields
 */
function createParameterString(data: any): string {
  const params: string[] = [];
  
  // PayFast ITN uses the exact order from the payload and includes empty fields
  // The order is: m_payment_id, pf_payment_id, payment_status, item_name, item_description, 
  // amount_gross, amount_fee, amount_net, custom_str1-5, custom_int1-5, name_first, name_last, 
  // email_address, merchant_id, token, billing_date
  const parameterOrder = [
    'm_payment_id',
    'pf_payment_id', 
    'payment_status',
    'item_name',
    'item_description',
    'amount_gross',
    'amount_fee',
    'amount_net',
    'custom_str1',
    'custom_str2',
    'custom_str3',
    'custom_str4',
    'custom_str5',
    'custom_int1',
    'custom_int2',
    'custom_int3',
    'custom_int4',
    'custom_int5',
    'name_first',
    'name_last',
    'email_address',
    'merchant_id',
    'token',
    'billing_date'
  ];
  
  parameterOrder.forEach(key => {
    if (key !== 'signature' && key !== 'merchant_key') {
      const value = data[key];
      if (value !== null && value !== undefined) {
        const trimmedValue = value.toString().trim();
        // Use custom URL encoding that matches PayFast requirements
        params.push(`${key}=${payfastUrlEncode(trimmedValue)}`);
      }
    }
  });

  return params.join('&');
}

/**
 * PayFast-specific URL encoding
 * PayFast uses spaces as + instead of %20
 */
function payfastUrlEncode(value: string): string {
  // First encode with standard encodeURIComponent
  let encoded = encodeURIComponent(value).replace(/%20/g, "+");
  
  // Convert all hex characters to uppercase as required by PayFast
  encoded = encoded.replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase());
  
  return encoded;
}

/**
 * Validates if IP is from PayFast servers
 */
function isValidPayFastIp(ip: string): boolean {
  // This is a simplified check. In production, you'd want to implement proper CIDR matching
  const payfastIps = [
    '197.97.154.',
    '41.74.179.',
    '41.74.180.'
  ];
  
  return payfastIps.some(prefix => ip.startsWith(prefix));
}

/**
 * Processes the payment and updates database
 */
async function processPayment(itnData: PayFastItnData): Promise<{success: boolean, error?: string}> {
  try {
    const db = admin.firestore();
    
    // Check if this is a duplicate notification
    const existingTransaction = await db
      .collection('transactions')
      .where('pf_payment_id', '==', itnData.pf_payment_id)
      .get();
    
    if (!existingTransaction.empty) {
      console.log('Duplicate ITN received, ignoring:', itnData.pf_payment_id);
      return { success: true }; // Return success for duplicate
    }

    // Create transaction record
    const transactionData = {
      m_payment_id: itnData.m_payment_id,
      pf_payment_id: itnData.pf_payment_id,
      payment_status: itnData.payment_status,
      amount_gross: parseFloat(itnData.amount_gross),
      amount_fee: parseFloat(itnData.amount_fee),
      amount_net: parseFloat(itnData.amount_net),
      name_first: itnData.name_first,
      name_last: itnData.name_last,
      email_address: itnData.email_address,
      item_name: itnData.item_name,
      item_description: itnData.item_description,
      token: itnData.token,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save transaction
    await db.collection('transactions').add(transactionData);

    // Update user subscription if payment is complete
    if (itnData.payment_status === 'COMPLETE') {
      await updateUserSubscription(itnData);
    }
    
    // Handle subscription cancellations
    if (itnData.payment_status === 'CANCELLED' && itnData.token) {
      await handleSubscriptionCancellation(itnData);
    }
    
    // Handle subscription status updates (suspended, etc.)
    if (itnData.payment_status === 'FAILED' && itnData.token) {
      await handleSubscriptionFailure(itnData);
    }

    return { success: true };

  } catch (error) {
    console.error('Payment processing error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Updates user subscription based on payment
 */
async function updateUserSubscription(itnData: PayFastItnData): Promise<void> {
  try {
    const db = admin.firestore();
    
    // Find user by email
    const userQuery = await db
      .collection('users')
      .where('email', '==', itnData.email_address)
      .get();
    
    let userId: string;
    
    if (userQuery.empty) {
      // Create new user if they don't exist
      console.log('Creating new user for email:', itnData.email_address);
      
      // Create Firestore user document only
      // Firebase Auth user will be created by the verify-email-address component
      const newUserData = {
        email: itnData.email_address,
        firstName: itnData.name_first,
        lastName: itnData.name_last,
        phoneNumber: itnData.cell_number || '',
        subscriptionStatus: 'active',
        subscriptionPlan: itnData.subscription_type === '1' ? 'monthly' : 'once-off',
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const newUserRef = await db.collection('users').add(newUserData);
      userId = newUserRef.id;
      
      console.log('New user created with ID:', userId);
    } else {
      const userDoc = userQuery.docs[0];
      userId = userDoc.id;
      console.log('Found existing user with ID:', userId);
    }

    // Check if this is a recurring payment notification
    const isRecurring = itnData.subscription_type === '1';
    
    // Create or update subscription
    const subscriptionData: any = {
      userId: userId,
      email: itnData.email_address,
      status: 'active',
      plan: isRecurring ? 'monthly' : 'once-off',
      amount: parseFloat(itnData.amount_gross),
      paymentId: itnData.pf_payment_id,
      token: itnData.token || itnData.tokenisation, // Handle both token field names
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add recurring billing specific fields
    if (isRecurring) {
      subscriptionData.recurringAmount = parseFloat(itnData.recurring_amount || itnData.amount_gross);
      subscriptionData.frequency = itnData.frequency || '3'; // Default to monthly
      subscriptionData.cycles = itnData.cycles || '0'; // 0 = unlimited
      subscriptionData.billingDate = itnData.billing_date;
      subscriptionData.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }

    // Check if subscription already exists
    const existingSubscription = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .get();

    if (existingSubscription.empty) {
      // Create new subscription
      subscriptionData.startDate = admin.firestore.FieldValue.serverTimestamp();
      subscriptionData.created_at = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('subscriptions').add(subscriptionData);
    } else {
      // Update existing subscription
      const subscriptionDoc = existingSubscription.docs[0];
      const existingData = subscriptionDoc.data();
      
      // Preserve original creation date and start date
      subscriptionData.created_at = existingData.created_at;
      subscriptionData.startDate = existingData.startDate || existingData.created_at;
      
      await subscriptionDoc.ref.update(subscriptionData);
    }

    // Update user document
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'active',
      subscriptionPlan: isRecurring ? 'monthly' : 'once-off',
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('User subscription updated successfully:', userId);

  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Handles subscription cancellation
 */
async function handleSubscriptionCancellation(itnData: PayFastItnData): Promise<void> {
  try {
    const db = admin.firestore();
    
    // Find subscription by token (handle both token and tokenisation fields)
    const subscriptionToken = itnData.token || itnData.tokenisation;
    const subscriptionQuery = await db
      .collection('subscriptions')
      .where('token', '==', subscriptionToken)
      .get();
    
    if (subscriptionQuery.empty) {
      console.error('Subscription not found for token:', itnData.token);
      return;
    }

    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscriptionData = subscriptionDoc.data();
    const userId = subscriptionData.userId;

    // Update subscription status
    await subscriptionDoc.ref.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancellationReason: itnData.item_description || 'Cancelled via PayFast',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user document
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'cancelled',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log audit action
    try {
      await db.collection('audit_logs').add({
        type: 'subscription_management',
        action: 'cancel',
        userId,
        subscriptionId: subscriptionDoc.id,
        result: 'success',
        source: 'payfast_itn',
        metadata: {
          payment_id: itnData.pf_payment_id,
          reason: 'Cancelled via PayFast ITN'
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log subscription cancellation audit:', error);
    }

    console.log('Subscription cancelled successfully:', subscriptionDoc.id);

  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
}

/**
 * Handles subscription failure (e.g., payment failed)
 */
async function handleSubscriptionFailure(itnData: PayFastItnData): Promise<void> {
  try {
    const db = admin.firestore();
    
    // Find subscription by token (handle both token and tokenisation fields)
    const subscriptionToken = itnData.token || itnData.tokenisation;
    const subscriptionQuery = await db
      .collection('subscriptions')
      .where('token', '==', subscriptionToken)
      .get();
    
    if (subscriptionQuery.empty) {
      console.error('Subscription not found for token:', itnData.token);
      return;
    }

    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscriptionData = subscriptionDoc.data();
    const userId = subscriptionData.userId;

    // Update subscription status - treat payment failure as paused (can be resumed)
    // This allows users to fix payment issues and resume
    await subscriptionDoc.ref.update({
      status: 'paused',
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
      pauseReason: itnData.item_description || 'Payment failed',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user document
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'paused',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log audit action
    try {
      await db.collection('audit_logs').add({
        type: 'subscription_management',
        action: 'pause',
        userId,
        subscriptionId: subscriptionDoc.id,
        result: 'success',
        source: 'payfast_itn',
        metadata: {
          payment_id: itnData.pf_payment_id,
          reason: 'Payment failed - paused via PayFast ITN'
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log subscription pause audit:', error);
    }

    console.log('Subscription suspended due to payment failure:', subscriptionDoc.id);

  } catch (error) {
    console.error('Error handling subscription failure:', error);
    throw error;
  }
}
