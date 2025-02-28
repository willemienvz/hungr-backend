import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-confirm-email',
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.scss']
})
export class ConfirmEmailComponent implements OnInit {
  verifying: boolean = true;
  private readonly verifyEmailFunctionUrl = 'https://us-central1-your-project-id.cloudfunctions.net/verifyEmailByUID';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit() {
    const uid = this.route.snapshot.queryParamMap.get('uid'); // Extract UID from URL

    if (uid) {
      this.verifyEmail(uid);
    } else {
      this.toastr.error('Invalid verification link.');
      this.verifying = false;
    }
  }

  verifyEmail(uid: string) {
    this.http.post(this.verifyEmailFunctionUrl, { uid }).subscribe({
      next: () => {
        this.toastr.success('Email verified successfully!');
        this.router.navigate(['/login']); // Redirect user
      },
      error: (err) => {
        console.error('Email verification error:', err);
        this.toastr.error('Failed to verify email.');
      },
      complete: () => {
        this.verifying = false;
      }
    });
  }
}
