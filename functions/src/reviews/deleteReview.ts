import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const deleteReview = async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { reviewId } = data;
  const userId = context.auth.uid;
  
  if (!reviewId) {
    throw new functions.https.HttpsError('invalid-argument', 'reviewId is required');
  }
  
  try {
    // Get the review to check ownership
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
      throw new functions.https.HttpsError('permission-denied', 'You can only delete your own reviews');
    }
    
    // Delete the review
    await admin.firestore()
      .collection('reviews')
      .doc(reviewId)
      .delete();
    
    // Update review stats
    await updateReviewStats(reviewData.menuItemId);
    
    return { 
      success: true,
      reviewId 
    };
  } catch (error) {
    console.error('Error deleting review:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete review');
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