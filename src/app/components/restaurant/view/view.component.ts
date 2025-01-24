import { Component, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Restaurant } from '../../../shared/services/restaurant';
import { Menu } from '../../../shared/services/menu';
import { User } from '../../../shared/services/user';

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrl: './view.component.scss'
})
export class ViewComponent {
  restuarant: Restaurant;  
  menuName: string;
  owner: string;
    constructor(
      private router: Router,
      private firestore: AngularFirestore,
      public dialogRef: MatDialogRef<ViewComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
        this.fetchRestaurants();
        console.log(data);
      }

      
  onCancel(): void {
    this.dialogRef.close(true); 
  }

  edit(): void {
   
  }

  fetchRestaurants() {
  this.firestore.collection<Restaurant>('restuarants', ref => ref.where('restaurantID', '==', this.data.id))
    .valueChanges()
    .subscribe(restuarants => {
      console.log(restuarants)
      this.restuarant = restuarants[0];
      this.fetchMenus(this.restuarant.menuID);
      this.fetchOwener(this.restuarant.ownerID);
    });
    
   
  }

  fetchMenus(id) {
    this.firestore.collection<Menu>('menus', ref => ref.where('menuID', '==', id))
    .valueChanges()
    .subscribe(result => {
      this.menuName = result[0].menuName;
    });
  }

  fetchOwener(id) {
    this.firestore.collection<User>('users', ref => ref.where('uid', '==', id))
    .valueChanges()
    .subscribe(result => {
      this.owner = result[0].firstName + ' ' + result[0].Surname;
    });
  }
}
