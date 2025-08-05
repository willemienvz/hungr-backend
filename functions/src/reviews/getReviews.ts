import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getReviews = async (data: any, context: functions.https.CallableContext) => {
  const { menuItemId, page = 1, limit = 10, sortBy = 'newest', rating } = data;
  
  if (!menuItemId) {
    throw new functions.https.HttpsError('invalid-argument', 'menuItemId is required');
  }
  
  try {
    let query = admin.firestore()
      .collection('reviews')
      .where('menuItemId', '==', menuItemId);
    
    // Apply rating filter if specified
    if (rating && rating >= 1 && rating <= 5) {
      query = query.where('rating', '==', rating);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        query = query.orderBy('createdAt', 'asc');
        break;
      case 'rating':
        query = query.orderBy('rating', 'desc').orderBy('createdAt', 'desc');
        break;
      case 'newest':
      default:
        query = query.orderBy('createdAt', 'desc');
        break;
    }
    
    // Get total count for pagination
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    const reviewsSnapshot = await query.get();
    
    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get review stats
    const statsDoc = await admin.firestore()
      .collection('reviewStats')
      .doc(menuItemId)
      .get();
    
    const stats = statsDoc.exists ? statsDoc.data() : {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      lastUpdated: admin.firestore.Timestamp.now()
    };
    
    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total
      },
      stats
    };
  } catch (error) {
    console.error('Error getting reviews:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get reviews');
  }
}; 