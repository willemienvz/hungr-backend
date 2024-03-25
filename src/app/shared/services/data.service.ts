import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { CollectionReference, Query } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private robotsCollection: AngularFirestoreCollection<any>;

  constructor(private firestore: AngularFirestore) {
    this.robotsCollection = this.firestore.collection('robots');
  }

  async createRobot(name: string, color: string, age: string) {
    try {
      const docRef = await this.robotsCollection.add({ name, color, age });
      console.log("Document written with ID: ", docRef.id);
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  }
}
