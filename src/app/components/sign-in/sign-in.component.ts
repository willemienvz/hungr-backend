import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";
@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})
export class SignInComponent implements OnInit {
  password: string = '';
  showPassword: boolean = false;
  emailError: string = '';
  passwordError: string = '';

  constructor(
    public authService: AuthService
  ) { }

  ngOnInit() { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onEmailChange(value: string): void {
    // Clear error when user starts typing
    if (this.emailError) {
      this.emailError = '';
    }
  }

  onPasswordChange(value: string): void {
    // Clear error when user starts typing
    if (this.passwordError) {
      this.passwordError = '';
    }
  }
}