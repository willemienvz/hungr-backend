import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { Notification } from '../../../shared/services/notification';
import { NotificationsService } from '../../../shared/services/notifications.service';

@Component({
  selector: 'app-top-menu',
  templateUrl: './top-menu.component.html',
  styleUrls: ['./top-menu.component.scss']
})
export class TopMenuComponent implements OnInit{
  userProfile: any;
  pageTitle: string = 'Overview Dashboard';
  notifications: Notification[] = [];

  constructor(public authService: AuthService,private firestore: AngularFirestore,private router: Router, private activatedRoute: ActivatedRoute, private notificationService: NotificationsService) {
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
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle = this.getPageTitle(this.activatedRoute);
      });
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
    console.log(child)
    while (child) {
      if (child.snapshot.data['title']) {
        return child.snapshot.data['title'];
      }
      child = child.firstChild;
    }
    return 'Overview Dashboard';
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
