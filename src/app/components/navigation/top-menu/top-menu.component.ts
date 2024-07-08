import { Component, HostListener } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-top-menu',
  templateUrl: './top-menu.component.html',
  styleUrls: ['./top-menu.component.scss']
})
export class TopMenuComponent {
  constructor(public authService: AuthService) {}

  isSearchBarExpanded = false;
  isProfileExpanded = false;
  isNotificationsExpanded = false;

  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    if (!(event.target as HTMLElement).closest('.search-bar')) {
      this.isSearchBarExpanded = false; 
    }
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
