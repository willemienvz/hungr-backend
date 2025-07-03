import { Component, Input } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { User } from '../../../shared/services/user';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
@Component({
  selector: 'app-view-users',
  templateUrl: './view-users.component.html',
  styleUrl: './view-users.component.scss',
})
export class ViewUsersComponent {
  @Input() user: User;

  showPopup: boolean = false;
  isSaving: boolean = false;
  isEditMode: boolean = false;

  constructor(
    private readonly toastr: ToastrService,
    private readonly firestore: AngularFirestore
  ) {}

  openPopup(user: any) {
    this.user = { ...user };
    this.showPopup = true;
    this.isEditMode = false; // Start in view mode
  }

  closePopup() {
    this.showPopup = false;
    this.isEditMode = false;
  }

  switchToEditMode() {
    this.isEditMode = true;
  }

  switchToViewMode() {
    this.isEditMode = false;
  }

  updateUser(updatedUser: User) {
    this.isSaving = true;
    const userRef: AngularFirestoreDocument<User> = this.firestore.doc(
      `users/${updatedUser.uid}`
    );

    const updatedData = {
      firstName: updatedUser.firstName,
      Surname: updatedUser.Surname,
      cellphoneNumber: updatedUser.cellphoneNumber,
    };

    userRef
      .update(updatedData)
      .then(() => {
        this.toastr.success('User updated successfully!');
        this.isSaving = false;
        this.switchToViewMode(); // Switch back to view mode after successful update
      })
      .catch((error) => {
        this.toastr.error('Error updating user');
        this.isSaving = false;
      });
  }
}
