import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof functions.https.HttpsError) {
        // Don't retry authentication or validation errors
        if (['unauthenticated', 'permission-denied', 'invalid-argument', 'failed-precondition'].includes(error.code)) {
          throw error;
        }
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if it's a network error (retryable)
      const isNetworkError = 
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT';
      
      if (!isNetworkError) {
        // Not a network error, don't retry
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Log subscription action to audit logs
 */
export async function logSubscriptionAction(
  db: admin.firestore.Firestore,
  action: 'pause' | 'cancel' | 'resume' | 'update',
  userId: string,
  subscriptionId: string,
  result: 'success' | 'failure',
  error?: string,
  metadata?: { [key: string]: any }
): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      type: 'subscription_management',
      action,
      userId,
      subscriptionId,
      result,
      error: error || null,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log subscription action:', error);
  }
}

/**
 * Database rollback helper
 * Stores previous state and provides rollback method
 */
export class DatabaseRollback {
  private db: admin.firestore.Firestore;
  private previousStates: Array<{
    ref: admin.firestore.DocumentReference;
    data: any;
  }> = [];

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * Store current state of a document for potential rollback
   */
  async storeState(ref: admin.firestore.DocumentReference): Promise<void> {
    const snapshot = await ref.get();
    if (snapshot.exists) {
      this.previousStates.push({
        ref,
        data: snapshot.data()
      });
    }
  }

  /**
   * Rollback all stored states
   */
  async rollback(): Promise<void> {
    if (this.previousStates.length === 0) {
      return;
    }

    const batch = this.db.batch();
    
    for (const state of this.previousStates) {
      if (state.data) {
        batch.set(state.ref, state.data, { merge: true });
      } else {
        // If document didn't exist, we can't rollback to non-existence
        // Just log the issue
        console.warn(`Cannot rollback document ${state.ref.path} - it didn't exist before`);
      }
    }

    try {
      await batch.commit();
      console.log(`Rolled back ${this.previousStates.length} document(s)`);
    } catch (error) {
      console.error('Failed to rollback database changes:', error);
      throw error;
    }
  }

  /**
   * Clear stored states (call after successful operation)
   */
  clear(): void {
    this.previousStates = [];
  }
}






