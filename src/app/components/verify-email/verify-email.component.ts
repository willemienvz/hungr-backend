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
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(formData.userEmail, formData.password);
      const user = userCredential.user;
  
      if (user) {
        await user.updateProfile({
          displayName: formData.firstName
        });
  
        const confirmationLink = `https://your-angular-app.com/confirm-email?uid=${user.uid}`;


        this.emailService.sendConfirmationEmail(formData.userEmail, confirmationLink, formData.firstName).subscribe({
          next: () => {
            this.authService.SetUserData(user, this.formData);
            alert('Confirmation email sent!')
            this.toastr.success('Confirmation email sent!');
          },
          error: (err) =>
            this.toastr.success('Error sending email:', err)
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
    }
  }
}