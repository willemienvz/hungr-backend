import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';

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
  constructor(private firestore: AngularFirestore,  private elementRef: ElementRef, private dialog: MatDialog, private toastr: ToastrService) {
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

  confirmDeleteRestaurant(id: string, index: number, restaurantName: string) {
    const data: DeleteConfirmationData = {
      title: 'Delete Restaurant',
      itemName: restaurantName,
      itemType: 'restaurant',
      message: `Are you sure you want to delete "${restaurantName}"? This will permanently remove the restaurant and all associated data.`,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteRestaurant(id, index);
      }
    });
  }

  private deleteRestaurant(id: string, index: number) {
    this.togglePopupMenu(index);
    this.firestore.collection('restuarants').doc(id).delete()
        .then(() => {
            this.toastr.success('Restaurant successfully deleted!');
        })
        .catch((error) => {
            this.toastr.error('Error removing restaurant');
            console.error("Error removing restaurant: ", error);
        });
  }

  private closeAllPopupMenu() {
    this.isPopupMenuOpen.fill(false);
  }

}
