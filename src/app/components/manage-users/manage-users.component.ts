import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { User } from '../../shared/services/user';
import { ToastrService } from 'ngx-toastr';
import { ViewUsersComponent } from './view-users/view-users.component';
@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
})
export class ManageUsersComponent implements OnInit {
  @ViewChild('editDialog') editDialog: ViewUsersComponent;
  users: User[] = [];
  isSaving: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  mainUserName: string = '';

  showConfirmDelete: boolean = false;
  pendingDeleteUid: string = '';
  popupMenuIndexToClose: number = -1;

  constructor(
    private readonly firestore: AngularFirestore,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.isSaving = true;
    this.fetchUsers();
  }

  private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const parentId = user.uid;
    this.mainUserName = user.email;
    this.firestore
      .collection<User>('users', (ref) => ref.where('parentId', '==', parentId))
      .valueChanges()
      .subscribe((users) => {
        this.users = users;
        this.isSaving = false;
      });
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  confirmDeleteUser(uid: string, index: number) {
    this.pendingDeleteUid = uid;
    this.popupMenuIndexToClose = index;
    this.showConfirmDelete = true;
  }

  cancelDelete() {
    this.showConfirmDelete = false;
    this.pendingDeleteUid = '';
    this.popupMenuIndexToClose = -1;
  }

  proceedDelete() {
    const userRef: AngularFirestoreDocument<any> = this.firestore.doc(
      `users/${this.pendingDeleteUid}`
    );
    userRef.delete().then(() => {
      this.closeAllPopupMenu();
      this.showConfirmDelete = false;
      this.pendingDeleteUid = '';
      this.popupMenuIndexToClose = -1;
      this.toastr.success('User deleted successfully!');
    });
  }

  editUser(user: User, index: number) {
    this.togglePopupMenu(index);
    if (this.editDialog) {
      this.editDialog.openPopup(user);
    } else {
      console.error('editDialog not available');
    }
  }

  private closeAllPopupMenu() {
    this.isPopupMenuOpen.fill(false);
  }
}
