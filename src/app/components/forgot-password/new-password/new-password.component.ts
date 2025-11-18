import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getAuth, confirmPasswordReset } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { environment } from '../../../../environments/environment'; 
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrls: ['./new-password.component.scss']
})
export class NewPasswordComponent implements OnInit {
  showPopup: boolean = true;
  oobCode: string | null = null;
  newPassword: string = '';
  passwordError: string = '';

  constructor(private readonly route: ActivatedRoute, private readonly router: Router, private readonly toastr: ToastrService) {}

  ngOnInit() {
    if (!getApps().length) {
      initializeApp(environment.firebase);
      
    }

    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode');    
  }

  async resetPassword() {
 

    if (this.oobCode && this.newPassword) {
      try {
       

     
        const auth = getAuth();
        console.log(this.newPassword);

        await confirmPasswordReset(auth, this.oobCode, this.newPassword);
        this.toastr.success('Password reset successful! Redirecting to login');
        setTimeout(() => this.router.navigate(['/sign-in']), 3000);
      } catch (error) {
        this.toastr.error('Failed to reset password. Please try again later');
      }
    } else {
      this.toastr.error('Invalid password reset link.');
    }
  }

  closePopup() {
    this.router.navigate(['/sign-in']);
  }

  onPasswordChange(value: string): void {
    // Clear error when user starts typing
    if (this.passwordError) {
      this.passwordError = '';
    }
  }
}
