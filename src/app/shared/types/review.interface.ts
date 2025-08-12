/**
 * Review Types and Interfaces
 * 
 * This file contains all TypeScript interfaces and types for the Reviews System.
 * These types define the structure for customer reviews, moderation workflow, and review management.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Represents a customer review with comprehensive metadata
 */
export interface Review {
  /** Unique identifier for the review */
  id: string;
  /** Menu item being reviewed */
  menuItemId: string;
  
  /** Customer's name as provided in the review */
  customerName: string;
  
  /** Customer's review message/feedback */
  message: string;
  
  /** Star rating (1-5) */
  rating: number;
  
  /** Current status of the review */
  status: ReviewStatus;
  
  /** Timestamp when the review was created */
  createdAt: Date;
  
  /** Optional admin user ID who moderated the review */
  moderatedBy?: string;
  
  /** Optional timestamp when the review was moderated */
  moderatedAt?: Date;
  
  /** Optional moderation notes from admin */
  moderationNotes?: string;
  
  /** IP address of the reviewer (for spam prevention) */
  reviewerIp?: string;
  
  /** User agent string (for spam prevention) */
  userAgent?: string;
}

/**
 * Review status enumeration
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Firestore document representation of a review
 */
export interface ReviewDocument {
  id?: string;
  menuItemId: string;
  customerName: string;
  message: string;
  rating: number;
  status: ReviewStatus;
  createdAt: Timestamp;
  moderatedBy?: string;
  moderatedAt?: Timestamp;
  moderationNotes?: string;
  reviewerIp?: string;
  userAgent?: string;
}

/**
 * Request payload for creating a new review
 */
export interface CreateReviewRequest {
  /** Customer's name */
  customerName: string;
  
  /** Customer's review message */
  message: string;
  
  /** Star rating (1-5) */
  rating: number;
  
  /** Optional IP address for spam prevention */
  reviewerIp?: string;
  
  /** Optional user agent for spam prevention */
  userAgent?: string;
}

/**
 * Request payload for updating review status
 */
export interface UpdateReviewStatusRequest {
  /** New status for the review */
  status: ReviewStatus;
  
  /** Admin user ID performing the moderation */
  moderatedBy: string;
  
  /** Optional moderation notes */
  moderationNotes?: string;
}

/**
 * Response wrapper for review operations
 */
export interface ReviewResponse<T = Review | Review[]> {
  /** Whether the operation was successful */
  success: boolean;
  
  /** The data returned from the operation */
  data?: T;
  
  /** Error message if the operation failed */
  error?: string;
  
  /** Success message or additional information */
  message?: string;
}

/**
 * Filters for querying reviews
 */
export interface ReviewFilters {
  /** Filter by review status */
  status?: ReviewStatus;
  
  /** Filter by rating range */
  ratingRange?: {
    min: number;
    max: number;
  };
  
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Search query for customer name or message */
  searchQuery?: string;
  
  /** Pagination parameters */
  pagination?: {
    page: number;
    limit: number;
  };
  
  /** Sort order */
  sortBy?: 'createdAt' | 'rating' | 'customerName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Review analytics and statistics
 */
export interface ReviewAnalytics {
  /** Total number of reviews */
  totalReviews: number;
  
  /** Average rating across all approved reviews */
  averageRating: number;
  
  /** Distribution of ratings (1-5 stars) */
  ratingDistribution: Record<number, number>;
  
  /** Reviews by status */
  statusDistribution: Record<ReviewStatus, number>;
  
  /** Recent review activity */
  recentActivity: Array<{
    date: Date;
    count: number;
    averageRating: number;
  }>;
  
  /** Pending reviews count */
  pendingReviewsCount: number;
} 