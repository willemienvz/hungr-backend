import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-confirm-email',
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.scss']
})
export class ConfirmEmailComponent implements OnInit {
  
  verifying = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly afAuth: AngularFireAuth,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  async ngOnInit() {
    const uid = this.route.snapshot.queryParamMap.get('uid');

    if (uid) {
      await this.verifyEmail(uid);
    } else {
      this.toastr.error('Invalid verification link.');
      this.verifying = false;
    }
  }

  async verifyEmail(uid: string) {
    try {
      const user = await this.afAuth.currentUser;

      if (user && user.uid === uid) {
        // Refresh the user state from Firebase
        await user.reload(); 

        // Check if the user is verified
        if (user.emailVerified) {
          this.toastr.success('Email verified successfully!');
          this.router.navigate(['/login']);
        } else {
          this.toastr.error('Email verification failed or the link is invalid.');
        }
      } else {
        this.toastr.error('Invalid or expired verification link.');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      this.toastr.error('Failed to verify email.');
    } finally {
      this.verifying = false;
    }
  }
}
