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
    console.log('ITN Subscription fields:', {
      subscription_type: req.body.subscription_type,
      recurring_amount: req.body.recurring_amount,
      frequency: req.body.frequency,
      cycles: req.body.cycles,
      billing_date: req.body.billing_date,
      token: req.body.token || req.body.tokenisation ? 'PRESENT' : 'MISSING'
    });

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

    // Save transaction (all statuses are logged)
    await db.collection('transactions').add(transactionData);

    // Define terminal statuses that can change subscription state
    const terminalStatuses = ['COMPLETE', 'FAILED', 'CANCELLED'];
    const paymentStatus = itnData.payment_status;

    // Create audit log entry for all payment statuses
    try {
      const auditLogData: any = {
        type: 'payment_processing',
        action: 'status_received',
        payment_id: itnData.pf_payment_id,
        payment_status: paymentStatus,
        email_address: itnData.email_address,
        amount_gross: parseFloat(itnData.amount_gross),
        result: 'success',
        source: 'payfast_itn',
        metadata: {
          m_payment_id: itnData.m_payment_id,
          item_name: itnData.item_name,
          item_description: itnData.item_description
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      // Add warning flag for unknown statuses
      if (!['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'CANCELLED'].includes(paymentStatus)) {
        auditLogData.metadata.warning = 'Unknown payment status received';
        auditLogData.metadata.is_unknown_status = true;
        console.warn('Unknown payment status received:', paymentStatus, 'for payment:', itnData.pf_payment_id);
      }

      await db.collection('audit_logs').add(auditLogData);
    } catch (error) {
      console.error('Failed to log payment status audit:', error);
      // Don't fail payment processing if audit logging fails
    }

    // Handle non-terminal statuses (PENDING, PROCESSING, unknown) - log only, no subscription changes
    if (paymentStatus === 'PENDING' || paymentStatus === 'PROCESSING') {
      console.log(`Payment status ${paymentStatus} received - logged, no subscription changes`);
      return { success: true };
    }

    // Handle unknown statuses - log with warning, no subscription changes
    if (!terminalStatuses.includes(paymentStatus)) {
      console.warn(`Unknown payment status "${paymentStatus}" received - logged with warning, no subscription changes`);
      return { success: true };
    }

    // Handle terminal statuses only (COMPLETE, FAILED, CANCELLED)
    // These can change subscription state
    
    // Update user subscription if payment is complete
    if (paymentStatus === 'COMPLETE') {
      await updateUserSubscription(itnData);
    }
    
    // Handle subscription cancellations
    if (paymentStatus === 'CANCELLED' && itnData.token) {
      await handleSubscriptionCancellation(itnData);
    }
    
    // Handle subscription status updates (suspended, etc.)
    if (paymentStatus === 'FAILED' && itnData.token) {
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
      // Determine if recurring (check subscription_type, token, or recurring_amount)
      // If we have a token, it's definitely a recurring subscription (PayFast only issues tokens for subscriptions)
      const hasToken = !!(itnData.token || itnData.tokenisation);
      const hasSubscriptionType = itnData.subscription_type === '1';
      const hasRecurringAmount = !!itnData.recurring_amount;
      const isRecurringForUser = hasSubscriptionType || hasRecurringAmount || hasToken;
      
      // Determine plan name
      let userPlanName = 'monthly';
      if (isRecurringForUser) {
        if (itnData.frequency) {
          switch (itnData.frequency) {
            case '3':
              userPlanName = 'monthly';
              break;
            case '4':
              userPlanName = 'quarterly';
              break;
            case '5':
              userPlanName = 'bi-annual';
              break;
            case '6':
              userPlanName = 'annual';
              break;
            default:
              userPlanName = 'monthly';
          }
        } else {
          // No frequency specified, but we have a token - default to monthly (our standard plan)
          userPlanName = 'monthly';
        }
      } else {
        userPlanName = 'once-off';
      }
      
      const newUserData = {
        email: itnData.email_address,
        firstName: itnData.name_first,
        lastName: itnData.name_last,
        phoneNumber: itnData.cell_number || '',
        subscriptionStatus: 'active',
        subscriptionPlan: userPlanName,
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
    // A subscription is recurring if:
    // 1. subscription_type is '1', OR
    // 2. recurring_amount field is present (indicates recurring billing), OR
    // 3. A token is present (token indicates recurring billing capability - PayFast only issues tokens for subscriptions)
    const hasToken = !!(itnData.token || itnData.tokenisation);
    const hasSubscriptionType = itnData.subscription_type === '1';
    const hasRecurringAmount = !!itnData.recurring_amount;
    const hasFrequency = !!itnData.frequency;
    
    // If we have a token, it's definitely a recurring subscription (PayFast only issues tokens for subscriptions)
    // This handles cases where PayFast doesn't echo subscription_type in ITN
    let isRecurring = hasSubscriptionType || hasRecurringAmount || hasToken;
    
    // Log subscription detection for debugging
    console.log('Subscription detection:', {
      subscription_type: itnData.subscription_type,
      hasToken,
      hasSubscriptionType,
      hasRecurringAmount,
      hasFrequency,
      isRecurring,
      frequency: itnData.frequency,
      recurring_amount: itnData.recurring_amount,
      amount_gross: itnData.amount_gross
    });
    
    // Determine plan based on frequency if available
    // For sign-ups, we always expect monthly recurring subscription (R999/month)
    // Default to monthly if we have a token (indicates recurring capability)
    let planName = 'monthly'; // Default to monthly for recurring subscriptions
    if (isRecurring) {
      if (itnData.frequency) {
        switch (itnData.frequency) {
          case '3':
            planName = 'monthly';
            break;
          case '4':
            planName = 'quarterly';
            break;
          case '5':
            planName = 'bi-annual';
            break;
          case '6':
            planName = 'annual';
            break;
          default:
            planName = 'monthly';
        }
      } else {
        // No frequency specified, but we have a token - default to monthly (our standard plan)
        planName = 'monthly';
      }
    } else {
      planName = 'once-off';
    }
    
    console.log('Determined plan name:', planName, 'isRecurring:', isRecurring);
    
    // Create or update subscription
    const subscriptionData: any = {
      userId: userId,
      email: itnData.email_address,
      status: 'active',
      plan: planName,
      amount: parseFloat(itnData.amount_gross),
      paymentId: itnData.pf_payment_id,
      token: itnData.token || itnData.tokenisation, // Handle both token field names
      consecutiveFailures: 0, // Initialize failure counter
      needsManualReview: false, // Initialize manual review flag
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
      
      // Reset failure counter on successful payment
      subscriptionData.consecutiveFailures = 0;
      subscriptionData.needsManualReview = false;
      // Clear manual review fields if they exist
      if (existingData.manualReviewReason !== undefined) {
        subscriptionData.manualReviewReason = admin.firestore.FieldValue.delete();
      }
      if (existingData.manualReviewFlaggedAt !== undefined) {
        subscriptionData.manualReviewFlaggedAt = admin.firestore.FieldValue.delete();
      }
      
      await subscriptionDoc.ref.update(subscriptionData);
      
      // Log failure counter reset
      try {
        await db.collection('audit_logs').add({
          type: 'subscription_management',
          action: 'failure_counter_reset',
          userId: userId,
          subscriptionId: subscriptionDoc.id,
          result: 'success',
          source: 'payfast_itn',
          metadata: {
            payment_id: itnData.pf_payment_id,
            reason: 'Payment succeeded - counter reset'
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to log failure counter reset:', error);
      }
    }

    // Update user document
    const tokenToSave = itnData.token || itnData.tokenisation;
    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'active',
      subscriptionPlan: planName, // Use the same planName determined above
      payfastToken: tokenToSave, // Save PayFast token to user document for subscription management
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
 * Enhanced with consecutive failure tracking, grace period, and automatic cancellation
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
      console.error('Subscription not found for token:', subscriptionToken);
      return; // May be one-off payment, no subscription
    }

    const subscriptionDoc = subscriptionQuery.docs[0];
    const subscriptionData = subscriptionDoc.data();
    const userId = subscriptionData.userId;
    
    // Get current consecutive failure count (default to 0 for backward compatibility)
    const currentFailures = subscriptionData.consecutiveFailures || 0;
    const newFailures = currentFailures + 1;
    
    // Prepare update object
    const updateData: any = {
      consecutiveFailures: newFailures,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Apply grace period and cancellation logic
    if (newFailures === 1) {
      // First failure: Log failure, keep subscription active (grace period)
      await logFailureTracking(db, userId, subscriptionDoc.id, newFailures, 'first_failure', itnData);
      
    } else if (newFailures === 2) {
      // Second failure: Flag for manual review, keep subscription active (grace period)
      updateData.needsManualReview = true;
      const lastFailurePaymentId = subscriptionData.lastFailurePaymentId || 'unknown';
      updateData.manualReviewReason = `Payment failed - 2 consecutive failures (payment IDs: ${lastFailurePaymentId}, ${itnData.pf_payment_id})`;
      updateData.manualReviewFlaggedAt = admin.firestore.FieldValue.serverTimestamp();
      
      await logFailureTracking(db, userId, subscriptionDoc.id, newFailures, 'grace_period_warning', itnData);
      await logManualReviewFlag(db, userId, subscriptionDoc.id, updateData.manualReviewReason);
      
    } else if (newFailures >= 3) {
      // Third failure: Cancel subscription
      updateData.status = 'cancelled';
      updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.cancellationReason = `Cancelled due to ${newFailures} consecutive payment failures`;
      
      // Update user document
      await db.collection('users').doc(userId).update({
        subscriptionStatus: 'cancelled',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await logFailureTracking(db, userId, subscriptionDoc.id, newFailures, 'cancellation', itnData);
      await logCancellation(db, userId, subscriptionDoc.id, updateData.cancellationReason);
    }
    
    // Store last failure payment ID for tracking
    updateData.lastFailurePaymentId = itnData.pf_payment_id;
    
    // Update subscription document
    await subscriptionDoc.ref.update(updateData);
    
    console.log(`Subscription failure handled: ${newFailures} consecutive failures for subscription:`, subscriptionDoc.id);

  } catch (error) {
    console.error('Error handling subscription failure:', error);
    throw error;
  }
}

/**
 * Log failure tracking event
 */
async function logFailureTracking(
  db: admin.firestore.Firestore,
  userId: string,
  subscriptionId: string,
  consecutiveFailures: number,
  failureType: 'first_failure' | 'grace_period_warning' | 'cancellation',
  itnData: PayFastItnData
): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      type: 'subscription_management',
      action: 'failure_tracked',
      userId,
      subscriptionId,
      result: 'success',
      source: 'payfast_itn',
      metadata: {
        payment_id: itnData.pf_payment_id,
        consecutive_failures: consecutiveFailures,
        failure_type: failureType,
        reason: itnData.item_description || 'Payment failed',
        amount: parseFloat(itnData.amount_gross)
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log failure tracking:', error);
  }
}

/**
 * Log manual review flag event
 */
async function logManualReviewFlag(
  db: admin.firestore.Firestore,
  userId: string,
  subscriptionId: string,
  reason: string
): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      type: 'subscription_management',
      action: 'flag_manual_review',
      userId,
      subscriptionId,
      result: 'success',
      source: 'payfast_itn',
      metadata: {
        reason: reason
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log manual review flag:', error);
  }
}

/**
 * Log cancellation event
 */
async function logCancellation(
  db: admin.firestore.Firestore,
  userId: string,
  subscriptionId: string,
  reason: string
): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      type: 'subscription_management',
      action: 'cancel_due_to_failures',
      userId,
      subscriptionId,
      result: 'success',
      source: 'payfast_itn',
      metadata: {
        reason: reason
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log cancellation:', error);
  }
}
