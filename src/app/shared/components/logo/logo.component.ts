import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
  @Input() containerClass: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onLogoClick(): void {
    // Check if user is logged in
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/sign-in']);
    }
  }
}
