import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getAuth, confirmPasswordReset } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { environment } from '../../../../environments/environment'; 

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrls: ['./new-password.component.scss']
})
export class NewPasswordComponent implements OnInit {
  showPopup: boolean = true;
  oobCode: string | null = null;
  newPassword: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // ✅ Ensure Firebase is initialized before using Firebase services
    if (!getApps().length) {
      initializeApp(environment.firebase);
      console.log("Firebase App initialized"); // Debugging
    }

    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode');
    console.log("ngOnInit() - oobCode:", this.oobCode);
  }

  async resetPassword() {
    console.log("resetPassword() called");

    if (this.oobCode && this.newPassword) {
      try {
        console.log("oobCode and newPassword are set", this.oobCode, this.newPassword);

        // ✅ Ensure getAuth() is used after Firebase is initialized
        const auth = getAuth();
        console.log("Auth instance created:", auth);

        await confirmPasswordReset(auth, this.oobCode, this.newPassword);
        console.log("Password reset successful");
        alert("Password reset successful! Redirecting to login...");
        setTimeout(() => this.router.navigate(['/sign-in']), 3000);
      } catch (error) {
        console.error("Error resetting password:", error);
        alert("Failed to reset password. Please try again.");
      }
    } else {
      alert("Invalid password reset link.");
    }
  }

  closePopup() {
    this.router.navigate(['/sign-in']);
  }
}
