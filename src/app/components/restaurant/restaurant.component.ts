import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Restaurant } from '../../shared/services/restaurant';
import { MatDialog } from '@angular/material/dialog';
import { ViewComponent } from './view/view.component';
import { ToastrService } from 'ngx-toastr';
import { DeleteConfirmationModalComponent, DeleteConfirmationData } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { TableColumn, TableAction } from '../shared/data-table/data-table.component';
import { UnsavedChangesDialogComponent } from '../unsaved-changes-dialog/unsaved-changes-dialog.component';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrl: './restaurant.component.scss',
})
export class RestaurantComponent {
  isTooltipOpen: boolean = false;
  isPopupMenuOpen: boolean[] = [];
  isSaving: boolean = false;
  isLoading: boolean = false;
  activeRestaurants: Restaurant[] = [];
  draftRestaurants: Restaurant[] = [];
  hasUnsavedChanges: boolean = false;

  // Table configuration
  restaurantColumns: TableColumn[] = [
    {
      key: 'restaurantName',
      label: 'Restaurant Name',
      sortable: true
    },
    {
      key: 'city',
      label: 'Location',
      sortable: true
    }
  ];

  restaurantActions: TableAction[] = [
    {
      key: 'view',
      label: 'View',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'danger'
    }
  ];

  draftRestaurantColumns: TableColumn[] = [
    {
      key: 'restaurantName',
      label: 'Restaurant Name',
      sortable: true
    },
    {
      key: 'city',
      label: 'Location',
      sortable: true
    }
  ];

  draftRestaurantActions: TableAction[] = [
    {
      key: 'view',
      label: 'View',
      icon: 'visibility',
      color: 'secondary'
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: 'secondary'
    },
    {
      key: 'activate',
      label: 'Activate',
      icon: 'check_circle',
      color: 'success'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'delete',
      color: 'danger'
    }
  ];
  constructor(
    private readonly toastr: ToastrService,
    private firestore: AngularFirestore,
    private router: Router,
    private elementRef: ElementRef,
    public dialog: MatDialog
  ) { }
  ngOnInit() {
    this.isLoading = true;
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
      .collection<Restaurant>('restaurants', (ref) =>
        ref.where('ownerID', '==', OwnerID)
      )
      .valueChanges()
      .subscribe((restaurants) => {
        // Separate active and draft restaurants
        this.activeRestaurants = restaurants.filter(restaurant => restaurant.status === true);
        this.draftRestaurants = restaurants.filter(restaurant => restaurant.status === false);
        console.log('Active restaurants:', this.activeRestaurants);
        console.log('Draft restaurants:', this.draftRestaurants);
        this.isLoading = false;
      });
  }

  onRestaurantAction(event: any) {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        this.viewRestaurant(row.restaurantID, index);
        break;
      case 'edit':
        // Navigate to edit restaurant page with unsaved changes check
        this.navigateWithUnsavedChangesCheck(['/restaurants/edit-restaurant', row.restaurantID]);
        break;
      case 'delete':
        this.openDialog(row.restaurantID, index, row.restaurantName);
        break;
    }
  }

  onDraftRestaurantAction(event: any) {
    const { action, row, index } = event;

    switch (action.key) {
      case 'view':
        this.viewRestaurant(row.restaurantID, index);
        break;
      case 'edit':
        // Navigate to edit restaurant page with unsaved changes check
        this.navigateWithUnsavedChangesCheck(['/restaurants/edit-restaurant', row.restaurantID]);
        break;
      case 'activate':
        this.activateRestaurant(row.restaurantID, index);
        break;
      case 'delete':
        this.openDialog(row.restaurantID, index, row.restaurantName);
        break;
    }
  }

  /**
   * Handle row click - trigger first available action
   */
  onRowClick(event: any) {
    const { row, index } = event;

    // Find the first available action for this row
    const firstAvailableAction = this.restaurantActions.find(action =>
      action.visible ? action.visible(row) : true
    );

    if (firstAvailableAction) {
      this.onRestaurantAction({ action: firstAvailableAction, row, index });
    }
  }

  onDraftRowClick(event: any) {
    const { row, index } = event;

    // Find the first available action for this row
    const firstAvailableAction = this.draftRestaurantActions.find(action =>
      action.visible ? action.visible(row) : true
    );

    if (firstAvailableAction) {
      this.onDraftRestaurantAction({ action: firstAvailableAction, row, index });
    }
  }

  activateRestaurant(restaurantId: string, index: number) {
    this.firestore
      .collection('restaurants')
      .doc(restaurantId)
      .update({ status: true })
      .then(() => {
        this.toastr.success('Restaurant activated successfully');
        // Remove from draft list and add to active list
        const restaurant = this.draftRestaurants[index];
        this.draftRestaurants.splice(index, 1);
        this.activeRestaurants.push(restaurant);
      })
      .catch((error) => {
        console.error('Error activating restaurant:', error);
        this.toastr.error('Failed to activate restaurant');
      });
  }

  deleteRestaurant(id: string, index: number) {
    this.firestore
      .collection('restaurants')
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

  // Navigation safety methods
  private markAsChanged() {
    this.hasUnsavedChanges = true;
  }

  private markAsSaved() {
    this.hasUnsavedChanges = false;
  }

  async navigateWithUnsavedChangesCheck(route: string | any[]) {
    if (this.hasUnsavedChanges) {
      const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result === true) {
          if (Array.isArray(route)) {
            this.router.navigate(route);
          } else {
            this.router.navigate([route]);
          }
        }
      });
    } else {
      if (Array.isArray(route)) {
        this.router.navigate(route);
      } else {
        this.router.navigate([route]);
      }
    }
  }

  // Method to navigate to add restaurant page
  navigateToAddRestaurant() {
    // No need to check for unsaved changes when adding a new restaurant
    this.router.navigate(['/restaurants/add-new-restaurant']);
  }
}
