import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private firestore: AngularFirestore) { }

  addPlaceholderUser(data: any) {
    return this.firestore.collection('users').add({
      data
    });
  }

  addUser(data: any) {
   return this.firestore.collection('users').add(data);
  }

  updateUser(uid: string, data: any) {
    return this.firestore.collection('users').doc(uid).update(data);
  }
}
