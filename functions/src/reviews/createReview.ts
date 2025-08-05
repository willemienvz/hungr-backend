import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createReview = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { menuItemId, rating, comment } = data;
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';
  const userName = context.auth.token.name || 'Anonymous';
  
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
    
    const existingReview = await admin.firestore()
      .collection('reviews')
      .where('menuItemId', '==', menuItemId)
      .where('userId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
      .get();
    
    if (!existingReview.empty) {
      throw new functions.https.HttpsError('already-exists', 'You can only review once per day');
    }
    
    // Create review
    const reviewData = {
      menuItemId,
      userId,
      userName,
      userEmail,
      rating,
      comment: comment?.trim() || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isEdited: false
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