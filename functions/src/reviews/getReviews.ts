import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const getReviews = async (data: any, context: functions.https.CallableContext) => {
  // Support two modes:
  // - If menuItemId is provided: legacy menu-item reviews
  // - Else: public restaurant reviews with optional status filter
  const { menuItemId, page = 1, limit = 10, sortBy = 'newest', rating, status } = data || {};
  
  try {
    let query: FirebaseFirestore.Query = admin.firestore().collection('reviews');
    if (menuItemId) {
      query = query.where('menuItemId', '==', menuItemId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    
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
    const totalSnapshot = await (query as FirebaseFirestore.Query).get();
    const total = totalSnapshot.size;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = (query as FirebaseFirestore.Query).limit(limit).offset(offset);
    
    const reviewsSnapshot = await (query as FirebaseFirestore.Query).get();
    
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