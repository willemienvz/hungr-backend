import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-add-user-dialog',
  templateUrl: './add-user-dialog.component.html',
  styleUrl: './add-user-dialog.component.scss'
})
export class AddUserDialogComponent {
  showPopup: boolean = false;
  isSaving: boolean = false;
  constructor(
    public authService: AuthService,
  ) { }
 

  openPopup() {
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  addUser(userForm: NgForm) {
    this.isSaving = true;
    
    if (userForm.valid) {
      const userData = userForm.value;
      this.authService.SignUpEditor(userForm.value.email, userData)
      this.closePopup();
    }
  }
}
