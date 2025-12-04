import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReviewsService } from '../../shared/services/reviews.service';
import { Review, ReviewStatus } from '../../shared/types/review.interface';
import { Observable, BehaviorSubject, combineLatest, Subject, of, EMPTY } from 'rxjs';
import { map, switchMap, debounceTime, distinctUntilChanged, startWith, tap, takeUntil, catchError, first, shareReplay } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { Menu } from '../../shared/services/menu';
import { SelectOption } from '../shared/form-select/form-select.component';

@Component({
  selector: 'app-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit, OnDestroy {
  reviews$: Observable<Review[]>;
  pendingReviews$: Observable<Review[]>;
  approvedReviews$: Observable<Review[]>;
  rejectedReviews$: Observable<Review[]>;
  filteredReviews$: Observable<Review[]>;
  paginatedReviews$: Observable<Review[]>;
  totalPages$: Observable<number>;
  currentFilter: ReviewStatus | 'all' = 'all';
  menuItemFilter: string = 'all';
  loading = false;
  searchControl = new FormControl('');
  private menuItemFilter$ = new BehaviorSubject<string>('all');
  pageIndex$ = new BehaviorSubject<number>(1);
  pageSize = 20;
  currentUserId = 'admin'; // fallback
  private destroy$ = new Subject<void>();
  reviewFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // Convert getters to properties to prevent infinite change detection loops
  reviewFilterSelectOptions: SelectOption[] = [];
  menuItemFilterSelectOptions: SelectOption[] = [];

  // Initialize static review filter options
  private initializeReviewFilterOptions(): void {
    this.reviewFilterSelectOptions = this.reviewFilterOptions.map(option => ({
      value: option.value,
      label: option.label
    }));
  }

  // Update menu item filter options when menu items change
  private updateMenuItemFilterOptions(): void {
    const options: SelectOption[] = [
      { value: 'all', label: 'All menu items' }
    ];
    this.menuItems.forEach(item => {
      options.push({
        value: item.itemId,
        label: item.name
      });
    });
    this.menuItemFilterSelectOptions = options;
  }

  private reviewsSubject$ = new BehaviorSubject<Review[]>([]);
  private pendingReviewsSubject$ = new BehaviorSubject<Review[]>([]);
  private approvedReviewsSubject$ = new BehaviorSubject<Review[]>([]);
  private rejectedReviewsSubject$ = new BehaviorSubject<Review[]>([]);

  constructor(
    private reviewsService: ReviewsService,
    private authService: AuthService,
    private firestore: AngularFirestore
  ) {
    // Initialize static review filter options
    this.initializeReviewFilterOptions();

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
    // Initialize menu item filter options with default "all" option
    this.updateMenuItemFilterOptions();
    
    // Load current user and scope lists by owner
    this.authService.getCurrentUserId().then(uid => {
      if (!uid) {
        console.error('No authenticated user found');
        this.loading = false;
        return;
      }
      
      this.currentUserId = uid;
      this.loading = true;
      
      // First, load restaurants to get restaurant IDs for filtering
      this.loadRestaurantsForOwner(uid);
      this.loadMenuItemsForOwner(uid);
      
      // Fetch restaurants ONCE and then set up review subscriptions
      // Use distinctUntilChanged to prevent duplicate emissions
      // Use shareReplay to prevent multiple subscriptions
      this.firestore
        .collection<Restaurant>('restaurants', ref => ref.where('ownerID', '==', uid))
        .valueChanges()
        .pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged((prev, curr) => {
            if (!prev || !curr) return false;
            if (prev.length !== curr.length) return false;
            // Compare by restaurant IDs
            const prevIds = prev.map(p => p.restaurantID).sort().join(',');
            const currIds = curr.map(c => c.restaurantID).sort().join(',');
            return prevIds === currIds;
          }),
          switchMap(restaurants => {
            const restaurantIds = restaurants.map(r => r.restaurantID).filter(id => !!id);
            
            if (restaurantIds.length === 0) {
              // No restaurants, return empty arrays
              return of({
                all: [] as Review[],
                pending: [] as Review[],
                approved: [] as Review[],
                rejected: [] as Review[]
              });
            }
            
            // Use combineLatest to get all review types at once, then filter
            return combineLatest([
              this.reviewsService.getReviews().pipe(
                takeUntil(this.destroy$),
                catchError(() => of([] as Review[])),
                shareReplay(1)
              ),
              this.reviewsService.getReviews({ status: 'pending' }).pipe(
                takeUntil(this.destroy$),
                catchError(() => of([] as Review[])),
                shareReplay(1)
              ),
              this.reviewsService.getReviews({ status: 'approved' }).pipe(
                takeUntil(this.destroy$),
                catchError(() => of([] as Review[])),
                shareReplay(1)
              ),
              this.reviewsService.getReviews({ status: 'rejected' }).pipe(
                takeUntil(this.destroy$),
                catchError(() => of([] as Review[])),
                shareReplay(1)
              )
            ]).pipe(
              map(([allReviews, pendingReviews, approvedReviews, rejectedReviews]) => ({
                all: this.filterReviewsByRestaurants(allReviews, restaurantIds, uid),
                pending: this.filterReviewsByRestaurants(pendingReviews, restaurantIds, uid),
                approved: this.filterReviewsByRestaurants(approvedReviews, restaurantIds, uid),
                rejected: this.filterReviewsByRestaurants(rejectedReviews, restaurantIds, uid)
              })),
              distinctUntilChanged((prev, curr) => {
                // Only update if reviews actually changed
                if (!prev || !curr) return false;
                const prevAllIds = prev.all.map(r => r.id).sort().join(',');
                const currAllIds = curr.all.map(r => r.id).sort().join(',');
                return prevAllIds === currAllIds;
              }),
              catchError((error) => {
                console.error('Error in combineLatest for reviews:', error);
                return of({
                  all: [] as Review[],
                  pending: [] as Review[],
                  approved: [] as Review[],
                  rejected: [] as Review[]
                });
              })
            );
          })
        )
        .subscribe({
          next: (filtered) => {
            this.reviewsSubject$.next(filtered.all);
            this.pendingReviewsSubject$.next(filtered.pending);
            this.approvedReviewsSubject$.next(filtered.approved);
            this.rejectedReviewsSubject$.next(filtered.rejected);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading reviews:', error);
            this.loading = false;
            // Set empty arrays to prevent undefined errors
            this.reviewsSubject$.next([]);
            this.pendingReviewsSubject$.next([]);
            this.approvedReviewsSubject$.next([]);
            this.rejectedReviewsSubject$.next([]);
          }
        });
    }).catch(error => {
      console.error('Error getting current user ID:', error);
      this.loading = false;
    });
  }

  /**
   * Filters reviews to only include those for the user's restaurants or with the user's ownerId
   */
  private filterReviewsByRestaurants(reviews: Review[], restaurantIds: string[], ownerId: string): Review[] {
    return reviews.filter(review => {
      // Check if review belongs to one of the user's restaurants
      const belongsToUserRestaurant = review.restaurantId && restaurantIds.includes(review.restaurantId);
      // Check if review has the user's ownerId
      const belongsToUser = review.ownerId === ownerId;
      return belongsToUserRestaurant || belongsToUser;
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
    this.menuItemFilter = value || 'all';
    this.menuItemFilter$.next(this.menuItemFilter);
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
    if (!ownerId) {
      console.warn('Cannot load restaurants: ownerId not provided');
      return;
    }
    
    this.firestore
      .collection<Restaurant>('restaurants', ref => ref.where('ownerID', '==', ownerId))
      .valueChanges()
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr) return false;
          if (prev.length !== curr.length) return false;
          // Compare by restaurant IDs to avoid false positives
          const prevIds = prev.map(r => r.restaurantID).sort().join(',');
          const currIds = curr.map(r => r.restaurantID).sort().join(',');
          return prevIds === currIds;
        })
      )
      .subscribe(restaurants => {
        restaurants.forEach(r => {
          if (r.restaurantID) this.restaurantNameMap[r.restaurantID] = r.restaurantName;
        });
      }, error => {
        console.error('Error loading restaurants:', error);
      });
  }

  private loadMenuItemsForOwner(ownerId: string): void {
    if (!ownerId) {
      console.warn('Cannot load menu items: ownerId not provided');
      return;
    }
    
    this.firestore
      .collection<Menu>('menus', ref => ref.where('OwnerID', '==', ownerId))
      .valueChanges()
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr) return false;
          if (prev.length !== curr.length) return false;
          // Compare by menu IDs to avoid false positives
          const prevIds = prev.map(m => (m as any).menuID).sort().join(',');
          const currIds = curr.map(m => (m as any).menuID).sort().join(',');
          return prevIds === currIds;
        })
      )
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
        // Update menu item filter options when menu items change
        this.updateMenuItemFilterOptions();
      }, error => {
        console.error('Error loading menu items:', error);
      });
  }

  getRestaurantName(restaurantId?: string | null): string {
    if (!restaurantId) return '';
    return this.restaurantNameMap[restaurantId] || restaurantId;
  }

  private ensureModeratorNamesCached(reviews: Review[]): void {
    // Get unique UIDs that need to be loaded
    const uidsToLoad = reviews
      .map(r => r.moderatedBy)
      .filter((uid): uid is string => !!uid && !this.userNameMap[uid]);
    
    // Remove duplicates
    const uniqueUids = [...new Set(uidsToLoad)];
    
    // Load each unique UID only once
    uniqueUids.forEach(uid => {
      // Mark as loading to prevent duplicate requests
      this.userNameMap[uid] = 'Loading...';
      
      this.firestore
        .collection<any>('users', ref => ref.where('uid', '==', uid))
        .valueChanges()
        .pipe(
          first(), // Only take first emission to prevent ongoing subscriptions
          takeUntil(this.destroy$),
          catchError(() => {
            // If error, just use the UID as fallback
            this.userNameMap[uid] = uid;
            return EMPTY;
          })
        )
        .subscribe(users => {
          const u = users && users[0];
          if (u) {
            const display = [u.firstName, u.Surname].filter(Boolean).join(' ').trim() || u.email || uid;
            this.userNameMap[uid] = display;
          } else {
            // Fallback to UID if user not found
            this.userNameMap[uid] = uid;
          }
        });
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

  onSearchInput(value: string): void {
    this.searchControl.setValue(value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 