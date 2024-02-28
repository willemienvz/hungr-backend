import { Component, OnInit } from '@angular/core';
import { AuthService } from "../../shared/services/auth.service";
import { FormDataService } from '../../shared/services/signup/form-data.service';
@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit {
  currentStep: number = 1;
  constructor(
    public authService: AuthService,
    private formDataService: FormDataService
  ) { }
  ngOnInit() { }

  onNextStep() {
    this.currentStep++;
  }

  onPreviousStep() {
    this.currentStep--;
  }

  onComplete() {
    // Handle form submission or additional logic here
  }
}