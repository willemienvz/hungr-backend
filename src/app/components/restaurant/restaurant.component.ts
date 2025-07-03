import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Restaurant } from '../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { ViewComponent } from './view/view.component';
import { ToastrService } from 'ngx-toastr';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrl: './restaurant.component.scss',
})
export class RestaurantComponent {
  isTooltipOpen: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  isSaving: boolean = false;
  restuarants: Restaurant[] = [];
  constructor(
    private readonly toastr: ToastrService,
    private firestore: AngularFirestore,
    private elementRef: ElementRef,
    public dialog: MatDialog
  ) {}
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

  openDialog(id: string, index: number, name: string): void {
    const data: DeleteConfirmationData = {
      title: 'Delete Restaurant',
      itemName: name,
      itemType: 'restaurant',
      message: `Are you sure you want to delete "${name}"? This will permanently remove the restaurant and all associated data.`,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    };

    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent, {
      width: '450px',
      panelClass: 'delete-confirmation-modal-panel',
      data: data
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.deleteRestaurant(id, index);
      }
    });
  }

  private fetchRestaurant() {
    const user = JSON.parse(localStorage.getItem('user')!);
    const OwnerID = user.uid;
    this.firestore
      .collection<Restaurant>('restuarants', (ref) =>
        ref.where('ownerID', '==', OwnerID)
      )
      .valueChanges()
      .subscribe((restuarants) => {
        this.restuarants = restuarants;
        console.log(this.restuarants);
        this.isSaving = false;
      });
  }

  deleteRestaurant(id: string, index: number) {
    this.firestore
      .collection('restuarants')
      .doc(id)
      .delete()
      .then(() => {
        this.toastr.success('Restaurant successfully deleted!');
      })
      .catch((error) => {
        this.toastr.error('Error removing restaurant');
        console.error('Error removing restaurant: ', error);
      });
  }

  private closeAllPopupMenu() {
    this.isPopupMenuOpen.fill(false);
  }

  viewRestaurant(id: string, index: number) {
    const dialogRef = this.dialog.open(ViewComponent, {
      width: '700px',
      data: { id: id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
      } else {
      }
    });
  }
}
