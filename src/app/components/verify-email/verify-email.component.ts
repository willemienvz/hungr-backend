import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { EmailService } from '../../shared/services/email.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  token: string = '';
  formData: any;
  isSaving: boolean = false;

  constructor(
    public authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth,
    private readonly emailService: EmailService,
    private readonly fns: AngularFireFunctions,
    private readonly http: HttpClient
  ) {}
  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['token']) {
        this.token = params['token'];
        localStorage.setItem('payflexToken', this.token);
        let data = localStorage.getItem('formData');
        this.formData = JSON.parse(data);
        console.log('storedData', JSON.parse(data));
      }
    });
  }

  verifyAndCreate() {
    this.signup(this.formData);
  }

  /* async signup(formData: any) {
    this.isSaving = true;
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        formData.userEmail,
        formData.password
      );
      const user = userCredential.user;

      if (user) {
        await user.updateProfile({
          displayName: formData.firstName,
        });

        //this.SendVerificationMail(user);
        this.emailService
          .sendConfirmationEmail(formData.userEmail, formData.firstName)
          .subscribe({
            next: () => {
              this.toastr.success('Confirmation email sent!');
              this.authService.SetUserData(user, formData);
            },
            error: (error) => {
              this.toastr.error('Failed to send confirmation email.');
              console.error('Email sending error:', error);
            },
            complete: () => {
              this.isSaving = false;
            },
          });
      }
    } catch (error) {
      this.isSaving = false;
      this.toastr.error('An error occured, please contact admin');
      console.error('Signup error:', error);
    }
  } */

  async signup(formData: any) {
    this.isSaving = true;
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        formData.userEmail,
        formData.password
      );
      const user = userCredential.user;

      if (user) {
        await user.updateProfile({
          displayName: formData.firstName,
        });

        this.emailService
          .sendConfirmationEmail(formData.userEmail, formData.firstName)
          .subscribe({
            next: () => {
              this.toastr.success('Confirmation email sent!');
              this.authService.SetUserData(user, formData);
            },
            error: (error) => {
              this.toastr.error('Failed to send confirmation email.');
              console.error('Email sending error:', error);
            },
            complete: () => {
              this.isSaving = false;
            },
          });
      }
    } catch (error) {
      this.isSaving = false;
      this.toastr.error('An error occurred, please contact admin.');
      console.error('Signup error:', error);
    }
  }

  SendVerificationMail(user: any) {
    return this.auth.currentUser
      .then((u: any) => {
        u.sendEmailVerification()
          .then(() => {
            this.toastr.success('Confirmation email sent!');
            this.authService.SetUserData(user, this.formData);
          })
          .catch((error: any) => {
            this.toastr.error(
              'Failed to send confirmation email. Please try again later.'
            );
            console.error('Error sending email verification:', error);
          });
      })
      .catch((error: any) => {
        this.toastr.error('Failed to retrieve current user.');
        console.error('Error retrieving current user:', error);
      })
      .finally(() => {
        this.isSaving = false;
      });
  }
}
