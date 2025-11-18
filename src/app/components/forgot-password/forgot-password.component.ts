import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  showPopup: boolean = false;
  emailError: string = '';

  constructor(
    public authService: AuthService
  ) { }

  ngOnInit() {
  }

  openPopup() {
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  onEmailChange(value: string): void {
    // Clear error when user starts typing
    if (this.emailError) {
      this.emailError = '';
    }
  }
}