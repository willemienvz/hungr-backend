import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createReview = async (data: any, context: functions.https.CallableContext) => {
  // Unified endpoint: supports authenticated menu-item reviews and anonymous restaurant reviews
  const { menuItemId, rating, comment, customerName, message, reviewerIp, userAgent } = data || {};

  // Branch A: legacy authenticated menu-item review
  if (menuItemId) {
    // Allow anonymous menu-item reviews. Use auth info if present.
    const userId = context.auth?.uid || null;
    const userEmail = (context.auth?.token as any)?.email || '';
    const userName = (context.auth?.token as any)?.name || 'Anonymous';
  
  // Validate input
    if (!menuItemId || rating < 1 || rating > 5) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid review data');
    }
    if (comment && comment.length < 10) {
      throw new functions.https.HttpsError('invalid-argument', 'Comment must be at least 10 characters');
    }
  
  try {
    // Check if user already reviewed this item today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Only enforce daily limit for authenticated users (identified by userId)
    if (userId) {
      const existingReview = await admin.firestore()
        .collection('reviews')
        .where('menuItemId', '==', menuItemId)
        .where('userId', '==', userId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
        .get();

      if (!existingReview.empty) {
        throw new functions.https.HttpsError('already-exists', 'You can only review once per day');
      }
    }
    
      // Create review
      const reviewData = {
        menuItemId,
        userId,
        userName: (customerName?.trim() || userName),
        userEmail: userEmail || null,
        rating,
        comment: comment?.trim() || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isEdited: false,
        status: 'pending'
      };
      const reviewRef = await admin.firestore().collection('reviews').add(reviewData);
    
    // Update review stats
    await updateReviewStats(menuItemId);
    
    return { 
      reviewId: reviewRef.id,
      success: true 
    };
    } catch (error) {
      console.error('Error creating review:', error);
      throw new functions.https.HttpsError('internal', 'Failed to create review');
    }
  }

  // Branch B: anonymous restaurant review (pending moderation)
  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    throw new functions.https.HttpsError('invalid-argument', 'Customer name must be at least 2 characters');
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Review message must be at least 10 characters');
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Rating must be between 1 and 5');
  }

  try {
    const review = {
      customerName: String(customerName).trim(),
      message: String(message).trim(),
      rating: Number(rating),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewerIp: reviewerIp || null,
      userAgent: userAgent || null
    };
    const docRef = await admin.firestore().collection('reviews').add(review);
    return { success: true, reviewId: docRef.id };
  } catch (error) {
    console.error('Error creating anonymous review:', error);
    throw new functions.https.HttpsError('internal', 'Failed to submit review');
  }
};

async function updateReviewStats(menuItemId: string) {
  try {
    const reviewsSnapshot = await admin.firestore()
      .collection('reviews')
      .where('menuItemId', '==', menuItemId)
      .get();
    
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    
    if (reviews.length === 0) {
      // Delete stats if no reviews
      await admin.firestore().collection('reviewStats').doc(menuItemId).delete();
      return;
    }
    
    // Calculate statistics
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;
    
    const ratingDistribution = {
      1: reviews.filter(r => r.rating === 1).length,
      2: reviews.filter(r => r.rating === 2).length,
      3: reviews.filter(r => r.rating === 3).length,
      4: reviews.filter(r => r.rating === 4).length,
      5: reviews.filter(r => r.rating === 5).length
    };
    
    const stats = {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection('reviewStats').doc(menuItemId).set(stats);
  } catch (error) {
    console.error('Error updating review stats:', error);
  }
} 