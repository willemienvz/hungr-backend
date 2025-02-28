import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { getAuth, confirmPasswordReset } from 'firebase/auth';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrl: './new-password.component.scss'
})
export class NewPasswordComponent implements OnInit {
 showPopup: boolean = true;
 mode: string | null = null;
 oobCode: string | null = null;
 newPassword: string = '';

  constructor(
    public authService: AuthService,
    private readonly route: ActivatedRoute, private readonly router: Router
  ) { }
  ngOnInit() {
    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode');
    this.mode = this.route.snapshot.queryParamMap.get('mode');
  }

  openPopup() {
    this.showPopup = true;
  }
  async resetPassword() {
    if (this.oobCode && this.newPassword) {
      try {
        const auth = getAuth();
        await confirmPasswordReset(auth, this.oobCode, this.newPassword);
        alert("Password reset successful! Redirecting to login...");
        setTimeout(() => this.router.navigate(['/login']), 3000);
      } catch (error) {
        console.error("Error resetting password:", error);
        alert("Failed to reset password. Please try again.");
      }
    } else {
      alert("Invalid password reset link.");
    }
  }
  closePopup() {
    this.showPopup = false;
  }
}
