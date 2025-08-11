import { Component, computed, input, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';
import { User } from '../../../shared/services/user';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ReviewsService } from '../../../shared/services/reviews.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  accountType1: boolean;
  userProfile: User;
  currentRoute: string;
  pendingReviewsCount: number = 0;

  constructor(
    private firestore: AngularFirestore, 
    private router: Router,
    private reviewsService: ReviewsService
  ){
    this.fetchUsers();
    this.loadPendingReviewsCount();
  }

private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.firestore.collection<User>('users', ref => ref.where('uid', '==', user.uid))
      .valueChanges()
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
    this.reviewsService.getPendingReviews().subscribe(reviews => {
      this.pendingReviewsCount = reviews.length;
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
}
