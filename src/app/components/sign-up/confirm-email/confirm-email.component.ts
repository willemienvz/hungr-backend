import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-confirm-email',
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.scss']
})
export class ConfirmEmailComponent implements OnInit {

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly afAuth: AngularFireAuth
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      const oobCode = params['oobCode'];

      if (mode === 'verifyEmail' && oobCode) {
        this.verifyEmail(oobCode);
      }
    });
  }

  verifyEmail(oobCode: string) {
    this.afAuth.applyActionCode(oobCode)
      .then(() => {
        console.log('Email successfully verified!');

        this.afAuth.currentUser.then(user => user?.reload());

        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Error verifying email:', error);
        alert(`Error verifying email: ${error.message}`);

        this.router.navigate(['/']);
      });
  }
}
