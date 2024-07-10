import { Component, HostListener } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../../../shared/services/user';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-top-menu',
  templateUrl: './top-menu.component.html',
  styleUrls: ['./top-menu.component.scss']
})
export class TopMenuComponent {
  userProfile: any;
  constructor(public authService: AuthService,private firestore: AngularFirestore,private router: Router) {
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

  private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    this.firestore.collection<User>('users', ref => ref.where('uid', '==', user.uid))
      .valueChanges()
      .subscribe(result => {
        this.userProfile = result[0];
        console.log( this.userProfile)
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
}
