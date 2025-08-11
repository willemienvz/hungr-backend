/**
 * Reviews Service Unit Tests
 */

import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { of } from 'rxjs';
import { ReviewsService } from './reviews.service';
import { Review, ReviewStatus } from '../types/review.interface';
import { Timestamp } from 'firebase/firestore';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockFirestore: jasmine.SpyObj<AngularFirestore>;
  let mockCollection: jasmine.SpyObj<any>;
  let mockDoc: jasmine.SpyObj<any>;

  const mockReview: Review = {
    id: 'test-id',
    customerName: 'John Doe',
    message: 'Great food and service!',
    rating: 5,
    status: 'pending',
    createdAt: new Date(),
    reviewerIp: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  };

  const mockReviewDocument = {
    id: 'test-id',
    customerName: 'John Doe',
    message: 'Great food and service!',
    rating: 5,
    status: 'pending',
    createdAt: Timestamp.now(),
    reviewerIp: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  };

  beforeEach(() => {
    mockCollection = jasmine.createSpyObj('collection', ['add', 'doc', 'ref']);
    mockDoc = jasmine.createSpyObj('doc', ['valueChanges', 'update', 'delete']);
    
    mockFirestore = jasmine.createSpyObj('AngularFirestore', ['collection']);
    mockFirestore.collection.and.returnValue(mockCollection);
    mockCollection.doc.and.returnValue(mockDoc);

    TestBed.configureTestingModule({
      providers: [
        ReviewsService,
        { provide: AngularFirestore, useValue: mockFirestore }
      ]
    });

    service = TestBed.inject(ReviewsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createReview', () => {
    it('should create a new review successfully', (done) => {
      const createRequest = {
        customerName: 'John Doe',
        message: 'Great food and service!',
        rating: 5,
        reviewerIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const mockDocRef = { id: 'test-id' };
      mockCollection.add.and.returnValue(Promise.resolve(mockDocRef));
      mockDoc.valueChanges.and.returnValue(of(mockReviewDocument));

      service.createReview(createRequest).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.message).toContain('submitted successfully');
        expect(mockCollection.add).toHaveBeenCalledWith(jasmine.objectContaining({
          customerName: 'John Doe',
          message: 'Great food and service!',
          rating: 5,
          status: 'pending'
        }));
        done();
      });
    });

    it('should handle errors when creating review', (done) => {
      const createRequest = {
        customerName: 'John Doe',
        message: 'Great food and service!',
        rating: 5
      };

      mockCollection.add.and.returnValue(Promise.reject(new Error('Database error')));

      service.createReview(createRequest).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to submit review');
        done();
      });
    });
  });

  describe('getReviewById', () => {
    it('should get a review by ID successfully', (done) => {
      mockDoc.valueChanges.and.returnValue(of(mockReviewDocument));

      service.getReviewById('test-id').subscribe(review => {
        expect(review.id).toBe('test-id');
        expect(review.customerName).toBe('John Doe');
        expect(review.rating).toBe(5);
        done();
      });
    });

    it('should throw error when review not found', (done) => {
      mockDoc.valueChanges.and.returnValue(of(null));

      service.getReviewById('non-existent-id').subscribe({
        error: (error) => {
          expect(error.message).toBe('Review not found');
          done();
        }
      });
    });
  });

  describe('getReviews', () => {
    it('should get all reviews successfully', (done) => {
      const mockSnapshot = {
        docs: [
          { id: 'test-id-1', data: () => mockReviewDocument },
          { id: 'test-id-2', data: () => ({ ...mockReviewDocument, id: 'test-id-2' }) }
        ]
      };

      mockCollection.ref = jasmine.createSpyObj('ref', ['where', 'orderBy', 'limit', 'get']);
      mockCollection.ref.where.and.returnValue(mockCollection.ref);
      mockCollection.ref.orderBy.and.returnValue(mockCollection.ref);
      mockCollection.ref.limit.and.returnValue(mockCollection.ref);
      mockCollection.ref.get.and.returnValue(Promise.resolve(mockSnapshot));

      service.getReviews().subscribe(reviews => {
        expect(reviews.length).toBe(2);
        expect(reviews[0].id).toBe('test-id-1');
        expect(reviews[1].id).toBe('test-id-2');
        done();
      });
    });

    it('should apply filters correctly', (done) => {
      const mockSnapshot = { docs: [] };
      const filters = {
        status: 'pending' as ReviewStatus,
        ratingRange: { min: 4, max: 5 },
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const
      };

      mockCollection.ref = jasmine.createSpyObj('ref', ['where', 'orderBy', 'limit', 'get']);
      mockCollection.ref.where.and.returnValue(mockCollection.ref);
      mockCollection.ref.orderBy.and.returnValue(mockCollection.ref);
      mockCollection.ref.limit.and.returnValue(mockCollection.ref);
      mockCollection.ref.get.and.returnValue(Promise.resolve(mockSnapshot));

      service.getReviews(filters).subscribe(() => {
        expect(mockCollection.ref.where).toHaveBeenCalledWith('status', '==', 'pending');
        expect(mockCollection.ref.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
        done();
      });
    });
  });

  describe('updateReviewStatus', () => {
    it('should update review status successfully', (done) => {
      const updateRequest = {
        status: 'approved' as ReviewStatus,
        moderatedBy: 'admin-user-id',
        moderationNotes: 'Approved after review'
      };

      mockDoc.update.and.returnValue(Promise.resolve());
      mockDoc.valueChanges.and.returnValue(of(mockReviewDocument));

      service.updateReviewStatus('test-id', updateRequest).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.message).toContain('approved successfully');
        expect(mockDoc.update).toHaveBeenCalledWith(jasmine.objectContaining({
          status: 'approved',
          moderatedBy: 'admin-user-id',
          moderationNotes: 'Approved after review'
        }));
        done();
      });
    });
  });

  describe('approveReview', () => {
    it('should approve a review successfully', (done) => {
      mockDoc.update.and.returnValue(Promise.resolve());
      mockDoc.valueChanges.and.returnValue(of(mockReviewDocument));

      service.approveReview('test-id', 'admin-user-id', 'Great review').subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.message).toContain('approved successfully');
        done();
      });
    });
  });

  describe('rejectReview', () => {
    it('should reject a review successfully', (done) => {
      mockDoc.update.and.returnValue(Promise.resolve());
      mockDoc.valueChanges.and.returnValue(of(mockReviewDocument));

      service.rejectReview('test-id', 'admin-user-id', 'Inappropriate content').subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.message).toContain('rejected successfully');
        done();
      });
    });
  });

  describe('deleteReview', () => {
    it('should delete a review successfully', (done) => {
      mockDoc.delete.and.returnValue(Promise.resolve());

      service.deleteReview('test-id').subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.message).toContain('deleted successfully');
        expect(mockDoc.delete).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('getReviewAnalytics', () => {
    it('should return correct analytics', (done) => {
      const mockReviews = [
        { ...mockReview, status: 'approved' as ReviewStatus, rating: 5 },
        { ...mockReview, id: 'test-2', status: 'approved' as ReviewStatus, rating: 4 },
        { ...mockReview, id: 'test-3', status: 'pending' as ReviewStatus, rating: 3 }
      ];

      spyOn(service, 'getReviews').and.returnValue(of(mockReviews));

      service.getReviewAnalytics().subscribe(analytics => {
        expect(analytics.totalReviews).toBe(3);
        expect(analytics.averageRating).toBe(4.5);
        expect(analytics.pendingReviewsCount).toBe(1);
        expect(analytics.statusDistribution.approved).toBe(2);
        expect(analytics.statusDistribution.pending).toBe(1);
        done();
      });
    });
  });

  describe('searchReviews', () => {
    it('should search reviews by query', (done) => {
      const mockReviews = [
        { ...mockReview, customerName: 'John Doe', message: 'Great food' },
        { ...mockReview, id: 'test-2', customerName: 'Jane Smith', message: 'Amazing service' }
      ];

      spyOn(service, 'getReviews').and.returnValue(of(mockReviews));

      service.searchReviews('John').subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].customerName).toBe('John Doe');
        done();
      });
    });

    it('should return empty array for short queries', (done) => {
      service.searchReviews('a').subscribe(results => {
        expect(results.length).toBe(0);
        done();
      });
    });
  });
}); 