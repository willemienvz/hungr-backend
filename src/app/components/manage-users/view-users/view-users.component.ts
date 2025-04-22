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

  constructor(
    private readonly toastr: ToastrService,
    private readonly firestore: AngularFirestore
  ) {}

  openPopup(user: any) {
    this.user = { ...user };
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
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
        this.closePopup();
      })
      .catch((error) => {
        this.toastr.error('Error updating user');
        this.isSaving = false;
      });
  }
}
