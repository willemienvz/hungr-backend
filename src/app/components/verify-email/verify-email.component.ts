import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { EmailService } from '../../shared/services/email.service';
@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  token: string = '';
  formData:any;
  isSaving: boolean = false;
  constructor(
    public authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly toastr: ToastrService,
    private readonly auth: AngularFireAuth,
    private readonly emailService: EmailService,
  ) { }
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        localStorage.setItem('payflexToken', this.token);
        let data = localStorage.getItem('formData');
        this.formData = JSON.parse(data)
        console.log('storedData', JSON.parse(data));

      }
    });
   
  }

  verifyAndCreate(){
    this.signup(this.formData);
  }


  async signup(formData:any) {
    this.isSaving = true;
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(formData.userEmail, formData.password);
      const user = userCredential.user;
  
      if (user) {
        await user.updateProfile({
          displayName: formData.firstName
        });
  
        //const confirmationLink = `https://main.d9ek0iheftizq.amplifyapp.com/confirm-email?uid=${user.uid}`;

        this.SendVerificationMail(user);
     /*   this.emailService.sendConfirmationEmail(formData.userEmail, confirmationLink, formData.firstName).subscribe({
          next: () => {
            this.authService.SetUserData(user, this.formData);
            this.toastr.success('Confirmation email sent!');
            this.isSaving = false;
          },
          error: (err) =>
          {
            this.toastr.success('Error sending email:', err)
            this.isSaving = false;
          }
            
        }); */
      }
    } catch (error) {
      this.isSaving = false;
      console.error('Signup error:', error);
    }
  }

  SendVerificationMail(user:any) {
    return this.auth.currentUser
      .then((u: any) => {
        u.sendEmailVerification()
        this.toastr.success('Confirmation email sent!');
        this.isSaving = false;
        this.authService.SetUserData(user, this.formData);

      })
  }
}