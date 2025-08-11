import { Component, OnInit } from '@angular/core';
import { ReviewsService } from '../../shared/services/reviews.service';
import { Review, ReviewStatus } from '../../shared/types/review.interface';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit {
  reviews$: Observable<Review[]>;
  pendingReviews$: Observable<Review[]>;
  approvedReviews$: Observable<Review[]>;
  rejectedReviews$: Observable<Review[]>;
  filteredReviews$: Observable<Review[]>;
  currentFilter: ReviewStatus | 'all' = 'all';
  loading = false;
  searchControl = new FormControl('');
  currentUserId = 'admin'; // This should come from auth service in real implementation

  constructor(private reviewsService: ReviewsService) {
    this.reviews$ = this.reviewsService.getReviews();
    this.pendingReviews$ = this.reviewsService.getPendingReviews();
    this.approvedReviews$ = this.reviewsService.getApprovedReviews();
    this.rejectedReviews$ = this.reviewsService.getReviewsByStatus('rejected');
    
    // Set up filtered reviews with search
    this.filteredReviews$ = this.getFilteredReviews();
  }

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    // The observables will automatically update when data changes
    this.loading = false;
  }

  setFilter(filter: ReviewStatus | 'all'): void {
    this.currentFilter = filter;
    this.loadReviews();
  }

  getFilteredReviews(): Observable<Review[]> {
    const baseReviews$ = this.getBaseReviews();
    const searchTerm$ = this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      map(term => term?.toLowerCase() || '')
    );

    return combineLatest([baseReviews$, searchTerm$]).pipe(
      map(([reviews, searchTerm]) => {
        if (!searchTerm) return reviews;
        return reviews.filter(review => 
          review.customerName.toLowerCase().includes(searchTerm) ||
          review.message.toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  private getBaseReviews(): Observable<Review[]> {
    switch (this.currentFilter) {
      case 'pending':
        return this.pendingReviews$;
      case 'approved':
        return this.approvedReviews$;
      case 'rejected':
        return this.rejectedReviews$;
      default:
        return this.reviews$;
    }
  }

  approveReview(review: Review): void {
    this.loading = true;
    this.reviewsService.approveReview(review.id, this.currentUserId, 'Approved by admin').subscribe({
      next: (result) => {
        if (result.success) {
          console.log('Review approved successfully');
          this.loadReviews();
        } else {
          console.error('Failed to approve review:', result.error);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error approving review:', error);
        this.loading = false;
      }
    });
  }

  rejectReview(review: Review): void {
    this.loading = true;
    this.reviewsService.rejectReview(review.id, this.currentUserId, 'Rejected by admin').subscribe({
      next: (result) => {
        if (result.success) {
          console.log('Review rejected successfully');
          this.loadReviews();
        } else {
          console.error('Failed to reject review:', result.error);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error rejecting review:', error);
        this.loading = false;
      }
    });
  }

  deleteReview(review: Review): void {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      this.loading = true;
      this.reviewsService.deleteReview(review.id).subscribe({
        next: (result) => {
          if (result.success) {
            console.log('Review deleted successfully');
            this.loadReviews();
          } else {
            console.error('Failed to delete review:', result.error);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.loading = false;
        }
      });
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchControl.setValue(target.value);
  }
} 