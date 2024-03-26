import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { User } from '../../shared/services/user';

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss']
})
export class ManageUsersComponent implements OnInit {
  users: User[] = [];
  isSaving: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  mainUserName:string='';
  constructor(private firestore: AngularFirestore) {
  }

  ngOnInit() {
    this.isSaving = true;
    this.fetchUsers();
  }

  private fetchUsers() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const parentId = user.uid;
    this.mainUserName = user.email;
    this.firestore.collection<User>('users', ref => ref.where('parentId', '==', parentId))
      .valueChanges()
      .subscribe(users => {
        this.users = users;
        this.isSaving = false;
      });
  }

  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  deleteUser(uid:string){
    const userRef: AngularFirestoreDocument<any> = this.firestore.doc(`users/${uid}`);
    userRef.delete();
  }
}
