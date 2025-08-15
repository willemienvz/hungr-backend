/**
 * Reviews Service
 * 
 * This service handles all review-related operations including CRUD operations,
 * moderation workflow, and analytics for the reviews system.
 */

import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { 
  Review, 
  ReviewDocument, 
  CreateReviewRequest, 
  UpdateReviewStatusRequest, 
  ReviewResponse, 
  ReviewFilters, 
  ReviewAnalytics,
  ReviewStatus 
} from '../types/review.interface';
import { Timestamp } from 'firebase/firestore';
import { Query } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  private readonly collectionName = 'reviews';
  private reviewsCollection: AngularFirestoreCollection<ReviewDocument>;

  constructor(private firestore: AngularFirestore) {
    this.reviewsCollection = this.firestore.collection<ReviewDocument>(this.collectionName);
  }

  /**
   * Creates a new review
   */
  createReview(request: CreateReviewRequest & { menuItemId: string; restaurantId?: string; ownerId?: string }): Observable<ReviewResponse<Review>> {
    try {
      const reviewData = {
        menuItemId: (request as any).menuItemId,
        customerName: request.customerName.trim(),
        message: request.message.trim(),
        rating: request.rating,
        status: 'pending' as ReviewStatus,
        createdAt: Timestamp.now(),
        reviewerIp: request.reviewerIp,
        userAgent: request.userAgent,
        restaurantId: (request as any).restaurantId || null,
        ownerId: (request as any).ownerId || null
      };

      return from(this.reviewsCollection.add(reviewData)).pipe(
        switchMap(docRef => this.getReviewById(docRef.id)),
        map(review => ({
          success: true,
          data: review,
          message: 'Review submitted successfully and is pending moderation'
        })),
        catchError(error => {
          console.error('Error creating review:', error);
          return of({
            success: false,
            error: 'Failed to submit review. Please try again.'
          });
        })
      );
    } catch (error) {
      console.error('Error in createReview:', error);
      return throwError(() => new Error('Invalid review data'));
    }
  }

  /**
   * Gets a review by ID
   */
  getReviewById(id: string): Observable<Review> {
    return this.firestore.doc<ReviewDocument>(`${this.collectionName}/${id}`).valueChanges().pipe(
      map(doc => {
        if (!doc) {
          throw new Error('Review not found');
        }
        return this.convertDocumentToReview(id, doc);
      }),
      catchError(error => {
        console.error('Error getting review by ID:', error);
        throw error;
      })
    );
  }

  /**
   * Gets all reviews with optional filtering
   */
  getReviews(filters?: ReviewFilters & { menuItemId?: string; restaurantId?: string; ownerId?: string }): Observable<Review[]> {
    const collection = this.firestore.collection<ReviewDocument>(this.collectionName, (ref: Query) => {
      let query: Query = ref;

      if ((filters as any)?.menuItemId) {
        query = query.where('menuItemId', '==', (filters as any).menuItemId);
      }

      if ((filters as any)?.restaurantId) {
        query = query.where('restaurantId', '==', (filters as any).restaurantId);
      }

      if ((filters as any)?.ownerId) {
        query = query.where('ownerId', '==', (filters as any).ownerId);
      }

      // Apply status filter
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply rating range filter
      if (filters?.ratingRange) {
        query = query.where('rating', '>=', filters.ratingRange.min)
                     .where('rating', '<=', filters.ratingRange.max);
      }

      // Apply date range filter
      if (filters?.dateRange) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(filters.dateRange.start))
                     .where('createdAt', '<=', Timestamp.fromDate(filters.dateRange.end));
      }

      // Apply sorting
      if (filters?.sortBy) {
        query = query.orderBy(filters.sortBy, filters.sortOrder || 'desc');
      } else {
        query = query.orderBy('createdAt', 'desc');
      }

      // Apply pagination (limit only, offset not available in Firestore)
      if (filters?.pagination) {
        const { limit } = filters.pagination;
        query = query.limit(limit);
      }

      return query;
    });

    // Realtime stream via snapshotChanges so UI updates instantly on approvals
    return collection.snapshotChanges().pipe(
      map(snaps => snaps.map(snap => this.convertDocumentToReview(snap.payload.doc.id, snap.payload.doc.data() as ReviewDocument))),
      catchError(error => {
        console.error('Error getting reviews:', error);
        return of([]);
      })
    );
  }

  /**
   * Gets reviews by status
   */
  getReviewsByStatus(status: ReviewStatus): Observable<Review[]> {
    return this.getReviews({ status });
  }

  /**
   * Gets pending reviews for moderation
   */
  getPendingReviews(): Observable<Review[]> {
    return this.getReviewsByStatus('pending');
  }

  /**
   * Gets approved reviews for display
   */
  getApprovedReviews(): Observable<Review[]> {
    return this.getReviewsByStatus('approved');
  }

  /**
   * Updates review status (moderation)
   */
  updateReviewStatus(id: string, request: UpdateReviewStatusRequest): Observable<ReviewResponse<Review>> {
    try {
      const updateData: Partial<ReviewDocument> = {
        status: request.status,
        moderatedBy: request.moderatedBy,
        moderatedAt: Timestamp.now()
      };

      if (request.moderationNotes) {
        updateData.moderationNotes = request.moderationNotes.trim();
      }

      return from(this.reviewsCollection.doc(id).update(updateData)).pipe(
        switchMap(() => this.getReviewById(id)),
        map(review => ({
          success: true,
          data: review,
          message: `Review ${request.status} successfully`
        })),
        catchError(error => {
          console.error('Error updating review status:', error);
          return of({
            success: false,
            error: 'Failed to update review status. Please try again.'
          });
        })
      );
    } catch (error) {
      console.error('Error in updateReviewStatus:', error);
      return throwError(() => new Error('Invalid update data'));
    }
  }

  /**
   * Approves a review
   */
  approveReview(id: string, moderatedBy: string, notes?: string): Observable<ReviewResponse<Review>> {
    return this.updateReviewStatus(id, {
      status: 'approved',
      moderatedBy,
      moderationNotes: notes
    });
  }

  /**
   * Rejects a review
   */
  rejectReview(id: string, moderatedBy: string, notes?: string): Observable<ReviewResponse<Review>> {
    return this.updateReviewStatus(id, {
      status: 'rejected',
      moderatedBy,
      moderationNotes: notes
    });
  }

  /**
   * Unapproves a review (revert to pending)
   */
  unapproveReview(id: string, moderatedBy: string, notes?: string): Observable<ReviewResponse<Review>> {
    return this.updateReviewStatus(id, {
      status: 'pending',
      moderatedBy,
      moderationNotes: notes
    });
  }

  /**
   * Deletes a review
   */
  deleteReview(id: string): Observable<ReviewResponse<void>> {
    return from(this.reviewsCollection.doc(id).delete()).pipe(
      map(() => ({
        success: true,
        message: 'Review deleted successfully'
      })),
      catchError(error => {
        console.error('Error deleting review:', error);
        return of({
          success: false,
          error: 'Failed to delete review. Please try again.'
        });
      })
    );
  }

  /**
   * Gets review analytics
   */
  getReviewAnalytics(): Observable<ReviewAnalytics> {
    return this.getReviews().pipe(
      map(reviews => {
        const approvedReviews = reviews.filter(r => r.status === 'approved');
        const totalReviews = reviews.length;
        const pendingReviewsCount = reviews.filter(r => r.status === 'pending').length;

        // Calculate average rating
        const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;

        // Calculate rating distribution
        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        approvedReviews.forEach(review => {
          ratingDistribution[review.rating]++;
        });

        // Calculate status distribution
        const statusDistribution: Record<ReviewStatus, number> = {
          pending: reviews.filter(r => r.status === 'pending').length,
          approved: reviews.filter(r => r.status === 'approved').length,
          rejected: reviews.filter(r => r.status === 'rejected').length
        };

        // Calculate recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentReviews = reviews.filter(r => r.createdAt >= thirtyDaysAgo);
        const recentActivity = this.calculateRecentActivity(recentReviews);

        return {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          ratingDistribution,
          statusDistribution,
          recentActivity,
          pendingReviewsCount
        };
      }),
      catchError(error => {
        console.error('Error getting review analytics:', error);
        return of({
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          statusDistribution: { pending: 0, approved: 0, rejected: 0 },
          recentActivity: [],
          pendingReviewsCount: 0
        });
      })
    );
  }

  /**
   * Searches reviews by customer name or message
   */
  searchReviews(query: string): Observable<Review[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const searchTerm = query.trim().toLowerCase();
    
    return this.getReviews().pipe(
      map(reviews => 
        reviews.filter(review => 
          review.customerName.toLowerCase().includes(searchTerm) ||
          review.message.toLowerCase().includes(searchTerm)
        )
      )
    );
  }

  /**
   * Converts Firestore document to Review interface
   */
  private convertDocumentToReview(id: string, doc: ReviewDocument): Review {
    return {
      id,
      menuItemId: doc.menuItemId,
      customerName: doc.customerName,
      message: doc.message,
      rating: doc.rating,
      status: doc.status,
      createdAt: doc.createdAt.toDate(),
      moderatedBy: doc.moderatedBy,
      moderatedAt: doc.moderatedAt?.toDate(),
      moderationNotes: doc.moderationNotes,
      reviewerIp: doc.reviewerIp,
      userAgent: doc.userAgent,
      restaurantId: doc.restaurantId,
      ownerId: doc.ownerId
    };
  }

  /**
   * Calculates recent activity from reviews
   */
  private calculateRecentActivity(reviews: Review[]): Array<{ date: Date; count: number; averageRating: number }> {
    const activityMap = new Map<string, { count: number; totalRating: number }>();

    reviews.forEach(review => {
      const dateKey = review.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (activityMap.has(dateKey)) {
        const existing = activityMap.get(dateKey)!;
        existing.count++;
        existing.totalRating += review.rating;
      } else {
        activityMap.set(dateKey, { count: 1, totalRating: review.rating });
      }
    });

    return Array.from(activityMap.entries())
      .map(([dateKey, data]) => ({
        date: new Date(dateKey),
        count: data.count,
        averageRating: data.totalRating / data.count
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
} 