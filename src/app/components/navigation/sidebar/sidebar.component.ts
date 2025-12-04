import { Component, computed, input, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter, takeUntil, switchMap, map } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { User } from '../../../shared/services/user';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ReviewsService } from '../../../shared/services/reviews.service';
import { MobileMenuService } from '../../../shared/services/mobile-menu.service';
import { AuthService } from '../../../shared/services/auth.service';
import { Restaurant } from '../../../shared/services/restaurant';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  accountType1: boolean;
  userProfile: User;
  currentRoute: string;
  pendingReviewsCount: number = 0;
  isMobileMenuOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private firestore: AngularFirestore, 
    private router: Router,
    private reviewsService: ReviewsService,
    private mobileMenuService: MobileMenuService,
    private authService: AuthService
  ){
    this.fetchUsers();
    this.loadPendingReviewsCount();
  }

private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.firestore.collection<User>('users', ref => ref.where('uid', '==', user.uid))
      .valueChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.userProfile = result[0];
        this.accountType1 = this.isAccountType1();
        localStorage.setItem('accountType', this.accountType1.toString())
      });
  }

  isAccountType1(): boolean {
    return this.userProfile.subscriptionType.includes('1');
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
    });

    // Subscribe to mobile menu state
    this.mobileMenuService.isMobileMenuOpen$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isOpen => {
      this.isMobileMenuOpen = isOpen;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isMenusRouteActive(): boolean {
    return this.currentRoute?.startsWith('/menus') || false;
  }

  isMediaLibraryRouteActive(): boolean {
    return this.currentRoute?.startsWith('/media-library') || false;
  }
  
  isRestaurantRouteActive(): boolean {
    return this.currentRoute?.startsWith('/restaurants') || false;
  }

  isReviewsRouteActive(): boolean {
    return this.currentRoute?.startsWith('/reviews') || false;
  }

  loadPendingReviewsCount(): void {
    this.authService.getCurrentUserId().then(uid => {
      if (uid) {
        // First, get all restaurants owned by this user
        this.firestore
          .collection<Restaurant>('restaurants', ref => ref.where('ownerID', '==', uid))
          .valueChanges()
          .pipe(
            takeUntil(this.destroy$),
            switchMap(restaurants => {
              const restaurantIds = restaurants.map(r => r.restaurantID).filter(id => !!id);
              
              // Fetch pending reviews and filter by restaurant IDs or ownerId
              // Note: Firestore 'in' query has a limit of 10 items
              // For now, we'll fetch all pending reviews and filter client-side
              // This ensures we get all reviews even if user has > 10 restaurants
              return this.reviewsService.getReviews({ status: 'pending' }).pipe(
                takeUntil(this.destroy$),
                map(reviews => {
                  // Filter reviews to only include those for the user's restaurants
                  // OR reviews that have the user's ownerId
                  return reviews.filter(review => {
                    // Check if review belongs to one of the user's restaurants
                    const belongsToUserRestaurant = review.restaurantId && restaurantIds.includes(review.restaurantId);
                    // Check if review has the user's ownerId
                    const belongsToUser = review.ownerId === uid;
                    return belongsToUserRestaurant || belongsToUser;
                  });
                })
              );
            }),
            takeUntil(this.destroy$)
          )
          .subscribe(reviews => {
            this.pendingReviewsCount = reviews.length;
          });
      } else {
        this.pendingReviewsCount = 0;
      }
    });
  }

  setActiveMenu(url: string) {
    const links = document.querySelectorAll('.sidebar a');
    links.forEach(link => {
      const linkRoute = link.getAttribute('routerLink') || link.getAttribute('href');
      if (linkRoute === url) {
        link.classList.add('activeMenu');
      } else {
        link.classList.remove('activeMenu');
      }
    });
  }

  closeMobileMenu(): void {
    this.mobileMenuService.closeMobileMenu();
  }

  onSidebarClick(event: MouseEvent): void {
    // Prevent clicks inside the sidebar from closing it
    event.stopPropagation();
  }
}
