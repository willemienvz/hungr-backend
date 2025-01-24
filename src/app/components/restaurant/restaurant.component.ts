import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import {MatDialog} from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog/confirm-delete-dialog.component';
import { ViewComponent } from './view/view.component';
@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrl: './restaurant.component.scss'
})
export class RestaurantComponent {
  isTooltipOpen:boolean = false;
  isPopupMenuOpen: boolean[] = [];
  isSaving: boolean = false;
  restuarants: Restaurant[] = [];
  constructor(private firestore: AngularFirestore,  private elementRef: ElementRef, public dialog: MatDialog) {
  }
  ngOnInit() {
    this.isSaving = true;
    this.fetchRestaurant();
  }
  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAllPopupMenu();
    }
  }
  
  togglePopupMenu(index: number) {
    this.isPopupMenuOpen[index] = !this.isPopupMenuOpen[index];
  }

  openDialog(id:string, index: number, name:string): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {name: name}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteRestaurant(id, index);
      } else {
      }
    });
  }

  private fetchRestaurant() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', OwnerID))
      .valueChanges()
      .subscribe(restuarants => {
        this.restuarants = restuarants;
        console.log(this.restuarants)
        this.isSaving = false;
      });
  }

  deleteRestaurant(id:string, index: number){
    this.firestore.collection('restuarants').doc(id).delete()
        .then(() => {
            console.log("Restaurant successfully deleted!");
        })
        .catch((error) => {
            console.error("Error removing restaurant: ", error);
        });
  }

  private closeAllPopupMenu() {
    this.isPopupMenuOpen.fill(false);
  }

  
  viewRestaurant(id:string, index: number){
    const dialogRef = this.dialog.open(ViewComponent, {
      width: '700px',
      data: {id: id}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        
      } else {
      }
    });
  }
}
