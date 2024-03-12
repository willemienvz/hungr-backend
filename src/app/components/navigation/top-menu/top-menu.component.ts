import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
@Component({
  selector: 'app-top-menu',
  templateUrl: './top-menu.component.html',
  styleUrl: './top-menu.component.scss'
})
export class TopMenuComponent {
  constructor(public authService: AuthService) {}

  isSearchBarExpanded = false;
  isProfileExpanded = false;
  isNotificationsExpanded = false;

  toggleSearchBar() {
    this.isSearchBarExpanded = !this.isSearchBarExpanded;
  }

  toggleProfile() {
    this.isProfileExpanded = !this.isProfileExpanded;
  }

  toggleNotifications() {
    this.isNotificationsExpanded = !this.isNotificationsExpanded;
  }
}
