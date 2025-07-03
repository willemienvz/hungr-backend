import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  isSaving: boolean = false;

  constructor(
    public authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth
  ) {}

  ngOnInit() {
    // Check if user is logged in
    this.auth.authState.subscribe(user => {
      if (user && !user.emailVerified) {
        // User exists but email not verified
        this.toastr.info('Please check your email for verification link');
      }
    });
  }

  verifyAndCreate() {
    this.isSaving = true;
    this.authService.SendVerificationMail()
      .then(() => {
        this.toastr.success('Verification email sent! Please check your inbox.');
      })
      .catch((error) => {
        this.toastr.error('Error sending verification email. Please try again.');
        console.error('Error:', error);
      })
      .finally(() => {
        this.isSaving = false;
      });
  }
}
