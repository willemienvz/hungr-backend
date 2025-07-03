import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { User } from '../../shared/services/user';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ViewUsersComponent } from './view-users/view-users.component';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
})
export class ManageUsersComponent implements OnInit {
  @ViewChild('editDialog') editDialog: ViewUsersComponent;
  users: User[] = [];
  isSaving: boolean = false;
  mainUserName: string = '';

  constructor(
    private readonly firestore: AngularFirestore,
    private toastr: ToastrService,
    private dialog: MatDialog
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

  getUserStatus(user: User): boolean {
    // For now, consider all users active. In a real implementation,
    // this would check user.isActive or user.status or similar field
    return true;
  }

  viewUser(user: User) {
    if (this.editDialog) {
      this.editDialog.openPopup(user);
    } else {
      console.error('editDialog not available');
    }
  }

  confirmDeleteUser(uid: string, index: number) {
    const user = this.users.find(u => u.uid === uid);
    const userName = user ? `${user.firstName} ${user.Surname}` : 'this user';
    
    const data: DeleteConfirmationData = {
      title: 'Delete User',
      itemName: userName,
      itemType: 'user',
      message: `Are you sure you want to delete ${userName}? This will remove their access to the system and cannot be undone.`,
      confirmButtonText: 'Yes, Delete User',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteUser(uid, index);
      }
    });
  }

  private deleteUser(uid: string, index: number) {
    const userRef: AngularFirestoreDocument<any> = this.firestore.doc(
      `users/${uid}`
    );
    userRef.delete().then(() => {
      this.toastr.success('User deleted successfully!');
    }).catch(error => {
      console.error('Error deleting user:', error);
      this.toastr.error('Error deleting user');
    });
  }

  editUser(user: User, index: number) {
    if (this.editDialog) {
      this.editDialog.openPopup(user);
    } else {
      console.error('editDialog not available');
    }
  }
}
