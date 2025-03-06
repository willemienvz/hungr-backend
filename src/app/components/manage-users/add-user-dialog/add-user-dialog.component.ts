import { Component } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
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
    private readonly toastr: ToastrService
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
        .then(() => {
          this.toastr.success('User signed up successfully!');
          this.closePopup();
          this.isSaving = false;
        })
        .catch((error) => {
          let errorMessage = '';
          if (error.message === "Firebase: The email address is already in use by another account. (auth/email-already-in-use)."){
            errorMessage = 'The email address is already in use by another account.'
          }else{
            errorMessage =error.message;
          }
          this.toastr.error(errorMessage);
          this.isSaving = false;
        });
    }
  }
}
