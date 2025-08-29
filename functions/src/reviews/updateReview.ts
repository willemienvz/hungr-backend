import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const updateReview = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { reviewId, rating, comment } = data;
  const userId = context.auth.uid;
  
  if (!reviewId || rating < 1 || rating > 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid review data');
  }
  
  if (comment && comment.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Comment must be at least 10 characters');
  }
  
  try {
    // Get the review to check ownership and editability
    const reviewDoc = await admin.firestore()
      .collection('reviews')
      .doc(reviewId)
      .get();
    
    if (!reviewDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Review not found');
    }
    
    const reviewData = reviewDoc.data()!;
    
    // Check ownership
    if (reviewData.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'You can only edit your own reviews');
    }
    
    // Check if review can still be edited (within 24 hours)
    const now = new Date();
    const reviewDate = reviewData.createdAt.toDate();
    const hoursDiff = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff >= 24) {
      throw new functions.https.HttpsError('failed-precondition', 'Reviews can only be edited within 24 hours');
    }
    
    // Update the review
    const updateData = {
      rating,
      comment: comment?.trim() || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isEdited: true
    };
    
    await admin.firestore()
      .collection('reviews')
      .doc(reviewId)
      .update(updateData);
    
    // Update review stats
    await updateReviewStats(reviewData.menuItemId);
    
    return { 
      success: true,
      reviewId 
    };
  } catch (error) {
    console.error('Error updating review:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update review');
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
      await admin.firestore().collection('reviewStats').doc(menuItemId).delete();
      return;
    }
    
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
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection('reviewStats').doc(menuItemId).set(stats);
  } catch (error) {
    console.error('Error updating review stats:', error);
  }
} 