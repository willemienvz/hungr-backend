import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  constructor(public authService: AuthService) {}
  ngOnInit(): void {}

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