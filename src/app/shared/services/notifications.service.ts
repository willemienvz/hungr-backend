import { Injectable } from '@angular/core';
import { Notification } from './notification';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  user: any;
  OwnerID:string='';
  newNotification: Notification = {
    ownerID: '',
    read: false,
    text: '',
    timestamp: ''
  }
 constructor(private firestore: AngularFirestore) {
  }


   addNotification(text: string){
    this.user = JSON.parse(localStorage.getItem('user')!);
    this.OwnerID = this.user.uid;

    this.newNotification.ownerID = this.OwnerID;
    this.newNotification.text = text;
    this.newNotification.timestamp =  Date.now().toString();


      this.firestore.collection('notification').add(this.newNotification)
        .then(() => {
          console.log('notification added')
        })
        .catch(error => {
          console.error('Error adding restaurant: ', error);
        });
    }

    markAllAsUnread(): void {
      this.user = JSON.parse(localStorage.getItem('user')!);
      this.OwnerID = this.user.uid;
      this.firestore
        .collection<Notification>('notification', (ref) =>
          ref.where('ownerID', '==', this.OwnerID)
        )
        .get()
        .subscribe((snapshot) => {
          snapshot.forEach((doc) => {
            this.firestore
              .collection('notification')
              .doc(doc.id)
              .update({ read: true })
              .catch((error) =>
                console.error(`Error updating notification ${doc.id}:`, error)
              );
          });
        });
    }
}
