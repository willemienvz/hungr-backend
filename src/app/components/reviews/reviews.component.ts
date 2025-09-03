import { Component, OnInit } from '@angular/core';
import { ReviewsService } from '../../shared/services/reviews.service';
import { Review, ReviewStatus } from '../../shared/types/review.interface';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, debounceTime, distinctUntilChanged, startWith, tap } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { Menu } from '../../shared/services/menu';

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
  paginatedReviews$: Observable<Review[]>;
  totalPages$: Observable<number>;
  currentFilter: ReviewStatus | 'all' = 'all';
  loading = false;
  searchControl = new FormControl('');
  private menuItemFilter$ = new BehaviorSubject<string>('all');
  pageIndex$ = new BehaviorSubject<number>(1);
  pageSize = 20;
  currentUserId = 'admin'; // fallback
  reviewFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  private reviewsSubject$ = new BehaviorSubject<Review[]>([]);
  private pendingReviewsSubject$ = new BehaviorSubject<Review[]>([]);
  private approvedReviewsSubject$ = new BehaviorSubject<Review[]>([]);
  private rejectedReviewsSubject$ = new BehaviorSubject<Review[]>([]);

  constructor(
    private reviewsService: ReviewsService,
    private authService: AuthService,
    private firestore: AngularFirestore
  ) {
    // Use subjects that we can update without recreating observables
    this.reviews$ = this.reviewsSubject$.asObservable();
    this.pendingReviews$ = this.pendingReviewsSubject$.asObservable();
    this.approvedReviews$ = this.approvedReviewsSubject$.asObservable();
    this.rejectedReviews$ = this.rejectedReviewsSubject$.asObservable();

    // Set up filtered reviews with search
    this.filteredReviews$ = this.getFilteredReviews();
    this.paginatedReviews$ = combineLatest([this.filteredReviews$, this.pageIndex$]).pipe(
      map(([reviews, pageIndex]) => {
        const start = (pageIndex - 1) * this.pageSize;
        return reviews.slice(start, start + this.pageSize);
      })
    );
    this.totalPages$ = this.filteredReviews$.pipe(
      map(reviews => reviews.length > 0 ? Math.ceil(reviews.length / this.pageSize) : 0)
    );
  }

  ngOnInit(): void {
    // Load current user and scope lists by owner
    this.authService.getCurrentUserId().then(uid => {
      if (uid) {
        this.currentUserId = uid;
        
        // Subscribe to the service observables and update our subjects
        this.reviewsService.getReviews({ ownerId: uid }).subscribe(reviews => {
          this.reviewsSubject$.next(reviews);
        });
        
        this.reviewsService.getReviews({ status: 'pending', ownerId: uid }).subscribe(reviews => {
          this.pendingReviewsSubject$.next(reviews);
        });
        
        this.reviewsService.getReviews({ status: 'approved', ownerId: uid }).subscribe(reviews => {
          this.approvedReviewsSubject$.next(reviews);
        });
        
        this.reviewsService.getReviews({ status: 'rejected', ownerId: uid }).subscribe(reviews => {
          this.rejectedReviewsSubject$.next(reviews);
        });
        
        this.loadRestaurantsForOwner(uid);
        this.loadMenuItemsForOwner(uid);
      }
      this.loadReviews();
      this.loading = false;
    });
  }

  loadReviews(): void {
    this.loading = true;
    // The observables will automatically update when data changes
    this.loading = false;
  }

  setFilter(filter: ReviewStatus | 'all'): void {
    this.currentFilter = filter;
    // The filtered reviews will automatically update since they depend on the subjects
    this.loadReviews();
  }

  onFilterChange(value: string): void {
    this.setFilter(value as ReviewStatus | 'all');
    this.pageIndex$.next(1);
  }

  onMenuItemFilterChange(value: string): void {
    this.menuItemFilter$.next(value || 'all');
    this.pageIndex$.next(1);
  }

  goToPage(page: number, totalPages: number): void {
    const safe = Math.min(Math.max(page, 1), totalPages);
    this.pageIndex$.next(safe);
  }

  getFilteredReviews(): Observable<Review[]> {
    const baseReviews$ = this.getBaseReviews();
    const searchTerm$ = this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value || ''),
      debounceTime(300),
      distinctUntilChanged(),
      map(term => term?.toLowerCase() || '')
    );

    return combineLatest([baseReviews$, searchTerm$, this.menuItemFilter$]).pipe(
      tap(([reviews]) => this.ensureModeratorNamesCached(reviews)),
      map(([reviews, searchTerm, menuItemId]) => {
        let result = reviews;
        if (searchTerm) {
          result = result.filter(review =>
            review.customerName.toLowerCase().includes(searchTerm) ||
            review.message.toLowerCase().includes(searchTerm)
          );
        }
        if (menuItemId && menuItemId !== 'all') {
          result = result.filter(r => (r.menuItemId || '') === menuItemId);
        }
        const statusPriority: Record<ReviewStatus, number> = { pending: 0, approved: 1, rejected: 2 } as const;
        result = [...result].sort((a, b) => {
          const pa = statusPriority[a.status];
          const pb = statusPriority[b.status];
          if (pa !== pb) return pa - pb;
          return (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0);
        });
        return result;
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

  unapproveReview(review: Review): void {
    this.loading = true;
    this.reviewsService.unapproveReview(review.id, this.currentUserId, 'Reverted to pending by admin').subscribe({
      next: (result) => {
        if (result.success) {
          console.log('Review unapproved successfully');
          this.loadReviews();
        } else {
          console.error('Failed to unapprove review:', result.error);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error unapproving review:', error);
        this.loading = false;
      }
    });
  }

  // ===== Display helpers and caching for names =====
  restaurantNameMap: Record<string, string> = {};
  userNameMap: Record<string, string> = {};
  menuItemNameMap: Record<string, string> = {};
  menuItems: { itemId: string; name: string }[] = [];

  private loadRestaurantsForOwner(ownerId: string): void {
    this.firestore
      .collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', ownerId))
      .valueChanges()
      .subscribe(restaurants => {
        restaurants.forEach(r => {
          if (r.restaurantID) this.restaurantNameMap[r.restaurantID] = r.restaurantName;
        });
      });
  }

  private loadMenuItemsForOwner(ownerId: string): void {
    this.firestore
      .collection<Menu>('menus', ref => ref.where('OwnerID', '==', ownerId))
      .valueChanges()
      .subscribe(menus => {
        this.menuItems = [];
        menus.forEach(menu => {
          const items: any[] = (menu as any).items || (menu as any).menuItems || [];
          items.forEach(item => {
            if (item?.itemId && item?.name) {
              this.menuItemNameMap[item.itemId] = item.name;
              this.menuItems.push({
                itemId: item.itemId,
                name: item.name
              });
            }
          });
        });
      });
  }

  getRestaurantName(restaurantId?: string | null): string {
    if (!restaurantId) return '';
    return this.restaurantNameMap[restaurantId] || restaurantId;
  }

  private ensureModeratorNamesCached(reviews: Review[]): void {
    reviews.forEach(r => {
      const uid = r.moderatedBy;
      if (uid && !this.userNameMap[uid]) {
        this.firestore
          .collection<any>('users', ref => ref.where('uid', '==', uid))
          .valueChanges()
          .pipe(startWith([] as any[]))
          .subscribe(users => {
            const u = users && users[0];
            if (u) {
              const display = [u.firstName, u.Surname].filter(Boolean).join(' ').trim() || u.email || uid;
              this.userNameMap[uid] = display;
            }
          });
      }
    });
  }

  getUserName(uid?: string | null): string {
    if (!uid) return '';
    return this.userNameMap[uid] || uid;
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