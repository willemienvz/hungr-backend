import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-top-menu',
  templateUrl: './top-menu.component.html',
  styleUrls: ['./top-menu.component.scss']
})
export class TopMenuComponent implements OnInit{
  userProfile: any;
  pageTitle: string = 'Overview Dashboard';

  constructor(public authService: AuthService,private firestore: AngularFirestore,private router: Router, private activatedRoute: ActivatedRoute) {
    this.fetchUsers();
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
}
