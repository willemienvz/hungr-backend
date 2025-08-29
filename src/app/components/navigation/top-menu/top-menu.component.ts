import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { Notification } from '../../../shared/services/notification';
import { NotificationsService } from '../../../shared/services/notifications.service';
import { BreadcrumbService, Breadcrumb } from '../../../shared/services/breadcrumb.service';

@Component({
  selector: 'app-top-menu',
  templateUrl: './top-menu.component.html',
  styleUrls: ['./top-menu.component.scss']
})
export class TopMenuComponent implements OnInit{
  userProfile: any;
  pageTitle: string = '';
  notifications: Notification[] = [];
  breadcrumbs: Breadcrumb[] = [];
  currentPageSubtitle: string = '';

  constructor(
    public authService: AuthService,
    private firestore: AngularFirestore,
    public router: Router, 
    private activatedRoute: ActivatedRoute, 
    private notificationService: NotificationsService,
    private breadcrumbService: BreadcrumbService
  ) {
    this.fetchUsers();
    this.fetchNotifications();
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isProfileExpanded = false;
        this.isNotificationsExpanded = false;
      }
    });
  }
  isSearchBarExpanded = false;
  isProfileExpanded = false;
  isNotificationsExpanded = false;

  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    if (!(event.target as HTMLElement).closest('.search-bar')) {
      this.isSearchBarExpanded = false; 
    }
  }

  ngOnInit(): void {
    // Subscribe to breadcrumbs
    this.breadcrumbService.breadcrumbs$.subscribe(breadcrumbs => {
      this.breadcrumbs = breadcrumbs;
    });

    // Subscribe to page title changes
    this.breadcrumbService.getCurrentPageTitle().subscribe(title => {
      this.pageTitle = title;
      this.extractSubtitle(title);
    });

    // Initial setup
    this.pageTitle = this.getPageTitle(this.activatedRoute);
    this.extractSubtitle(this.pageTitle);
  }

  private extractSubtitle(title: string): void {
    // Extract subtitle from HTML span if present
    const submenuMatch = title.match(/<span class="submenuHeading">([^<]*)<\/span>/);
    this.currentPageSubtitle = submenuMatch ? submenuMatch[1].replace('/', '').trim() : '';
  }

  private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.firestore.collection<User>('users', ref => ref.where('uid', '==', user.uid))
      .valueChanges()
      .subscribe(result => {
        this.userProfile = result[0];
      });
  }

  private fetchNotifications() {
    const user = JSON.parse(localStorage.getItem('user')!);
      this.firestore.collection<Notification>('notification', ref => ref.where('ownerID', '==', user.uid))
      .valueChanges()
      .subscribe(result => {
        this.notifications = result;
      });
  }

  toggleSearchBar() {
    this.isSearchBarExpanded = !this.isSearchBarExpanded;
  }

  toggleProfile() {
    this.isNotificationsExpanded = false;
    this.isProfileExpanded = !this.isProfileExpanded;
  }

  toggleNotifications() {
    this.isProfileExpanded = false;
    this.isNotificationsExpanded = !this.isNotificationsExpanded;
    if (this.isNotificationsExpanded){
      this.fetchNotifications();
    }else{
      this.notificationService.markAllAsUnread();
    }
  }

  getPageTitle(route: ActivatedRoute): string {
    let child = route.firstChild;
    while (child) {
      if (child.snapshot.data['title']) {
        return child.snapshot.data['title'];
      }
      child = child.firstChild;
    }
    return 'Overview Dashboard';
  }

  // Navigate to parent route when clicking on breadcrumb
  navigateToBreadcrumb(url: string): void {
    this.router.navigate([url]);
  }

  // Get the parent breadcrumb (for the main title click)
  getParentBreadcrumb(): Breadcrumb | null {
    if (this.breadcrumbs.length > 1) {
      return this.breadcrumbs[this.breadcrumbs.length - 2]; // Second to last item
    }
    return null;
  }

  // Get the current page title without HTML
  getCurrentPageTitle(): string {
    // If we have a subtitle from the route data, use it
    if (this.currentPageSubtitle) {
      return this.currentPageSubtitle;
    }
    
    // If we have breadcrumbs, get the label for the current page
    if (this.breadcrumbs.length > 0) {
      // Get the current route label
      const currentUrl = this.router.url.split('/').filter(s => s && !s.match(/^\d+$/)).join('/');
      const currentLabel = this.breadcrumbService.getRouteLabel(currentUrl);
      if (currentLabel) {
        return currentLabel;
      }
    }
    
    // Fallback to cleaning the page title
    return this.pageTitle.replace(/<[^>]*>/g, '').split('/')[0].trim();
  }

  calcTimeago(timestamp: string): string {
    const dateThen = new Date(parseInt(timestamp.toString(), 10));
    const dateNow = new Date();
    const diffInMs = dateNow.getTime() - dateThen.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000); 
  
    const seconds = diffInSeconds;
    const minutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(diffInSeconds / 3600);
    const days = Math.floor(diffInSeconds / 86400);
    const weeks = Math.floor(diffInSeconds / 604800);
    const months = Math.floor(diffInSeconds / 2592000); 
    const years = Math.floor(diffInSeconds / 31536000); 
  
    if (seconds < 60) {
      return `${seconds} seconds ago`;
    } else if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else if (days < 7) {
      return `${days} days ago`;
    } else if (weeks < 4) {
      return `${weeks} weeks ago`;
    } else if (months < 12) {
      return `${months} months ago`;
    } else {
      return `${years} years ago`;
    }
  }
}
