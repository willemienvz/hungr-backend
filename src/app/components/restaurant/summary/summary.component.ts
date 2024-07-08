import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../../shared/services/restaurant';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss'
})
export class SummaryComponent  implements OnInit{
  isTooltipOpen:boolean = false;
  isPopupMenuOpen: boolean[] = [];
  isSaving: boolean = false;
  restuarants: Restaurant[] = [];
  constructor(private firestore: AngularFirestore,  private elementRef: ElementRef) {
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

  private fetchRestaurant() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.firestore.collection<Restaurant>('restuarants', ref => ref.where('ownerID', '==', OwnerID))
      .valueChanges()
      .subscribe(restuarants => {
        this.restuarants = restuarants;
        this.isSaving = false;
      });
  }

  deleteRestaurant(id:string, index: number){
    this.togglePopupMenu(index);
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

}
